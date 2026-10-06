-- Keyli — Notifications in-app et déclenchement des alertes de recherche
--
-- Sources : docs/MODULES/annonces.md (alertes), docs/prd.md §7.2 et §7.5
-- (alertes sauvegardées, notifications), docs/KEYLI_DASHBOARD_DESIGN_SPEC.md
-- (cloche du DashboardTopbar).
--
-- Décisions du porteur de projet du 2026-10-05 :
--   - notification immédiate, dans l'application, à la publication ou
--     republication d'une annonce correspondant à une alerte active (trigger
--     en base) ; l'email viendra plus tard par Edge Function ;
--   - critères = filtres de la recherche + rayon autour d'un point ;
--   - au plus 10 notifications par alerte et par jour.

-- ============================================================
-- Notifications in-app — table générique (alertes aujourd'hui ; messages,
-- vérification, expiration d'abonnement plus tard)
-- ============================================================
create table public.notifications_keyli (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) not null,
  type         text not null check (type in ('alerte_recherche')),  -- liste étendue au fil des modules
  titre        text not null,
  contenu      text,
  property_id  uuid references public.properties_keyli(id),
  alert_id     uuid references public.search_alerts_keyli(id),
  lue          boolean not null default false,
  created_at   timestamptz not null default now()
);
-- Pastille de la cloche (non lues) et liste par date
create index idx_notifications_user_non_lues on public.notifications_keyli (user_id) where not lue;
create index idx_notifications_user_date on public.notifications_keyli (user_id, created_at desc);
-- Plafond quotidien par alerte
create index idx_notifications_alerte_date on public.notifications_keyli (alert_id, created_at desc)
  where alert_id is not null;

alter table public.notifications_keyli enable row level security;
create policy "Utilisateur lit ses notifications" on public.notifications_keyli
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Utilisateur marque ses notifications lues" on public.notifications_keyli
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Création par le serveur uniquement (triggers, Edge Functions)
revoke all on public.notifications_keyli from anon, authenticated;
grant select on public.notifications_keyli to authenticated;
grant update (lue) on public.notifications_keyli to authenticated;

