-- Keyli — Paiement des abonnements par Paystack (logique en base)
--
-- Sources : docs/MODULES/pricing.md (flux de paiement), docs/DATABASE_LOGIC.md
-- (handle-paystack-payment, paystack-webhook), documentation Paystack
-- (montant XOF multiplié par 100, webhook signé HMAC SHA512).
--
-- Décisions du porteur de projet du 2026-10-23 :
--   - renouvellement du même forfait avant l'échéance : prolonge d'un mois à
--     partir de la fin de l'abonnement en cours ;
--   - changement de forfait : immédiat, nouveau cycle d'un mois, sans
--     prorata ; l'ancien abonnement est clôturé ;
--   - compte Paystack Côte d'Ivoire, encaissement en XOF.
--
-- Les Edge Functions ne font que parler à Paystack : toutes les règles
-- (qui peut payer quoi, quel montant, quel abonnement en résulte) sont ici.
-- Un abonnement n'est jamais activé avant la confirmation réelle du paiement.

-- Une référence Paystack n'identifie qu'une seule tentative
create unique index uq_payment_attempts_keyli_reference
  on public.payment_attempts_keyli (paystack_reference) where paystack_reference is not null;

-- ============================================================
-- Démarrage d'un paiement — appelé AU NOM de l'utilisateur (par
-- handle-paystack-payment avec son jeton) : vérifie qu'il a le droit de
-- souscrire ce forfait, fige le montant depuis plans_keyli et crée la
-- tentative. Renvoie ce qu'il faut pour initialiser la transaction Paystack.
-- ============================================================
create or replace function public.initier_paiement_keyli(p_plan uuid)
returns table (reference text, montant numeric, devise text, email text, plan_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_prof  public.profiles_keyli%rowtype;
  v_plan  public.plans_keyli%rowtype;
  v_ref   text;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  select * into v_prof from public.profiles_keyli where user_id = v_uid;
  if v_prof.role_keyli not in ('owner', 'agency') then
    raise exception 'Seuls les propriétaires et les agences souscrivent un forfait' using errcode = '42501';
  end if;
  if not public.compte_actif_keyli(v_uid) then
    raise exception 'Compte suspendu' using errcode = '42501';
  end if;

  select * into v_plan from public.plans_keyli where id = p_plan;
  if not found or not v_plan.actif then
    raise exception 'Ce forfait n''est pas proposé' using errcode = '23514';
  end if;
  if v_prof.role_keyli = 'agency' and v_plan.code = 'proprietaire' then
    raise exception 'Un compte agence ne peut pas souscrire au forfait Propriétaire' using errcode = '23514';
  end if;

  v_ref := 'KEYLI-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.payment_attempts_keyli (user_id, email, plan_id, amount, status, paystack_reference)
  values (v_uid, v_prof.email, v_plan.id, v_plan.prix_mensuel, 'initiated', v_ref);

  return query select v_ref, v_plan.prix_mensuel, 'XOF'::text, v_prof.email, v_plan.code;
end;
$$;

revoke execute on function public.initier_paiement_keyli(uuid) from public, anon;
grant execute on function public.initier_paiement_keyli(uuid) to authenticated;

-- ============================================================
-- Échec côté Paystack (initialisation refusée, paiement échoué) —
-- serveur uniquement
-- ============================================================
create or replace function public.echec_paiement_keyli(p_reference text, p_message text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payment_attempts_keyli
     set status = 'failed', error_message = left(p_message, 500)
   where paystack_reference = p_reference and status = 'initiated';
$$;

revoke execute on function public.echec_paiement_keyli(text, text) from public, anon, authenticated;

-- ============================================================
-- Confirmation d'un paiement réussi — serveur uniquement (webhook signé, ou
-- vérification auprès de Paystack). Idempotente : un webhook rejoué ou une
-- double confirmation ne crée ni deuxième transaction ni deuxième mois.
-- p_montant_subunit : montant renvoyé par Paystack (XOF × 100).
-- Renvoie l'abonnement actif résultant.
-- ============================================================
create or replace function public.confirmer_paiement_keyli(
  p_reference text, p_montant_subunit numeric, p_devise text, p_paystack_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tent    public.payment_attempts_keyli%rowtype;
  v_plan    public.plans_keyli%rowtype;
  v_actuel  public.subscriptions_keyli%rowtype;
  v_sub     uuid;
begin
  select * into v_tent from public.payment_attempts_keyli
   where paystack_reference = p_reference for update;
  if not found then
    raise exception 'Référence de paiement inconnue : %', p_reference using errcode = 'P0002';
  end if;

  -- Déjà confirmée : on renvoie simplement l'abonnement lié
  if v_tent.status = 'success' then
    select subscription_id into v_sub from public.transactions_keyli where paystack_ref = p_reference;
    return v_sub;
  end if;

  -- Contrôle du montant et de la devise réellement payés (l'Edge Function
  -- enregistre alors l'échec via echec_paiement_keyli)
  if upper(coalesce(p_devise, '')) <> 'XOF' or p_montant_subunit <> v_tent.amount * 100 then
    raise exception 'Montant ou devise inattendus : % % (attendu % XOF)',
      p_montant_subunit / 100, p_devise, v_tent.amount using errcode = '23514';
  end if;

  select * into v_plan from public.plans_keyli where id = v_tent.plan_id;

  -- Abonnement en cours (actif et non échu)
  select * into v_actuel from public.subscriptions_keyli
   where user_id = v_tent.user_id and status = 'active' and end_date > now()
   for update;

  if found and v_actuel.plan_id = v_tent.plan_id then
    -- Renouvellement : un mois de plus après la fin actuelle
    update public.subscriptions_keyli
       set end_date = end_date + interval '1 month', paystack_payment_id = p_paystack_id
     where id = v_actuel.id;
    v_sub := v_actuel.id;
  else
    -- Changement de forfait (ou première souscription) : nouveau cycle
    -- immédiat, sans prorata ; l'éventuel abonnement en cours est clôturé
    update public.subscriptions_keyli set status = 'canceled'
     where user_id = v_tent.user_id and status = 'active';
    insert into public.subscriptions_keyli (user_id, plan_id, amount, status, start_date, end_date, paystack_payment_id)
    values (v_tent.user_id, v_tent.plan_id, v_tent.amount, 'active', now(), now() + interval '1 month', p_paystack_id)
    returning id into v_sub;
  end if;

  insert into public.transactions_keyli (user_id, subscription_id, amount, currency, status, paystack_ref)
  values (v_tent.user_id, v_sub, v_tent.amount, 'XOF', 'completed', p_reference);

  update public.payment_attempts_keyli set status = 'success', error_message = null where id = v_tent.id;

  return v_sub;
end;
$$;

revoke execute on function public.confirmer_paiement_keyli(text, numeric, text, text) from public, anon, authenticated;
