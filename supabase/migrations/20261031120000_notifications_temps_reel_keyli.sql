-- Keyli — Notifications in-app en temps réel (cloche de l'en-tête)
--
-- Sources : docs/KEYLI_DASHBOARD_DESIGN_SPEC.md (cloche avec pastille,
-- oscillation à la réception), docs/ANIMATIONS.md (effet 8).
--
-- Même choix que pour la messagerie (décision du porteur du 2026-10-29) :
-- Supabase Realtime, filtré par la RLS (chacun ne reçoit que ses propres
-- notifications), avec une actualisation périodique côté client en filet
-- de sécurité. Les règles de lecture et de marquage « lue » sont inchangées
-- (migration 20261005140000) : chacun lit ses notifications et ne modifie
-- que la colonne `lue`.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public'
                        and tablename = 'notifications_keyli') then
    alter publication supabase_realtime add table public.notifications_keyli;
  end if;
end;
$$;
