-- Keyli — Module admin, fondations : rôles, journal d'audit, lecture admin,
-- actions sensibles
--
-- Sources : docs/reference/schema_cible_reference.sql (audit_logs_keyli),
-- docs/MODULES/admin.md, docs/MODULES/verification.md, docs/ROLES.md
-- (admin, super_admin), docs/DATABASE_LOGIC.md (actions sensibles).
--
-- Décisions du porteur de projet du 2026-10-02 :
--   - chaque action admin sensible est une fonction SQL (RPC) qui vérifie
--     le rôle, exécute l'action ET écrit l'audit dans la même transaction
--     (remplace les Edge Functions prévues pour ces actions) ;
--   - propriétaire vérifié = extrait de naissance ET certificat de résidence
--     approuvés ; agence vérifiée = registre approuvé ; bien vérifié = son
--     ACD approuvé ;
--   - journal d'audit : un admin lit ses propres entrées, le super_admin
--     lit tout ; personne ne modifie ni ne supprime une entrée.
--
-- Les administrateurs n'écrivent JAMAIS directement dans les tables
-- sensibles : aucun privilège d'écriture ne leur est donné, tout passe par
-- les fonctions ci-dessous.

-- ============================================================
-- Rôles administrateurs
-- ============================================================
create or replace function public.est_admin_keyli()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select role_keyli in ('admin', 'super_admin')
      from public.profiles_keyli where user_id = (select auth.uid())
  ), false);
$$;

create or replace function public.est_super_admin_keyli()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select role_keyli = 'super_admin'
      from public.profiles_keyli where user_id = (select auth.uid())
  ), false);
$$;

revoke execute on function public.est_admin_keyli() from public, anon;
revoke execute on function public.est_super_admin_keyli() from public, anon;
grant execute on function public.est_admin_keyli() to authenticated;
grant execute on function public.est_super_admin_keyli() to authenticated;

-- ============================================================
-- Journal d'audit (colonnes et index du schéma de référence)
-- ============================================================
create table public.audit_logs_keyli (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null,
  action       text not null,
  entity_type  text not null,   -- 'document' | 'property' | 'user' | 'report' | 'subscription' | 'plan'
  entity_id    text,
  details      jsonb default '{}',
  created_at   timestamptz default now()
);
create index idx_audit_admin on public.audit_logs_keyli(admin_id);
create index idx_audit_created on public.audit_logs_keyli(created_at desc);
create index idx_audit_entity on public.audit_logs_keyli(entity_type, entity_id);

alter table public.audit_logs_keyli enable row level security;

create policy "Super admin lit tout le journal"
  on public.audit_logs_keyli for select
  to authenticated
  using ((select public.est_super_admin_keyli()));

create policy "Admin lit ses propres entrées"
  on public.audit_logs_keyli for select
  to authenticated
  using ((select public.est_admin_keyli()) and admin_id = (select auth.uid()));

-- Écriture uniquement par les fonctions d'action ; aucune modification ni
-- suppression possible depuis l'API.
revoke all on public.audit_logs_keyli from anon, authenticated;
grant select on public.audit_logs_keyli to authenticated;

-- Écriture d'une entrée — interne, appelée par les fonctions d'action
create or replace function public.journaliser_keyli(
  p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs_keyli (admin_id, action, entity_type, entity_id, details)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'));
$$;

revoke execute on function public.journaliser_keyli(text, text, text, jsonb) from public, anon, authenticated;

-- ============================================================
-- Lecture admin (supervision) — complète les policies existantes
-- ============================================================
create policy "Admin lit tous les profils" on public.profiles_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit toutes les annonces" on public.properties_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit tous les médias" on public.property_media_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit tous les agents" on public.agency_agents_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit tous les documents" on public.documents_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit tous les abonnements" on public.subscriptions_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit toutes les transactions" on public.transactions_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit toutes les tentatives de paiement" on public.payment_attempts_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit toutes les mises en ligne" on public.property_publications_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit tous les signalements" on public.reports_keyli
  for select to authenticated using ((select public.est_admin_keyli()));
create policy "Admin lit tous les forfaits, désactivés compris" on public.plans_keyli
  for select to authenticated using ((select public.est_admin_keyli()));

-- Fichiers de vérification (bucket privé) : lecture admin pour la revue
create policy "Documents keyli : lecture admin"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents_keyli' and (select public.est_admin_keyli()));

-- Les messages privés restent inaccessibles à l'admin (aucune règle
-- produit ne prévoit leur lecture).

