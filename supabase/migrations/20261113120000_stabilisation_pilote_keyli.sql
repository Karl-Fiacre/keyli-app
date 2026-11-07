-- ============================================================
-- Sprint 6 — stabilisation du pilote (2026-11-06)
-- Décisions du porteur : relances automatiques, délais de la vérification,
-- journal des erreurs (la politique de sécurité du contenu est dans
-- public/_headers). Détail : docs/MODULES/stabilisation.md.
-- Objectif du sprint (PRD) : ≥ 70 % de propriétaires vérifiés.
-- ============================================================

-- ---------- 1. Relances automatiques ----------
-- Une ligne par relance envoyée : jamais deux fois la même relance.
create table public.relances_keyli (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  etape       text not null check (etape in ('documents', 'document_rejete', 'annonce')),
  palier      smallint not null check (palier in (3, 7)),   -- jours d'attente
  created_at  timestamptz not null default now(),
  unique (user_id, etape, palier)
);

alter table public.relances_keyli enable row level security;
-- Lecture par l'équipe seulement ; écriture par la tâche planifiée
create policy "Admin lit les relances" on public.relances_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
revoke all on public.relances_keyli from anon, authenticated;
grant select on public.relances_keyli to authenticated;

-- Nouveau type de notification (cloche + email)
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'recommandation_forfait',
                  'visite_planifiee', 'visite_modifiee', 'visite_annulee', 'visite_effectuee',
                  'document_approuve', 'document_rejete',
                  'reservation_demandee', 'reservation_acceptee', 'reservation_refusee', 'reservation_annulee',
                  'retour_repondu', 'relance_demarrage'));

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
    'retour_repondu', 'relance_demarrage'
  )
$$;

