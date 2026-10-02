-- Keyli — Module admin, back-office : retours, pilote, onboarding,
-- marketing, suivi d'inscription ; registre obligatoire pour publier
--
-- Sources : docs/reference/schema_cible_reference.sql (section ADMIN,
-- PILOTE, MARKETING), docs/MODULES/admin.md, docs/MODULES/verification.md,
-- docs/PRD_REGLES.md (MODULE VÉRIFICATION).
--
-- Ces tables ne portent pas d'action sensible : l'admin y écrit
-- directement (réponse à un retour, statut d'une inscription pilote,
-- étapes d'onboarding, modèles marketing), sans passer par une fonction
-- d'audit.
--
-- Décision du porteur de projet du 2026-10-02 : une agence doit avoir son
-- registre de commerce approuvé pour publier (code KY004), activé dès ce
-- module puisque la revue des documents existe désormais.

-- ============================================================
-- Enums du suivi pilote
-- ============================================================
create type public.inscription_status_keyli as enum ('en_attente', 'contacte', 'converti', 'rejete');
create type public.priority_level_keyli as enum ('haute', 'moyenne', 'basse');

-- ============================================================
-- Retours utilisateurs (colonnes du schéma de référence)
-- ============================================================
create table public.feedback_keyli (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  type            text check (type in ('recommendation', 'complaint', 'bug', 'suggestion')),
  subject         text not null,
  message         text not null,
  status          text default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_response  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_feedback_status_date on public.feedback_keyli (status, created_at);
create trigger trg_feedback_keyli_updated_at
  before update on public.feedback_keyli
  for each row execute function public.set_updated_at_keyli();

alter table public.feedback_keyli enable row level security;
create policy "Utilisateur envoie un retour" on public.feedback_keyli
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Utilisateur lit ses retours" on public.feedback_keyli
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Admin lit tous les retours" on public.feedback_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin répond aux retours" on public.feedback_keyli
  for update to authenticated
  using ((select public.est_admin_keyli())) with check ((select public.est_admin_keyli()));

revoke all on public.feedback_keyli from anon, authenticated;
grant select on public.feedback_keyli to authenticated;
grant insert (user_id, type, subject, message) on public.feedback_keyli to authenticated;
grant update (status, admin_response) on public.feedback_keyli to authenticated;

-- ============================================================
-- Inscriptions au pilote — formulaire public de la page pilote
-- ============================================================
create table public.inscription_pilot_keyli (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  first_name      text,
  last_name       text,
  phone           text,
  city            text default 'Abidjan',
  property_type   public.property_type_keyli,
  budget          numeric,
  message         text,
  status          public.inscription_status_keyli default 'en_attente',
  priority_level  public.priority_level_keyli default 'moyenne',
  source          text default 'pilot_landing',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
-- File de contact du PilotDashboard, triée par priorité
create index idx_inscription_pilot_file on public.inscription_pilot_keyli (status, priority_level, created_at);
create trigger trg_inscription_pilot_keyli_updated_at
  before update on public.inscription_pilot_keyli
  for each row execute function public.set_updated_at_keyli();

alter table public.inscription_pilot_keyli enable row level security;
-- Visiteurs compris : c'est le formulaire de la page pilote. Statut et
-- priorité restent ceux par défaut ; aucune lecture publique.
create policy "Inscription pilote ouverte" on public.inscription_pilot_keyli
  for insert to anon, authenticated with check (true);
create policy "Admin lit les inscriptions pilote" on public.inscription_pilot_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin suit les inscriptions pilote" on public.inscription_pilot_keyli
  for update to authenticated
  using ((select public.est_admin_keyli())) with check ((select public.est_admin_keyli()));

revoke all on public.inscription_pilot_keyli from anon, authenticated;
grant insert (email, first_name, last_name, phone, city, property_type, budget, message)
  on public.inscription_pilot_keyli to anon, authenticated;
grant select on public.inscription_pilot_keyli to authenticated;
grant update (status, priority_level) on public.inscription_pilot_keyli to authenticated;

-- ============================================================
-- Onboarding — étapes posées par l'admin, cochées par l'utilisateur
-- ============================================================
create table public.onboarding_checklists_keyli (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) not null,
  step          varchar(100) not null,
  completed     boolean default false,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index idx_onboarding_user on public.onboarding_checklists_keyli (user_id);
create trigger trg_onboarding_keyli_updated_at
  before update on public.onboarding_checklists_keyli
  for each row execute function public.set_updated_at_keyli();

alter table public.onboarding_checklists_keyli enable row level security;
create policy "Utilisateur lit son onboarding" on public.onboarding_checklists_keyli
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Utilisateur coche ses étapes" on public.onboarding_checklists_keyli
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Admin gère l'onboarding" on public.onboarding_checklists_keyli
  for all to authenticated
  using ((select public.est_admin_keyli())) with check ((select public.est_admin_keyli()));

revoke all on public.onboarding_checklists_keyli from anon, authenticated;
grant select, delete on public.onboarding_checklists_keyli to authenticated;
grant insert (user_id, step, completed, completed_at, notes) on public.onboarding_checklists_keyli to authenticated;
grant update (step, completed, completed_at, notes) on public.onboarding_checklists_keyli to authenticated;

-- ============================================================
-- Modèles marketing — réservés à l'admin
-- ============================================================
create table public.marketing_templates_keyli (
  id               uuid primary key default gen_random_uuid(),
  name             varchar(255) not null,
  type             varchar(50) not null,   -- 'whatsapp' | 'facebook' | 'instagram'
  title            text,
  content          text not null,
  image_url        text,
  target_audience  varchar(100),
  created_by       uuid references auth.users(id) default auth.uid(),  -- auteur, renseigné automatiquement
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create trigger trg_marketing_templates_keyli_updated_at
  before update on public.marketing_templates_keyli
  for each row execute function public.set_updated_at_keyli();

alter table public.marketing_templates_keyli enable row level security;
create policy "Admin gère les modèles marketing" on public.marketing_templates_keyli
  for all to authenticated
  using ((select public.est_admin_keyli()))
  with check ((select public.est_admin_keyli()));

revoke all on public.marketing_templates_keyli from anon, authenticated;
grant select, delete on public.marketing_templates_keyli to authenticated;
grant insert (name, type, title, content, image_url, target_audience)
  on public.marketing_templates_keyli to authenticated;
grant update (name, type, title, content, image_url, target_audience)
  on public.marketing_templates_keyli to authenticated;

-- ============================================================
-- Suivi de l'entonnoir d'inscription (avant création du compte)
-- ============================================================
create table public.signup_attempts_keyli (
  id             uuid primary key default gen_random_uuid(),
  email          text,
  first_name     text,
  last_name      text,
  phone          text,
  role           text,
  step_reached   text default 'form_started',
  error_message  text,
  user_agent     text,
  completed      boolean default false,
  created_at     timestamptz default now(),
  completed_at   timestamptz
);
create index idx_signup_attempts_date on public.signup_attempts_keyli (created_at desc);

alter table public.signup_attempts_keyli enable row level security;
-- Écriture par le formulaire d'inscription (visiteur pas encore connecté),
-- en ajout seulement : un visiteur ne peut ni relire ni modifier une
-- tentative. completed / completed_at restent côté serveur.
create policy "Suivi d'inscription ouvert" on public.signup_attempts_keyli
  for insert to anon, authenticated with check (true);
create policy "Admin lit le suivi d'inscription" on public.signup_attempts_keyli
  for select to authenticated using ((select public.est_admin_keyli()));

revoke all on public.signup_attempts_keyli from anon, authenticated;
grant insert (email, first_name, last_name, phone, role, step_reached, error_message, user_agent)
  on public.signup_attempts_keyli to anon, authenticated;
grant select on public.signup_attempts_keyli to authenticated;

-- ============================================================
-- Registre obligatoire pour qu'une agence publie (KY004)
-- Redéfinition des fonctions de 20261002160000 : seul ajout, le statut
-- « registre_requis » évalué avant le forfait.
-- ============================================================
create or replace function public.evaluer_publication_keyli(p_owner uuid)
returns table (
  statut                text,          -- registre_requis | sans_abonnement | incluse | depassement | couverte_negociee | bloquee
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

  if v_eval.statut = 'registre_requis' then
    raise exception 'Une agence doit avoir son registre de commerce approuvé pour publier une annonce'
      using errcode = 'KY004';
  elsif v_eval.statut = 'sans_abonnement' then
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
