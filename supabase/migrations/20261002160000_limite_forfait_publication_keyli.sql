-- Keyli — Limite du forfait à la publication d'une annonce
--
-- Sources : docs/prd.md §11.2, docs/PRD_REGLES.md (MODULE PRICING,
-- MODULE ANNONCES), docs/MODULES/pricing.md, docs/MODULES/annonces.md.
--
-- Décisions du porteur de projet du 2026-10-02 :
--   - contrôle par trigger en base (impossible à contourner, identique web
--     et mobile) plutôt que par une Edge Function de publication ;
--   - sans abonnement actif, pas de publication ;
--   - au-delà du seuil, si le forfait a un prix de dépassement (Propriétaire
--     1 500 XOF, Grande Agence 1 000 XOF ou prix négocié) : accord explicite
--     de l'utilisateur pour CETTE publication, puis facturation au cycle de
--     l'abonnement (prix figé au moment de la publication) ;
--   - Agence Moyenne au-delà de 10 : publication refusée, passage au
--     forfait Grande Agence proposé ;
--   - Grande Agence avec montant mensuel négocié : couverte, sans accord à
--     l'unité.
--
-- Comptage (PRD §11.2) : chaque mise en ligne active à un moment du cycle
-- en cours compte ; une annonce archivée puis republiée compte comme une
-- nouvelle. Le cycle est la période de l'abonnement actif (mensuel).
--
-- Codes d'erreur renvoyés au client (SQLSTATE, repris par l'API) :
--   KY001 abonnement actif requis
--   KY002 palier atteint, montée de gamme nécessaire
--   KY003 dépassement facturable à accepter (accepte_depassement = true)

-- ------------------------------------------------------------
-- Journal des mises en ligne
-- ------------------------------------------------------------
create table public.property_publications_keyli (
  id                uuid primary key default gen_random_uuid(),
  -- Différée : la ligne est créée dans le trigger BEFORE INSERT de
  -- l'annonce, avant que l'annonce elle-même soit écrite.
  property_id       uuid not null references public.properties_keyli(id) deferrable initially deferred,
  owner_id          uuid not null references auth.users(id),
  subscription_id   uuid references public.subscriptions_keyli(id),
  published_at      timestamptz not null default now(),
  unpublished_at    timestamptz,            -- renseignée à l'archivage
  hors_forfait      boolean not null default false,
  prix_depassement  decimal(10,2),          -- prix unitaire figé, facturé au cycle ; NULL si inclus ou couvert
  created_at        timestamptz default now()
);

create index idx_publications_owner_periode
  on public.property_publications_keyli (owner_id, published_at, unpublished_at);
create index idx_publications_property_ouverte
  on public.property_publications_keyli (property_id) where unpublished_at is null;

-- ------------------------------------------------------------
-- Accord explicite de dépassement — valable pour une seule publication :
-- le trigger le remet toujours à false (jamais conservé à true).
-- ------------------------------------------------------------
alter table public.properties_keyli
  add column accepte_depassement boolean not null default false;

grant insert (accepte_depassement), update (accepte_depassement)
  on public.properties_keyli to authenticated;

