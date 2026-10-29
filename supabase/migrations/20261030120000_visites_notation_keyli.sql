-- Keyli — Visites côté chercheur et avis après visite (Sprint 2)
--
-- Sources : docs/MODULES/leads-visites.md, docs/MODULES/notation.md,
-- docs/PRD_REGLES.md (notation après transaction).
--
-- Décisions du porteur de projet du 2026-10-30 :
--   - le chercheur voit ses visites (dans la conversation) et reçoit une
--     notification in-app à la planification, au changement d'horaire, à
--     l'annulation et quand la visite est marquée effectuée (invitation à
--     donner son avis) ;
--   - planifier une visite fait passer le lead « nouveau » → « visite
--     planifiée » (jamais de retour en arrière ; le reste reste manuel) ;
--   - avis publics : note + commentaire (500 caractères), nom public de
--     l'auteur et date ; l'auteur peut modifier son avis.
-- Inchangé : seul le propriétaire / l'agence planifie et met à jour une
-- visite ; on ne note qu'après une visite effectuée ou un lead conclu.

-- ============================================================
-- Le visiteur lit ses propres visites (jamais celles des autres)
-- ============================================================
create policy "Visiteur lit ses visites" on public.visits_keyli
  for select to authenticated using ((select auth.uid()) = visitor_user_id);

-- Visites d'un visiteur (conversation, futur tableau de bord chercheur)
create index idx_visits_visitor on public.visits_keyli (visitor_user_id, scheduled_at)
  where visitor_user_id is not null;

-- ============================================================
-- Garde-fous et lien avec le lead
-- ============================================================
create or replace function public.controler_visite_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Garde-fous réservés aux écritures du propriétaire de l'annonce : une
  -- écriture serveur (auth.uid() NULL, reprise d'historique) n'y est pas
  -- soumise, et une tentative sur l'annonce d'autrui est refusée par la RLS
  -- juste après ce trigger (sans message de date trompeur).
  v_client boolean := (select auth.uid()) is not null
                      and exists (select 1 from public.properties_keyli p
                                   where p.id = new.property_id and p.owner_id = (select auth.uid()));
begin
  if tg_op = 'INSERT' then
    -- Rattachée automatiquement au lead du visiteur sur ce bien
    if new.lead_id is null and new.visitor_user_id is not null then
      select l.id into new.lead_id
        from public.leads_keyli l
       where l.property_id = new.property_id and l.contact_user_id = new.visitor_user_id;
    end if;
    if v_client then
      -- Une visite se planifie dans le futur, toujours au statut « planifiée »
      if new.scheduled_at <= now() then
        raise exception 'Une visite se planifie à une date future' using errcode = '23514';
      end if;
      new.status := 'planifiee';
    end if;
    return new;
  end if;

  if not v_client then
    return new;
  end if;

  -- Une visite effectuée ou annulée est définitive (historique, avis)
  if old.status in ('effectuee', 'annulee')
     and (new.status is distinct from old.status or new.scheduled_at is distinct from old.scheduled_at) then
    raise exception 'Cette visite est déjà %', case old.status when 'effectuee' then 'effectuée' else 'annulée' end
      using errcode = '23514';
  end if;
  -- Replanification : à une date future
  if new.scheduled_at is distinct from old.scheduled_at and new.scheduled_at <= now() then
    raise exception 'Une visite se replanifie à une date future' using errcode = '23514';
  end if;
  -- « Effectuée » seulement une fois l'heure passée : l'avis suit une vraie visite
  if new.status = 'effectuee' and old.status <> 'effectuee' and new.scheduled_at > now() then
    raise exception 'Une visite ne peut être marquée effectuée qu''après son heure prévue' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_visits_keyli_controle
  before insert or update on public.visits_keyli
  for each row execute function public.controler_visite_keyli();

revoke execute on function public.controler_visite_keyli() from public, anon, authenticated;

-- ============================================================
-- Notifications du visiteur et avancement du lead
-- ============================================================
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'recommandation_forfait',
                  'visite_planifiee', 'visite_modifiee', 'visite_annulee', 'visite_effectuee'));

create or replace function public.suivre_visite_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titre  text;
  v_quand  text := to_char(new.scheduled_at at time zone 'Africa/Abidjan', 'DD/MM/YYYY à HH24:MI');
begin
  -- Pipeline : « nouveau » → « visite planifiée », jamais en arrière
  if tg_op = 'INSERT' and new.lead_id is not null then
    update public.leads_keyli set stage = 'visite_planifiee'
     where id = new.lead_id and stage = 'nouveau';
  end if;

  if new.visitor_user_id is null then
    return null;
  end if;
  select p.title into v_titre from public.properties_keyli p where p.id = new.property_id;

  if tg_op = 'INSERT' then
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (new.visitor_user_id, 'visite_planifiee', 'Visite planifiée',
            format('Visite de « %s » prévue le %s.', v_titre, v_quand), new.property_id);
  elsif new.status = 'annulee' and old.status <> 'annulee' then
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (new.visitor_user_id, 'visite_annulee', 'Visite annulée',
            format('La visite de « %s » prévue le %s est annulée.', v_titre,
                   to_char(old.scheduled_at at time zone 'Africa/Abidjan', 'DD/MM/YYYY à HH24:MI')), new.property_id);
  elsif new.status = 'effectuee' and old.status <> 'effectuee' then
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (new.visitor_user_id, 'visite_effectuee', 'Donnez votre avis',
            format('Votre visite de « %s » est terminée : vous pouvez maintenant noter l''annonceur.', v_titre),
            new.property_id);
  elsif new.scheduled_at is distinct from old.scheduled_at then
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (new.visitor_user_id, 'visite_modifiee', 'Visite déplacée',
            format('La visite de « %s » est désormais prévue le %s.', v_titre, v_quand), new.property_id);
  end if;
  return null;
end;
$$;

create trigger trg_visits_keyli_suivi
  after insert or update on public.visits_keyli
  for each row execute function public.suivre_visite_keyli();

revoke execute on function public.suivre_visite_keyli() from public, anon, authenticated;

-- ============================================================
-- Avis : note obligatoire, commentaire limité, lecture avec l'auteur
-- ============================================================
alter table public.ratings_keyli alter column rating set not null;
alter table public.ratings_keyli
  add constraint ratings_keyli_commentaire_court check (comment is null or length(comment) <= 500);

-- Avis reçus par une personne : note, commentaire, date, nom public de
-- l'auteur et titre du bien concerné (s'il est encore visible)
create or replace function public.avis_recus_keyli(p_user uuid, p_limite integer default 20)
returns table (
  id          uuid,
  note        integer,
  commentaire text,
  date_avis   timestamptz,
  auteur      text,
  titre_bien  text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.rating, r.comment, coalesce(r.updated_at, r.created_at),
         coalesce(pp.nom_affiche, 'Membre Keyli'), p.title
    from public.ratings_keyli r
    left join public.profils_publics_keyli pp on pp.user_id = r.rater_id
    left join public.properties_keyli p on p.id = r.property_id
   where r.rated_user_id = p_user
   order by coalesce(r.updated_at, r.created_at) desc
   limit least(greatest(coalesce(p_limite, 20), 1), 50);
$$;

revoke execute on function public.avis_recus_keyli(uuid, integer) from public;
grant execute on function public.avis_recus_keyli(uuid, integer) to anon, authenticated;
