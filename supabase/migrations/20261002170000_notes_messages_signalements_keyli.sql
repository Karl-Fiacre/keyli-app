-- Keyli — Messagerie, notation, signalements
--
-- Sources : docs/reference/schema_cible_reference.sql (section NOTATION,
-- MESSAGERIE, SIGNALEMENTS), docs/MODULES/messagerie.md,
-- docs/MODULES/notation.md, docs/MODULES/admin.md (modération),
-- docs/PRD_REGLES.md (MODULE CHERCHEUR, MODULE NOTATION).
--
-- Décisions du porteur de projet du 2026-10-02 :
--   - profiles_keyli.rating_avg recalculé par trigger SQL ;
--   - on ne note que quelqu'un avec qui on a échangé au moins un message
--     dans chaque sens au sujet du bien (à resserrer sur « lead conclu »
--     quand leads_keyli existera).

-- ============================================================
-- MESSAGERIE — aucun paywall (PRD 11.3) : tout compte connecté écrit
-- ============================================================
create table public.messages_keyli (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid references auth.users(id) not null,
  to_user      uuid references auth.users(id) not null,
  property_id  uuid references public.properties_keyli(id),
  body         text not null,
  read         boolean default false,
  created_at   timestamptz default now(),

  constraint messages_keyli_corps_non_vide check (nullif(btrim(body), '') is not null),
  constraint messages_keyli_pas_a_soi_meme check (from_user <> to_user)
);

-- Badge « nouveaux messages » (MessagePreviewList) et fils de discussion
create index idx_messages_destinataire_non_lus on public.messages_keyli (to_user) where read = false;
create index idx_messages_fil on public.messages_keyli (property_id, from_user, to_user, created_at);

alter table public.messages_keyli enable row level security;

create policy "Participant lit ses messages"
  on public.messages_keyli for select
  to authenticated
  using ((select auth.uid()) in (from_user, to_user));

-- « L'utilisateur connecté a-t-il reçu un message de p_auteur au sujet de
-- p_property ? » — une policy de messages_keyli ne peut pas interroger
-- messages_keyli directement (récursion RLS) : SECURITY DEFINER, mais la
-- question porte uniquement sur la boîte de réception de l'appelant, donc
-- elle ne révèle rien des conversations des autres.
create or replace function public.a_recu_message_de_keyli(p_auteur uuid, p_property uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.messages_keyli m
     where m.from_user = p_auteur
       and m.to_user = (select auth.uid())
       and m.property_id is not distinct from p_property
  );
$$;

revoke execute on function public.a_recu_message_de_keyli(uuid, uuid) from public, anon;
grant execute on function public.a_recu_message_de_keyli(uuid, uuid) to authenticated;

-- Envoi : en son propre nom. Premier contact = au sujet d'une annonce
-- visible, adressé à son propriétaire. Sinon, réponse uniquement à
-- quelqu'un qui nous a déjà écrit (au sujet du même bien, ou en direct) :
-- personne ne peut être démarché à froid.
create policy "Utilisateur envoie un message"
  on public.messages_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = from_user
    and (
      exists (
        select 1 from public.properties_keyli p
         where p.id = property_id and p.owner_id = to_user
      )
      or public.a_recu_message_de_keyli(to_user, property_id)
    )
  );

-- Lecture du fil : seul le destinataire marque un message comme lu.
create policy "Destinataire marque ses messages lus"
  on public.messages_keyli for update
  to authenticated
  using ((select auth.uid()) = to_user)
  with check ((select auth.uid()) = to_user);

-- Un message envoyé ne se modifie ni ne se supprime.
revoke all on public.messages_keyli from anon, authenticated;
grant select on public.messages_keyli to authenticated;
grant insert (from_user, to_user, property_id, body) on public.messages_keyli to authenticated;
grant update (read) on public.messages_keyli to authenticated;

-- ============================================================
-- NOTATION — publique, bidirectionnelle (colonnes du schéma de référence)
-- ============================================================
create table public.ratings_keyli (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references public.properties_keyli(id) not null,
  rater_id       uuid not null,
  rated_user_id  uuid not null,
  rating         integer check (rating between 1 and 5),
  comment        text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (property_id, rater_id)
);

create index idx_ratings_rated_user on public.ratings_keyli (rated_user_id);

