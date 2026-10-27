-- Keyli — Messagerie : conversations, lecture, temps réel (Sprint 2)
--
-- Sources : docs/MODULES/messagerie.md (aucun paywall, anti-démarchage,
-- « read » à l'ouverture réelle du fil), docs/DATABASE_LOGIC.md.
--
-- Décision du porteur de projet du 2026-10-29 : nouveaux messages en
-- TEMPS RÉEL (Supabase Realtime sur messages_keyli, filtré par la RLS), avec
-- une actualisation périodique côté client comme filet de sécurité.
--
-- Une conversation = un bien + un interlocuteur. Les règles d'envoi et de
-- lecture (migration 20261002170000) sont inchangées.

-- Boîte de réception : messages envoyés et reçus d'un compte, du plus récent
create index idx_messages_expediteur_date on public.messages_keyli (from_user, created_at desc);
create index idx_messages_destinataire_date on public.messages_keyli (to_user, created_at desc);

-- ============================================================
-- Conversations du compte connecté : dernier message, non lus, annonce et
-- profil public de l'interlocuteur. SECURITY INVOKER : la RLS ne laisse voir
-- que ses propres messages ; l'annonce peut être absente (archivée ou
-- masquée), l'interlocuteur n'est connu que par son profil public.
-- ============================================================
create or replace function public.mes_conversations_keyli()
returns table (
  property_id        uuid,
  titre_annonce      text,
  image_annonce      text,
  interlocuteur      uuid,
  nom_interlocuteur  text,
  interlocuteur_verifie boolean,
  dernier_message    text,
  dernier_envoi      timestamptz,
  envoye_par_moi     boolean,
  non_lus            bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with mes_messages as (
    select m.*,
           case when m.from_user = (select auth.uid()) then m.to_user else m.from_user end as autre
      from public.messages_keyli m
     where (select auth.uid()) in (m.from_user, m.to_user)
  ),
  conversations as (
    select distinct on (mm.property_id, mm.autre)
           mm.property_id, mm.autre, mm.body, mm.created_at, mm.from_user
      from mes_messages mm
     order by mm.property_id, mm.autre, mm.created_at desc
  ),
  non_lus as (
    select mm.property_id, mm.autre, count(*) as n
      from mes_messages mm
     where mm.to_user = (select auth.uid()) and not coalesce(mm.read, false)
     group by mm.property_id, mm.autre
  )
  select c.property_id, p.title, p.main_image_url, c.autre, pp.nom_affiche, coalesce(pp.verified, false),
         c.body, c.created_at, c.from_user = (select auth.uid()), coalesce(n.n, 0)
    from conversations c
    left join public.properties_keyli p on p.id = c.property_id
    left join public.profils_publics_keyli pp on pp.user_id = c.autre
    left join non_lus n on n.property_id is not distinct from c.property_id and n.autre = c.autre
   order by c.created_at desc;
$$;

revoke execute on function public.mes_conversations_keyli() from public, anon;
grant execute on function public.mes_conversations_keyli() to authenticated;

-- ============================================================
-- Temps réel : les insertions de messages sont diffusées par Supabase
-- Realtime ; chaque abonné ne reçoit que les lignes que la RLS lui laisse
-- lire (expéditeur ou destinataire).
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages_keyli') then
    alter publication supabase_realtime add table public.messages_keyli;
  end if;
end;
$$;