-- Relances des annonceurs bloqués (propriétaires et agences, comptes
-- actifs). Trois cas, chacun relancé au plus deux fois (à 3 puis 7 jours) :
--   documents       : pièces jamais envoyées (depuis l'inscription)
--   document_rejete : un document refusé n'a pas été renvoyé (depuis le refus)
--   annonce         : compte vérifié sans aucune annonce (depuis l'inscription)
-- La relance à 7 jours exige 4 jours d'écart avec la première, pour qu'un
-- ancien compte ne reçoive pas les deux le même jour. Renvoie le nombre de
-- relances envoyées.
create or replace function public.relancer_annonceurs_keyli()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r       record;
  v_nb    integer := 0;
begin
  for r in
    with annonceurs as (
      select p.user_id, p.role_keyli, p.created_at, coalesce(p.verified, false) as verifie
        from public.profiles_keyli p
       where p.role_keyli in ('owner', 'agency')
         and public.compte_actif_keyli(p.user_id)
    ),
    situations as (
      -- Pièces jamais envoyées
      select a.user_id, 'documents'::text as etape, a.created_at as depuis
        from annonceurs a
       where not exists (select 1 from public.documents_keyli d
                          where d.user_id = a.user_id and d.property_id is null)
      union all
      -- Document refusé, pas renvoyé depuis
      select a.user_id, 'document_rejete', max(d.reviewed_at)
        from annonceurs a
        join public.documents_keyli d on d.user_id = a.user_id and d.status = 'rejected'
       where d.reviewed_at is not null
         and not exists (select 1 from public.documents_keyli d2
                          where d2.user_id = d.user_id and d2.doc_type = d.doc_type
                            and d2.status <> 'rejected' and d2.created_at > d.reviewed_at)
       group by a.user_id
      union all
      -- Vérifié mais aucune annonce
      select a.user_id, 'annonce', a.created_at
        from annonceurs a
       where a.verifie
         and not exists (select 1 from public.properties_keyli pr where pr.owner_id = a.user_id)
    )
    select s.user_id, s.etape,
           case
             when s.depuis <= now() - interval '7 days'
                  and exists (select 1 from public.relances_keyli x
                               where x.user_id = s.user_id and x.etape = s.etape and x.palier = 3
                                 and x.created_at <= now() - interval '4 days')
                  and not exists (select 1 from public.relances_keyli x
                                   where x.user_id = s.user_id and x.etape = s.etape and x.palier = 7)
               then 7
             when s.depuis <= now() - interval '3 days'
                  and not exists (select 1 from public.relances_keyli x
                                   where x.user_id = s.user_id and x.etape = s.etape and x.palier = 3)
               then 3
           end as palier
      from situations s
  loop
    continue when r.palier is null;
    insert into public.relances_keyli (user_id, etape, palier) values (r.user_id, r.etape, r.palier)
      on conflict do nothing;
    if found then
      insert into public.notifications_keyli (user_id, type, titre, contenu)
      values (r.user_id, 'relance_demarrage',
        case r.etape
          when 'documents' then 'Obtenez votre badge « Vérifié »'
          when 'document_rejete' then 'Un document est à renvoyer'
          else 'Publiez votre première annonce'
        end,
        case r.etape
          when 'documents' then
            'Envoyez vos pièces depuis votre profil : l''équipe Keyli les examine et vos annonces passent en tête des résultats.'
          when 'document_rejete' then
            'Un de vos documents a été refusé. Consultez le motif dans votre profil et envoyez une nouvelle version.'
          else
            'Votre compte est vérifié : publiez une annonce pour être visible des chercheurs de logement.'
        end);
      v_nb := v_nb + 1;
    end if;
  end loop;
  return v_nb;
end;
$$;

revoke execute on function public.relancer_annonceurs_keyli() from public, anon, authenticated;

-- Chaque jour à 9 h (heure d'Abidjan = UTC)
select cron.schedule('keyli-relances-annonceurs', '0 9 * * *', 'select public.relancer_annonceurs_keyli()');

-- ---------- 2. Délais de la vérification ----------
-- Suivi du pilote enrichi : dossiers en attente depuis plus de 48 h et
-- délai moyen de traitement sur 30 jours (en heures), relances envoyées.
drop function public.suivi_pilote_keyli();
create function public.suivi_pilote_keyli()
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
  avis                     bigint,
  documents_en_attente     bigint,
  documents_en_retard      bigint,    -- en attente depuis plus de 48 h
  delai_moyen_heures       numeric,   -- dépôt → décision, 30 derniers jours ; NULL sans décision
  relances_7j              bigint
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
    (select count(*) from public.ratings_keyli),
    (select count(*) from public.documents_keyli d where d.status = 'pending'),
    (select count(*) from public.documents_keyli d
      where d.status = 'pending' and d.created_at < now() - interval '48 hours'),
    (select round(avg(extract(epoch from (d.reviewed_at - d.created_at)) / 3600)::numeric, 1)
       from public.documents_keyli d
      where d.status <> 'pending' and d.reviewed_at > now() - interval '30 days'),
    (select count(*) from public.relances_keyli x where x.created_at > now() - interval '7 days');
end;
$$;

revoke execute on function public.suivi_pilote_keyli() from public, anon;
grant execute on function public.suivi_pilote_keyli() to authenticated;

-- ---------- 3. Journal des erreurs ----------
-- Erreurs inattendues rencontrées dans l'application (visiteurs compris),
-- sans donnée personnelle : la page (sans paramètres), le message nettoyé
-- (emails et suites de chiffres masqués), le code, le navigateur.
create table public.erreurs_client_keyli (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  page        text not null check (char_length(page) <= 300),
  message     text not null check (char_length(message) <= 500),
  code        text check (char_length(code) <= 50),
  navigateur  text check (char_length(navigateur) <= 200),
  created_at  timestamptz not null default now()
);
create index idx_erreurs_client_date on public.erreurs_client_keyli (created_at desc);

alter table public.erreurs_client_keyli enable row level security;
create policy "Admin lit le journal des erreurs" on public.erreurs_client_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
revoke all on public.erreurs_client_keyli from anon, authenticated;
grant select on public.erreurs_client_keyli to authenticated;

create or replace function public.journaliser_erreur_keyli(
  p_page text, p_message text, p_code text default null, p_navigateur text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_msg text;
begin
  -- Anti-abus : 30 par heure et par compte, 500 par heure pour les visiteurs
  if v_uid is not null then
    if (select count(*) from public.erreurs_client_keyli e
         where e.user_id = v_uid and e.created_at > now() - interval '1 hour') >= 30 then
      return;
    end if;
  elsif (select count(*) from public.erreurs_client_keyli e
          where e.user_id is null and e.created_at > now() - interval '1 hour') >= 500 then
    return;
  end if;

  -- Aucune donnée personnelle : emails et suites de 4 chiffres ou plus masqués
  v_msg := regexp_replace(coalesce(p_message, ''), '[^\s@]+@[^\s@]+', '[email]', 'g');
  v_msg := regexp_replace(v_msg, '[0-9][0-9 .-]{3,}[0-9]', '[nombre]', 'g');

  insert into public.erreurs_client_keyli (user_id, page, message, code, navigateur)
  values (v_uid,
          left(split_part(split_part(coalesce(nullif(btrim(p_page), ''), '/'), '?', 1), '#', 1), 300),
          left(coalesce(nullif(btrim(v_msg), ''), '(sans message)'), 500),
          left(nullif(btrim(p_code), ''), 50),
          left(nullif(btrim(p_navigateur), ''), 200));
end;
$$;

revoke execute on function public.journaliser_erreur_keyli(text, text, text, text) from public;
grant execute on function public.journaliser_erreur_keyli(text, text, text, text) to anon, authenticated;

-- Erreurs regroupées pour l'équipe (les plus fréquentes d'abord)
create or replace function public.erreurs_recentes_keyli(p_jours integer default 7)
returns table (
  message      text,
  code         text,
  page         text,
  occurrences  bigint,
  comptes      bigint,
  derniere     timestamptz
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
  select e.message, e.code, e.page, count(*), count(distinct e.user_id), max(e.created_at)
    from public.erreurs_client_keyli e
   where e.created_at > now() - make_interval(days => least(greatest(coalesce(p_jours, 7), 1), 90))
   group by e.message, e.code, e.page
   order by count(*) desc, max(e.created_at) desc
   limit 100;
end;
$$;

revoke execute on function public.erreurs_recentes_keyli(integer) from public, anon;
grant execute on function public.erreurs_recentes_keyli(integer) to authenticated;

-- Conservation limitée : 90 jours, purge chaque nuit
create or replace function public.purger_erreurs_client_keyli()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.erreurs_client_keyli where created_at < now() - interval '90 days';
$$;
revoke execute on function public.purger_erreurs_client_keyli() from public, anon, authenticated;
select cron.schedule('keyli-purge-erreurs', '30 3 * * *', 'select public.purger_erreurs_client_keyli()');
