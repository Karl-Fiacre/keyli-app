-- Keyli — Back-office admin : file de vérification, modération, indicateurs
-- (Sprint 3, semaines 9-10)
--
-- Sources : docs/MODULES/admin.md, docs/MODULES/verification.md,
-- docs/PRD_REGLES.md, docs/prd.md §4.2 (KPI pilote : taux de vérification
-- ≥ 70 %, note moyenne ≥ 4.0/5, 500 propriétés).
--
-- Décisions du porteur de projet du 2026-11-01 :
--   - motif de signalement choisi dans une LISTE, avec une précision
--     facultative (obligatoire pour « autre ») ;
--   - le premier super_admin est promu à la main par le porteur (SQL Editor
--     du Dashboard, procédure dans docs/SETUP.md) — rien d'automatique ici ;
--   - écrans utilisateur d'envoi des documents et de signalement ajoutés
--     dans le même lot (les files admin seraient vides sans eux).
-- Les actions admin restent celles, auditées, de 20261002180000 et
-- 20261021120000 ; ce lot n'ajoute que des lectures réservées aux admins
-- et une notification de l'utilisateur après revue de son document.

-- ============================================================
-- Signalements : motif en liste + précision
-- ============================================================
alter table public.reports_keyli
  add column motif text not null default 'autre'
    check (motif in ('fraude', 'indisponible', 'informations_trompeuses',
                     'photos_non_conformes', 'comportement', 'autre'));
alter table public.reports_keyli drop constraint reports_keyli_motif_non_vide;
alter table public.reports_keyli alter column reason drop not null;
alter table public.reports_keyli
  add constraint reports_keyli_precision check (
    (motif <> 'autre' or nullif(btrim(reason), '') is not null)
    and (reason is null or length(reason) <= 1000)
  );

grant insert (motif) on public.reports_keyli to authenticated;

-- ============================================================
-- Notification de l'utilisateur après la revue de son document
-- ============================================================
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'recommandation_forfait',
                  'visite_planifiee', 'visite_modifiee', 'visite_annulee', 'visite_effectuee',
                  'document_approuve', 'document_rejete'));

create or replace function public.notifier_revue_document_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_libelle text := case new.doc_type
    when 'acd' then 'L''ACD de votre bien'
    when 'registre' then 'Votre registre de commerce'
    when 'extrait_naissance' then 'Votre extrait de naissance'
    when 'cert_residence' then 'Votre certificat de résidence'
  end;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (new.user_id, 'document_approuve', 'Document approuvé',
            v_libelle || ' a été approuvé par l''équipe Keyli.', new.property_id);
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (new.user_id, 'document_rejete', 'Document à renvoyer',
            v_libelle || ' n''a pas pu être validé : ' || coalesce(new.review_notes, '') ||
            ' Vous pouvez en déposer un nouveau.', new.property_id);
  end if;
  return null;
end;
$$;

create trigger trg_documents_keyli_notification
  after update of status on public.documents_keyli
  for each row execute function public.notifier_revue_document_keyli();

revoke execute on function public.notifier_revue_document_keyli() from public, anon, authenticated;

