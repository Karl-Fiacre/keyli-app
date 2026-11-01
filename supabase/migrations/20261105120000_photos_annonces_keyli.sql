-- Keyli — Photos des annonces (Cloudinary)
--
-- Sources : docs/MODULES/annonces.md (étapes 4-5 de la publication),
-- docs/MODULES/photos.md, docs/DATABASE.md (property_media_keyli).
--
-- Décisions du porteur (2026-11-01) :
--   - 1 photo minimum pour publier, 10 au plus par annonce ;
--   - photos choisies dans le formulaire de publication, puis ajoutées,
--     retirées et réordonnées depuis « Mes annonces ».
--
-- Fonctionnement : le navigateur envoie chaque photo directement à
-- Cloudinary avec une signature délivrée par l'Edge Function
-- cloudinary-signature (identifiant imposé : keyli/annonces/<compte>/<uuid>).
-- La base n'accepte ensuite QUE des adresses de ce dossier, dans le compte
-- Cloudinary de Keyli : une adresse d'image quelconque est refusée.

-- ------------------------------------------------------------
-- Compte Cloudinary de Keyli (nom public, visible dans toute adresse
-- d'image — ce n'est pas un secret)
-- ------------------------------------------------------------
create or replace function public.cloudinary_cloud_keyli()
returns text
language sql
immutable
set search_path = ''
as $$ select 'djizi4dod'::text $$;

grant execute on function public.cloudinary_cloud_keyli() to anon, authenticated;

-- Adresse d'une photo envoyée par Keyli pour le compte p_proprietaire :
-- https://res.cloudinary.com/<compte>/image/upload/[v<version>/]keyli/annonces/<proprietaire>/<uuid>.<jpg|jpeg|png|webp>
create or replace function public.url_photo_keyli_valide(p_url text, p_proprietaire uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url is not null and p_proprietaire is not null and p_url ~ (
    '^https://res\.cloudinary\.com/' || public.cloudinary_cloud_keyli()
    || '/image/upload/(v[0-9]+/)?keyli/annonces/' || p_proprietaire::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  )
$$;

grant execute on function public.url_photo_keyli_valide(text, uuid) to authenticated;

-- ------------------------------------------------------------
-- Droits sur les médias : l'ajout n'accepte que des photos Keyli du
-- propriétaire de l'annonce (remplace la policy « for all » d'origine)
-- ------------------------------------------------------------
drop policy "Propriétaire gère les médias de ses annonces" on public.property_media_keyli;

-- Le propriétaire voit aussi les photos de ses annonces archivées
create policy "Propriétaire lit les médias de ses annonces"
  on public.property_media_keyli for select
  to authenticated
  using (exists (
    select 1 from public.properties_keyli p
     where p.id = property_id and p.owner_id = (select auth.uid())
  ));

create policy "Propriétaire ajoute des photos Keyli à ses annonces"
  on public.property_media_keyli for insert
  to authenticated
  with check (
    media_type = 'image'
    and public.compte_actif_keyli((select auth.uid()))
    and public.url_photo_keyli_valide(url, (select auth.uid()))
    and exists (select 1 from public.properties_keyli p
                 where p.id = property_id and p.owner_id = (select auth.uid()))
  );

create policy "Propriétaire réordonne les photos de ses annonces"
  on public.property_media_keyli for update
  to authenticated
  using (exists (select 1 from public.properties_keyli p
                  where p.id = property_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.properties_keyli p
                       where p.id = property_id and p.owner_id = (select auth.uid())));

create policy "Propriétaire retire des photos de ses annonces"
  on public.property_media_keyli for delete
  to authenticated
  using (exists (select 1 from public.properties_keyli p
                  where p.id = property_id and p.owner_id = (select auth.uid())));

-- ------------------------------------------------------------
-- Limites : 10 photos au plus, 1 au moins (une annonce ne perd jamais sa
-- dernière photo). La ligne de l'annonce est verrouillée pour que deux
-- ajouts simultanés ne dépassent pas la limite.
-- ------------------------------------------------------------
create or replace function public.limites_photos_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property_id uuid := coalesce(new.property_id, old.property_id);
  v_nombre integer;
begin
  -- Annonce supprimée (cascade) : rien à protéger
  perform 1 from public.properties_keyli where id = v_property_id for update;
  if not found then
    return coalesce(new, old);
  end if;

  select count(*) into v_nombre
    from public.property_media_keyli
   where property_id = v_property_id and media_type = 'image';

  if tg_op = 'INSERT' and new.media_type = 'image' and v_nombre >= 10 then
    raise exception 'Une annonce compte au plus 10 photos' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' and old.media_type = 'image' and v_nombre <= 1 then
    raise exception 'Une annonce doit garder au moins une photo' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_property_media_keyli_limites
  before insert or delete on public.property_media_keyli
  for each row execute function public.limites_photos_keyli();

revoke execute on function public.limites_photos_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Publication atomique : annonce + avantages + photos (1 à 10). La
-- signature change (p_photos) : l'ancienne version est supprimée.
-- ------------------------------------------------------------
drop function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, uuid, text, numeric, integer, integer, boolean, uuid[], boolean
);

