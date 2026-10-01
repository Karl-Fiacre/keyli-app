-- Keyli — Module vérification : documents_keyli + stockage des fichiers
--
-- Sources : docs/reference/schema_cible_reference.sql (section VÉRIFICATION),
-- docs/MODULES/verification.md, docs/ROLES.md, docs/PRD_REGLES.md
-- (MODULE VÉRIFICATION), docs/CONTEXT.md (règle 4).
--
-- Décisions du porteur de projet du 2026-10-02 : fichiers de 5 Mo maximum,
-- formats PDF / JPEG / PNG, limite imposée par un bucket Supabase Storage
-- privé (refus côté serveur à chaque envoi, impossible à contourner depuis
-- le client) — pas d'Edge Function de validation.
--
-- Côté client : déposer ses documents et suivre leur statut. Le traitement
-- (approbation / rejet, passage de verified / is_verified à true, entrée
-- audit_logs_keyli) se fera côté serveur avec le module admin.

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type public.document_type_keyli as enum ('acd', 'registre', 'extrait_naissance', 'cert_residence');
create type public.document_status_keyli as enum ('pending', 'approved', 'rejected');

-- ------------------------------------------------------------
-- Table (colonnes identiques au schéma de référence)
-- file_url contient le chemin de l'objet dans le bucket privé
-- documents_keyli (« <user_id>/<fichier> »), pas une URL publique.
-- ------------------------------------------------------------
create table public.documents_keyli (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) not null,
  property_id   uuid references public.properties_keyli(id),
  doc_type      public.document_type_keyli not null,
  file_url      text not null,
  status        public.document_status_keyli default 'pending',
  review_notes  text,
  created_at    timestamptz default now(),
  reviewed_at   timestamptz,

  -- Jamais de rejet silencieux : un rejet porte toujours un commentaire
  constraint documents_keyli_rejet_commente check (
    status is distinct from 'rejected' or nullif(btrim(review_notes), '') is not null
  )
);

-- Pas de doublon en attente ou approuvé pour un même document : même
-- utilisateur, même type et même bien (un ACD par bien ; les pièces
-- personnelles et le registre ont property_id NULL, comptés comme égaux).
-- Un document rejeté peut être redéposé.
create unique index uq_documents_keyli_en_cours
  on public.documents_keyli (user_id, doc_type, property_id) nulls not distinct
  where status in ('pending', 'approved');

-- File de vérification admin (docs/DATABASE_LOGIC.md)
create index idx_documents_status_date on public.documents_keyli (status, created_at);

-- ------------------------------------------------------------
-- RLS — documents_keyli
-- ------------------------------------------------------------
alter table public.documents_keyli enable row level security;

create policy "Utilisateur lit ses documents"
  on public.documents_keyli for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Dépôt : pour soi-même, type de pièce selon le rôle (docs/ROLES.md) —
-- propriétaire : acd / extrait_naissance / cert_residence ;
-- agence : registre. Le fichier doit être dans son propre dossier du
-- bucket, et un bien éventuel doit lui appartenir.
create policy "Propriétaire ou agence dépose ses documents"
  on public.documents_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      ((select public.current_user_role_keyli()) = 'owner'
        and doc_type in ('acd', 'extrait_naissance', 'cert_residence'))
      or
      ((select public.current_user_role_keyli()) = 'agency'
        and doc_type = 'registre')
    )
    and split_part(file_url, '/', 1) = (select auth.uid())::text
    and (
      property_id is null
      or exists (
        select 1 from public.properties_keyli p
         where p.id = property_id and p.owner_id = (select auth.uid())
      )
    )
  );

-- Aucune modification ni suppression côté client : statut, commentaire et
-- date de revue relèvent de l'admin ; un document rejeté se redépose.
revoke all on public.documents_keyli from anon, authenticated;
grant select on public.documents_keyli to authenticated;
grant insert (user_id, property_id, doc_type, file_url) on public.documents_keyli to authenticated;

-- ------------------------------------------------------------
-- Stockage — bucket privé, 5 Mo, PDF / JPEG / PNG
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents_keyli', 'documents_keyli', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png']);

-- Envoi : propriétaires et agences, dans leur propre dossier uniquement.
create policy "Documents keyli : envoi dans son dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents_keyli'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_role_keyli()) in ('owner', 'agency')
  );

-- Lecture : ses propres fichiers uniquement (l'admin lira via le module admin).
create policy "Documents keyli : lecture de son dossier"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents_keyli'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Pas de policy UPDATE ni DELETE : un fichier déposé ne se remplace pas
-- (ce qui contournerait la revue admin) ; on dépose un nouveau document.
