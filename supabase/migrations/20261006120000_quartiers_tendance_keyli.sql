-- Keyli — Quartiers tendance : popularité et tendance des prix
--
-- Sources : docs/MODULES/quartiers-tendance.md, docs/MODULES/analytics-tracking.md,
-- docs/prd.md §7.2. Une seule source de données pour deux usages : les
-- « quartiers populaires » de l'Accueil et le TrendBar « tendance des prix
-- par quartier » du dashboard Chercheur.
--
-- Décisions du porteur de projet du 2026-10-06 :
--   - popularité = sessions distinctes ayant cherché le quartier OU consulté
--     une de ses annonces (une session compte une fois par zone) ;
--   - fenêtre : 30 derniers jours, prix comparés aux 30 jours précédents ;
--   - recalcul chaque nuit par pg_cron ;
--   - affichage par quartier, repli sur la commune quand le quartier a moins
--     de 5 annonces mises en ligne sur la période.
-- Précision de mise en œuvre : les prix sont calculés séparément pour la
-- location et la vente (une moyenne mêlant loyers et prix de vente n'aurait
-- pas de sens).

create extension if not exists pg_cron with schema pg_catalog;

-- ============================================================
-- Instantané des tendances, recalculé chaque nuit
-- ============================================================
create table public.quartiers_tendance_keyli (
  niveau                    text not null check (niveau in ('quartier', 'commune')),
  zone_id                   uuid not null,          -- id du quartier ou de la commune
  commune_id                uuid not null references public.communes_keyli(id),
  nom                       text not null,
  score_popularite          integer not null default 0,  -- sessions distinctes (recherche ou vue)
  sessions_recherche        integer not null default 0,
  sessions_vue              integer not null default 0,
  nb_location               integer not null default 0,  -- mises en ligne sur la période
  prix_moyen_location       numeric(14,2),
  prix_moyen_location_prec  numeric(14,2),
  tendance_location_pct     numeric(7,1),
  nb_vente                  integer not null default 0,
  prix_moyen_vente          numeric(14,2),
  prix_moyen_vente_prec     numeric(14,2),
  tendance_vente_pct        numeric(7,1),
  prix_fiable               boolean not null default false,  -- au moins 5 annonces sur la période
  periode_debut             timestamptz not null,
  periode_fin               timestamptz not null,
  calcule_le                timestamptz not null default now(),
  primary key (niveau, zone_id)
);
create index idx_quartiers_tendance_score on public.quartiers_tendance_keyli (niveau, score_popularite desc);

alter table public.quartiers_tendance_keyli enable row level security;
-- Données agrégées et anonymes : lecture publique (Accueil, visiteurs compris)
create policy "Lecture publique des tendances" on public.quartiers_tendance_keyli
  for select to anon, authenticated using (true);
revoke all on public.quartiers_tendance_keyli from anon, authenticated;
grant select on public.quartiers_tendance_keyli to anon, authenticated;

-- ============================================================
-- Calcul — remplace entièrement l'instantané
-- ============================================================
create or replace function public.calculer_quartiers_tendance_keyli()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fin         timestamptz := now();
  v_debut       timestamptz := now() - interval '30 days';
  v_debut_prec  timestamptz := now() - interval '60 days';
