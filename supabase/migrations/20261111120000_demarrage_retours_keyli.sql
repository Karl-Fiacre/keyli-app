-- ============================================================
-- Sprint 4 — accueil du panel pilote (2026-11-06)
-- Décisions du porteur : parcours de démarrage des annonceurs et retours
-- des utilisateurs (docs/MODULES/demarrage-retours.md).
--
-- 1. Retours (feedback_keyli, table du 2026-10-02) : longueurs bornées,
--    5 retours par 24 h au plus, notification (cloche + email) quand
--    l'équipe répond.
-- 2. Parcours de démarrage : étapes calculées par la base à partir des
--    données réelles (profil, documents, forfait, annonces, équipe) —
--    jamais cochées à la main. La table onboarding_checklists_keyli
--    (étapes posées par l'admin) reste disponible pour un suivi manuel.
-- ============================================================

-- ---------- 1. Retours ----------
-- NOT VALID : contrôle des nouveaux retours sans bloquer d'éventuels anciens
alter table public.feedback_keyli
  add constraint feedback_keyli_type_requis check (type is not null) not valid,
  add constraint feedback_keyli_sujet_longueur
    check (char_length(btrim(subject)) between 3 and 120) not valid,
  add constraint feedback_keyli_message_longueur
    check (char_length(btrim(message)) between 10 and 2000) not valid,
  add constraint feedback_keyli_reponse_longueur
    check (admin_response is null or char_length(admin_response) <= 2000) not valid;

-- Lecture « mes retours » par date
create index if not exists idx_feedback_user_date on public.feedback_keyli (user_id, created_at desc);

-- Pas plus de 5 retours par 24 h et par compte (protection contre l'abus)
create or replace function public.limiter_retours_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.feedback_keyli f
       where f.user_id = new.user_id and f.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Vous avez déjà envoyé 5 retours aujourd''hui : réessayez demain.'
      using errcode = '23514';
  end if;
  new.status := 'pending';
  new.admin_response := null;
  return new;
end;
$$;

revoke execute on function public.limiter_retours_keyli() from public, anon, authenticated;

create trigger trg_feedback_keyli_limite
  before insert on public.feedback_keyli
  for each row execute function public.limiter_retours_keyli();

-- Nouveau type de notification : réponse de l'équipe à un retour
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'recommandation_forfait',
                  'visite_planifiee', 'visite_modifiee', 'visite_annulee', 'visite_effectuee',
                  'document_approuve', 'document_rejete',
                  'reservation_demandee', 'reservation_acceptee', 'reservation_refusee', 'reservation_annulee',
                  'retour_repondu'));

-- Emails : la réponse de l'équipe part aussi par email (si l'utilisateur
-- n'a pas coupé les emails de notification)
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
    'abonnement_rappel', 'abonnement_expire', 'depassement_cycle',
    'alerte_recherche',
    'retour_repondu'
  )
$$;

create or replace function public.notifier_reponse_retour_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(new.admin_response), '') is not null
     and new.admin_response is distinct from old.admin_response then
    insert into public.notifications_keyli (user_id, type, titre, contenu)
    values (new.user_id, 'retour_repondu', 'L’équipe Keyli a répondu à votre retour',
            left(new.subject, 120));
  end if;
  return new;
end;
$$;

revoke execute on function public.notifier_reponse_retour_keyli() from public, anon, authenticated;

create trigger trg_feedback_keyli_reponse
  after update of admin_response on public.feedback_keyli
  for each row execute function public.notifier_reponse_retour_keyli();

-- ---------- 2. Parcours de démarrage ----------
-- Étapes de l'annonceur connecté (propriétaire ou agence), dans l'ordre.
-- Aucune ligne pour les autres rôles. Lit seulement les données de l'appelant.
create or replace function public.etapes_demarrage_keyli()
returns table (etape text, faite boolean, ordre integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_p    public.profiles_keyli%rowtype;
begin
  if v_uid is null then
    return;
  end if;
  select * into v_p from public.profiles_keyli p where p.user_id = v_uid;
  if not found or v_p.role_keyli not in ('owner', 'agency') then
    return;
  end if;

  return query
  select e.etape, e.faite, e.ordre from (values
    ('profil',
     nullif(btrim(v_p.first_name), '') is not null and nullif(btrim(v_p.last_name), '') is not null
       and nullif(btrim(v_p.phone), '') is not null
       and (v_p.role_keyli <> 'agency' or nullif(btrim(v_p.nom_agence), '') is not null),
     1),
    -- Documents personnels envoyés (en attente ou approuvés) : extrait de
    -- naissance et certificat de résidence pour un propriétaire, registre
    -- de commerce pour une agence
    ('documents',
     case when v_p.role_keyli = 'agency' then
       exists (select 1 from public.documents_keyli d
                where d.user_id = v_uid and d.doc_type = 'registre' and d.status <> 'rejected')
     else
       exists (select 1 from public.documents_keyli d
                where d.user_id = v_uid and d.doc_type = 'extrait_naissance' and d.status <> 'rejected')
       and exists (select 1 from public.documents_keyli d
                    where d.user_id = v_uid and d.doc_type = 'cert_residence' and d.status <> 'rejected')
     end,
     2),
    ('verification', coalesce(v_p.verified, false), 3),
    ('forfait', public.abonnement_en_cours_keyli(v_uid), 4),
    ('annonce',
     exists (select 1 from public.properties_keyli pr where pr.owner_id = v_uid and pr.archived_at is null),
     5),
    ('equipe',
     exists (select 1 from public.agency_agents_keyli a where a.agency_user_id = v_uid and coalesce(a.actif, true)),
     6)
  ) as e(etape, faite, ordre)
  where e.etape <> 'equipe' or v_p.role_keyli = 'agency'
  order by e.ordre;
end;
$$;

revoke execute on function public.etapes_demarrage_keyli() from public, anon;
grant execute on function public.etapes_demarrage_keyli() to authenticated;
