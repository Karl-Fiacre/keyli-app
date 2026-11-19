-- Keyli — Conformité des boutiques d'applications (Sprint 20)
--
-- Sources : exigences Google Play (contenu généré par les utilisateurs,
-- suppression de compte, section « Sécurité des données ») et App Store
-- (règles 1.2 et 5.1.1(v)) ; docs/MODULES/conformite.md.
--
-- Décisions du porteur de projet du 2026-11-19 :
--   - suppression de compte codée (pas seulement une demande par email),
--     depuis le profil web et mobile ;
--   - signaler un utilisateur (pas seulement une annonce) et le bloquer.
--
-- Suppression = effacement des données personnelles + anonymisation du
-- compte, pas un DELETE de auth.users : les paiements et factures doivent
-- être conservés (obligation comptable, politique de confidentialité), et
-- les réservations / échanges de l'autre partie gardent leur historique.
-- Le compte anonymisé est suspendu (connexion bannie par la fonction Edge
-- supprimer-compte, annonces masquées, écritures bloquées).

-- ============================================================
-- Profil : date de suppression du compte
-- ============================================================
alter table public.profiles_keyli
  add column compte_supprime_le timestamptz;

-- ============================================================
-- BLOCAGES — un utilisateur bloqué ne peut plus vous écrire, et vous ne
-- pouvez plus lui écrire tant que le blocage existe.
-- ============================================================
create table public.blocages_keyli (
  bloqueur_id  uuid not null references auth.users(id) on delete cascade,
  bloque_id    uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (bloqueur_id, bloque_id),
  constraint blocages_keyli_pas_soi_meme check (bloqueur_id <> bloque_id)
);

-- « Qui m'a bloqué ? » n'est jamais lisible ; l'index sert la fonction
-- bloque_entre_keyli dans les deux sens
create index idx_blocages_bloque on public.blocages_keyli (bloque_id, bloqueur_id);

alter table public.blocages_keyli enable row level security;

create policy "Utilisateur lit ses blocages"
  on public.blocages_keyli for select
  to authenticated
  using ((select auth.uid()) = bloqueur_id);

create policy "Utilisateur bloque quelqu'un"
  on public.blocages_keyli for insert
  to authenticated
  with check ((select auth.uid()) = bloqueur_id);

create policy "Utilisateur débloque quelqu'un"
  on public.blocages_keyli for delete
  to authenticated
  using ((select auth.uid()) = bloqueur_id);

revoke all on public.blocages_keyli from anon, authenticated;
grant select, delete on public.blocages_keyli to authenticated;
grant insert (bloqueur_id, bloque_id) on public.blocages_keyli to authenticated;

-- « L'un des deux a-t-il bloqué l'autre ? » — SECURITY DEFINER car
-- l'expéditeur ne voit pas les blocages posés par le destinataire ; ne
-- répond que oui / non, sans dire qui a bloqué.
create or replace function public.bloque_entre_keyli(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocages_keyli b
     where (b.bloqueur_id = p_a and b.bloque_id = p_b)
        or (b.bloqueur_id = p_b and b.bloque_id = p_a)
  );
$$;

revoke execute on function public.bloque_entre_keyli(uuid, uuid) from public, anon;
grant execute on function public.bloque_entre_keyli(uuid, uuid) to authenticated;

-- Messagerie : policy RESTRICTIVE ajoutée aux règles d'envoi existantes
create policy "Pas de message entre utilisateurs bloqués"
  on public.messages_keyli as restrictive for insert
  to authenticated
  with check (not public.bloque_entre_keyli(from_user, to_user));

-- Mes blocages, avec le nom affiché (écran « Utilisateurs bloqués »)
create or replace function public.mes_blocages_keyli()
returns table (bloque_id uuid, nom text, photo_url text, bloque_le timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.bloque_id,
         coalesce(nullif(btrim(p.nom_agence), ''),
                  nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
                  'Utilisateur Keyli'),
         p.photo_url,
         b.created_at
    from public.blocages_keyli b
    left join public.profiles_keyli p on p.user_id = b.bloque_id
   where b.bloqueur_id = (select auth.uid())
   order by b.created_at desc;
$$;

revoke execute on function public.mes_blocages_keyli() from public, anon;
grant execute on function public.mes_blocages_keyli() to authenticated;

-- ============================================================
-- SIGNALEMENTS — signaler aussi un utilisateur (depuis une conversation)
-- ============================================================
alter table public.reports_keyli
  add column reported_user_id uuid references auth.users(id);

create index idx_reports_utilisateur on public.reports_keyli (reported_user_id)
  where reported_user_id is not null;

-- Un seul signalement en attente par personne et par cible (annonce ou
-- utilisateur)
drop index public.uq_reports_keyli_un_en_attente;
create unique index uq_reports_keyli_un_en_attente
  on public.reports_keyli (reporter_id, property_id, reported_user_id) nulls not distinct
  where status = 'pending';

-- Signaler une annonce visible, ou quelqu'un qui vous a écrit (on ne peut
-- pas signaler un inconnu au hasard)
drop policy "Utilisateur signale une annonce" on public.reports_keyli;
create policy "Utilisateur signale une annonce ou un utilisateur"
  on public.reports_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and (property_id is null
         or exists (select 1 from public.properties_keyli p where p.id = property_id))
    and (reported_user_id is null
         or (reported_user_id <> (select auth.uid())
             and exists (select 1 from public.messages_keyli m
                          where m.from_user = reported_user_id
                            and m.to_user = (select auth.uid()))))
  );

