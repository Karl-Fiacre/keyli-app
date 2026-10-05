-- Keyli — Notation : après une visite effectuée ou un lead conclu
--
-- Décisions du porteur de projet du 2026-10-05 (remplacent la règle
-- provisoire « échange de messages dans les deux sens » du 2026-10-02) :
--   - on note (dans les deux sens, chercheur ↔ propriétaire/agence)
--     seulement après une visite effectuée OU un lead conclu entre les deux
--     personnes, sur ce bien (« après transaction », PRD) ;
--   - une note par personne notée : unicité (bien, auteur, personne notée)
--     au lieu de (bien, auteur) — un propriétaire peut noter chacun de ses
--     locataires successifs, une seule fois chacun.

-- ------------------------------------------------------------
-- « L'utilisateur connecté a-t-il une visite effectuée ou un lead conclu
-- avec p_autre au sujet de p_property ? » — SECURITY DEFINER car un
-- chercheur ne lit ni les visites ni les leads (réservés au propriétaire) ;
-- la réponse ne porte que sur l'appelant lui-même.
-- ------------------------------------------------------------
create or replace function public.relation_notable_keyli(p_property uuid, p_autre uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.visits_keyli v
     where v.property_id = p_property
       and v.status = 'effectuee'
       and ((v.scheduled_by = (select auth.uid()) and v.visitor_user_id = p_autre)
         or (v.scheduled_by = p_autre and v.visitor_user_id = (select auth.uid())))
  ) or exists (
    select 1 from public.leads_keyli l
     where l.property_id = p_property
       and l.stage = 'conclu'
       and ((l.owner_id = (select auth.uid()) and l.contact_user_id = p_autre)
         or (l.owner_id = p_autre and l.contact_user_id = (select auth.uid())))
  );
$$;

revoke execute on function public.relation_notable_keyli(uuid, uuid) from public, anon;
grant execute on function public.relation_notable_keyli(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- Nouvelle règle de notation
-- ------------------------------------------------------------
drop policy "Utilisateur note après un échange" on public.ratings_keyli;

create policy "Utilisateur note après une visite ou un lead conclu"
  on public.ratings_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = rater_id
    and rated_user_id <> rater_id
    and public.relation_notable_keyli(property_id, rated_user_id)
  );

-- ------------------------------------------------------------
-- Une note par personne notée (et non plus une seule par auteur et par bien)
-- ------------------------------------------------------------
alter table public.ratings_keyli drop constraint ratings_keyli_property_id_rater_id_key;
alter table public.ratings_keyli
  add constraint ratings_keyli_une_note_par_personne unique (property_id, rater_id, rated_user_id);