begin
  delete from public.quartiers_tendance_keyli where true;

  insert into public.quartiers_tendance_keyli (
    niveau, zone_id, commune_id, nom,
    score_popularite, sessions_recherche, sessions_vue,
    nb_location, prix_moyen_location, prix_moyen_location_prec, tendance_location_pct,
    nb_vente, prix_moyen_vente, prix_moyen_vente_prec, tendance_vente_pct,
    prix_fiable, periode_debut, periode_fin
  )
  with zones as (
    select 'quartier'::text as niveau, q.id as zone_id, q.commune_id, q.nom
      from public.quartiers_keyli q
    union all
    select 'commune', c.id, c.id, c.nom
      from public.communes_keyli c
  ),
  -- Mises en ligne des 60 derniers jours (période + période précédente)
  pubs as (
    select pp.published_at, p.price, p.status, q.id as quartier_id, q.commune_id
      from public.property_publications_keyli pp
      join public.properties_keyli p on p.id = pp.property_id
      join public.quartiers_keyli q on q.id = p.quartier_id
     where pp.published_at >= v_debut_prec
  ),
  -- Recherches et vues des 30 derniers jours
  inter as (
    select i.session_id, i.interaction_type, q.id as quartier_id, q.commune_id
      from public.property_interactions_keyli i
      join public.quartiers_keyli q on q.id = i.quartier_id
     where i.created_at >= v_debut
       and i.interaction_type in ('view', 'search_neighborhood')
  ),
  calc as (
    select z.*,
           pop.score, pop.recherche, pop.vue, px.*
      from zones z
      cross join lateral (
        select count(distinct i.session_id)::int as score,
               count(distinct i.session_id) filter (where i.interaction_type = 'search_neighborhood')::int as recherche,
               count(distinct i.session_id) filter (where i.interaction_type = 'view')::int as vue
          from inter i
         where (z.niveau = 'quartier' and i.quartier_id = z.zone_id)
            or (z.niveau = 'commune' and i.commune_id = z.zone_id)
      ) pop
      cross join lateral (
        select count(*) filter (where p.status = 'a_louer' and p.published_at >= v_debut)::int as nb_loc,
               avg(p.price) filter (where p.status = 'a_louer' and p.published_at >= v_debut) as loc,
               avg(p.price) filter (where p.status = 'a_louer' and p.published_at < v_debut) as loc_prec,
               count(*) filter (where p.status = 'a_vendre' and p.published_at >= v_debut)::int as nb_ven,
               avg(p.price) filter (where p.status = 'a_vendre' and p.published_at >= v_debut) as ven,
               avg(p.price) filter (where p.status = 'a_vendre' and p.published_at < v_debut) as ven_prec
          from pubs p
         where (z.niveau = 'quartier' and p.quartier_id = z.zone_id)
            or (z.niveau = 'commune' and p.commune_id = z.zone_id)
      ) px
  )
  select niveau, zone_id, commune_id, nom,
         score, recherche, vue,
         nb_loc, round(loc, 2), round(loc_prec, 2),
         case when loc_prec > 0 and loc is not null then round((loc - loc_prec) / loc_prec * 100, 1) end,
         nb_ven, round(ven, 2), round(ven_prec, 2),
         case when ven_prec > 0 and ven is not null then round((ven - ven_prec) / ven_prec * 100, 1) end,
         (nb_loc + nb_ven) >= 5,
         v_debut, v_fin
    from calc;
end;
$$;

revoke execute on function public.calculer_quartiers_tendance_keyli() from public, anon, authenticated;

-- ============================================================
-- Vues pour l'affichage (droits de l'appelant : la table est publique)
-- ============================================================
-- Chips « quartiers populaires » de l'Accueil (le nombre affiché est un
-- réglage d'écran : 6 dans les maquettes)
create view public.quartiers_populaires_keyli
with (security_invoker = true) as
select t.zone_id as quartier_id, t.nom, c.nom as commune, t.score_popularite,
       t.sessions_recherche, t.sessions_vue, t.calcule_le
  from public.quartiers_tendance_keyli t
  join public.communes_keyli c on c.id = t.commune_id
 where t.niveau = 'quartier' and t.score_popularite > 0
 order by t.score_popularite desc, t.nom;

-- TrendBar : tendance des prix de chaque quartier, ou de sa commune quand
-- le quartier n'a pas assez d'annonces sur la période
create view public.tendances_prix_keyli
with (security_invoker = true) as
select q.id as quartier_id,
       case when tq.prix_fiable then 'quartier' else 'commune' end as niveau_affiche,
       case when tq.prix_fiable then tq.nom else tc.nom end as nom_affiche,
       case when tq.prix_fiable then tq.prix_moyen_location else tc.prix_moyen_location end as prix_moyen_location,
       case when tq.prix_fiable then tq.tendance_location_pct else tc.tendance_location_pct end as tendance_location_pct,
       case when tq.prix_fiable then tq.prix_moyen_vente else tc.prix_moyen_vente end as prix_moyen_vente,
       case when tq.prix_fiable then tq.tendance_vente_pct else tc.tendance_vente_pct end as tendance_vente_pct,
       coalesce(tq.calcule_le, tc.calcule_le) as calcule_le
  from public.quartiers_keyli q
  left join public.quartiers_tendance_keyli tq on tq.niveau = 'quartier' and tq.zone_id = q.id
  left join public.quartiers_tendance_keyli tc on tc.niveau = 'commune' and tc.zone_id = q.commune_id;

revoke all on public.quartiers_populaires_keyli, public.tendances_prix_keyli from anon, authenticated;
grant select on public.quartiers_populaires_keyli, public.tendances_prix_keyli to anon, authenticated;

-- ============================================================
-- Recalcul chaque nuit à 02:00 (UTC = heure d'Abidjan), et un premier
-- calcul tout de suite
-- ============================================================
select cron.schedule('keyli-quartiers-tendance', '0 2 * * *',
                     'select public.calculer_quartiers_tendance_keyli()');

select public.calculer_quartiers_tendance_keyli();