-- ============================================================
-- ACTION : revue d'un document (admin)
-- ============================================================
create or replace function public.admin_reviser_document_keyli(
  p_document uuid, p_decision public.document_status_keyli, p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc   public.documents_keyli%rowtype;
  v_role  public.user_role_keyli;
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Décision invalide : %', p_decision using errcode = '22023';
  end if;

  select * into v_doc from public.documents_keyli where id = p_document for update;
  if not found then
    raise exception 'Document introuvable' using errcode = 'P0002';
  end if;
  if v_doc.status <> 'pending' then
    raise exception 'Ce document a déjà été traité (%)', v_doc.status using errcode = '23514';
  end if;

  -- La contrainte documents_keyli_rejet_commente impose un commentaire au rejet
  update public.documents_keyli
     set status = p_decision, review_notes = nullif(btrim(p_notes), ''), reviewed_at = now()
   where id = p_document;

  if p_decision = 'approved' then
    -- Bien vérifié = son ACD approuvé
    if v_doc.doc_type = 'acd' and v_doc.property_id is not null then
      update public.properties_keyli set is_verified = true where id = v_doc.property_id;
    end if;

    -- Compte vérifié : agence = registre ; propriétaire = extrait ET certificat
    select role_keyli into v_role from public.profiles_keyli where user_id = v_doc.user_id;
    if (v_role = 'agency' and v_doc.doc_type = 'registre')
       or (v_role = 'owner'
           and exists (select 1 from public.documents_keyli d
                        where d.user_id = v_doc.user_id and d.doc_type = 'extrait_naissance' and d.status = 'approved')
           and exists (select 1 from public.documents_keyli d
                        where d.user_id = v_doc.user_id and d.doc_type = 'cert_residence' and d.status = 'approved'))
    then
      update public.profiles_keyli
         set verified = true, verification_date = now()
       where user_id = v_doc.user_id and verified is not true;
    end if;
  end if;

  perform public.journaliser_keyli(
    'document_' || p_decision::text, 'document', p_document::text,
    jsonb_build_object('doc_type', v_doc.doc_type, 'user_id', v_doc.user_id,
                       'property_id', v_doc.property_id, 'notes', p_notes)
  );
end;
$$;

-- ============================================================
-- ACTION : traitement d'un signalement (admin)
-- ============================================================
create or replace function public.admin_traiter_signalement_keyli(
  p_report uuid, p_statut public.report_status_keyli, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avant public.report_status_keyli;
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if p_statut = 'pending' then
    raise exception 'Un signalement traité ne revient pas « en attente »' using errcode = '22023';
  end if;

  select status into v_avant from public.reports_keyli where id = p_report for update;
  if not found then
    raise exception 'Signalement introuvable' using errcode = 'P0002';
  end if;

  update public.reports_keyli set status = p_statut where id = p_report;

  perform public.journaliser_keyli(
    'signalement_' || p_statut::text, 'report', p_report::text,
    jsonb_build_object('avant', v_avant, 'apres', p_statut, 'note', p_note)
  );
end;
$$;

-- ============================================================
-- ACTION : changement de rôle (super_admin — nomme / retire les admins)
-- ============================================================
create or replace function public.super_admin_changer_role_keyli(
  p_user uuid, p_role public.user_role_keyli
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avant public.user_role_keyli;
begin
  if not public.est_super_admin_keyli() then
    raise exception 'Action réservée au super_admin' using errcode = '42501';
  end if;
  if p_role = 'super_admin' then
    raise exception 'Le rôle super_admin ne s''attribue qu''en SQL direct' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'Un super_admin ne change pas son propre rôle' using errcode = '42501';
  end if;

  select role_keyli into v_avant from public.profiles_keyli where user_id = p_user for update;
  if not found then
    raise exception 'Utilisateur introuvable' using errcode = 'P0002';
  end if;
  if v_avant = 'super_admin' then
    raise exception 'Le rôle d''un super_admin ne se modifie qu''en SQL direct' using errcode = '42501';
  end if;

  update public.profiles_keyli set role_keyli = p_role where user_id = p_user;

  perform public.journaliser_keyli(
    'role_modifie', 'user', p_user::text,
    jsonb_build_object('avant', v_avant, 'apres', p_role)
  );
end;
$$;

-- ============================================================
-- ACTION : modification d'un forfait (super_admin)
-- ============================================================
create or replace function public.super_admin_modifier_forfait_keyli(
  p_plan uuid, p_prix_mensuel numeric, p_seuil_min integer, p_seuil_max integer,
  p_prix_depassement_unitaire numeric, p_actif boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avant public.plans_keyli%rowtype;
  v_apres public.plans_keyli%rowtype;
begin
  if not public.est_super_admin_keyli() then
    raise exception 'Action réservée au super_admin' using errcode = '42501';
  end if;
  if p_prix_mensuel is null or p_prix_mensuel < 0 or p_seuil_min is null or p_seuil_min < 1
     or (p_seuil_max is not null and p_seuil_max < p_seuil_min)
     or (p_prix_depassement_unitaire is not null and p_prix_depassement_unitaire < 0) then
    raise exception 'Valeurs de forfait incohérentes' using errcode = '22023';
  end if;

  select * into v_avant from public.plans_keyli where id = p_plan for update;
  if not found then
    raise exception 'Forfait introuvable' using errcode = 'P0002';
  end if;

  update public.plans_keyli
     set prix_mensuel = p_prix_mensuel, seuil_min = p_seuil_min, seuil_max = p_seuil_max,
         prix_depassement_unitaire = p_prix_depassement_unitaire, actif = coalesce(p_actif, actif)
   where id = p_plan
  returning * into v_apres;

  perform public.journaliser_keyli(
    'forfait_modifie', 'plan', p_plan::text,
    jsonb_build_object('avant', to_jsonb(v_avant), 'apres', to_jsonb(v_apres))
  );
end;
$$;

-- ============================================================
-- ACTION : formule personnalisée Grande Agence (super_admin)
-- Le trigger validate_subscription_keyli refuse toute formule hors
-- forfait Grande Agence.
-- ============================================================
create or replace function public.super_admin_formule_negociee_keyli(
  p_subscription uuid, p_prix_depassement_negocie numeric,
  p_montant_depassement_negocie numeric, p_conditions text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avant public.subscriptions_keyli%rowtype;
begin
  if not public.est_super_admin_keyli() then
    raise exception 'Action réservée au super_admin' using errcode = '42501';
  end if;

  select * into v_avant from public.subscriptions_keyli where id = p_subscription for update;
  if not found then
    raise exception 'Abonnement introuvable' using errcode = 'P0002';
  end if;

  update public.subscriptions_keyli
     set prix_depassement_negocie = p_prix_depassement_negocie,
         montant_depassement_negocie = p_montant_depassement_negocie,
         conditions_negociees = nullif(btrim(p_conditions), '')
   where id = p_subscription;

  perform public.journaliser_keyli(
    'formule_negociee', 'subscription', p_subscription::text,
    jsonb_build_object(
      'user_id', v_avant.user_id,
      'avant', jsonb_build_object('prix', v_avant.prix_depassement_negocie,
                                  'montant', v_avant.montant_depassement_negocie,
                                  'conditions', v_avant.conditions_negociees),
      'apres', jsonb_build_object('prix', p_prix_depassement_negocie,
                                  'montant', p_montant_depassement_negocie,
                                  'conditions', p_conditions))
  );
end;
$$;

-- Fonctions d'action : appelables par tout compte connecté, le contrôle de
-- rôle est fait à l'intérieur (refus 42501).
revoke execute on function public.admin_reviser_document_keyli(uuid, public.document_status_keyli, text) from public, anon;
revoke execute on function public.admin_traiter_signalement_keyli(uuid, public.report_status_keyli, text) from public, anon;
revoke execute on function public.super_admin_changer_role_keyli(uuid, public.user_role_keyli) from public, anon;
revoke execute on function public.super_admin_modifier_forfait_keyli(uuid, numeric, integer, integer, numeric, boolean) from public, anon;
revoke execute on function public.super_admin_formule_negociee_keyli(uuid, numeric, numeric, text) from public, anon;
grant execute on function public.admin_reviser_document_keyli(uuid, public.document_status_keyli, text) to authenticated;
grant execute on function public.admin_traiter_signalement_keyli(uuid, public.report_status_keyli, text) to authenticated;
grant execute on function public.super_admin_changer_role_keyli(uuid, public.user_role_keyli) to authenticated;
grant execute on function public.super_admin_modifier_forfait_keyli(uuid, numeric, integer, integer, numeric, boolean) to authenticated;
grant execute on function public.super_admin_formule_negociee_keyli(uuid, numeric, numeric, text) to authenticated;
