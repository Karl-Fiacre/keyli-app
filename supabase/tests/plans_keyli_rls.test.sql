-- Tests RLS de plans_keyli — exécutés par `npm run db:test` (pgTAP), en
-- local, en CI et sur le projet distant (`--linked`). Transaction annulée à
-- la fin : aucune donnée de test ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(12);

-- ------------------------------------------------------------
-- Structure et données de départ
-- ------------------------------------------------------------
select has_table('public', 'plans_keyli', 'La table plans_keyli existe');
select is(
  (select relrowsecurity from pg_class where oid = 'public.plans_keyli'::regclass),
  true,
  'RLS est activée sur plans_keyli'
);
select results_eq(
  $$ select code, seuil_min, seuil_max, prix_mensuel, prix_depassement_unitaire
       from public.plans_keyli order by seuil_min $$,
  $$ values ('proprietaire'::text,   1,  4::integer,    5000.00::numeric,  1500.00::numeric),
            ('agence_moyenne'::text, 5,  10::integer,   15000.00::numeric, null::numeric),
            ('grande_agence'::text,  11, null::integer, 25000.00::numeric, 1000.00::numeric) $$,
  'Les 3 forfaits du PRD sont présents avec les bons seuils et prix'
);

-- Un forfait désactivé pour la suite des tests
update public.plans_keyli set actif = false where code = 'grande_agence';

-- ------------------------------------------------------------
-- Visiteur anonyme (page de tarifs)
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select results_eq(
  $$ select code from public.plans_keyli order by seuil_min $$,
  $$ values ('proprietaire'::text), ('agence_moyenne'::text) $$,
  'Un visiteur voit les forfaits actifs, pas les forfaits désactivés'
);
select throws_ok(
  $$ update public.plans_keyli set prix_mensuel = 1 where code = 'proprietaire' $$,
  '42501', null,
  'Un visiteur ne peut pas modifier un prix'
);
select throws_ok(
  $$ insert into public.plans_keyli (code, nom, seuil_min, prix_mensuel)
       values ('pirate', 'Pirate', 1, 0) $$,
  '42501', null,
  'Un visiteur ne peut pas créer de forfait'
);

-- ------------------------------------------------------------
-- Utilisateur authentifié
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select count(*)::int from public.plans_keyli $$,
  $$ values (2) $$,
  'Un utilisateur connecté voit les 2 forfaits actifs'
);
select throws_ok(
  $$ update public.plans_keyli set prix_mensuel = 1 where code = 'proprietaire' $$,
  '42501', null,
  'Un utilisateur connecté ne peut pas modifier un prix'
);
select throws_ok(
  $$ update public.plans_keyli set seuil_max = 100 where code = 'proprietaire' $$,
  '42501', null,
  'Un utilisateur connecté ne peut pas modifier un seuil'
);
select throws_ok(
  $$ insert into public.plans_keyli (code, nom, seuil_min, prix_mensuel)
       values ('gratuit', 'Gratuit', 1, 0) $$,
  '42501', null,
  'Un utilisateur connecté ne peut pas créer de forfait'
);
select throws_ok(
  $$ delete from public.plans_keyli where code = 'proprietaire' $$,
  '42501', null,
  'Un utilisateur connecté ne peut pas supprimer de forfait'
);

set local role postgres;

select is(
  (select prix_mensuel from public.plans_keyli where code = 'proprietaire'),
  5000.00::numeric,
  'Le prix du forfait Propriétaire est inchangé après les tentatives'
);

select * from finish();
rollback;