-- ============================================================
-- Validation des critères d'une alerte
-- Clés acceptées : commune_id, quartier_id (uuid), type
-- (property_type_keyli), status (property_status_keyli), prix_min,
-- prix_max, rooms_min (nombres ≥ 0), furnished (booléen), lat, lng,
-- rayon_km (ensemble : point + rayon de 0,1 à 50 km).
-- ============================================================
create or replace function public.criteres_alerte_valides_keyli(c jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
begin
  if jsonb_typeof(c) <> 'object' or c = '{}'::jsonb then
    return false;
  end if;

  for k in select jsonb_object_keys(c) loop
    if k not in ('commune_id', 'quartier_id', 'type', 'status', 'prix_min', 'prix_max',
                 'rooms_min', 'furnished', 'lat', 'lng', 'rayon_km') then
      return false;
    end if;
  end loop;

  if (c ? 'commune_id' and (jsonb_typeof(c -> 'commune_id') <> 'string'
        or (c ->> 'commune_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
     or (c ? 'quartier_id' and (jsonb_typeof(c -> 'quartier_id') <> 'string'
        or (c ->> 'quartier_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
     or (c ? 'type' and (c ->> 'type') not in ('maison', 'duplex', 'villa', 'appartement', 'studio',
        'residence_meublee', 'auberge', 'hotel', 'bureau', 'magasin'))
     or (c ? 'status' and (c ->> 'status') not in ('a_louer', 'a_vendre'))
     or (c ? 'furnished' and jsonb_typeof(c -> 'furnished') <> 'boolean')
  then
    return false;
  end if;

  for k in select unnest(array['prix_min', 'prix_max', 'rooms_min']) loop
    if c ? k and (jsonb_typeof(c -> k) <> 'number' or (c ->> k)::numeric < 0) then
      return false;
    end if;
  end loop;

  if c ? 'prix_min' and c ? 'prix_max' and (c ->> 'prix_min')::numeric > (c ->> 'prix_max')::numeric then
    return false;
  end if;

  -- Rayon : point et rayon ensemble, coordonnées et rayon dans des bornes réalistes
  if (c ? 'lat' or c ? 'lng' or c ? 'rayon_km') then
    if not (c ? 'lat' and c ? 'lng' and c ? 'rayon_km')
       or jsonb_typeof(c -> 'lat') <> 'number' or jsonb_typeof(c -> 'lng') <> 'number'
       or jsonb_typeof(c -> 'rayon_km') <> 'number'
       or (c ->> 'lat')::numeric not between -90 and 90
       or (c ->> 'lng')::numeric not between -180 and 180
       or (c ->> 'rayon_km')::numeric not between 0.1 and 50 then
      return false;
    end if;
  end if;

  return true;
end;
$$;

alter table public.search_alerts_keyli
  add constraint search_alerts_keyli_criteres_valides check (public.criteres_alerte_valides_keyli(criteres));

-- ============================================================
-- Correspondance annonce ↔ critères (même logique que la recherche)
-- ============================================================
create or replace function public.annonce_correspond_alerte_keyli(p public.properties_keyli, c jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
        (not c ? 'quartier_id' or p.quartier_id = (c ->> 'quartier_id')::uuid)
    and (not c ? 'commune_id' or exists (
          select 1 from public.quartiers_keyli q
           where q.id = p.quartier_id and q.commune_id = (c ->> 'commune_id')::uuid))
    and (not c ? 'type' or p.type::text = c ->> 'type')
    and (not c ? 'status' or p.status::text = c ->> 'status')
    and (not c ? 'prix_min' or p.price >= (c ->> 'prix_min')::numeric)
    and (not c ? 'prix_max' or p.price <= (c ->> 'prix_max')::numeric)
    and (not c ? 'rooms_min' or coalesce(p.rooms, 0) >= (c ->> 'rooms_min')::numeric)
    and (not c ? 'furnished' or coalesce(p.furnished, false) = (c ->> 'furnished')::boolean)
    and (not c ? 'rayon_km' or extensions.st_dwithin(
          p.geolocation,
          extensions.st_setsrid(extensions.st_makepoint((c ->> 'lng')::float8, (c ->> 'lat')::float8), 4326)::extensions.geography,
          (c ->> 'rayon_km')::float8 * 1000));
$$;

-- ============================================================
-- Déclenchement à la publication / republication
-- ============================================================
create or replace function public.notifier_alertes_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.search_alerts_keyli%rowtype;
begin
  -- Seulement une mise en ligne : création publiée ou republication
  if not ((tg_op = 'INSERT' and new.archived_at is null)
       or (tg_op = 'UPDATE' and old.archived_at is not null and new.archived_at is null)) then
    return null;
  end if;

  for a in
    select * from public.search_alerts_keyli s
     where s.actif
       and s.user_id <> new.owner_id   -- jamais pour sa propre annonce
       and public.annonce_correspond_alerte_keyli(new, s.criteres)
  loop
    -- Plafond : 10 notifications par alerte et par jour
    if (select count(*) from public.notifications_keyli n
         where n.alert_id = a.id and n.created_at >= date_trunc('day', now())) < 10 then
      insert into public.notifications_keyli (user_id, type, titre, contenu, property_id, alert_id)
      values (a.user_id, 'alerte_recherche', 'Nouvelle annonce pour votre alerte',
              -- Prix au format ivoirien « 350 000 XOF », indépendant de la locale du serveur
              new.title || ' — ' || replace(to_char(new.price, 'FM999,999,999,990'), ',', ' ') || ' XOF',
              new.id, a.id);
      update public.search_alerts_keyli set derniere_notification_at = now() where id = a.id;
    end if;
  end loop;
  return null;
end;
$$;

create trigger trg_properties_keyli_alertes
  after insert or update of archived_at on public.properties_keyli
  for each row execute function public.notifier_alertes_keyli();

revoke execute on function public.notifier_alertes_keyli() from public, anon, authenticated;
