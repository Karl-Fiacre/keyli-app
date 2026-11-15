-- ============================================================
-- Pilote national (décisions du porteur du 2026-11-14,
-- docs/MODULES/publicite-pilote-villes.md, docs/PRD_REGLES.md « PILOTE
-- NATIONAL ») :
--   1. villes de la vague 2 dans le référentiel : Bouaké, San-Pédro,
--      Yamoussoukro ; la ville d'une annonce vient de sa commune (plus
--      jamais « Abidjan » écrit en dur) ;
--   2. gratuité pour tous les annonceurs, sur tout le territoire, pendant
--      les 3 mois du pilote (1er décembre 2026 → 28 février 2027 inclus),
--      30 annonces gratuites en ligne au plus par annonceur ; à la fin, les
--      annonces gratuites RESTENT en ligne (option A) mais toute nouvelle
--      publication suit de nouveau les forfaits ; vérifications inchangées
--      (registre de commerce d'une agence toujours requis).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Villes
-- ------------------------------------------------------------
alter table public.communes_keyli
  add column ville text not null default 'Abidjan';

-- Une commune de l'intérieur porte le nom de sa ville. Quartiers : un
-- « <Ville> Centre » provisoire, comme au départ pour Abidjan
-- (20261001130000) ; l'équipe locale enrichit la liste (liste fermée).
insert into public.communes_keyli (nom, ville) values
  ('Bouaké', 'Bouaké'), ('San-Pédro', 'San-Pédro'), ('Yamoussoukro', 'Yamoussoukro');

insert into public.quartiers_keyli (commune_id, nom)
  select c.id, c.nom || ' Centre'
    from public.communes_keyli c
   where c.nom in ('Bouaké', 'San-Pédro', 'Yamoussoukro');

-- La ville d'une annonce est déduite de son quartier (source de vérité :
-- la base, pas le formulaire)
create or replace function public.ville_annonce_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.quartier_id is not null then
    select c.ville into new.city
      from public.quartiers_keyli q
      join public.communes_keyli c on c.id = q.commune_id
     where q.id = new.quartier_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.ville_annonce_keyli() from public, anon, authenticated;

create trigger trg_properties_keyli_ville
  before insert or update of quartier_id, city on public.properties_keyli
  for each row execute function public.ville_annonce_keyli();

-- Annonces existantes : ville recalculée depuis leur quartier
update public.properties_keyli p
   set city = c.ville
  from public.quartiers_keyli q
  join public.communes_keyli c on c.id = q.commune_id
 where q.id = p.quartier_id and p.city is distinct from c.ville;

