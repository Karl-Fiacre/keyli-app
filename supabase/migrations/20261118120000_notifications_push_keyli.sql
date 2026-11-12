-- ============================================================
-- Notifications push de l'application mobile (Sprint 17, 2026-11-11)
-- Choix du porteur : envoi DIRECT par Apple (APNs) et Google (FCM), sans
-- service intermédiaire. Même architecture que les emails
-- (20261107120000_emails_notifications_keyli.sql) :
-- * appareils_push_keyli : jetons des téléphones (un compte peut en avoir
--   plusieurs : tous reçoivent la notification) ;
-- * déclencheurs sur notifications_keyli et messages_keyli → file
--   pushs_sortants_keyli, seulement si le destinataire a un appareil ;
-- * tâche keyli-envoi-pushs (pg_cron, chaque minute) → Edge Function
--   envoyer-pushs → prendre_pushs_keyli / terminer_push_keyli ; les jetons
--   refusés par Apple ou Google sont retirés.
-- La préférence se règle sur le téléphone (autorisation des
-- notifications) ; la déconnexion retire le jeton de l'appareil.
-- Détail : docs/MODULES/mobile.md, section Sprint 17.
-- ============================================================

-- ---------- Appareils ----------
create table public.appareils_push_keyli (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  jeton          text not null unique check (length(jeton) between 20 and 4096),
  plateforme     text not null check (plateforme in ('ios', 'android')),
  -- APNs : serveur de production (TestFlight, App Store) ou de développement
  environnement  text not null default 'production' check (environnement in ('production', 'sandbox')),
  created_at     timestamptz not null default now(),
  derniere_vue   timestamptz not null default now()
);

comment on table public.appareils_push_keyli is
  'Jetons push des téléphones (docs/MODULES/mobile.md, Sprint 17). Écrits par enregistrer_appareil_push_keyli.';

create index idx_appareils_push_user on public.appareils_push_keyli (user_id);

-- RLS : chacun voit et retire ses appareils ; l'enregistrement passe par
-- la fonction (un jeton qui change de compte sur le même téléphone)
alter table public.appareils_push_keyli enable row level security;

create policy "Utilisateur : lecture de ses appareils"
  on public.appareils_push_keyli for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Utilisateur : retrait de ses appareils"
  on public.appareils_push_keyli for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.appareils_push_keyli to authenticated;

