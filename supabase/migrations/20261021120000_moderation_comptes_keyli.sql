-- Keyli — Modération : retrait de vérification et suspension de compte
--
-- Sources : docs/MODULES/admin.md (suspension de compte), docs/MODULES/verification.md,
-- docs/PRD_REGLES.md (MODULE ADMIN), docs/ROLES.md.
--
-- Décisions du porteur de projet du 2026-10-21 :
--   - retrait de vérification (compte ou bien) : par un admin, motif
--     obligatoire ; le document concerné passe « rejeté » avec ce motif ;
--   - suspension : par un admin, motif obligatoire ; un admin ou un
--     super_admin ne peut être suspendu que par le super_admin ;
--   - effets : connexion bloquée (auth.users.banned_until), annonces
--     masquées au public (pas archivées), écritures bloquées même avec une
--     session encore ouverte ;
--   - date de fin facultative (levée automatique) ou suspension indéfinie
--     jusqu'à réactivation ; l'utilisateur est notifié avec le motif.
-- Toutes les actions sont des fonctions SQL auditées (même modèle que le
-- module admin).

-- ============================================================
-- État de suspension sur le profil (jamais modifiable par le client :
-- privilèges par colonne de profiles_keyli inchangés)
-- ============================================================
alter table public.profiles_keyli
  add column suspendu boolean not null default false,
  add column suspension_fin timestamptz,         -- NULL = indéfinie (si suspendu)
  add column suspension_motif text;

-- « Ce compte est-il actif ? » — une suspension dont la date de fin est
-- passée est levée automatiquement, sans tâche planifiée.
create or replace function public.compte_actif_keyli(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles_keyli p
     where p.user_id = p_user
       and p.suspendu
       and (p.suspension_fin is null or p.suspension_fin > now())
  );
$$;

revoke execute on function public.compte_actif_keyli(uuid) from public;
grant execute on function public.compte_actif_keyli(uuid) to anon, authenticated;

-- ============================================================
-- Annonces des comptes suspendus masquées au public (pas archivées :
-- elles réapparaissent à la levée de la suspension)
-- ============================================================
drop policy "Lecture publique des annonces publiées" on public.properties_keyli;
create policy "Lecture publique des annonces publiées"
  on public.properties_keyli for select
  to anon, authenticated
  using (archived_at is null and public.compte_actif_keyli(owner_id));

-- ============================================================
-- Écritures bloquées pour un compte suspendu, même avec une session encore
-- ouverte : policies RESTRICTIVES ajoutées aux règles existantes (elles ne
-- les remplacent pas, elles s'y ajoutent en ET).
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles_keyli', 'properties_keyli', 'property_media_keyli', 'agency_agents_keyli',
    'documents_keyli', 'messages_keyli', 'ratings_keyli', 'reports_keyli', 'feedback_keyli',
    'onboarding_checklists_keyli', 'marketing_templates_keyli', 'leads_keyli', 'visits_keyli',
    'favorites_keyli', 'search_alerts_keyli', 'notifications_keyli', 'property_interactions_keyli'
  ] loop
    execute format(
      'create policy "Compte suspendu : pas de création" on public.%I as restrictive for insert to authenticated with check (public.compte_actif_keyli((select auth.uid())))', t);
    execute format(
      'create policy "Compte suspendu : pas de modification" on public.%I as restrictive for update to authenticated using (public.compte_actif_keyli((select auth.uid()))) with check (public.compte_actif_keyli((select auth.uid())))', t);
    execute format(
      'create policy "Compte suspendu : pas de suppression" on public.%I as restrictive for delete to authenticated using (public.compte_actif_keyli((select auth.uid())))', t);
  end loop;
end;
$$;

create policy "Compte suspendu : pas d'envoi de fichier"
  on storage.objects as restrictive for insert
  to authenticated
  with check (public.compte_actif_keyli((select auth.uid())));

-- ============================================================
-- Notifications : nouveaux types
-- ============================================================
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive'));