-- ------------------------------------------------------------
-- 2. Gratuité du pilote
-- ------------------------------------------------------------
-- Une seule ligne : période et plafond, lisibles par tous (l'interface
-- affiche « gratuit jusqu'au … »), modifiables seulement côté serveur.
create table public.pilote_gratuite_keyli (
  id        boolean primary key default true check (id),
  debut     timestamptz not null,
  fin       timestamptz not null,        -- exclue
  plafond   integer not null check (plafond > 0),
  check (fin >= debut)
);

-- Heure d'Abidjan = UTC
insert into public.pilote_gratuite_keyli (debut, fin, plafond)
values ('2026-12-01 00:00:00+00', '2027-03-01 00:00:00+00', 30);

alter table public.pilote_gratuite_keyli enable row level security;

create policy "Lecture publique de la gratuité du pilote"
  on public.pilote_gratuite_keyli for select
  to anon, authenticated
  using (true);

revoke all on public.pilote_gratuite_keyli from anon, authenticated;
grant select on public.pilote_gratuite_keyli to anon, authenticated;

-- Une mise en ligne gratuite ne compte jamais dans un forfait, même si
-- l'annonce reste en ligne après le pilote (option A)
alter table public.property_publications_keyli
  add column gratuite_pilote boolean not null default false;

-- Plafond : annonces gratuites EN LIGNE d'un annonceur
create index idx_publications_gratuites_en_ligne
  on public.property_publications_keyli (owner_id)
  where gratuite_pilote and unpublished_at is null;

-- Reprend 20261026120000 : les mises en ligne gratuites sont exclues
create or replace function public.publications_periode_keyli(
  p_owner uuid, p_debut timestamptz, p_fin timestamptz
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.property_publications_keyli pub
   where pub.owner_id = p_owner
     and not pub.gratuite_pilote
     and pub.published_at < p_fin
     and (pub.unpublished_at is null or pub.unpublished_at >= p_debut);
$$;

revoke execute on function public.publications_periode_keyli(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- Reprend 20261026120000 : pendant le pilote, statut « gratuite_pilote »
-- (plafond non atteint) ; plafond atteint sans abonnement :
-- « plafond_pilote » ; plafond atteint avec un abonnement : les règles du
-- forfait s'appliquent comme d'habitude.
create or replace function public.evaluer_publication_keyli(p_owner uuid)
returns table (
  statut                text,          -- registre_requis | gratuite_pilote | plafond_pilote | sans_abonnement | incluse | depassement | couverte_negociee | bloquee
  subscription_id       uuid,
  plan_code             text,
  seuil_max             integer,
  publications_cycle    integer,       -- mises en ligne comptées (gratuites en ligne pendant le pilote)
  prix_depassement      decimal(10,2)  -- prix mensuel facturé si statut = depassement
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub      public.subscriptions_keyli%rowtype;
  v_plan     public.plans_keyli%rowtype;
  v_cycle    record;
  v_count    integer;
  v_pilote   public.pilote_gratuite_keyli%rowtype;
  v_gratuit  integer;
begin
  -- Agence : registre de commerce approuvé obligatoire avant toute publication
  if (select role_keyli from public.profiles_keyli where user_id = p_owner) = 'agency'
     and not exists (
       select 1 from public.documents_keyli d
        where d.user_id = p_owner and d.doc_type = 'registre' and d.status = 'approved'
     ) then
    return query select 'registre_requis'::text, null::uuid, null::text, null::integer, 0, null::decimal(10,2);
    return;
  end if;

  select s.* into v_sub
    from public.subscriptions_keyli s
   where s.user_id = p_owner
     and s.status = 'active'
     and now() >= s.start_date and now() < s.end_date
   limit 1;

  -- Pilote : gratuit jusqu'au plafond d'annonces en ligne
  select * into v_pilote from public.pilote_gratuite_keyli where id;
  if found and now() >= v_pilote.debut and now() < v_pilote.fin then
    select count(*)::integer into v_gratuit
      from public.property_publications_keyli pub
     where pub.owner_id = p_owner and pub.gratuite_pilote and pub.unpublished_at is null;
    if v_gratuit + 1 <= v_pilote.plafond then
      return query select 'gratuite_pilote'::text, null::uuid, 'pilote'::text, v_pilote.plafond, v_gratuit,
                          null::decimal(10,2);
      return;
    elsif v_sub.id is null then
      return query select 'plafond_pilote'::text, null::uuid, 'pilote'::text, v_pilote.plafond, v_gratuit,
                          null::decimal(10,2);
      return;
    end if;
  end if;

  if v_sub.id is null then
    return query select 'sans_abonnement'::text, null::uuid, null::text, null::integer, 0, null::decimal(10,2);
    return;
  end if;

  select p.* into v_plan from public.plans_keyli p where p.id = v_sub.plan_id;
  select * into v_cycle from public.cycle_abonnement_keyli(v_sub.start_date, v_sub.end_date, now());
  v_count := public.publications_periode_keyli(p_owner, v_cycle.debut, v_cycle.fin);

  if v_plan.seuil_max is null or v_count + 1 <= v_plan.seuil_max then
    return query select 'incluse'::text, v_sub.id, v_plan.code, v_plan.seuil_max, v_count, null::decimal(10,2);
  elsif v_sub.montant_depassement_negocie is not null then
    return query select 'couverte_negociee'::text, v_sub.id, v_plan.code, v_plan.seuil_max, v_count, null::decimal(10,2);
  elsif coalesce(v_sub.prix_depassement_negocie, v_plan.prix_depassement_unitaire) is not null then
    return query select 'depassement'::text, v_sub.id, v_plan.code, v_plan.seuil_max, v_count,
                        coalesce(v_sub.prix_depassement_negocie, v_plan.prix_depassement_unitaire);
  else
    return query select 'bloquee'::text, v_sub.id, v_plan.code, v_plan.seuil_max, v_count, null::decimal(10,2);
  end if;
end;
$$;

-- Reprend 20261026120000 : plafond du pilote (KY005) et mise en ligne
-- gratuite marquée
create or replace function public.controler_publication_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eval record;
begin
  -- Archivage : on clôt la mise en ligne en cours
  if tg_op = 'UPDATE' and old.archived_at is null and new.archived_at is not null then
    update public.property_publications_keyli
       set unpublished_at = new.archived_at
     where property_id = new.id and unpublished_at is null;
    new.accepte_depassement := false;
    return new;
  end if;

  -- Ni création publiée, ni republication : rien à contrôler
  if not (
       (tg_op = 'INSERT' and new.archived_at is null)
    or (tg_op = 'UPDATE' and old.archived_at is not null and new.archived_at is null)
  ) then
    new.accepte_depassement := false;
    return new;
  end if;

  -- Tentative illégitime d'un client (pour un autre compte, ou rôle qui ne
  -- publie pas) : la RLS la refusera juste après ce trigger.
  if (select auth.uid()) is not null
     and ((select auth.uid()) <> new.owner_id
          or coalesce(public.current_user_role_keyli()::text, '') not in ('owner', 'agency')) then
    new.accepte_depassement := false;
    return new;
  end if;

  -- Deux publications simultanées du même compte ne dépassent pas ensemble
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  select * into v_eval from public.evaluer_publication_keyli(new.owner_id);

  if v_eval.statut = 'registre_requis' then
    raise exception 'Une agence doit avoir son registre de commerce approuvé pour publier une annonce'
      using errcode = 'KY004';
  elsif v_eval.statut = 'plafond_pilote' then
    raise exception 'Pendant le pilote, % annonces gratuites peuvent être en ligne en même temps : archivez-en une ou choisissez un forfait pour publier davantage',
      v_eval.seuil_max
      using errcode = 'KY005';
  elsif v_eval.statut = 'sans_abonnement' then
    raise exception 'Un abonnement actif est nécessaire pour publier une annonce'
      using errcode = 'KY001';
  elsif v_eval.statut = 'bloquee' then
    raise exception 'Le forfait % est limité à % annonces : passez au forfait Grande Agence pour publier davantage',
      v_eval.plan_code, v_eval.seuil_max
      using errcode = 'KY002';
  elsif v_eval.statut = 'depassement' and not new.accepte_depassement then
    raise exception 'Cette annonce dépasse les % annonces de votre forfait : % XOF par mois, ajoutés à votre prochain paiement, tant que vous dépassez ce seuil. Confirmez le dépassement pour publier.',
      v_eval.seuil_max, v_eval.prix_depassement
      using errcode = 'KY003';
  end if;

  insert into public.property_publications_keyli
    (property_id, owner_id, subscription_id, published_at, hors_forfait, prix_depassement, gratuite_pilote)
  values (
    new.id, new.owner_id, v_eval.subscription_id, now(),
    v_eval.statut in ('depassement', 'couverte_negociee'),
    case when v_eval.statut = 'depassement' then v_eval.prix_depassement end,
    v_eval.statut = 'gratuite_pilote'
  );

  new.accepte_depassement := false;
  return new;
end;
$$;
