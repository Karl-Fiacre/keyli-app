-- ============================================================
-- Sprint 5 — lancement et suivi terrain du pilote (2026-11-06)
-- Décisions du porteur : candidature au pilote, suivi du pilote
-- (docs/MODULES/lancement-pilote.md).
--
-- 1. Candidatures (inscription_pilot_keyli, table du 2026-10-02) : profil,
--    commune, nombre de biens, note de l'équipe. L'envoi passe par
--    candidater_pilote_keyli : la fonction valide, limite le débit et ne
--    révèle jamais si un email a déjà candidaté (plus d'insertion directe).
-- 2. Suivi : candidatures avec « compte créé », et suivi_pilote_keyli
--    (entonnoir de démarrage des annonceurs, retours, visites, séjours).
-- ============================================================

-- ---------- 1. Candidatures ----------
alter table public.inscription_pilot_keyli
  add column profil     text,
  add column commune    text,
  add column nom_agence text,
  add column nb_biens   integer,
  add column note_admin text;

-- NOT VALID : contrôle des nouvelles lignes sans bloquer d'éventuelles anciennes
alter table public.inscription_pilot_keyli
  add constraint inscription_pilot_profil check (profil in ('proprietaire', 'agence', 'chercheur')) not valid,
  add constraint inscription_pilot_email_format
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254) not valid,
  add constraint inscription_pilot_nb_biens check (nb_biens between 0 and 10000) not valid,
  add constraint inscription_pilot_message_longueur check (char_length(message) <= 1000) not valid,
  add constraint inscription_pilot_note_longueur check (char_length(note_admin) <= 2000) not valid;

-- L'email est unique : une insertion directe trahirait les adresses déjà
-- inscrites (erreur 23505). Tout passe désormais par la fonction ci-dessous.
drop policy "Inscription pilote ouverte" on public.inscription_pilot_keyli;
revoke insert on public.inscription_pilot_keyli from anon, authenticated;
grant update (note_admin) on public.inscription_pilot_keyli to authenticated;

-- Envoi d'une candidature (visiteurs compris). Réponse identique que
-- l'email soit nouveau ou non ; une candidature encore « en attente » est
-- mise à jour avec les nouvelles informations.
create or replace function public.candidater_pilote_keyli(
  p_email      text,
  p_prenom     text,
  p_nom        text,
  p_telephone  text,
  p_profil     text,
  p_commune    text default null,
  p_nom_agence text default null,
  p_nb_biens   integer default null,
  p_message    text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse email invalide.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_prenom, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_nom, ''))) not between 1 and 80 then
    raise exception 'Prénom et nom sont requis.' using errcode = '22023';
  end if;
  if coalesce(regexp_replace(p_telephone, '\s', '', 'g'), '') !~ '^\+225[0-9]{10}$' then
    raise exception 'Numéro de téléphone invalide (+225 suivi de 10 chiffres).' using errcode = '22023';
  end if;
  if p_profil is null or p_profil not in ('proprietaire', 'agence', 'chercheur') then
    raise exception 'Profil inconnu.' using errcode = '22023';
  end if;
  if p_profil = 'agence' and nullif(btrim(p_nom_agence), '') is null then
    raise exception 'Le nom de l''agence est obligatoire.' using errcode = '22023';
  end if;
  if p_commune is not null and not exists (select 1 from public.communes_keyli c where c.nom = p_commune) then
    raise exception 'Commune inconnue.' using errcode = '22023';
  end if;
  if p_nb_biens is not null and p_nb_biens not between 0 and 10000 then
    raise exception 'Nombre de biens invalide.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_message, '')) > 1000 then
    raise exception 'Message trop long (1000 caractères au plus).' using errcode = '22023';
  end if;

  -- Anti-abus : au plus 100 candidatures par heure sur toute la plateforme
  -- (volume très au-delà d'un panel pilote ; protège la file de l'équipe)
  if (select count(*) from public.inscription_pilot_keyli i
       where i.created_at > now() - interval '1 hour') >= 100 then
    raise exception 'Trop de candidatures en ce moment : réessayez dans une heure.' using errcode = '23514';
  end if;

  insert into public.inscription_pilot_keyli
    (email, first_name, last_name, phone, profil, commune, nom_agence, nb_biens, message, source)
  values
    (v_email, btrim(p_prenom), btrim(p_nom), regexp_replace(p_telephone, '\s', '', 'g'), p_profil,
     p_commune, nullif(btrim(p_nom_agence), ''),
     case when p_profil = 'chercheur' then null else p_nb_biens end,
     nullif(btrim(p_message), ''), 'page_pilote')
  on conflict (email) do update
    set first_name = excluded.first_name,
        last_name  = excluded.last_name,
        phone      = excluded.phone,
        profil     = excluded.profil,
        commune    = excluded.commune,
        nom_agence = excluded.nom_agence,
        nb_biens   = excluded.nb_biens,
        message    = excluded.message
    where public.inscription_pilot_keyli.status = 'en_attente';
end;
$$;