-- Enregistre le jeton du téléphone pour le compte connecté. Un même
-- téléphone passé d'un compte à l'autre ne notifie plus que le dernier.
create or replace function public.enregistrer_appareil_push_keyli(
  p_jeton text,
  p_plateforme text,
  p_environnement text default 'production'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if p_plateforme not in ('ios', 'android') or p_environnement not in ('production', 'sandbox')
     or p_jeton is null or length(p_jeton) not between 20 and 4096 then
    raise exception 'Appareil invalide' using errcode = '22023';
  end if;
  insert into public.appareils_push_keyli (user_id, jeton, plateforme, environnement)
  values (auth.uid(), p_jeton, p_plateforme, p_environnement)
  on conflict (jeton) do update
    set user_id = excluded.user_id,
        plateforme = excluded.plateforme,
        environnement = excluded.environnement,
        derniere_vue = now();
end;
$$;

revoke execute on function public.enregistrer_appareil_push_keyli(text, text, text) from public, anon;
grant execute on function public.enregistrer_appareil_push_keyli(text, text, text) to authenticated;

-- ---------- Types envoyés en push ----------
-- Mêmes événements que les emails (choix du porteur du 2026-11-02), sauf
-- la relance de démarrage (commerciale) ; les nouveaux messages ont leur
-- propre déclencheur.
create or replace function public.notification_par_push_keyli(p_type text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_type in (
    'reservation_demandee', 'reservation_acceptee', 'reservation_refusee', 'reservation_annulee',
    'visite_planifiee', 'visite_modifiee', 'visite_annulee',
    'document_approuve', 'document_rejete', 'verification_retiree',
    'compte_suspendu', 'compte_reactive',
    'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'paiement_echoue',
    'alerte_recherche', 'retour_repondu'
  )
$$;

-- ---------- File d'envoi ----------
create table public.pushs_sortants_keyli (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  categorie       text not null check (categorie in ('notification', 'message')),
  notification_id uuid references public.notifications_keyli(id) on delete cascade,
  type            text,
  property_id     uuid references public.properties_keyli(id) on delete cascade,
  expediteur_id   uuid references auth.users(id) on delete cascade,
  statut          text not null default 'en_attente'
                    check (statut in ('en_attente', 'en_cours', 'envoye', 'ignore', 'echec')),
  tentatives      integer not null default 0,
  erreur          text,
  envoyer_apres   timestamptz not null default now(),
  envoye_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint pushs_sortants_keyli_notification check (
    categorie <> 'notification' or (notification_id is not null and type is not null)
  ),
  constraint pushs_sortants_keyli_message check (
    categorie <> 'message' or (expediteur_id is not null and property_id is not null)
  )
);

comment on table public.pushs_sortants_keyli is
  'File des notifications push (docs/MODULES/mobile.md, Sprint 17). Écrite par déclencheurs, vidée par l''Edge Function envoyer-pushs.';

create index idx_pushs_sortants_a_envoyer on public.pushs_sortants_keyli (envoyer_apres)
  where statut = 'en_attente';
create index idx_pushs_sortants_conversation on public.pushs_sortants_keyli (user_id, property_id, expediteur_id)
  where categorie = 'message' and statut in ('en_attente', 'en_cours');
create index idx_pushs_sortants_notification on public.pushs_sortants_keyli (notification_id);

-- RLS : lecture réservée aux admins ; aucune écriture directe
alter table public.pushs_sortants_keyli enable row level security;

create policy "Admins : lecture de la file des push"
  on public.pushs_sortants_keyli for select
  to authenticated
  using ((select public.est_admin_keyli()));

grant select on public.pushs_sortants_keyli to authenticated;

-- ---------- Déclencheur : notification → push ----------
create or replace function public.file_push_notification_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.notification_par_push_keyli(new.type) then
    return new;
  end if;
  if not exists (select 1 from public.appareils_push_keyli a where a.user_id = new.user_id) then
    return new;
  end if;
  insert into public.pushs_sortants_keyli (user_id, categorie, notification_id, type, property_id)
  values (new.user_id, 'notification', new.id, new.type, new.property_id);
  return new;
end;
$$;

create trigger trg_file_push_notification
  after insert on public.notifications_keyli
  for each row execute function public.file_push_notification_keyli();

-- ---------- Déclencheur : message → push ----------
-- Envoi immédiat (c'est l'intérêt du push) ; un push encore en file pour la
-- conversation suffit, il annoncera les messages suivants.
create or replace function public.file_push_message_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.property_id is null or new.from_user = new.to_user then
    return new;
  end if;
  if not exists (select 1 from public.appareils_push_keyli a where a.user_id = new.to_user) then
    return new;
  end if;
  if exists (
    select 1 from public.pushs_sortants_keyli p
    where p.categorie = 'message' and p.user_id = new.to_user
      and p.property_id = new.property_id and p.expediteur_id = new.from_user
      and p.statut in ('en_attente', 'en_cours')
  ) then
    return new;
  end if;
  insert into public.pushs_sortants_keyli (user_id, categorie, property_id, expediteur_id)
  values (new.to_user, 'message', new.property_id, new.from_user);
  return new;
end;
$$;

create trigger trg_file_push_message
  after insert on public.messages_keyli
  for each row execute function public.file_push_message_keyli();

revoke execute on function public.file_push_notification_keyli() from public, anon, authenticated;
revoke execute on function public.file_push_message_keyli() from public, anon, authenticated;

-- ---------- Prise d'un lot (Edge Function, service_role) ----------
-- Verrouille le lot, écarte ce qui n'a plus lieu d'être (plus d'appareil,
-- messages déjà lus) et renvoie le texte et les jetons de chaque envoi.
create or replace function public.prendre_pushs_keyli(p_limite integer default 50)
returns table (
  id uuid,
  categorie text,
  type text,
  titre text,
  contenu text,
  property_id uuid,
  expediteur_id uuid,
  expediteur text,
  extrait text,
  non_lus integer,
  appareils jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ids uuid[];
begin
  -- Envois interrompus : remis en file
  update public.pushs_sortants_keyli p
  set statut = 'en_attente', updated_at = now()
  where p.statut = 'en_cours' and p.updated_at < now() - interval '10 minutes';

  with lot as (
    select p.id from public.pushs_sortants_keyli p
    where p.statut = 'en_attente' and p.envoyer_apres <= now()
    order by p.envoyer_apres
    limit greatest(1, least(coalesce(p_limite, 50), 200))
    for update skip locked
  ), pris as (
    update public.pushs_sortants_keyli p
    set statut = 'en_cours', tentatives = p.tentatives + 1, updated_at = now()
    from lot where p.id = lot.id
    returning p.id
  )
  select array_agg(pris.id) into v_ids from pris;

  if v_ids is null then
    return;
  end if;

  -- Écartés : plus aucun appareil (déconnexion entre-temps)
  update public.pushs_sortants_keyli p
  set statut = 'ignore', erreur = 'Aucun appareil enregistré', updated_at = now()
  where p.id = any (v_ids)
    and not exists (select 1 from public.appareils_push_keyli a where a.user_id = p.user_id);

  -- Écartés : messages tous lus entre-temps
  update public.pushs_sortants_keyli p
  set statut = 'ignore', erreur = 'Messages déjà lus', updated_at = now()
  where p.id = any (v_ids) and p.statut = 'en_cours' and p.categorie = 'message'
    and not exists (
      select 1 from public.messages_keyli m
      where m.to_user = p.user_id and m.from_user = p.expediteur_id
        and m.property_id = p.property_id and not m.read
    );

  return query
  select
    p.id,
    p.categorie,
    p.type,
    n.titre,
    n.contenu,
    p.property_id,
    p.expediteur_id,
    case when p.categorie = 'message' then
      coalesce(nullif(x.nom_agence, ''), nullif(trim(coalesce(x.first_name, '')), ''), 'Un utilisateur')
    end,
    case when p.categorie = 'message' then (
      select left(m.body, 140) from public.messages_keyli m
      where m.to_user = p.user_id and m.from_user = p.expediteur_id
        and m.property_id = p.property_id and not m.read
      order by m.created_at desc limit 1
    ) end,
    case when p.categorie = 'message' then (
      select count(*)::integer from public.messages_keyli m
      where m.to_user = p.user_id and m.from_user = p.expediteur_id
        and m.property_id = p.property_id and not m.read
    ) end,
    (
      select coalesce(jsonb_agg(jsonb_build_object(
        'jeton', a.jeton, 'plateforme', a.plateforme, 'environnement', a.environnement)), '[]'::jsonb)
      from public.appareils_push_keyli a where a.user_id = p.user_id
    )
  from public.pushs_sortants_keyli p
  left join public.notifications_keyli n on n.id = p.notification_id
  left join public.profiles_keyli x on x.user_id = p.expediteur_id
  where p.id = any (v_ids) and p.statut = 'en_cours';
end;
$$;

-- ---------- Compte rendu d'envoi ----------
-- Succès (au moins un appareil atteint) : envoyé. Échec : nouvel essai dans
-- 2, 4, 6, 8 minutes, puis abandon à la 5e tentative (un push en retard
-- perd vite son intérêt).
create or replace function public.terminer_push_keyli(p_id uuid, p_ok boolean, p_erreur text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pushs_sortants_keyli p
  set statut = case
        when p_ok then 'envoye'
        when p.tentatives >= 5 then 'echec'
        else 'en_attente'
      end,
      envoye_at = case when p_ok then now() end,
      erreur = case when p_ok then null else left(p_erreur, 500) end,
      envoyer_apres = case when p_ok then p.envoyer_apres else now() + make_interval(mins => 2 * p.tentatives) end,
      updated_at = now()
  where p.id = p_id and p.statut = 'en_cours';
end;
$$;

-- Jetons refusés définitivement par Apple ou Google (application
-- désinstallée, jeton expiré) : retirés
create or replace function public.retirer_jetons_push_keyli(p_jetons text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre integer;
begin
  delete from public.appareils_push_keyli where jeton = any (coalesce(p_jetons, '{}'));
  get diagnostics v_nombre = row_count;
  return v_nombre;
end;
$$;

revoke execute on function public.prendre_pushs_keyli(integer) from public, anon, authenticated;
revoke execute on function public.terminer_push_keyli(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.retirer_jetons_push_keyli(text[]) from public, anon, authenticated;
grant execute on function public.prendre_pushs_keyli(integer) to service_role;
grant execute on function public.terminer_push_keyli(uuid, boolean, text) to service_role;
grant execute on function public.retirer_jetons_push_keyli(text[]) to service_role;

-- ---------- Tâche planifiée : réveil de l'Edge Function ----------
-- Mêmes valeurs du coffre que les emails (keyli_url_projet, keyli_cle_anon,
-- déjà posées). Appel seulement s'il y a des push dus.
create or replace function public.declencher_envoi_pushs_keyli()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_cle text;
begin
  if not exists (
    select 1 from public.pushs_sortants_keyli
    where statut = 'en_attente' and envoyer_apres <= now()
  ) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'keyli_url_projet';
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'keyli_cle_anon';
  if v_url is null or v_cle is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/envoyer-pushs',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_cle),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

revoke execute on function public.declencher_envoi_pushs_keyli() from public, anon, authenticated;

select cron.schedule('keyli-envoi-pushs', '* * * * *', 'select public.declencher_envoi_pushs_keyli()');
