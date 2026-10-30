-- Keyli — Activité quotidienne de la plateforme (mini-graphiques des
-- indicateurs admin, dashboards enrichis semaine 12)
--
-- Sources : docs/KEYLI_DASHBOARD_DESIGN_SPEC.md (Sparkline), docs/MODULES/admin.md
-- (analytics de base). Lecture seule, réservée aux admins, sans nouvelle
-- donnée : simples comptages par jour sur les tables existantes.

create or replace function public.admin_activite_quotidienne_keyli(p_jours integer default 30)
returns table (
  jour          date,
  inscriptions  bigint,   -- comptes chercheur / propriétaire / agence créés
  vues          bigint,   -- vues d'annonces
  contacts      bigint    -- nouveaux leads (premiers contacts)
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jours integer := least(greatest(coalesce(p_jours, 30), 7), 90);
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  return query
  -- Jours calendaires d'Abidjan (UTC+0), le plus ancien d'abord ; un jour
  -- sans activité vaut 0 (série continue pour le graphique)
  select d::date,
         (select count(*) from public.profiles_keyli p
           where p.role_keyli in ('user', 'owner', 'agency')
             and (p.created_at at time zone 'Africa/Abidjan')::date = d::date),
         (select count(*) from public.property_interactions_keyli i
           where i.interaction_type = 'view'
             and (i.created_at at time zone 'Africa/Abidjan')::date = d::date),
         (select count(*) from public.leads_keyli l
           where l.contact_user_id is not null
             and (l.created_at at time zone 'Africa/Abidjan')::date = d::date)
    from generate_series((now() at time zone 'Africa/Abidjan')::date - (v_jours - 1),
                         (now() at time zone 'Africa/Abidjan')::date, interval '1 day') as d
   order by d;
end;
$$;

revoke execute on function public.admin_activite_quotidienne_keyli(integer) from public, anon;
grant execute on function public.admin_activite_quotidienne_keyli(integer) to authenticated;
