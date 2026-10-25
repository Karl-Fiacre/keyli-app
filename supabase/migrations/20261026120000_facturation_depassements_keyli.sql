-- Keyli — Facturation des dépassements de forfait et recommandation de
-- montée de gamme
--
-- Sources : docs/prd.md §11.2 (« facturation de dépassement prélevée au même
-- cycle que l'abonnement, pas via une facture séparée par annonce » ;
-- « 2 mois consécutifs → recommandation explicite de montée de gamme »),
-- docs/PRD_REGLES.md, docs/MODULES/pricing.md.
--
-- Décisions du porteur de projet du 2026-10-26 :
--   - dépassement MENSUEL : à chaque cycle, (annonces en ligne pendant le
--     cycle − seuil) × prix unitaire (prix négocié prioritaire) ;
--   - payé AVEC le prochain paiement du forfait (un seul paiement Paystack) ;
--     un impayé reste dû et s'ajoute à tout paiement suivant ;
--   - Grande Agence avec montant mensuel négocié : dû seulement pour un cycle
--     qui a réellement dépassé 30 annonces ;
--   - après 2 cycles clôturés d'affilée en dépassement (ou au seuil pour
--     l'Agence Moyenne, qui ne peut pas dépasser) : notification in-app
--     proposant le forfait supérieur, ou la formule négociée au-delà de la
--     Grande Agence. Aucun blocage.
--
-- Corrige aussi le comptage du seuil : depuis le paiement Paystack, un
-- renouvellement prolonge le même abonnement (end_date + 1 mois). Le seuil
-- était compté sur toute la durée de l'abonnement ; il l'est désormais sur
-- le CYCLE MENSUEL en cours (mois successifs à partir de start_date).