-- ============================================================
-- ACTION : retrait de vérification d'un compte (admin)
-- ============================================================
create or replace function public.admin_retirer_verification_compte_keyli(p_user uuid, p_motif text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un motif est obligatoire' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles_keyli where user_id = p_user and verified) then
    raise exception 'Ce compte n''est pas vérifié' using errcode = '23514';
  end if;

  update public.profiles_keyli set verified = false, verification_date = null where user_id = p_user;

  -- Pièces du compte (identité, résidence, registre) : rejetées avec le
  -- motif — le compte doit en déposer de nouvelles
  update public.documents_keyli
     set status = 'rejected', review_notes = 'Vérification retirée : ' || btrim(p_motif), reviewed_at = now()
   where user_id = p_user and status = 'approved'
     and doc_type in ('extrait_naissance', 'cert_residence', 'registre');

  insert into public.notifications_keyli (user_id, type, titre, contenu)
  values (p_user, 'verification_retiree', 'Votre vérification a été retirée', btrim(p_motif));

  perform public.journaliser_keyli('verification_retiree', 'user', p_user::text,
                                   jsonb_build_object('motif', p_motif));
end;
$$;

-- ============================================================
-- ACTION : retrait de vérification d'un bien (admin)
-- ============================================================
create or replace function public.admin_retirer_verification_bien_keyli(p_property uuid, p_motif text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_titre text;
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un motif est obligatoire' using errcode = '22023';
  end if;

  select owner_id, title into v_owner, v_titre
    from public.properties_keyli where id = p_property and is_verified;
  if not found then
    raise exception 'Ce bien n''est pas vérifié' using errcode = '23514';
  end if;

  update public.properties_keyli set is_verified = false where id = p_property;

  update public.documents_keyli
     set status = 'rejected', review_notes = 'Vérification retirée : ' || btrim(p_motif), reviewed_at = now()
   where property_id = p_property and doc_type = 'acd' and status = 'approved';

  insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
  values (v_owner, 'verification_retiree', 'Le badge « Vérifié » de votre annonce a été retiré',
          v_titre || ' — ' || btrim(p_motif), p_property);

  perform public.journaliser_keyli('verification_bien_retiree', 'property', p_property::text,
                                   jsonb_build_object('owner_id', v_owner, 'motif', p_motif));
end;
$$;

-- ============================================================
-- ACTION : suspension d'un compte (admin ; admins et super_admins par le
-- super_admin uniquement)
-- ============================================================
create or replace function public.admin_suspendre_compte_keyli(
  p_user uuid, p_motif text, p_fin timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role_keyli;
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un motif est obligatoire' using errcode = '22023';
  end if;
  if p_fin is not null and p_fin <= now() then
    raise exception 'La date de fin doit être dans le futur' using errcode = '22023';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'On ne suspend pas son propre compte' using errcode = '42501';
  end if;

  select role_keyli into v_role from public.profiles_keyli where user_id = p_user for update;
  if not found then
    raise exception 'Utilisateur introuvable' using errcode = 'P0002';
  end if;
  if v_role in ('admin', 'super_admin') and not public.est_super_admin_keyli() then
    raise exception 'Seul le super_admin suspend un administrateur' using errcode = '42501';
  end if;

  update public.profiles_keyli
     set suspendu = true, suspension_fin = p_fin, suspension_motif = btrim(p_motif)
   where user_id = p_user;

  -- Connexion bloquée (levée à la date de fin, ou dans 100 ans si indéfinie)
  update auth.users set banned_until = coalesce(p_fin, now() + interval '100 years') where id = p_user;

  insert into public.notifications_keyli (user_id, type, titre, contenu)
  values (p_user, 'compte_suspendu', 'Votre compte est suspendu',
          btrim(p_motif) || coalesce(' — jusqu''au ' || to_char(p_fin, 'DD/MM/YYYY'), ''));

  perform public.journaliser_keyli('compte_suspendu', 'user', p_user::text,
                                   jsonb_build_object('motif', p_motif, 'fin', p_fin));
end;
$$;

-- ============================================================
-- ACTION : réactivation d'un compte suspendu (admin ; admins et
-- super_admins par le super_admin uniquement)
-- ============================================================
create or replace function public.admin_reactiver_compte_keyli(p_user uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role_keyli;
  v_suspendu boolean;
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;

  select role_keyli, suspendu into v_role, v_suspendu
    from public.profiles_keyli where user_id = p_user for update;
  if not found then
    raise exception 'Utilisateur introuvable' using errcode = 'P0002';
  end if;
  if not v_suspendu then
    raise exception 'Ce compte n''est pas suspendu' using errcode = '23514';
  end if;
  if v_role in ('admin', 'super_admin') and not public.est_super_admin_keyli() then
    raise exception 'Seul le super_admin réactive un administrateur' using errcode = '42501';
  end if;

  update public.profiles_keyli
     set suspendu = false, suspension_fin = null, suspension_motif = null
   where user_id = p_user;
  update auth.users set banned_until = null where id = p_user;

  insert into public.notifications_keyli (user_id, type, titre, contenu)
  values (p_user, 'compte_reactive', 'Votre compte est réactivé', nullif(btrim(p_note), ''));

  perform public.journaliser_keyli('compte_reactive', 'user', p_user::text,
                                   jsonb_build_object('note', p_note));
end;
$$;

revoke execute on function public.admin_retirer_verification_compte_keyli(uuid, text) from public, anon;
revoke execute on function public.admin_retirer_verification_bien_keyli(uuid, text) from public, anon;
revoke execute on function public.admin_suspendre_compte_keyli(uuid, text, timestamptz) from public, anon;
revoke execute on function public.admin_reactiver_compte_keyli(uuid, text) from public, anon;
grant execute on function public.admin_retirer_verification_compte_keyli(uuid, text) to authenticated;
grant execute on function public.admin_retirer_verification_bien_keyli(uuid, text) to authenticated;
grant execute on function public.admin_suspendre_compte_keyli(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_reactiver_compte_keyli(uuid, text) to authenticated;
