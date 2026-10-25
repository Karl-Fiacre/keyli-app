-- Keyli — Expiration des abonnements
--
-- Sources : docs/prd.md (« Notification avant expiration, blocage à
-- échéance »), docs/MODULES/pricing.md (section Expiration).
--
-- Décisions du porteur de projet du 2026-10-25 :
--   - à l'échéance d'un abonnement non renouvelé, les annonces publiées sont
--     MASQUÉES au public (pas archivées) et réapparaissent au renouvellement ;
--   - aucun délai de grâce : blocage dès la date de fin ;
--   - rappels à J-7 et J-1, puis notification le jour de l'expiration ;
--   - tâche SQL planifiée par pg_cron (et non deux Edge Functions),
--     notifications dans l'application ; l'email viendra par Edge Function
--     une fois le fournisseur choisi.

-- ============================================================
-- « Ce compte a-t-il un abonnement en cours ? » — dépend de l'heure, pas
-- d'une tâche planifiée : le masquage est exact à la seconde près, même si
-- la tâche horaire n'est pas encore passée.
-- ============================================================
create or replace function public.abonnement_en_cours_keyli(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions_keyli s
     where s.user_id = p_user
       and s.status = 'active'
       and now() >= s.start_date and now() < s.end_date
  );
$$;

revoke execute on function public.abonnement_en_cours_keyli(uuid) from public;
grant execute on function public.abonnement_en_cours_keyli(uuid) to anon, authenticated;

-- Annonces visibles du public : non archivées, compte actif ET abonnement
-- en cours. Le propriétaire continue de voir toutes ses annonces (policy
-- « Propriétaire lit toutes ses annonces ») ; les médias suivent
-- automatiquement (leur policy passe par properties_keyli).
drop policy "Lecture publique des annonces publiées" on public.properties_keyli;
create policy "Lecture publique des annonces publiées"
  on public.properties_keyli for select
  to anon, authenticated
  using (archived_at is null
         and public.compte_actif_keyli(owner_id)
         and public.abonnement_en_cours_keyli(owner_id));

-- ============================================================
-- Suivi des rappels : on retient l'échéance pour laquelle chaque rappel a
-- été envoyé. Un renouvellement déplace end_date, ce qui réarme les rappels
-- sans remise à zéro explicite.
-- ============================================================
alter table public.subscriptions_keyli
  add column rappel_j7_pour timestamptz,
  add column rappel_j1_pour timestamptz;

-- Recherche horaire des abonnements actifs proches de l'échéance
create index idx_subscriptions_keyli_actifs_echeance
  on public.subscriptions_keyli (end_date) where status = 'active';

-- ============================================================
-- Garde-fous : les contrôles de rôle et de forfait ne s'appliquent qu'à la
-- souscription (création, changement de compte ou de forfait). Un simple
-- changement d'état (expiration, rappel) ne doit pas échouer parce que le
-- rôle du compte a changé depuis.
-- ============================================================
create or replace function public.validate_subscription_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role        public.user_role_keyli;
  v_plan        public.plans_keyli%rowtype;
  v_souscription boolean := tg_op = 'INSERT'
                            or new.plan_id is distinct from old.plan_id
                            or new.user_id is distinct from old.user_id;
begin
  select * into v_plan from public.plans_keyli where id = new.plan_id;

  if v_souscription then
    select role_keyli into v_role from public.profiles_keyli where user_id = new.user_id;

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
    if not v_plan.actif then
      raise exception 'Le forfait % n''est plus proposé', v_plan.code
        using errcode = '23514';
    end if;
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

-- ============================================================
-- Notifications : nouveaux types
-- ============================================================
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire'));

-- ============================================================
-- Tâche horaire : rappels J-7 / J-1 puis expiration.
-- Rejouable sans effet de bord (chaque rappel n'est envoyé qu'une fois par
-- échéance, une expiration qu'une fois). Renvoie le nombre d'actions.
-- ============================================================
create or replace function public.traiter_echeances_abonnements_keyli()
returns table (rappels_j7 integer, rappels_j1 integer, expirations integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_j7  integer;
  v_j1  integer;
  v_exp integer;
begin
  -- 1. Expiration : échéance passée, abonnement encore « active »
  with expires as (
    update public.subscriptions_keyli s
       set status = 'expired'
     where s.status = 'active' and s.end_date <= now()
    returning s.user_id, s.end_date, s.plan_id
  ), notifs as (
    insert into public.notifications_keyli (user_id, type, titre, contenu)
    select e.user_id, 'abonnement_expire',
           'Votre abonnement a expiré',
           format('Votre forfait %s a pris fin le %s. Vos annonces ne sont plus visibles du public : '
                  'renouvelez votre abonnement pour les remettre en ligne.',
                  p.nom, to_char(e.end_date at time zone 'Africa/Abidjan', 'DD/MM/YYYY'))
      from expires e join public.plans_keyli p on p.id = e.plan_id
    returning 1
  )
  select count(*)::integer into v_exp from notifs;

  -- 2. Rappel J-1 (moins de 24 h avant l'échéance). Marque aussi J-7 :
  --    un abonnement découvert à moins d'un jour ne reçoit qu'un rappel.
  with rappels as (
    update public.subscriptions_keyli s
       set rappel_j1_pour = s.end_date, rappel_j7_pour = s.end_date
     where s.status = 'active'
       and s.end_date > now() and s.end_date <= now() + interval '1 day'
       and s.rappel_j1_pour is distinct from s.end_date
    returning s.user_id, s.end_date, s.plan_id
  ), notifs as (
    insert into public.notifications_keyli (user_id, type, titre, contenu)
    select r.user_id, 'abonnement_rappel',
           'Votre abonnement expire demain',
           format('Votre forfait %s prend fin le %s. Sans renouvellement, vos annonces seront masquées '
                  'au public dès cette date.',
                  p.nom, to_char(r.end_date at time zone 'Africa/Abidjan', 'DD/MM/YYYY à HH24:MI'))
      from rappels r join public.plans_keyli p on p.id = r.plan_id
    returning 1
  )
  select count(*)::integer into v_j1 from notifs;

  -- 3. Rappel J-7 (entre 1 et 7 jours avant l'échéance)
  with rappels as (
    update public.subscriptions_keyli s
       set rappel_j7_pour = s.end_date
     where s.status = 'active'
       and s.end_date > now() + interval '1 day' and s.end_date <= now() + interval '7 days'
       and s.rappel_j7_pour is distinct from s.end_date
    returning s.user_id, s.end_date, s.plan_id
  ), notifs as (
    insert into public.notifications_keyli (user_id, type, titre, contenu)
    select r.user_id, 'abonnement_rappel',
           'Votre abonnement expire dans 7 jours',
           format('Votre forfait %s prend fin le %s. Renouvelez-le pour garder vos annonces en ligne.',
                  p.nom, to_char(r.end_date at time zone 'Africa/Abidjan', 'DD/MM/YYYY'))
      from rappels r join public.plans_keyli p on p.id = r.plan_id
    returning 1
  )
  select count(*)::integer into v_j7 from notifs;

  return query select v_j7, v_j1, v_exp;
end;
$$;

-- Tâche serveur uniquement
revoke execute on function public.traiter_echeances_abonnements_keyli() from public, anon, authenticated;

-- Toutes les heures : un rappel J-1 part au plus tard 1 h après le seuil
select cron.schedule('keyli-echeances-abonnements', '5 * * * *',
                     'select public.traiter_echeances_abonnements_keyli()');
