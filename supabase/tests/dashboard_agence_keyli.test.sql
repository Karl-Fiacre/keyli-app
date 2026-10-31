-- Tests du dashboard Agence (semaine 17) : pipeline, indicateurs, équipe,
-- conseils à règles fixes. En local, en CI et sur le distant (--linked) :
-- les vérifications portent sur les lignes créées par le test.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(17);

-- A agence ; C et N chercheurs
insert into auth.users (id, email, raw_user_meta_data) values
  ('acac0000-0000-0000-0000-00000000000a', 'a@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Test", "first_name": "Awa", "last_name": "Koné"}'),
  ('acac0000-0000-0000-0000-00000000000c', 'c@test.local', '{"first_name": "Aminata", "last_name": "Diallo"}'),
  ('acac0000-0000-0000-0000-00000000000d', 'n@test.local', '{"first_name": "Nestor", "last_name": "Brou"}');

select set_config('request.jwt.claims', '', true);
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'acac0000-0000-0000-0000-00000000000a', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'grande_agence';

insert into public.documents_keyli (user_id, doc_type, file_url, status)
values ('acac0000-0000-0000-0000-00000000000a', 'registre', 'acac0000-0000-0000-0000-00000000000a/registre.pdf', 'approved');

insert into public.agency_agents_keyli (id, agency_user_id, nom) values
  ('acac2222-0000-0000-0000-000000000001', 'acac0000-0000-0000-0000-00000000000a', 'Agent Un'),
  ('acac2222-0000-0000-0000-000000000002', 'acac0000-0000-0000-0000-00000000000a', 'Agent Deux');

insert into public.properties_keyli (id, owner_id, agent_id, title, type, status, price, city, quartier_id, geolocation, is_verified, archived_at)
values
  ('acac1111-0000-0000-0000-000000000001', 'acac0000-0000-0000-0000-00000000000a', 'acac2222-0000-0000-0000-000000000001',
   'Villa Angré', 'villa', 'a_louer', 500000, 'Abidjan', (select id from public.quartiers_keyli where nom = 'Angré'),
   'SRID=4326;POINT(-3.98 5.39)', true, null),
  ('acac1111-0000-0000-0000-000000000002', 'acac0000-0000-0000-0000-00000000000a', 'acac2222-0000-0000-0000-000000000002',
   'Studio Marcory', 'studio', 'a_louer', 120000, 'Abidjan', (select id from public.quartiers_keyli where nom = 'Marcory Centre'),
   'SRID=4326;POINT(-3.99 5.30)', false, null),
  ('acac1111-0000-0000-0000-000000000003', 'acac0000-0000-0000-0000-00000000000a', null,
   'Ancien bureau', 'bureau', 'a_louer', 400000, 'Abidjan', (select id from public.quartiers_keyli where nom = 'Angré'),
   'SRID=4326;POINT(-3.98 5.39)', false, now());

-- Prix moyen fiable d'Angré : la villa est 25 % au-dessus
insert into public.quartiers_tendance_keyli (niveau, zone_id, commune_id, nom, score_popularite, prix_moyen_location, prix_fiable, periode_debut, periode_fin)
select 'quartier', q.id, q.commune_id, q.nom, 5, 400000, true, now() - interval '30 days', now()
  from public.quartiers_keyli q where q.nom = 'Angré'
on conflict (niveau, zone_id) do update set prix_moyen_location = 400000, prix_fiable = true;

-- Leads : C contacte la villa (lead auto, vieux de 3 jours, sans réponse) ;
-- N contacte la villa puis passe en négociation ; contact hors plateforme conclu
insert into public.messages_keyli (from_user, to_user, property_id, body) values
  ('acac0000-0000-0000-0000-00000000000c', 'acac0000-0000-0000-0000-00000000000a', 'acac1111-0000-0000-0000-000000000001', 'Bonjour'),
  ('acac0000-0000-0000-0000-00000000000d', 'acac0000-0000-0000-0000-00000000000a', 'acac1111-0000-0000-0000-000000000001', 'Bonsoir');
update public.leads_keyli set created_at = now() - interval '3 days', agent_id = 'acac2222-0000-0000-0000-000000000001'
 where contact_user_id = 'acac0000-0000-0000-0000-00000000000c';
update public.leads_keyli set stage = 'negociation', agent_id = 'acac2222-0000-0000-0000-000000000001'
 where contact_user_id = 'acac0000-0000-0000-0000-00000000000d';
insert into public.leads_keyli (property_id, owner_id, agent_id, contact_nom, stage)
values ('acac1111-0000-0000-0000-000000000002', 'acac0000-0000-0000-0000-00000000000a',
        'acac2222-0000-0000-0000-000000000002', 'Koffi Yao', 'conclu');