-- ------------------------------------------------------------
-- Évaluation de la prochaine publication d'un compte — source unique pour
-- le trigger et pour l'affichage (etat_publication_keyli).
-- ------------------------------------------------------------
create or replace function public.evaluer_publication_keyli(p_owner uuid)
returns table (
  statut                text,          -- sans_abonnement | incluse | depassement | couverte_negociee | bloquee
  subscription_id       uuid,
  plan_code             text,
  seuil_max             integer,
  publications_cycle    integer,       -- mises en ligne déjà comptées sur le cycle en cours
  prix_depassement      decimal(10,2)  -- prix facturé si statut = depassement
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub    public.subscriptions_keyli%rowtype;
  v_plan   public.plans_keyli%rowtype;
  v_count  integer;
begin
  select s.* into v_sub
    from public.subscriptions_keyli s
   where s.user_id = p_owner
     and s.status = 'active'
     and now() >= s.start_date and now() < s.end_date
   limit 1;

  if not found then
    return query select 'sans_abonnement'::text, null::uuid, null::text, null::integer, 0, null::decimal(10,2);
    return;
  end if;

  select p.* into v_plan from public.plans_keyli p where p.id = v_sub.plan_id;

  select count(*)::integer into v_count
    from public.property_publications_keyli pub
   where pub.owner_id = p_owner
     and pub.published_at < v_sub.end_date
     and (pub.unpublished_at is null or pub.unpublished_at >= v_sub.start_date);

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

-- Fonction interne (paramètre libre) : jamais exposée au client, qui
-- pourrait sinon sonder le volume d'un autre compte.
revoke execute on function public.evaluer_publication_keyli(uuid) from public, anon, authenticated;

-- Version exposée : uniquement pour l'utilisateur connecté (compteur
-- « 3/4 annonces », demande d'accord avant de publier).
create or replace function public.etat_publication_keyli()
returns table (
  statut                text,
  subscription_id       uuid,
  plan_code             text,
  seuil_max             integer,
  publications_cycle    integer,
  prix_depassement      decimal(10,2)
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.evaluer_publication_keyli((select auth.uid()));
$$;

revoke execute on function public.etat_publication_keyli() from public, anon;
grant execute on function public.etat_publication_keyli() to authenticated;

-- ------------------------------------------------------------
-- Trigger de contrôle : publication, republication, archivage
-- ------------------------------------------------------------
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
  -- publie pas) : la RLS la refusera juste après ce trigger — ne pas
  -- évaluer le forfait d'autrui ni renvoyer un message de forfait trompeur.
  -- (auth.uid() est NULL pour les écritures serveur, toujours contrôlées.)
  if (select auth.uid()) is not null
     and ((select auth.uid()) <> new.owner_id
          or coalesce(public.current_user_role_keyli()::text, '') not in ('owner', 'agency')) then
    new.accepte_depassement := false;
    return new;
  end if;

  -- Deux publications simultanées du même compte ne dépassent pas ensemble
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  select * into v_eval from public.evaluer_publication_keyli(new.owner_id);

  if v_eval.statut = 'sans_abonnement' then
    raise exception 'Un abonnement actif est nécessaire pour publier une annonce'
      using errcode = 'KY001';
  elsif v_eval.statut = 'bloquee' then
    raise exception 'Le forfait % est limité à % annonces : passez au forfait Grande Agence pour publier davantage',
      v_eval.plan_code, v_eval.seuil_max
      using errcode = 'KY002';
  elsif v_eval.statut = 'depassement' and not new.accepte_depassement then
    raise exception 'Cette annonce dépasse les % annonces de votre forfait : % XOF seront facturés au cycle de votre abonnement. Confirmez le dépassement pour publier.',
      v_eval.seuil_max, v_eval.prix_depassement
      using errcode = 'KY003';
  end if;

  insert into public.property_publications_keyli
    (property_id, owner_id, subscription_id, published_at, hors_forfait, prix_depassement)
  values (
    new.id, new.owner_id, v_eval.subscription_id, now(),
    v_eval.statut in ('depassement', 'couverte_negociee'),
    case when v_eval.statut = 'depassement' then v_eval.prix_depassement end
  );

  new.accepte_depassement := false;
  return new;
end;
$$;

create trigger trg_properties_keyli_controle_publication
  before insert or update on public.properties_keyli
  for each row execute function public.controler_publication_keyli();

revoke execute on function public.controler_publication_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- RLS : chacun lit ses mises en ligne (historique, facture à venir) ;
-- écritures par trigger uniquement.
-- ------------------------------------------------------------
alter table public.property_publications_keyli enable row level security;

create policy "Propriétaire lit ses mises en ligne"
  on public.property_publications_keyli for select
  to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.property_publications_keyli from anon, authenticated;
grant select on public.property_publications_keyli to authenticated;
