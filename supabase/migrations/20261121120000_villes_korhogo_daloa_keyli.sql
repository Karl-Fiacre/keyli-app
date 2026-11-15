-- ============================================================
-- Pilote national : Korhogo et Daloa ouvertes dès le pilote (décision du
-- porteur du 2026-11-15 ; elles étaient prévues en vague 3, après bilan).
-- Même principe que Bouaké, San-Pédro et Yamoussoukro
-- (20261120120000_pilote_national_keyli.sql) : une commune au nom de la
-- ville et un quartier « <Ville> Centre » provisoire, que l'équipe locale
-- enrichira (liste fermée). La ville d'une annonce vient de son quartier
-- (trigger trg_properties_keyli_ville) ; la gratuité du pilote s'applique
-- sur tout le territoire, sans changement.
-- ============================================================

insert into public.communes_keyli (nom, ville) values
  ('Korhogo', 'Korhogo'), ('Daloa', 'Daloa');

insert into public.quartiers_keyli (commune_id, nom)
  select c.id, c.nom || ' Centre'
    from public.communes_keyli c
   where c.nom in ('Korhogo', 'Daloa');
