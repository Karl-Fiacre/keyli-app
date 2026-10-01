-- Keyli — Module pricing : abonnements, transactions, tentatives de paiement
--
-- Sources : docs/reference/schema_cible_reference.sql (section ABONNEMENTS
-- & PAIEMENTS), docs/MODULES/pricing.md, docs/PRD_REGLES.md (MODULE
-- PRICING), docs/DATABASE_LOGIC.md.
--
-- Toutes les écritures viennent du serveur (Edge Functions
-- handle-paystack-payment / paystack-webhook, ou admin) : le client ne fait
-- que LIRE ses propres données. Un abonnement n'est jamais activé avant la
-- confirmation réelle du paiement par le webhook Paystack.
--
-- Décisions du porteur de projet du 2026-10-02 :
--   - formule personnalisée Grande Agence (au-delà de 30 annonces) : prix
--     par annonce négocié et/ou montant mensuel négocié, sur l'abonnement ;
--   - payment_attempts_keyli.plan_type (TEXT hérité de l'ancien enum)
--     remplacé par plan_id → plans_keyli, statut en valeurs contrôlées ;
--   - un seul abonnement actif par compte.

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type public.subscription_status_keyli as enum ('active', 'expired', 'canceled');
create type public.transaction_status_keyli as enum ('pending', 'completed', 'failed');

-- ------------------------------------------------------------
-- Abonnements — colonnes du schéma de référence + formule négociée
-- ------------------------------------------------------------
create table public.subscriptions_keyli (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid references auth.users(id) not null,
  plan_id                      uuid references public.plans_keyli(id) not null,
  amount                       decimal(10,2) not null,
  status                       public.subscription_status_keyli default 'active',
  start_date                   timestamptz not null,
  end_date                     timestamptz not null,
  paystack_payment_id          text,
  -- Formule personnalisée (Grande Agence uniquement, négociée avec le
  -- super_admin) : remplace le dépassement standard de plans_keyli.
  prix_depassement_negocie     decimal(10,2),   -- prix par annonce au-delà de 30
  montant_depassement_negocie  decimal(10,2),   -- forfait mensuel couvrant les annonces au-delà de 30
  conditions_negociees         text,
  created_at                   timestamptz default now(),
  updated_at                   timestamptz default now(),

  constraint subscriptions_keyli_periode_valide check (end_date > start_date)
);

-- Un seul abonnement actif par compte : le forfait servant au calcul de
-- dépassement est toujours sans ambiguïté.
create unique index uq_subscriptions_keyli_un_actif
  on public.subscriptions_keyli (user_id) where status = 'active';

-- Expiration (cron check-expired-subscriptions)
create index idx_subscriptions_status_fin on public.subscriptions_keyli (status, end_date);

create trigger trg_subscriptions_keyli_updated_at
  before update on public.subscriptions_keyli
  for each row execute function public.set_updated_at_keyli();

-- ------------------------------------------------------------
-- Garde-fous métier, appliqués à TOUTE écriture (serveur compris)
-- ------------------------------------------------------------
create or replace function public.validate_subscription_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role  public.user_role_keyli;
  v_plan  public.plans_keyli%rowtype;
begin
  select role_keyli into v_role from public.profiles_keyli where user_id = new.user_id;
  select * into v_plan from public.plans_keyli where id = new.plan_id;

  -- Seuls les comptes qui publient s'abonnent (pas de paywall chercheur)
  if v_role is null or v_role not in ('owner', 'agency') then
    raise exception 'Abonnement réservé aux propriétaires et agences (rôle : %)', v_role
      using errcode = '23514';
  end if;

  -- Un compte agence ne prend jamais le forfait Propriétaire (PRD_REGLES.md)
  if v_role = 'agency' and v_plan.code = 'proprietaire' then
    raise exception 'Un compte agence ne peut pas souscrire au forfait Propriétaire'
      using errcode = '23514';
  end if;

  -- On ne souscrit qu'à un forfait actif ; un forfait désactivé plus tard
  -- n'invalide pas les abonnements existants (DATABASE_LOGIC.md)
  if (tg_op = 'INSERT' or new.plan_id is distinct from old.plan_id) and not v_plan.actif then
    raise exception 'Le forfait % n''est plus proposé', v_plan.code
      using errcode = '23514';
  end if;

  -- Formule négociée : Grande Agence uniquement
  if v_plan.code <> 'grande_agence'
     and (new.prix_depassement_negocie is not null
          or new.montant_depassement_negocie is not null
          or new.conditions_negociees is not null) then
    raise exception 'Une formule personnalisée n''existe que pour le forfait Grande Agence'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger trg_subscriptions_keyli_validation
  before insert or update on public.subscriptions_keyli
  for each row execute function public.validate_subscription_keyli();

revoke execute on function public.validate_subscription_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Transactions (colonnes identiques au schéma de référence)
-- ------------------------------------------------------------
create table public.transactions_keyli (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) not null,
  subscription_id  uuid references public.subscriptions_keyli(id),
  amount           decimal(10,2) not null,
  currency         text default 'XOF',
  status           public.transaction_status_keyli default 'pending',
  paystack_ref     text,
  created_at       timestamptz default now()
);

-- Une référence Paystack n'est enregistrée qu'une fois : le webhook peut
-- être rejoué par Paystack, il ne doit jamais créer de doublon.
create unique index uq_transactions_keyli_paystack_ref
  on public.transactions_keyli (paystack_ref) where paystack_ref is not null;
create index idx_transactions_user on public.transactions_keyli (user_id, created_at desc);

-- ------------------------------------------------------------
-- Tentatives de paiement — plan_type remplacé par plan_id, statut contrôlé
-- ------------------------------------------------------------
create table public.payment_attempts_keyli (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,
  email               text,
  plan_id             uuid references public.plans_keyli(id),
  amount              numeric,
  status              text default 'initiated'
                        check (status in ('initiated', 'success', 'failed', 'abandoned')),
  error_message       text,
  paystack_reference  text,
  created_at          timestamptz default now()
);

create index idx_payment_attempts_user on public.payment_attempts_keyli (user_id, created_at desc);

-- ------------------------------------------------------------
-- RLS : lecture de ses propres données, aucune écriture côté client
-- ------------------------------------------------------------
alter table public.subscriptions_keyli enable row level security;
alter table public.transactions_keyli enable row level security;
alter table public.payment_attempts_keyli enable row level security;

create policy "Utilisateur lit ses abonnements"
  on public.subscriptions_keyli for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Utilisateur lit ses transactions"
  on public.transactions_keyli for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Utilisateur lit ses tentatives de paiement"
  on public.payment_attempts_keyli for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.subscriptions_keyli from anon, authenticated;
revoke all on public.transactions_keyli from anon, authenticated;
revoke all on public.payment_attempts_keyli from anon, authenticated;
grant select on public.subscriptions_keyli to authenticated;
grant select on public.transactions_keyli to authenticated;
grant select on public.payment_attempts_keyli to authenticated;

-- ------------------------------------------------------------
-- plans_keyli : un abonné garde l'accès à son forfait même désactivé
-- depuis (docs/DATABASE_LOGIC.md) — complète la lecture publique des
-- forfaits actifs.
-- ------------------------------------------------------------
create policy "Abonné lit le forfait de ses abonnements"
  on public.plans_keyli for select
  to authenticated
  using (exists (
    select 1 from public.subscriptions_keyli s
     where s.plan_id = plans_keyli.id and s.user_id = (select auth.uid())
  ));