-- ============================================================
-- File de vérification (admin) : documents par statut, avec le déposant et
-- le bien concerné. Le fichier s'ouvre par une URL signée (policy de
-- lecture admin du bucket privé).
-- ============================================================
create or replace function public.admin_file_verification_keyli(
  p_statut public.document_status_keyli default 'pending',
  p_limite integer default 100
)
returns table (
  id            uuid,
  doc_type      public.document_type_keyli,
  fichier       text,
  statut        public.document_status_keyli,
  depose_le     timestamptz,
  revu_le       timestamptz,
  notes         text,
  user_id       uuid,
  nom           text,
  email         text,
  role          public.user_role_keyli,
  compte_verifie boolean,
  property_id   uuid,
  titre_bien    text
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
  select d.id, d.doc_type, d.file_url, d.status, d.created_at, d.reviewed_at, d.review_notes,
         d.user_id,
         coalesce(nullif(btrim(pr.nom_agence), ''),
                  nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.email),
         pr.email, pr.role_keyli, coalesce(pr.verified, false), d.property_id, p.title
    from public.documents_keyli d
    left join public.profiles_keyli pr on pr.user_id = d.user_id
    left join public.properties_keyli p on p.id = d.property_id
   where d.status = p_statut
   -- En attente : les plus anciens d'abord (premier arrivé, premier servi)
   order by case when p_statut = 'pending' then d.created_at end asc,
            coalesce(d.reviewed_at, d.created_at) desc
   limit least(greatest(coalesce(p_limite, 100), 1), 200);
end;
$$;

revoke execute on function public.admin_file_verification_keyli(public.document_status_keyli, integer) from public, anon;
grant execute on function public.admin_file_verification_keyli(public.document_status_keyli, integer) to authenticated;

-- ============================================================
-- File de modération (admin) : signalements par statut, avec l'annonce,
-- l'annonceur, l'auteur et le nombre de signalements en attente sur la
-- même annonce (signal d'alerte).
-- ============================================================
create or replace function public.admin_file_signalements_keyli(
  p_statut public.report_status_keyli default 'pending',
  p_limite integer default 100
)
returns table (
  id               uuid,
  motif            text,
  precision_texte  text,
  statut           public.report_status_keyli,
  signale_le       timestamptz,
  property_id      uuid,
  titre_bien       text,
  bien_verifie     boolean,
  bien_archive     boolean,
  annonceur_id     uuid,
  annonceur        text,
  annonceur_suspendu boolean,
  auteur           text,
  signalements_en_attente bigint
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
  select r.id, r.motif, r.reason, r.status, r.created_at, r.property_id, p.title,
         coalesce(p.is_verified, false), p.archived_at is not null, p.owner_id,
         coalesce(nullif(btrim(ow.nom_agence), ''),
                  nullif(btrim(concat_ws(' ', ow.first_name, ow.last_name)), ''), ow.email),
         coalesce(ow.suspendu, false),
         coalesce(nullif(btrim(concat_ws(' ', au.first_name, au.last_name)), ''), au.email),
         (select count(*) from public.reports_keyli r2
           where r2.property_id = r.property_id and r2.status = 'pending')
    from public.reports_keyli r
    left join public.properties_keyli p on p.id = r.property_id
    left join public.profiles_keyli ow on ow.user_id = p.owner_id
    left join public.profiles_keyli au on au.user_id = r.reporter_id
   where r.status = p_statut
   order by case when p_statut = 'pending' then r.created_at end asc, r.updated_at desc
   limit least(greatest(coalesce(p_limite, 100), 1), 200);
end;
$$;

revoke execute on function public.admin_file_signalements_keyli(public.report_status_keyli, integer) from public, anon;
grant execute on function public.admin_file_signalements_keyli(public.report_status_keyli, integer) to authenticated;

-- ============================================================
-- Indicateurs de base (admin). Seuils du PRD affichés par l'écran :
-- vérification ≥ 70 %, note ≥ 4.0, 500 propriétés (docs/MODULES/admin.md —
-- aucun autre seuil inventé). Taux de vérification calculé sur les
-- annonceurs (propriétaires et agences).
-- ============================================================
create or replace function public.admin_indicateurs_keyli()
returns table (
  comptes_total            bigint,
  chercheurs               bigint,
  proprietaires            bigint,
  agences                  bigint,
  annonceurs_verifies      bigint,
  taux_verification        numeric,   -- en %, NULL sans annonceur
  note_moyenne             numeric,   -- moyenne des avis publiés, NULL sans avis
  avis                     bigint,
  annonces_publiees        bigint,    -- non archivées
  annonces_visibles        bigint,    -- publiées, compte actif, abonnement en cours
  annonces_verifiees       bigint,
  abonnements_actifs       bigint,
  documents_en_attente     bigint,
  signalements_en_attente  bigint,
  inscriptions_30j         bigint,
  contacts_30j             bigint,    -- nouveaux leads (premiers contacts)
  vues_30j                 bigint,
  encaisse_30j             numeric    -- XOF, transactions confirmées
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
  with annonceurs as (
    select count(*) as n, count(*) filter (where verified) as v
      from public.profiles_keyli where role_keyli in ('owner', 'agency')
  )
  select
    (select count(*) from public.profiles_keyli where role_keyli in ('user', 'owner', 'agency')),
    (select count(*) from public.profiles_keyli where role_keyli = 'user'),
    (select count(*) from public.profiles_keyli where role_keyli = 'owner'),
    (select count(*) from public.profiles_keyli where role_keyli = 'agency'),
    a.v,
    case when a.n > 0 then round(100.0 * a.v / a.n, 1) end,
    (select round(avg(rating)::numeric, 2) from public.ratings_keyli),
    (select count(*) from public.ratings_keyli),
    (select count(*) from public.properties_keyli where archived_at is null),
    (select count(*) from public.properties_keyli p
      where p.archived_at is null and public.compte_actif_keyli(p.owner_id)
        and public.abonnement_en_cours_keyli(p.owner_id)),
    (select count(*) from public.properties_keyli where archived_at is null and is_verified),
    (select count(*) from public.subscriptions_keyli
      where status = 'active' and now() >= start_date and now() < end_date),
    (select count(*) from public.documents_keyli where status = 'pending'),
    (select count(*) from public.reports_keyli where status = 'pending'),
    (select count(*) from public.profiles_keyli where created_at > now() - interval '30 days'),
    (select count(*) from public.leads_keyli where contact_user_id is not null and created_at > now() - interval '30 days'),
    (select count(*) from public.property_interactions_keyli
      where interaction_type = 'view' and created_at > now() - interval '30 days'),
    (select coalesce(sum(amount), 0) from public.transactions_keyli
      where status = 'completed' and created_at > now() - interval '30 days')
  from annonceurs a;
end;
$$;

revoke execute on function public.admin_indicateurs_keyli() from public, anon;
grant execute on function public.admin_indicateurs_keyli() to authenticated;
