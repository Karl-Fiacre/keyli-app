-- ============================================================
-- Sprint 9 — fiabilisation des paiements (2026-11-08)
-- Décision du porteur : rattrapage automatique, paiements refusés, onglet
-- admin « Paiements », contrôle des échéances (docs/MODULES/paiements.md).
-- Objectif du calendrier : zéro abonnement expiré non détecté.
--
-- 1. Rattrapage : toutes les 15 minutes, les paiements restés « initiated »
--    (webhook manqué, visiteur parti avant le retour sur Keyli) sont
--    vérifiés auprès de Paystack par l'Edge Function rapprocher-paiements.
--    Réussi : le forfait est activé (même confirmation idempotente que le
--    webhook). Sans issue après 24 h : « abandoned ».
-- 2. Refus : motif de la banque ou de l'opérateur conservé
--    (motif_refus), notification et email « paiement_echoue ».
-- 3. Back-office : synthèse, liste et contrôles des paiements.
-- 4. Surveillance horaire : échéances non traitées (corrigées aussitôt),
--    rappels manqués, paiements jamais vérifiés, incohérences, tâches
--    planifiées en échec ; chaque anomalie est inscrite au journal des
--    erreurs (onglet admin « Erreurs »).
-- ============================================================

-- ---------- 1. Suivi des vérifications et motif de refus ----------
alter table public.payment_attempts_keyli
  add column motif_refus            text check (char_length(motif_refus) <= 300),
  add column verifications          integer not null default 0,
  add column derniere_verification  timestamptz;

-- Paiements à rattraper (peu nombreux, lus toutes les 15 minutes)
create index idx_payment_attempts_a_verifier
  on public.payment_attempts_keyli (created_at) where status in ('initiated', 'failed');

-- ---------- Nouveau type de notification ----------
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'recommandation_forfait',
                  'visite_planifiee', 'visite_modifiee', 'visite_annulee', 'visite_effectuee',
                  'document_approuve', 'document_rejete',
                  'reservation_demandee', 'reservation_acceptee', 'reservation_refusee', 'reservation_annulee',
                  'retour_repondu', 'relance_demarrage', 'paiement_echoue'));

-- Le refus d'un paiement part aussi par email (catégorie abonnement)
create or replace function public.notification_par_email_keyli(p_type text)
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
    'alerte_recherche',
    'retour_repondu', 'relance_demarrage'
  )
$$;

-- ---------- 2. Échec d'un paiement ----------
-- Remplace la version à deux paramètres (mêmes appels nommés acceptés).
-- p_motif_refus : réponse de la banque ou de l'opérateur (« gateway
-- response » Paystack), seulement pour un vrai refus de paiement.
-- p_notifier : prévient l'annonceur (refus, montant incohérent) ; jamais
-- pour une panne de configuration, qui ne le concerne pas.
-- Un seul passage « initiated » → « failed » : une seule notification.
drop function public.echec_paiement_keyli(text, text);