-- Un avis de 4 étoiles sur le studio (bien de l'Agent Deux)
insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
values ('acac1111-0000-0000-0000-000000000002', 'acac0000-0000-0000-0000-00000000000c', 'acac0000-0000-0000-0000-00000000000a', 4);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.connecter('acac0000-0000-0000-0000-00000000000a');

-- ------------------------------------------------------------
-- Pipeline
-- ------------------------------------------------------------
select results_eq(
  $$ select etape::text, contact, bien, agent from public.pipeline_leads_keyli() order by contact $$,
  $$ values ('nouveau', 'Aminata D.', 'Villa Angré', 'Agent Un'),
            ('conclu', 'Koffi Yao', 'Studio Marcory', 'Agent Deux'),
            ('negociation', 'Nestor B.', 'Villa Angré', 'Agent Un') $$,
  'Pipeline : nom public ou nom saisi, bien et agent');

-- Changement d'étape par l'agence (menu de la carte)
update public.leads_keyli set stage = 'visite_planifiee' where contact_user_id = 'acac0000-0000-0000-0000-00000000000d';
select is((select etape::text from public.pipeline_leads_keyli() where contact = 'Nestor B.'), 'visite_planifiee',
  'L''agence change l''étape de son lead');

-- ------------------------------------------------------------
-- Indicateurs
-- ------------------------------------------------------------
select is((public.tableau_bord_agence_keyli(30) ->> 'annonces_actives')::integer, 2, 'Annonces en ligne');
select is((public.tableau_bord_agence_keyli(30) ->> 'annonces_en_attente')::integer, 1, 'Annonces non vérifiées');
select is((public.tableau_bord_agence_keyli(30) ->> 'annonces_archivees')::integer, 1, 'Annonces archivées');
select is((public.tableau_bord_agence_keyli(30) ->> 'leads_actifs')::integer, 2, 'Leads actifs : conclus exclus');
select is((public.tableau_bord_agence_keyli(30) ->> 'leads_nouveaux')::integer, 3, 'Leads reçus sur la période');
select is((public.tableau_bord_agence_keyli(30) ->> 'leads_conclus')::integer, 1, 'Leads conclus sur la période');
select is((public.tableau_bord_agence_keyli(30) ->> 'note_moyenne')::numeric, 4.0, 'Note moyenne de l''agence');

-- ------------------------------------------------------------
-- Équipe
-- ------------------------------------------------------------
select results_eq(
  $$ select nom, annonces, leads, conclus, conversion, note from public.performance_equipe_keyli(30) order by nom $$,
  $$ values ('Agent Deux', 1, 1, 1, 100, 4.0::numeric), ('Agent Un', 1, 2, 0, 0, null::numeric) $$,
  'Performance par agent : annonces, leads, conversion, note des biens attribués');

-- ------------------------------------------------------------
-- Conseils
-- ------------------------------------------------------------
select results_eq(
  $$ select regle, type, texte from public.conseils_agence_keyli() where regle = 'prix' $$,
  $$ values ('prix', 'warn', '1 annonce s''écarte de plus de 15 % du prix moyen de son quartier.') $$,
  'Prix à ajuster : villa à +25 % du prix moyen fiable');
select is((select type from public.conseils_agence_keyli() where regle = 'opportunite'), 'neutre',
  'Opportunité toujours présente');
select results_eq(
  $$ select type, texte from public.conseils_agence_keyli() where regle = 'reactivite' $$,
  $$ values ('warn', '1 lead attend une réponse depuis plus de 48 h.') $$,
  'Lead « Nouveau » de 3 jours sans réponse signalé');

-- L'agence répond : plus rien en attente
select set_config('request.jwt.claims', '', true);
set local role postgres;
insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('acac0000-0000-0000-0000-00000000000a', 'acac0000-0000-0000-0000-00000000000c', 'acac1111-0000-0000-0000-000000000001', 'Oui, disponible');
set local role authenticated;
select pg_temp.connecter('acac0000-0000-0000-0000-00000000000a');
select is((select type from public.conseils_agence_keyli() where regle = 'reactivite'), 'ok',
  'Après la réponse, la carte devient une félicitation');
select is((select count(*)::integer from public.conseils_agence_keyli()), 3, 'Toujours trois conseils');

-- ------------------------------------------------------------
-- Cloisonnement
-- ------------------------------------------------------------
select pg_temp.connecter('acac0000-0000-0000-0000-00000000000c');
select is((select count(*)::integer from public.pipeline_leads_keyli() where bien in ('Villa Angré', 'Studio Marcory')), 0,
  'Un chercheur ne voit pas le pipeline de l''agence');
select is((select count(*)::integer from public.performance_equipe_keyli(30) where nom like 'Agent %'), 0,
  'Un chercheur ne voit pas l''équipe de l''agence');

select * from finish();
rollback;