-- ============================================================
-- Cycle mensuel contenant un instant : [debut, fin[, fin bornée par la
-- fin de l'abonnement. Les mois sont comptés depuis start_date.
-- ============================================================
create or replace function public.cycle_abonnement_keyli(
  p_start timestamptz, p_end timestamptz, p_at timestamptz
)
returns table (debut timestamptz, fin timestamptz)
language plpgsql
stable
set search_path = ''
as $$
declare
  n integer := greatest(0, (extract(year from age(p_at, p_start)) * 12
                            + extract(month from age(p_at, p_start)))::integer);
begin
  -- Fins de mois (31 janvier + 1 mois = 28 février) : on recale n pour que
  -- l'instant soit bien dans le cycle renvoyé.
  while p_start + make_interval(months => n + 1) <= p_at loop
    n := n + 1;
  end loop;
  while n > 0 and p_start + make_interval(months => n) > p_at loop
    n := n - 1;
  end loop;
  return query select p_start + make_interval(months => n),
                      least(p_start + make_interval(months => n + 1), p_end);
end;
$$;

revoke execute on function public.cycle_abonnement_keyli(timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function public.cycle_abonnement_keyli(timestamptz, timestamptz, timestamptz) to authenticated;

-- Mises en ligne d'un compte actives à un moment de [debut, fin[
-- (PRD §11.2 : archivée puis republiée = nouvelle mise en ligne)
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
     and pub.published_at < p_fin
     and (pub.unpublished_at is null or pub.unpublished_at >= p_debut);
$$;

revoke execute on function public.publications_periode_keyli(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- ============================================================
-- Évaluation de la prochaine publication : seuil compté sur le cycle
-- mensuel en cours (et non plus sur toute la durée de l'abonnement).
-- Reprend la version de 20261002190000_admin_backoffice_keyli.sql
-- (registre de commerce requis pour une agence) : seul le comptage change.
-- ============================================================
create or replace function public.evaluer_publication_keyli(p_owner uuid)
returns table (
  statut                text,          -- registre_requis | sans_abonnement | incluse | depassement | couverte_negociee | bloquee
  subscription_id       uuid,
  plan_code             text,
  seuil_max             integer,
  publications_cycle    integer,       -- mises en ligne déjà comptées sur le cycle en cours
  prix_depassement      decimal(10,2)  -- prix mensuel facturé si statut = depassement
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub    public.subscriptions_keyli%rowtype;
  v_plan   public.plans_keyli%rowtype;
  v_cycle  record;
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

-- Message de l'accord de dépassement : le coût est désormais mensuel
-- (reprend la version de 20261002190000_admin_backoffice_keyli.sql)
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
    raise exception 'Cette annonce dépasse les % annonces de votre forfait : % XOF par mois, ajoutés à votre prochain paiement, tant que vous dépassez ce seuil. Confirmez le dépassement pour publier.',
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

-- ============================================================
-- Dépassements par cycle clôturé
-- ============================================================
create table public.depassements_cycle_keyli (
  id                 uuid primary key default gen_random_uuid(),
  subscription_id    uuid not null references public.subscriptions_keyli(id),
  user_id            uuid not null references auth.users(id),
  cycle_debut        timestamptz not null,
  cycle_fin          timestamptz not null,
  nb_publications    integer not null,
  seuil              integer,                   -- NULL : forfait sans seuil
  nb_depassement     integer not null default 0,
  prix_unitaire      decimal(10,2),             -- prix appliqué (négocié prioritaire)
  montant            decimal(10,2) not null default 0,
  en_depassement     boolean not null default false,  -- compte pour la recommandation à 2 mois
  statut             text not null check (statut in ('neant', 'a_payer', 'paye')),
  tentative_id       uuid references public.payment_attempts_keyli(id),  -- paiement qui l'inclut
  transaction_id     uuid references public.transactions_keyli(id),      -- paiement confirmé
  created_at         timestamptz not null default now(),
  unique (subscription_id, cycle_debut),
  check (cycle_fin > cycle_debut),
  check ((statut = 'neant') = (montant = 0))
);

-- Montant dû d'un compte (écran Abonnement, démarrage d'un paiement)
create index idx_depassements_user_a_payer
  on public.depassements_cycle_keyli (user_id) where statut = 'a_payer';
-- Historique et détection des cycles consécutifs
create index idx_depassements_user_cycle
  on public.depassements_cycle_keyli (user_id, cycle_fin desc);

alter table public.depassements_cycle_keyli enable row level security;

create policy "Utilisateur lit ses dépassements"
  on public.depassements_cycle_keyli for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Écritures serveur uniquement (clôture planifiée, paiement)
revoke all on public.depassements_cycle_keyli from anon, authenticated;
grant select on public.depassements_cycle_keyli to authenticated;

-- Part du paiement consacrée aux dépassements (le reste = forfait)
alter table public.payment_attempts_keyli
  add column montant_depassements decimal(10,2) not null default 0;

-- ============================================================
-- Notifications : nouveaux types
-- ============================================================
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'recommandation_forfait'));

-- ============================================================
-- Clôture des cycles terminés — tâche planifiée. Rejouable : un cycle
-- n'est enregistré qu'une fois (unique subscription_id, cycle_debut).
-- Renvoie le nombre de cycles clôturés.
-- ============================================================
create or replace function public.cloturer_cycles_keyli()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c           record;
  v_plan      public.plans_keyli%rowtype;
  v_nb        integer;
  v_dep       integer;
  v_prix      decimal(10,2);
  v_montant   decimal(10,2);
  v_en_dep    boolean;
  v_id        uuid;
  v_prec      boolean;
  v_avant     boolean;
  v_suivant   public.plans_keyli%rowtype;
  v_total     integer := 0;
begin
  for c in
    select s.id as sub_id, s.user_id, s.plan_id, s.prix_depassement_negocie, s.montant_depassement_negocie,
           s.start_date + make_interval(months => g.n) as debut,
           least(s.start_date + make_interval(months => g.n + 1), s.end_date) as fin
      from public.subscriptions_keyli s
     cross join lateral generate_series(
            0, (extract(year from age(least(s.end_date, now()), s.start_date)) * 12
                + extract(month from age(least(s.end_date, now()), s.start_date)))::integer + 1) as g(n)
     where s.start_date + make_interval(months => g.n) < least(s.end_date, now())
       and least(s.start_date + make_interval(months => g.n + 1), s.end_date) <= now()
       and not exists (select 1 from public.depassements_cycle_keyli d
                        where d.subscription_id = s.id
                          and d.cycle_debut = s.start_date + make_interval(months => g.n))
     order by fin
  loop
    select * into v_plan from public.plans_keyli where id = c.plan_id;
    v_nb   := public.publications_periode_keyli(c.user_id, c.debut, c.fin);
    v_dep  := case when v_plan.seuil_max is null then 0 else greatest(0, v_nb - v_plan.seuil_max) end;
    v_prix := coalesce(c.prix_depassement_negocie, v_plan.prix_depassement_unitaire);

    v_montant := case
      when v_dep = 0 then 0
      when c.montant_depassement_negocie is not null then c.montant_depassement_negocie
      when v_prix is not null then v_dep * v_prix
      else 0
    end;
    -- Agence Moyenne : bloquée au seuil, « en dépassement » dès qu'elle l'atteint
    v_en_dep := v_dep > 0 or (v_plan.seuil_max is not null and v_prix is null
                              and c.montant_depassement_negocie is null and v_nb >= v_plan.seuil_max);

    insert into public.depassements_cycle_keyli
      (subscription_id, user_id, cycle_debut, cycle_fin, nb_publications, seuil, nb_depassement,
       prix_unitaire, montant, en_depassement, statut)
    values (c.sub_id, c.user_id, c.debut, c.fin, v_nb, v_plan.seuil_max, v_dep,
            case when v_dep > 0 and c.montant_depassement_negocie is null then v_prix end,
            v_montant, v_en_dep, case when v_montant > 0 then 'a_payer' else 'neant' end)
    returning id into v_id;
    v_total := v_total + 1;

    if v_montant > 0 then
      insert into public.notifications_keyli (user_id, type, titre, contenu)
      values (c.user_id, 'depassement_cycle', 'Dépassement de forfait ce mois-ci',
              format('Du %s au %s, %s annonce(s) au-delà des %s de votre forfait %s : %s XOF, ajoutés à votre prochain paiement.',
                     to_char(c.debut at time zone 'Africa/Abidjan', 'DD/MM'),
                     to_char(c.fin at time zone 'Africa/Abidjan', 'DD/MM/YYYY'),
                     v_dep, v_plan.seuil_max, v_plan.nom,
                     replace(to_char(v_montant, 'FM999G999G999'), ',', ' ')));
    end if;

    -- Recommandation : 2e cycle d'affilée en dépassement (une fois par série),
    -- sauf formule déjà négociée avec le super_admin
    if v_en_dep and c.prix_depassement_negocie is null and c.montant_depassement_negocie is null then
      select d.en_depassement into v_prec
        from public.depassements_cycle_keyli d
       where d.user_id = c.user_id and d.id <> v_id and d.cycle_fin <= c.debut
       order by d.cycle_fin desc limit 1;
      select d.en_depassement into v_avant
        from public.depassements_cycle_keyli d
       where d.user_id = c.user_id and d.id <> v_id and d.cycle_fin <= c.debut
       order by d.cycle_fin desc offset 1 limit 1;

      if coalesce(v_prec, false) and not coalesce(v_avant, false) then
        select * into v_suivant from public.plans_keyli
         where actif and seuil_min > v_plan.seuil_min
         order by seuil_min limit 1;
        insert into public.notifications_keyli (user_id, type, titre, contenu)
        values (c.user_id, 'recommandation_forfait', 'Un forfait plus adapté à votre volume',
                case when v_suivant.id is not null then
                  format('Vous dépassez le seuil de votre forfait %s depuis 2 mois. Le forfait %s (%s annonces et plus, %s XOF/mois) vous reviendrait moins cher.',
                         v_plan.nom, v_suivant.nom, v_suivant.seuil_min,
                         replace(to_char(v_suivant.prix_mensuel, 'FM999G999G999'), ',', ' '))
                else
                  format('Vous dépassez les %s annonces du forfait %s depuis 2 mois. Contactez l''équipe Keyli pour une formule personnalisée adaptée à votre volume.',
                         v_plan.seuil_max, v_plan.nom)
                end);
      end if;
    end if;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.cloturer_cycles_keyli() from public, anon, authenticated;

-- Toutes les heures, après la tâche d'échéances (hh:05)
select cron.schedule('keyli-cloture-cycles', '10 * * * *', 'select public.cloturer_cycles_keyli()');

-- ============================================================
-- Paiement : le forfait + les dépassements impayés, en un seul paiement
-- ============================================================
-- Signature de retour modifiée (montant détaillé) : recréation
drop function public.initier_paiement_keyli(uuid);

create function public.initier_paiement_keyli(p_plan uuid)
returns table (reference text, montant numeric, devise text, email text, plan_code text,
               montant_forfait numeric, montant_depassements numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_prof  public.profiles_keyli%rowtype;
  v_plan  public.plans_keyli%rowtype;
  v_ref   text;
  v_tent  uuid;
  v_dep   decimal(10,2);
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
  values (v_uid, v_prof.email, v_plan.id, v_plan.prix_mensuel, 'initiated', v_ref)
  returning id into v_tent;

  -- Dépassements impayés rattachés à ce paiement, sauf ceux déjà inclus
  -- dans un autre paiement en cours de moins de 2 heures (page Paystack
  -- encore ouverte) : ils ne sont jamais facturés deux fois.
  with inclus as (
    update public.depassements_cycle_keyli d
       set tentative_id = v_tent
     where d.user_id = v_uid and d.statut = 'a_payer'
       and (d.tentative_id is null or not exists (
             select 1 from public.payment_attempts_keyli t
              where t.id = d.tentative_id and t.status = 'initiated'
                and t.created_at > now() - interval '2 hours'))
    returning d.montant as montant_cycle
  )
  select coalesce(sum(i.montant_cycle), 0) into v_dep from inclus i;

  update public.payment_attempts_keyli
     set amount = v_plan.prix_mensuel + v_dep, montant_depassements = v_dep
   where id = v_tent;

  return query select v_ref, v_plan.prix_mensuel + v_dep, 'XOF'::text, v_prof.email, v_plan.code,
                      v_plan.prix_mensuel, v_dep;
end;
$$;

revoke execute on function public.initier_paiement_keyli(uuid) from public, anon;
grant execute on function public.initier_paiement_keyli(uuid) to authenticated;

-- Confirmation : dépassements inclus marqués payés ; l'abonnement garde le
-- prix du forfait seul ; un abonnement remplacé est clôturé à la date du
-- changement (son dernier cycle, partiel, est alors facturable).
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
  v_actuel  public.subscriptions_keyli%rowtype;
  v_sub     uuid;
  v_tx      uuid;
  v_forfait decimal(10,2);
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

  v_forfait := v_tent.amount - v_tent.montant_depassements;

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
    -- immédiat, sans prorata. L'abonnement en cours est clôturé maintenant ;
    -- un abonnement échu pas encore traité par la tâche passe « expired ».
    update public.subscriptions_keyli
       set status   = case when end_date > now() then 'canceled' else 'expired' end::public.subscription_status_keyli,
           end_date = case when end_date > now() then greatest(now(), start_date + interval '1 second') else end_date end
     where user_id = v_tent.user_id and status = 'active';
    insert into public.subscriptions_keyli (user_id, plan_id, amount, status, start_date, end_date, paystack_payment_id)
    values (v_tent.user_id, v_tent.plan_id, v_forfait, 'active', now(), now() + interval '1 month', p_paystack_id)
    returning id into v_sub;
  end if;

  insert into public.transactions_keyli (user_id, subscription_id, amount, currency, status, paystack_ref)
  values (v_tent.user_id, v_sub, v_tent.amount, 'XOF', 'completed', p_reference)
  returning id into v_tx;

  update public.depassements_cycle_keyli
     set statut = 'paye', transaction_id = v_tx
   where tentative_id = v_tent.id and statut = 'a_payer';

  update public.payment_attempts_keyli set status = 'success', error_message = null where id = v_tent.id;

  return v_sub;
end;
$$;

revoke execute on function public.confirmer_paiement_keyli(text, numeric, text, text) from public, anon, authenticated;
