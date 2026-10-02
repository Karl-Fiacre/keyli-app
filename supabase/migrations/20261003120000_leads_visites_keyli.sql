-- Keyli — Pipeline de leads et visites
--
-- Sources : docs/reference/schema_cible_reference.sql (section PIPELINE DE
-- LEADS & VISITES), docs/MODULES/leads-visites.md, docs/MODULES/dashboard.md.
--
-- Un lead est l'état commercial d'un contact (Nouveau → Visite planifiée →
-- Négociation → Conclu) ; la conversation reste dans messages_keyli.
--   - créé automatiquement au premier message d'un chercheur au sujet d'une
--     annonce (trigger sur messages_keyli) ;
--   - ou créé à la main par le propriétaire/agence pour un contact hors
--     plateforme (contact_nom, sans compte Keyli) ;
--   - owner_id toujours égal au propriétaire de l'annonce (imposé par
--     trigger, jamais saisi par le client) ;
--   - leads et visites ne se suppriment pas (historique, visites annulées
--     conservées).

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type public.lead_stage_keyli as enum ('nouveau', 'visite_planifiee', 'negociation', 'conclu');
create type public.visit_status_keyli as enum ('planifiee', 'effectuee', 'annulee');

-- ------------------------------------------------------------
-- Leads (colonnes du schéma de référence)
-- ------------------------------------------------------------
create table public.leads_keyli (
  id                 uuid primary key default gen_random_uuid(),
  property_id        uuid references public.properties_keyli(id) not null,
  owner_id           uuid references auth.users(id) not null,       -- propriétaire ou compte agence
  agent_id           uuid references public.agency_agents_keyli(id), -- si agence, agent assigné
  contact_user_id    uuid references auth.users(id),                -- chercheur, si compte Keyli
  contact_nom        text,                                           -- si contact hors plateforme
  source_message_id  uuid references public.messages_keyli(id),
  stage              public.lead_stage_keyli default 'nouveau',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),

  constraint leads_keyli_contact_identifie check (
    contact_user_id is not null or nullif(btrim(contact_nom), '') is not null
  )
);
create index idx_leads_owner_stage on public.leads_keyli(owner_id, stage);
create index idx_leads_agent on public.leads_keyli(agent_id);
-- Un seul lead par chercheur et par annonce
create unique index uq_leads_keyli_contact_annonce
  on public.leads_keyli (property_id, contact_user_id) where contact_user_id is not null;

create trigger trg_leads_keyli_updated_at
  before update on public.leads_keyli
  for each row execute function public.set_updated_at_keyli();

-- owner_id recopié de l'annonce ; agent obligatoirement rattaché à ce compte
create or replace function public.coherence_lead_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.owner_id into new.owner_id from public.properties_keyli p where p.id = new.property_id;

  if new.agent_id is not null and not exists (
    select 1 from public.agency_agents_keyli a
     where a.id = new.agent_id and a.agency_user_id = new.owner_id
  ) then
    raise exception 'L''agent assigné n''appartient pas au compte propriétaire de l''annonce'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_leads_keyli_coherence
  before insert or update on public.leads_keyli
  for each row execute function public.coherence_lead_keyli();

revoke execute on function public.coherence_lead_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Création automatique au premier contact d'un chercheur
-- ------------------------------------------------------------
create or replace function public.creer_lead_au_contact_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.property_id is not null
     and exists (select 1 from public.properties_keyli p
                  where p.id = new.property_id and p.owner_id = new.to_user) then
    insert into public.leads_keyli (property_id, owner_id, contact_user_id, source_message_id)
    values (new.property_id, new.to_user, new.from_user, new.id)
    on conflict (property_id, contact_user_id) where contact_user_id is not null do nothing;
  end if;
  return null;
end;
$$;

create trigger trg_messages_keyli_lead
  after insert on public.messages_keyli
  for each row execute function public.creer_lead_au_contact_keyli();

revoke execute on function public.creer_lead_au_contact_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Visites (colonnes du schéma de référence)
-- ------------------------------------------------------------
create table public.visits_keyli (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.leads_keyli(id),
  property_id     uuid references public.properties_keyli(id) not null,
  scheduled_by    uuid references auth.users(id) not null,
  visitor_user_id uuid references auth.users(id),
  visitor_nom     text,
  scheduled_at    timestamptz not null,
  status          public.visit_status_keyli default 'planifiee',
  created_at      timestamptz default now(),

  constraint visits_keyli_visiteur_identifie check (
    visitor_user_id is not null or nullif(btrim(visitor_nom), '') is not null
  )
);
create index idx_visits_scheduled_by on public.visits_keyli(scheduled_by, scheduled_at);

-- ------------------------------------------------------------
-- RLS — leads
-- ------------------------------------------------------------
alter table public.leads_keyli enable row level security;

create policy "Propriétaire lit ses leads" on public.leads_keyli
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Admin lit tous les leads" on public.leads_keyli
  for select to authenticated using ((select public.est_admin_keyli()));

-- Création manuelle (contact hors plateforme) sur l'une de ses annonces
create policy "Propriétaire crée un lead hors plateforme" on public.leads_keyli
  for insert to authenticated
  with check (
    exists (select 1 from public.properties_keyli p
             where p.id = property_id and p.owner_id = (select auth.uid()))
    and (select public.current_user_role_keyli()) in ('owner', 'agency')
  );

-- Faire progresser le pipeline, assigner un agent
create policy "Propriétaire fait avancer ses leads" on public.leads_keyli
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on public.leads_keyli from anon, authenticated;
grant select on public.leads_keyli to authenticated;
grant insert (property_id, agent_id, contact_nom, stage) on public.leads_keyli to authenticated;
grant update (agent_id, contact_nom, stage) on public.leads_keyli to authenticated;

-- ------------------------------------------------------------
-- RLS — visites
-- ------------------------------------------------------------
alter table public.visits_keyli enable row level security;

create policy "Propriétaire lit ses visites" on public.visits_keyli
  for select to authenticated using ((select auth.uid()) = scheduled_by);
create policy "Admin lit toutes les visites" on public.visits_keyli
  for select to authenticated using ((select public.est_admin_keyli()));

-- Planifier : sur l'une de ses annonces ; lead éventuel du même bien et à
-- soi ; visiteur avec compte = quelqu'un qui nous a écrit sur ce bien.
create policy "Propriétaire planifie une visite" on public.visits_keyli
  for insert to authenticated
  with check (
    (select auth.uid()) = scheduled_by
    and exists (select 1 from public.properties_keyli p
                 where p.id = property_id and p.owner_id = (select auth.uid()))
    and (lead_id is null or exists (
          select 1 from public.leads_keyli l
           where l.id = lead_id and l.property_id = visits_keyli.property_id
             and l.owner_id = (select auth.uid())))
    and (visitor_user_id is null
         or public.a_recu_message_de_keyli(visitor_user_id, property_id))
  );

-- Mettre à jour : effectuée, annulée, ou replanifiée — jamais supprimée
create policy "Propriétaire met à jour ses visites" on public.visits_keyli
  for update to authenticated
  using ((select auth.uid()) = scheduled_by)
  with check ((select auth.uid()) = scheduled_by);

revoke all on public.visits_keyli from anon, authenticated;
grant select on public.visits_keyli to authenticated;
grant insert (lead_id, property_id, scheduled_by, visitor_user_id, visitor_nom, scheduled_at)
  on public.visits_keyli to authenticated;
grant update (status, scheduled_at) on public.visits_keyli to authenticated;