grant insert (reported_user_id) on public.reports_keyli to authenticated;

-- File de modération : la personne signalée est l'annonceur du bien, ou
-- l'utilisateur signalé directement (même colonnes qu'avant)
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
         coalesce(p.is_verified, false), p.archived_at is not null,
         coalesce(p.owner_id, r.reported_user_id),
         coalesce(nullif(btrim(ow.nom_agence), ''),
                  nullif(btrim(concat_ws(' ', ow.first_name, ow.last_name)), ''), ow.email),
         coalesce(ow.suspendu, false),
         coalesce(nullif(btrim(concat_ws(' ', au.first_name, au.last_name)), ''), au.email),
         case when r.property_id is not null
              then (select count(*) from public.reports_keyli r2
                     where r2.property_id = r.property_id and r2.status = 'pending')
              else (select count(*) from public.reports_keyli r2
                     where r2.reported_user_id = r.reported_user_id and r2.status = 'pending')
         end
    from public.reports_keyli r
    left join public.properties_keyli p on p.id = r.property_id
    left join public.profiles_keyli ow on ow.user_id = coalesce(p.owner_id, r.reported_user_id)
    left join public.profiles_keyli au on au.user_id = r.reporter_id
   where r.status = p_statut
   order by case when p_statut = 'pending' then r.created_at end asc, r.updated_at desc
   limit least(greatest(coalesce(p_limite, 100), 1), 200);
end;
$$;

revoke execute on function public.admin_file_signalements_keyli(public.report_status_keyli, integer) from public, anon;
grant execute on function public.admin_file_signalements_keyli(public.report_status_keyli, integer) to authenticated;

-- ============================================================
-- SUPPRESSION DE COMPTE — appelée uniquement par la fonction Edge
-- supprimer-compte (clé service_role), qui a vérifié l'identité de
-- l'appelant, puis bannit la connexion et efface ses fichiers.
-- ============================================================
create or replace function public.supprimer_compte_keyli(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profil public.profiles_keyli;
  v_r record;
  v_aujourdhui date := (now() at time zone 'Africa/Abidjan')::date;
begin
  select * into v_profil from public.profiles_keyli where user_id = p_user for update;
  if not found then
    raise exception 'Compte introuvable' using errcode = 'P0002';
  end if;
  if v_profil.compte_supprime_le is not null then
    return; -- déjà supprimé : rien à refaire
  end if;
  if v_profil.role_keyli in ('admin', 'super_admin') then
    raise exception 'Un compte administrateur ne se supprime pas lui-même' using errcode = '42501';
  end if;

  -- Séjours à venir annulés, l'autre partie prévenue
  for v_r in
    select r.*, p.title
      from public.reservations_keyli r
      join public.properties_keyli p on p.id = r.property_id
     where p_user in (r.voyageur_id, r.owner_id)
       and r.statut in ('demandee', 'acceptee')
       and r.date_arrivee >= v_aujourdhui
  loop
    update public.reservations_keyli
       set statut = 'annulee', motif = 'Compte supprimé', annulee_par = p_user
     where id = v_r.id;
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (case when p_user = v_r.voyageur_id then v_r.owner_id else v_r.voyageur_id end,
            'reservation_annulee', 'Réservation annulée',
            format('« %s » : le séjour du %s au %s est annulé (compte supprimé).', v_r.title,
                   to_char(v_r.date_arrivee, 'DD/MM/YYYY'), to_char(v_r.date_depart, 'DD/MM/YYYY')),
            v_r.property_id);
  end loop;

  -- Annonces retirées
  update public.properties_keyli set archived_at = now()
   where owner_id = p_user and archived_at is null;

  -- Données personnelles effacées
  delete from public.messages_keyli where p_user in (from_user, to_user);
  delete from public.ratings_keyli where p_user in (rater_id, rated_user_id);
  delete from public.favorites_keyli where user_id = p_user;
  delete from public.search_alerts_keyli where user_id = p_user;
  delete from public.notifications_keyli where user_id = p_user;
  delete from public.appareils_push_keyli where user_id = p_user;
  delete from public.documents_keyli where user_id = p_user;
  delete from public.onboarding_checklists_keyli where user_id = p_user;
  delete from public.reports_keyli where reporter_id = p_user;
  delete from public.blocages_keyli where p_user in (bloqueur_id, bloque_id);
  update public.leads_keyli set contact_user_id = null where contact_user_id = p_user;
  update public.visits_keyli set visitor_user_id = null where visitor_user_id = p_user;
  update public.property_interactions_keyli set user_id = null where user_id = p_user;

  -- Profil anonymisé et suspendu sans fin (annonces masquées, écritures
  -- bloquées par les policies de 20261021120000)
  update public.profiles_keyli
     set email = format('supprime-%s@keyli.invalid', p_user),
         first_name = null, last_name = null, phone = null, photo_url = null,
         nom_agence = null, id_number = null, id_validity_date = null,
         verified = false, verification_date = null,
         suspendu = true, suspension_fin = null,
         suspension_motif = 'Compte supprimé à la demande de l''utilisateur',
         compte_supprime_le = now()
   where user_id = p_user;

  insert into public.audit_logs_keyli (admin_id, action, entity_type, entity_id, details)
  values (p_user, 'suppression_compte', 'user', p_user::text,
          jsonb_build_object('role', v_profil.role_keyli, 'origine', 'utilisateur'));
end;
$$;

revoke execute on function public.supprimer_compte_keyli(uuid) from public, anon, authenticated;
grant execute on function public.supprimer_compte_keyli(uuid) to service_role;