create function public.echec_paiement_keyli(
  p_reference text, p_message text, p_motif_refus text default null, p_notifier boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tent public.payment_attempts_keyli%rowtype;
begin
  update public.payment_attempts_keyli
     set status = 'failed',
         error_message = left(p_message, 500),
         motif_refus = left(nullif(btrim(p_motif_refus), ''), 300)
   where paystack_reference = p_reference and status = 'initiated'
  returning * into v_tent;

  if found and p_notifier and v_tent.user_id is not null then
    insert into public.notifications_keyli (user_id, type, titre, contenu)
    select v_tent.user_id, 'paiement_echoue', 'Votre paiement n''a pas abouti',
           format('Le paiement de %s XOF pour le forfait %s n''a pas abouti. Votre abonnement n''a pas été '
                  'modifié : vous pouvez réessayer depuis la page Abonnement, avec un autre moyen de paiement '
                  'si besoin.',
                  replace(to_char(v_tent.amount, 'FM999G999G999'), ',', ' '), coalesce(p.nom, 'choisi'))
      from (select 1) x
      left join public.plans_keyli p on p.id = v_tent.plan_id;
  end if;
end;
$$;

revoke execute on function public.echec_paiement_keyli(text, text, text, boolean) from public, anon, authenticated;

-- Paiement sans issue : visiteur parti, page Paystack fermée.
-- p_immediat : le visiteur est revenu sur Keyli et Paystack indique
-- « abandoned » ; sinon seulement après 24 h (le paiement peut encore
-- aboutir sur la page Paystack restée ouverte).
create or replace function public.abandonner_paiement_keyli(p_reference text, p_immediat boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payment_attempts_keyli
     set status = 'abandoned'
   where paystack_reference = p_reference and status = 'initiated'
     and (p_immediat or created_at < now() - interval '24 hours');
  return found;
end;
$$;

revoke execute on function public.abandonner_paiement_keyli(text, boolean) from public, anon, authenticated;

-- ---------- 3. Rattrapage : paiements à vérifier ----------
-- Prend un lot et le marque (une vérification par paiement et par heure au
-- plus) : deux appels simultanés ne vérifient pas deux fois le même.
-- Candidats : « initiated » depuis plus de 15 minutes, et « failed » par
-- refus de moins de 24 h (le client peut réessayer sur la même page
-- Paystack et finalement payer). Avec p_reference (vérification demandée
-- par un admin) : ce paiement-là, sans délai.
create or replace function public.prendre_paiements_a_verifier_keyli(
  p_limite integer default 20, p_reference text default null
)
returns table (reference text, statut text, cree_le timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with lot as (
    select t.id
      from public.payment_attempts_keyli t
     where t.paystack_reference is not null
       and (
         (p_reference is not null and t.paystack_reference = p_reference and t.status in ('initiated', 'failed'))
         or (p_reference is null
             and (t.derniere_verification is null or t.derniere_verification < now() - interval '1 hour')
             and ((t.status = 'initiated' and t.created_at < now() - interval '15 minutes')
                  or (t.status = 'failed' and t.motif_refus is not null
                      and t.created_at > now() - interval '24 hours')))
       )
     order by t.created_at
     limit least(greatest(coalesce(p_limite, 20), 1), 50)
     for update skip locked
  )
  update public.payment_attempts_keyli t
     set verifications = t.verifications + 1, derniere_verification = now()
    from lot
   where t.id = lot.id
  returning t.paystack_reference, t.status, t.created_at;
end;
$$;

revoke execute on function public.prendre_paiements_a_verifier_keyli(integer, text) from public, anon, authenticated;

-- Tâche planifiée : réveille l'Edge Function seulement s'il y a des
-- paiements à vérifier. Adresse et clé publique du projet lues dans le
-- coffre (Vault), déjà posées pour les emails (docs/MODULES/emails.md) :
-- aucune nouvelle valeur à saisir. Un appel extérieur de la fonction ne
-- peut que vérifier un paiement déjà en attente.
create or replace function public.declencher_rapprochement_paiements_keyli()
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
    select 1 from public.payment_attempts_keyli t
     where t.paystack_reference is not null
       and (t.derniere_verification is null or t.derniere_verification < now() - interval '1 hour')
       and ((t.status = 'initiated' and t.created_at < now() - interval '15 minutes')
            or (t.status = 'failed' and t.motif_refus is not null and t.created_at > now() - interval '24 hours'))
  ) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'keyli_url_projet';
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'keyli_cle_anon';
  if v_url is null or v_cle is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/rapprocher-paiements',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_cle),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function public.declencher_rapprochement_paiements_keyli() from public, anon, authenticated;

select cron.schedule('keyli-rapprochement-paiements', '*/15 * * * *',
                     'select public.declencher_rapprochement_paiements_keyli()');

-- ---------- 4. Contrôles (surveillance et back-office) ----------
-- Chaque contrôle doit valoir 0. p_fenetre : période examinée pour les
-- tâches planifiées en échec.
create or replace function public.anomalies_paiements_keyli(p_fenetre interval default interval '24 hours')
returns table (controle text, libelle text, nombre integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_taches integer := 0;
begin
  -- Historique pg_cron : absent sur une base sans l'extension (sans effet)
  begin
    select count(*)::integer into v_taches
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
     where j.jobname like 'keyli-%' and d.status = 'failed' and d.start_time > now() - p_fenetre;
  exception when others then
    v_taches := 0;
  end;

  return query
  select 'echeances_non_traitees', 'Forfaits échus depuis plus de 2 h encore marqués actifs',
         (select count(*)::integer from public.subscriptions_keyli s
           where s.status = 'active' and s.end_date < now() - interval '2 hours')
  union all
  select 'rappels_j7_manques', 'Rappels J-7 non envoyés',
         (select count(*)::integer from public.subscriptions_keyli s
           where s.status = 'active'
             and s.end_date > now() + interval '1 day'
             and s.end_date <= now() + interval '7 days' - interval '2 hours'
             and s.created_at < now() - interval '2 hours'
             and s.rappel_j7_pour is distinct from s.end_date)
  union all
  select 'rappels_j1_manques', 'Rappels J-1 non envoyés',
         (select count(*)::integer from public.subscriptions_keyli s
           where s.status = 'active'
             and s.end_date > now()
             and s.end_date <= now() + interval '1 day' - interval '2 hours'
             and s.created_at < now() - interval '2 hours'
             and s.rappel_j1_pour is distinct from s.end_date)
  union all
  select 'paiements_non_verifies', 'Paiements en cours depuis plus d''1 h jamais vérifiés auprès de Paystack',
         (select count(*)::integer from public.payment_attempts_keyli t
           where t.status = 'initiated' and t.paystack_reference is not null
             and t.created_at < now() - interval '1 hour'
             and (t.derniere_verification is null or t.derniere_verification < now() - interval '2 hours'))
  union all
  select 'paiements_sans_transaction', 'Paiements réussis sans transaction enregistrée',
         (select count(*)::integer from public.payment_attempts_keyli t
           where t.status = 'success'
             and not exists (select 1 from public.transactions_keyli x where x.paystack_ref = t.paystack_reference))
  union all
  select 'transactions_sans_abonnement', 'Transactions encaissées sans abonnement lié',
         (select count(*)::integer from public.transactions_keyli x
           where x.status = 'completed' and x.subscription_id is null)
  union all
  select 'taches_en_echec', 'Exécutions de tâches planifiées en échec',
         v_taches;
end;
$$;

revoke execute on function public.anomalies_paiements_keyli(interval) from public, anon, authenticated;

-- Surveillance horaire (après la tâche des échéances, à :05) :
-- * échéances oubliées : traitées aussitôt (expiration, rappels) ;
-- * chaque anomalie restante est inscrite au journal des erreurs, sans
--   donnée personnelle (nombre seulement).
-- Renvoie le nombre de contrôles en anomalie.
create or replace function public.surveiller_paiements_keyli()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  a     record;
  v_nb  integer := 0;
begin
  if exists (select 1 from public.anomalies_paiements_keyli(interval '1 hour') x
              where x.controle in ('echeances_non_traitees', 'rappels_j7_manques', 'rappels_j1_manques')
                and x.nombre > 0) then
    perform public.traiter_echeances_abonnements_keyli();
    insert into public.erreurs_client_keyli (page, message, code)
    values ('/tache/surveillance-paiements', 'Échéances d''abonnement en retard : traitées par la surveillance', 'corrige');
  end if;

  for a in select * from public.anomalies_paiements_keyli(interval '1 hour') x where x.nombre > 0 loop
    insert into public.erreurs_client_keyli (page, message, code)
    values ('/tache/surveillance-paiements', left('Contrôle des paiements : ' || a.libelle, 500), a.controle);
    v_nb := v_nb + 1;
  end loop;
  return v_nb;
end;
$$;

revoke execute on function public.surveiller_paiements_keyli() from public, anon, authenticated;

select cron.schedule('keyli-surveillance-paiements', '40 * * * *', 'select public.surveiller_paiements_keyli()');

-- ---------- 5. Back-office ----------
-- Contrôles sur 24 h (admin)
create or replace function public.controles_paiements_keyli()
returns table (controle text, libelle text, nombre integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  return query select * from public.anomalies_paiements_keyli(interval '24 hours');
end;
$$;

revoke execute on function public.controles_paiements_keyli() from public, anon;
grant execute on function public.controles_paiements_keyli() to authenticated;

-- Synthèse d'une période (admin) : encaissé (transactions), tentatives par
-- statut, et paiements actuellement en cours.
create or replace function public.synthese_paiements_keyli(p_debut date, p_fin date)
returns table (
  encaisse     numeric,
  reussis      bigint,
  echoues      bigint,
  abandonnes   bigint,
  en_cours     bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if p_debut is null or p_fin is null or p_fin < p_debut or p_fin - p_debut > 366 then
    raise exception 'Période invalide (un an au plus).' using errcode = '22023';
  end if;
  return query
  select (select coalesce(sum(x.amount), 0) from public.transactions_keyli x
           where x.status = 'completed'
             and x.created_at >= p_debut::timestamptz and x.created_at < (p_fin + 1)::timestamptz),
         count(*) filter (where t.status = 'success'),
         count(*) filter (where t.status = 'failed'),
         count(*) filter (where t.status = 'abandoned'),
         count(*) filter (where t.status = 'initiated')
    from public.payment_attempts_keyli t
   where t.created_at >= p_debut::timestamptz and t.created_at < (p_fin + 1)::timestamptz;
end;
$$;

revoke execute on function public.synthese_paiements_keyli(date, date) from public, anon;
grant execute on function public.synthese_paiements_keyli(date, date) to authenticated;

-- Derniers paiements (admin), filtrables par statut
create or replace function public.paiements_admin_keyli(p_statut text default null, p_limite integer default 50)
returns table (
  id                     uuid,
  reference              text,
  email                  text,
  forfait                text,
  montant                numeric,
  statut                 text,
  message                text,
  motif_refus            text,
  verifications          integer,
  derniere_verification  timestamptz,
  cree_le                timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  return query
  select t.id, t.paystack_reference, t.email, p.nom, t.amount, t.status, t.error_message, t.motif_refus,
         t.verifications, t.derniere_verification, t.created_at
    from public.payment_attempts_keyli t
    left join public.plans_keyli p on p.id = t.plan_id
   where p_statut is null or t.status = p_statut
   order by t.created_at desc
   limit least(greatest(coalesce(p_limite, 50), 1), 200);
end;
$$;

revoke execute on function public.paiements_admin_keyli(text, integer) from public, anon;
grant execute on function public.paiements_admin_keyli(text, integer) to authenticated;