create or replace function public.publier_annonce_keyli(
  p_titre               text,
  p_type                public.property_type_keyli,
  p_statut              public.property_status_keyli,
  p_prix                numeric,
  p_ville               text,
  p_latitude            double precision,
  p_longitude           double precision,
  p_photos              text[],
  p_quartier            uuid default null,
  p_description         text default null,
  p_surface             numeric default null,
  p_pieces              integer default null,
  p_salles_de_bain      integer default null,
  p_meuble              boolean default false,
  p_avantages           uuid[] default '{}',
  p_accepte_depassement boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_photos text[] := coalesce(p_photos, '{}');
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if coalesce(btrim(p_titre), '') = '' or length(p_titre) > 120 then
    raise exception 'Le titre est obligatoire (120 caractères au plus)' using errcode = '23514';
  end if;
  if p_prix is null or p_prix <= 0 then
    raise exception 'Le prix doit être supérieur à zéro' using errcode = '23514';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Point GPS invalide' using errcode = '23514';
  end if;
  if (p_surface is not null and p_surface <= 0)
     or (p_pieces is not null and p_pieces < 0)
     or (p_salles_de_bain is not null and p_salles_de_bain < 0) then
    raise exception 'Surface, pièces et salles de bain ne peuvent pas être négatives' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(coalesce(p_avantages, '{}')) a(id)
              where not exists (select 1 from public.avantages_keyli v where v.id = a.id and v.actif)) then
    raise exception 'Avantage inconnu' using errcode = '23514';
  end if;
  if cardinality(v_photos) < 1 then
    raise exception 'Ajoutez au moins une photo' using errcode = '23514';
  end if;
  if cardinality(v_photos) > 10 then
    raise exception 'Une annonce compte au plus 10 photos' using errcode = '23514';
  end if;
  if (select count(distinct u) from unnest(v_photos) u) <> cardinality(v_photos) then
    raise exception 'La même photo est envoyée deux fois' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(v_photos) u where not public.url_photo_keyli_valide(u, (select auth.uid()))) then
    raise exception 'Photo refusée : elle doit être envoyée depuis Keyli' using errcode = '23514';
  end if;

  insert into public.properties_keyli
    (owner_id, title, type, status, price, description, city, quartier_id, geolocation,
     area_m2, rooms, bathrooms, furnished, accepte_depassement)
  values
    ((select auth.uid()), btrim(p_titre), p_type, p_statut, p_prix, nullif(btrim(p_description), ''),
     btrim(p_ville), p_quartier,
     extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
     p_surface, p_pieces, p_salles_de_bain, coalesce(p_meuble, false), coalesce(p_accepte_depassement, false))
  returning id into v_id;

  insert into public.property_avantages_keyli (property_id, avantage_id)
  select v_id, a.id from (select distinct unnest(coalesce(p_avantages, '{}')) as id) a;

  -- L'ordre du formulaire est conservé : la première photo est la principale
  insert into public.property_media_keyli (property_id, media_type, url, order_index)
  select v_id, 'image', u.url, (u.rang - 1)::integer
    from unnest(v_photos) with ordinality as u(url, rang);

  return v_id;
end;
$$;

revoke execute on function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, text[], uuid, text, numeric, integer, integer, boolean, uuid[], boolean
) from public, anon;
grant execute on function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, text[], uuid, text, numeric, integer, integer, boolean, uuid[], boolean
) to authenticated;

-- ------------------------------------------------------------
-- Nouvel ordre des photos en une seule écriture : des mises à jour
-- séparées (une par photo, en parallèle) laissaient main_image_url
-- calculée sur un état intermédiaire. SECURITY INVOKER : RLS appliquée.
-- p_ids = liste complète des photos de l'annonce, dans le nouvel ordre.
-- ------------------------------------------------------------
create or replace function public.ordonner_photos_keyli(p_property uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.properties_keyli
                  where id = p_property and owner_id = (select auth.uid())) then
    raise exception 'Annonce introuvable' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) = 0
     or (select count(distinct i) from unnest(p_ids) i) <> cardinality(p_ids)
     or (select count(*) from public.property_media_keyli
          where property_id = p_property and media_type = 'image') <> cardinality(p_ids)
     or exists (select 1 from unnest(p_ids) i
                 where not exists (select 1 from public.property_media_keyli m
                                    where m.id = i and m.property_id = p_property and m.media_type = 'image')) then
    raise exception 'La liste des photos ne correspond pas à l''annonce' using errcode = '23514';
  end if;

  update public.property_media_keyli m
     set order_index = (u.rang - 1)::integer
    from unnest(p_ids) with ordinality as u(id, rang)
   where m.id = u.id and m.property_id = p_property;
end;
$$;

revoke execute on function public.ordonner_photos_keyli(uuid, uuid[]) from public, anon;
grant execute on function public.ordonner_photos_keyli(uuid, uuid[]) to authenticated;