revoke execute on function public.candidater_pilote_keyli(text, text, text, text, text, text, text, integer, text)
  from public;
grant execute on function public.candidater_pilote_keyli(text, text, text, text, text, text, text, integer, text)
  to anon, authenticated;

-- File des candidatures pour l'équipe, avec « compte créé » (un compte
-- Keyli existe pour cet email). Priorité haute d'abord, puis les plus anciennes.
create or replace function public.candidatures_pilote_keyli(p_statut public.inscription_status_keyli)
returns table (
  id             uuid,
  email          text,
  prenom         text,
  nom            text,
  telephone      text,
  profil         text,
  commune        text,
  nom_agence     text,
  nb_biens       integer,
  message        text,
  statut         public.inscription_status_keyli,
  priorite       public.priority_level_keyli,
  note_admin     text,
  created_at     timestamptz,
  compte_cree    boolean
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
  select i.id, i.email, i.first_name, i.last_name, i.phone, i.profil, i.commune, i.nom_agence, i.nb_biens,
         i.message, i.status, i.priority_level, i.note_admin, i.created_at,
         exists (select 1 from auth.users u where lower(u.email) = lower(i.email))
    from public.inscription_pilot_keyli i
   where i.status = p_statut
   order by case i.priority_level when 'haute' then 0 when 'moyenne' then 1 else 2 end, i.created_at
   limit 200;
end;
$$;

revoke execute on function public.candidatures_pilote_keyli(public.inscription_status_keyli) from public, anon;
grant execute on function public.candidatures_pilote_keyli(public.inscription_status_keyli) to authenticated;

-- ---------- 2. Suivi du pilote ----------
-- Entonnoir de démarrage des annonceurs (mêmes règles que
-- etapes_demarrage_keyli), candidatures, retours et activité terrain.
create or replace function public.suivi_pilote_keyli()
returns table (
  candidatures_en_attente  bigint,
  candidatures_contactees  bigint,
  candidatures_converties  bigint,
  candidatures_rejetees    bigint,
  candidatures_avec_compte bigint,
  annonceurs               bigint,
  annonceurs_profil        bigint,
  annonceurs_documents     bigint,
  annonceurs_verifies      bigint,
  annonceurs_forfait       bigint,
  annonceurs_annonce       bigint,
  retours_en_attente       bigint,
  retours_total            bigint,
  visites_planifiees       bigint,
  visites_effectuees       bigint,
  reservations_demandees   bigint,
  reservations_acceptees   bigint,
  avis                     bigint
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
  with a as (
    select
      nullif(btrim(p.first_name), '') is not null and nullif(btrim(p.last_name), '') is not null
        and nullif(btrim(p.phone), '') is not null
        and (p.role_keyli <> 'agency' or nullif(btrim(p.nom_agence), '') is not null) as profil,
      case when p.role_keyli = 'agency' then
        exists (select 1 from public.documents_keyli d
                 where d.user_id = p.user_id and d.doc_type = 'registre' and d.status <> 'rejected')
      else
        exists (select 1 from public.documents_keyli d
                 where d.user_id = p.user_id and d.doc_type = 'extrait_naissance' and d.status <> 'rejected')
        and exists (select 1 from public.documents_keyli d
                     where d.user_id = p.user_id and d.doc_type = 'cert_residence' and d.status <> 'rejected')
      end as documents,
      coalesce(p.verified, false) as verifie,
      public.abonnement_en_cours_keyli(p.user_id) as forfait,
      exists (select 1 from public.properties_keyli pr where pr.owner_id = p.user_id and pr.archived_at is null)
        as annonce
    from public.profiles_keyli p
    where p.role_keyli in ('owner', 'agency')
  ),
  c as (
    select i.status, exists (select 1 from auth.users u where lower(u.email) = lower(i.email)) as compte
      from public.inscription_pilot_keyli i
  )
  select
    (select count(*) from c where c.status = 'en_attente'),
    (select count(*) from c where c.status = 'contacte'),
    (select count(*) from c where c.status = 'converti'),
    (select count(*) from c where c.status = 'rejete'),
    (select count(*) from c where c.compte),
    (select count(*) from a),
    (select count(*) from a where a.profil),
    (select count(*) from a where a.documents),
    (select count(*) from a where a.verifie),
    (select count(*) from a where a.forfait),
    (select count(*) from a where a.annonce),
    (select count(*) from public.feedback_keyli f where f.status = 'pending'),
    (select count(*) from public.feedback_keyli),
    (select count(*) from public.visits_keyli v where v.status = 'planifiee'),
    (select count(*) from public.visits_keyli v where v.status = 'effectuee'),
    (select count(*) from public.reservations_keyli r where r.statut = 'demandee'),
    (select count(*) from public.reservations_keyli r where r.statut = 'acceptee'),
    (select count(*) from public.ratings_keyli);
end;
$$;

revoke execute on function public.suivi_pilote_keyli() from public, anon;
grant execute on function public.suivi_pilote_keyli() to authenticated;