create trigger trg_ratings_keyli_updated_at
  before update on public.ratings_keyli
  for each row execute function public.set_updated_at_keyli();

-- Moyenne recalculée en base à chaque note ajoutée, modifiée ou retirée
create or replace function public.recalculer_note_moyenne_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  foreach v_user in array array[old.rated_user_id, new.rated_user_id] loop
    if v_user is not null then
      update public.profiles_keyli
         set rating_avg = coalesce((
               select round(avg(r.rating)::numeric, 2)
                 from public.ratings_keyli r
                where r.rated_user_id = v_user and r.rating is not null), 0)
       where user_id = v_user;
    end if;
  end loop;
  return null;
end;
$$;

create trigger trg_ratings_keyli_note_moyenne
  after insert or update or delete on public.ratings_keyli
  for each row execute function public.recalculer_note_moyenne_keyli();

revoke execute on function public.recalculer_note_moyenne_keyli() from public, anon, authenticated;

alter table public.ratings_keyli enable row level security;

-- Notes publiques par design (docs/MODULES/notation.md)
create policy "Lecture publique des notes"
  on public.ratings_keyli for select
  to anon, authenticated
  using (true);

-- Noter : en son nom, quelqu'un d'autre, avec qui on a échangé au moins un
-- message dans chaque sens au sujet de ce bien. Les règles d'envoi des
-- messages garantissent qu'une des deux parties est le propriétaire du bien.
create policy "Utilisateur note après un échange"
  on public.ratings_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = rater_id
    and rated_user_id <> rater_id
    and exists (
      select 1 from public.messages_keyli m
       where m.property_id = ratings_keyli.property_id
         and m.from_user = (select auth.uid()) and m.to_user = ratings_keyli.rated_user_id
    )
    and exists (
      select 1 from public.messages_keyli m
       where m.property_id = ratings_keyli.property_id
         and m.from_user = ratings_keyli.rated_user_id and m.to_user = (select auth.uid())
    )
  );

-- L'auteur peut revoir sa note et son commentaire, pas la cible ni le bien.
create policy "Auteur modifie sa note"
  on public.ratings_keyli for update
  to authenticated
  using ((select auth.uid()) = rater_id)
  with check ((select auth.uid()) = rater_id);

revoke all on public.ratings_keyli from anon, authenticated;
grant select on public.ratings_keyli to anon, authenticated;
grant insert (property_id, rater_id, rated_user_id, rating, comment) on public.ratings_keyli to authenticated;
grant update (rating, comment) on public.ratings_keyli to authenticated;

-- ============================================================
-- SIGNALEMENTS — traités par l'admin (colonnes du schéma de référence)
-- ============================================================
create type public.report_status_keyli as enum ('pending', 'reviewed', 'resolved');

create table public.reports_keyli (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid references auth.users(id) not null,
  property_id   uuid references public.properties_keyli(id),
  reason        text not null,
  status        public.report_status_keyli default 'pending',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  constraint reports_keyli_motif_non_vide check (nullif(btrim(reason), '') is not null)
);

-- File de modération admin, visible dès la création (docs/MODULES/admin.md)
create index idx_reports_status_date on public.reports_keyli (status, created_at);

-- Pas de signalements en rafale : un seul en attente par personne et par annonce
create unique index uq_reports_keyli_un_en_attente
  on public.reports_keyli (reporter_id, property_id) nulls not distinct
  where status = 'pending';

create trigger trg_reports_keyli_updated_at
  before update on public.reports_keyli
  for each row execute function public.set_updated_at_keyli();

alter table public.reports_keyli enable row level security;

create policy "Utilisateur lit ses signalements"
  on public.reports_keyli for select
  to authenticated
  using ((select auth.uid()) = reporter_id);

-- Signaler une annonce visible, en son nom ; le statut reste « pending »
-- jusqu'au traitement par l'admin (module admin).
create policy "Utilisateur signale une annonce"
  on public.reports_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and (property_id is null
         or exists (select 1 from public.properties_keyli p where p.id = property_id))
  );

revoke all on public.reports_keyli from anon, authenticated;
grant select on public.reports_keyli to authenticated;
grant insert (reporter_id, property_id, reason) on public.reports_keyli to authenticated;
