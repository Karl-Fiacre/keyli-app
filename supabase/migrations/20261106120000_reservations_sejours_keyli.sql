-- Keyli — Séjours courts et demandes de réservation (dates d'arrivée et de départ)
--
-- Source : docs/MODULES/reservations.md. Évolution du périmètre v1 décidée
-- par le porteur le 2026-11-01 (PRD §5.2 / §12.1 amendés) :
--   - DEMANDE de réservation : le voyageur choisit ses dates, la base calcule
--     le total, l'hôte accepte ou refuse ; pas de paiement en ligne (réglé
--     directement avec l'hôte pour l'instant) ;
--   - hôtels et auberges : TYPES DE CHAMBRES (quantité, prix par nuit,
--     voyageurs max) — la base compte les chambres libres par nuit ;
--   - séjours courts uniquement : hôtels, auberges, et tout logement à louer
--     marqué « séjour court » par l'annonceur (prix = prix par nuit). Les
--     locations au mois et les ventes restent en mise en relation.
--
-- Garanties côté base (jamais côté écran) : disponibilité, prix et total
-- calculés ici ; une réservation acceptée bloque les nuits ; deux acceptations
-- simultanées ne peuvent pas dépasser la capacité (verrou sur l'annonce).

-- ------------------------------------------------------------
-- Annonces : séjour court
-- ------------------------------------------------------------
alter table public.properties_keyli
  add column sejour_court  boolean not null default false,
  add column nuits_min     integer not null default 1,
  add column voyageurs_max integer;

-- Un hôtel ou une auberge à louer se réserve forcément à la nuit
update public.properties_keyli
   set sejour_court = true
 where type in ('hotel', 'auberge') and status = 'a_louer';

alter table public.properties_keyli
  add constraint properties_keyli_sejour_location check (not sejour_court or status = 'a_louer'),
  add constraint properties_keyli_hotel_sejour
    check (not (type in ('hotel', 'auberge') and status = 'a_louer') or sejour_court),
  add constraint properties_keyli_nuits_min check (nuits_min between 1 and 90),
  add constraint properties_keyli_voyageurs_max check (voyageurs_max is null or voyageurs_max between 1 and 50);

-- Droits par colonne (comme les autres colonnes saisissables de l'annonce)
grant insert (sejour_court, nuits_min, voyageurs_max) on public.properties_keyli to authenticated;
grant update (sejour_court, nuits_min, voyageurs_max) on public.properties_keyli to authenticated;

create index idx_properties_sejour on public.properties_keyli (sejour_court) where archived_at is null and sejour_court;

-- Unité réservable d'une annonce hôtelière : une chambre par type ; logement
-- entier sinon (capacité 1)
create or replace function public.est_hotelier_keyli(p_type public.property_type_keyli)
returns boolean
language sql
immutable
set search_path = ''
as $$ select p_type in ('hotel', 'auberge') $$;

grant execute on function public.est_hotelier_keyli(public.property_type_keyli) to anon, authenticated;

-- ------------------------------------------------------------
-- Types de chambres (hôtels et auberges)
-- ------------------------------------------------------------
create table public.types_chambres_keyli (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties_keyli(id) on delete cascade,
  nom            text not null check (length(btrim(nom)) between 1 and 80),
  description    text check (description is null or length(description) <= 500),
  quantite       integer not null check (quantite between 1 and 500),
  prix_nuit      numeric not null check (prix_nuit > 0),
  voyageurs_max  integer not null check (voyageurs_max between 1 and 20),
  actif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_types_chambres_property on public.types_chambres_keyli (property_id) where actif;

create trigger trg_types_chambres_keyli_updated_at
  before update on public.types_chambres_keyli
  for each row execute function public.set_updated_at_keyli();

-- Seule une annonce d'hôtel ou d'auberge reçoit des types de chambres ;
-- l'annonce d'une chambre ne change jamais
create or replace function public.coherence_type_chambre_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.property_id <> old.property_id then
    raise exception 'Une chambre ne change pas d''annonce' using errcode = '23514';
  end if;
  if not exists (select 1 from public.properties_keyli p
                  where p.id = new.property_id and public.est_hotelier_keyli(p.type) and p.sejour_court) then
    raise exception 'Les types de chambres sont réservés aux hôtels et auberges' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_types_chambres_keyli_coherence
  before insert or update on public.types_chambres_keyli
  for each row execute function public.coherence_type_chambre_keyli();

-- Le prix affiché d'un hôtel = prix de sa chambre la moins chère (« à partir de »)
create or replace function public.sync_prix_hotel_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property uuid := coalesce(new.property_id, old.property_id);
  v_min numeric;
begin
  select min(prix_nuit) into v_min
    from public.types_chambres_keyli where property_id = v_property and actif;
  if v_min is not null then
    update public.properties_keyli set price = v_min where id = v_property and price <> v_min;
  end if;
  return null;
end;
$$;

create trigger trg_types_chambres_keyli_prix
  after insert or update or delete on public.types_chambres_keyli
  for each row execute function public.sync_prix_hotel_keyli();

revoke execute on function public.coherence_type_chambre_keyli() from public, anon, authenticated;
revoke execute on function public.sync_prix_hotel_keyli() from public, anon, authenticated;

alter table public.types_chambres_keyli enable row level security;

create policy "Lecture publique des chambres des annonces publiées"
  on public.types_chambres_keyli for select
  to anon, authenticated
  using (actif and exists (select 1 from public.properties_keyli p
                            where p.id = property_id and p.archived_at is null));

create policy "Propriétaire lit les chambres de ses annonces"
  on public.types_chambres_keyli for select
  to authenticated
  using (exists (select 1 from public.properties_keyli p
                  where p.id = property_id and p.owner_id = (select auth.uid())));

create policy "Propriétaire ajoute des chambres à ses annonces"
  on public.types_chambres_keyli for insert
  to authenticated
  with check (
    public.compte_actif_keyli((select auth.uid()))
    and exists (select 1 from public.properties_keyli p
                 where p.id = property_id and p.owner_id = (select auth.uid()))
  );

create policy "Propriétaire modifie les chambres de ses annonces"
  on public.types_chambres_keyli for update
  to authenticated
  using (exists (select 1 from public.properties_keyli p
                  where p.id = property_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.properties_keyli p
                       where p.id = property_id and p.owner_id = (select auth.uid())));

grant select on public.types_chambres_keyli to anon, authenticated;
grant insert (property_id, nom, description, quantite, prix_nuit, voyageurs_max, actif)
  on public.types_chambres_keyli to authenticated;
grant update (nom, description, quantite, prix_nuit, voyageurs_max, actif)
  on public.types_chambres_keyli to authenticated;

-- Pas de suppression : une chambre déjà réservée reste dans l'historique ;
-- on la désactive (actif = false)

-- ------------------------------------------------------------
-- Réservations
-- ------------------------------------------------------------
create type public.reservation_status_keyli as enum ('demandee', 'acceptee', 'refusee', 'annulee');

create table public.reservations_keyli (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties_keyli(id),
  chambre_id     uuid references public.types_chambres_keyli(id),
  voyageur_id    uuid not null references auth.users(id),
  owner_id       uuid not null references auth.users(id),
  date_arrivee   date not null,
  date_depart    date not null,
  nuits          integer generated always as (date_depart - date_arrivee) stored,
  voyageurs      integer not null check (voyageurs between 1 and 50),
  nb_chambres    integer not null default 1 check (nb_chambres between 1 and 50),
  prix_nuit      numeric not null check (prix_nuit > 0),
  montant_total  numeric not null check (montant_total > 0),
  statut         public.reservation_status_keyli not null default 'demandee',
  message        text check (message is null or length(message) <= 1000),
  motif          text check (motif is null or length(motif) <= 500),
  annulee_par    uuid references auth.users(id),
  repondu_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reservations_keyli_dates check (date_depart > date_arrivee),
  constraint reservations_keyli_logement_entier check (chambre_id is not null or nb_chambres = 1)
);

create index idx_reservations_occupation
  on public.reservations_keyli (property_id, chambre_id, date_arrivee, date_depart)
  where statut = 'acceptee';
create index idx_reservations_voyageur on public.reservations_keyli (voyageur_id, created_at desc);
create index idx_reservations_hote on public.reservations_keyli (owner_id, statut, date_arrivee);

create trigger trg_reservations_keyli_updated_at
  before update on public.reservations_keyli
  for each row execute function public.set_updated_at_keyli();

alter table public.reservations_keyli enable row level security;

-- Lecture : le voyageur, l'hôte, l'admin. Aucune écriture directe : tout
-- passe par les fonctions ci-dessous (contrôles, prix, notifications).
create policy "Voyageur et hôte lisent leurs réservations"
  on public.reservations_keyli for select
  to authenticated
  using ((select auth.uid()) in (voyageur_id, owner_id) or (select public.est_admin_keyli()));

grant select on public.reservations_keyli to authenticated;

-- ------------------------------------------------------------
-- Notifications des réservations
-- ------------------------------------------------------------
alter table public.notifications_keyli drop constraint notifications_keyli_type_check;
alter table public.notifications_keyli add constraint notifications_keyli_type_check
  check (type in ('alerte_recherche', 'verification_retiree', 'compte_suspendu', 'compte_reactive',
                  'abonnement_rappel', 'abonnement_expire', 'depassement_cycle', 'recommandation_forfait',
                  'visite_planifiee', 'visite_modifiee', 'visite_annulee', 'visite_effectuee',
                  'document_approuve', 'document_rejete',
                  'reservation_demandee', 'reservation_acceptee', 'reservation_refusee', 'reservation_annulee'));

-- ------------------------------------------------------------
-- Occupation : chambres (ou logement) déjà prises chaque nuit. Seules les
-- réservations ACCEPTÉES bloquent des nuits ; une demande n'en bloque pas.
-- SECURITY DEFINER : ne renvoie que des nombres, jamais qui a réservé.
-- ------------------------------------------------------------
create or replace function public.occupation_sejour_keyli(
  p_property uuid, p_chambre uuid, p_de date, p_a date
)
returns table (jour date, occupees integer, capacite integer)
language sql
stable
security definer
set search_path = ''
as $$
  with cap as (
    select case when p_chambre is null then 1
                else (select t.quantite from public.types_chambres_keyli t
                       where t.id = p_chambre and t.property_id = p_property) end as n
  )
  select g.jour::date,
         coalesce((select sum(r.nb_chambres) from public.reservations_keyli r
                    where r.property_id = p_property
                      and r.chambre_id is not distinct from p_chambre
                      and r.statut = 'acceptee'
                      and r.date_arrivee <= g.jour::date and r.date_depart > g.jour::date), 0)::integer,
         (select n from cap)::integer
    from generate_series(p_de, p_a - 1, interval '1 day') as g(jour)
   where p_de is not null and p_a is not null and p_a > p_de and p_a - p_de <= 400
     and exists (select 1 from public.properties_keyli p
                  where p.id = p_property and p.archived_at is null and p.sejour_court)
$$;

revoke execute on function public.occupation_sejour_keyli(uuid, uuid, date, date) from public;
grant execute on function public.occupation_sejour_keyli(uuid, uuid, date, date) to anon, authenticated;

-- Nuits complètes (plus aucune chambre / logement pris) : grisées dans le
-- calendrier
create or replace function public.nuits_completes_keyli(
  p_property uuid, p_chambre uuid, p_de date, p_a date
)
returns setof date
language sql
stable
security invoker
set search_path = ''
as $$
  select o.jour from public.occupation_sejour_keyli(p_property, p_chambre, p_de, p_a) o
   where o.occupees >= o.capacite
   order by o.jour
$$;

grant execute on function public.nuits_completes_keyli(uuid, uuid, date, date) to anon, authenticated;

-- ------------------------------------------------------------
-- Devis : contrôle complet d'un séjour et calcul du total. Utilisé par
-- l'écran (affichage) ET par demander/accepter (même règle partout).
-- motif = null si le séjour est réservable.
-- ------------------------------------------------------------
create or replace function public.devis_sejour_keyli(
  p_property  uuid,
  p_chambre   uuid,
  p_arrivee   date,
  p_depart    date,
  p_voyageurs integer,
  p_chambres  integer default 1
)
returns table (nuits integer, prix_nuit numeric, montant_total numeric, restantes integer, motif text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_p public.properties_keyli%rowtype;
  v_c public.types_chambres_keyli%rowtype;
  v_aujourdhui date := (now() at time zone 'Africa/Abidjan')::date;
  v_nuits integer;
  v_prix numeric;
  v_capacite_voyageurs integer;
  v_restantes integer;
  v_chambres integer := coalesce(p_chambres, 1);
begin
  select * into v_p from public.properties_keyli where id = p_property and archived_at is null;
  if not found or not v_p.sejour_court then
    return query select null::integer, null::numeric, null::numeric, null::integer,
                        'Cette annonce ne se réserve pas à la nuit'::text;
    return;
  end if;

  if public.est_hotelier_keyli(v_p.type) then
    select * into v_c from public.types_chambres_keyli
     where id = p_chambre and property_id = p_property and actif;
    if not found then
      return query select null::integer, null::numeric, null::numeric, null::integer,
                          'Choisissez un type de chambre'::text;
      return;
    end if;
    v_prix := v_c.prix_nuit;
    if v_chambres < 1 or v_chambres > v_c.quantite then
      return query select null::integer, null::numeric, null::numeric, null::integer,
                          format('Entre 1 et %s chambre(s) de ce type', v_c.quantite);
      return;
    end if;
    v_capacite_voyageurs := v_c.voyageurs_max * v_chambres;
  else
    if p_chambre is not null or v_chambres <> 1 then
      return query select null::integer, null::numeric, null::numeric, null::integer,
                          'Ce logement se réserve en entier'::text;
      return;
    end if;
    v_prix := v_p.price;
    v_capacite_voyageurs := coalesce(v_p.voyageurs_max, 50);
  end if;

  if p_arrivee is null or p_depart is null then
    return query select null::integer, v_prix, null::numeric, null::integer, 'Choisissez vos dates'::text;
    return;
  end if;
  v_nuits := p_depart - p_arrivee;
  if p_arrivee < v_aujourdhui then
    return query select null::integer, v_prix, null::numeric, null::integer,
                        'La date d''arrivée est déjà passée'::text;
    return;
  end if;
  if v_nuits < 1 then
    return query select null::integer, v_prix, null::numeric, null::integer,
                        'Le départ doit suivre l''arrivée'::text;
    return;
  end if;
  if p_arrivee > v_aujourdhui + 365 then
    return query select v_nuits, v_prix, null::numeric, null::integer,
                        'Réservation possible jusqu''à un an à l''avance'::text;
    return;
  end if;
  if v_nuits > 90 then
    return query select v_nuits, v_prix, null::numeric, null::integer,
                        '90 nuits au plus : au-delà, écrivez à l''annonceur'::text;
    return;
  end if;
  if v_nuits < v_p.nuits_min then
    return query select v_nuits, v_prix, null::numeric, null::integer,
                        format('Séjour de %s nuit(s) minimum', v_p.nuits_min);
    return;
  end if;
  if coalesce(p_voyageurs, 0) < 1 or p_voyageurs > v_capacite_voyageurs then
    return query select v_nuits, v_prix, null::numeric, null::integer,
                        format('%s voyageur(s) au plus', v_capacite_voyageurs);
    return;
  end if;

  select min(o.capacite - o.occupees) into v_restantes
    from public.occupation_sejour_keyli(p_property, p_chambre, p_arrivee, p_depart) o;
  if coalesce(v_restantes, 0) < v_chambres then
    return query select v_nuits, v_prix, v_prix * v_nuits * v_chambres, greatest(coalesce(v_restantes, 0), 0),
                        'Ces dates ne sont plus disponibles'::text;
    return;
  end if;

  return query select v_nuits, v_prix, v_prix * v_nuits * v_chambres, v_restantes, null::text;
end;
$$;

revoke execute on function public.devis_sejour_keyli(uuid, uuid, date, date, integer, integer) from public;
grant execute on function public.devis_sejour_keyli(uuid, uuid, date, date, integer, integer) to anon, authenticated;

-- ------------------------------------------------------------
-- Demande de réservation (voyageur)
-- ------------------------------------------------------------
create or replace function public.demander_reservation_keyli(
  p_property  uuid,
  p_chambre   uuid,
  p_arrivee   date,
  p_depart    date,
  p_voyageurs integer,
  p_chambres  integer default 1,
  p_message   text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_titre text;
  v_devis record;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if not public.compte_actif_keyli(v_uid) then
    raise exception 'Compte suspendu' using errcode = '42501';
  end if;

  select owner_id, title into v_owner, v_titre
    from public.properties_keyli where id = p_property and archived_at is null;
  if v_owner is null then
    raise exception 'Annonce introuvable' using errcode = '23514';
  end if;
  if v_owner = v_uid then
    raise exception 'Vous ne pouvez pas réserver votre propre annonce' using errcode = '23514';
  end if;

  select * into v_devis
    from public.devis_sejour_keyli(p_property, p_chambre, p_arrivee, p_depart, p_voyageurs, p_chambres);
  if v_devis.motif is not null then
    raise exception '%', v_devis.motif using errcode = '23514';
  end if;

  -- Anti-abus : une seule demande en attente par annonce et par voyageur,
  -- dix au plus en tout
  if exists (select 1 from public.reservations_keyli
              where voyageur_id = v_uid and property_id = p_property and statut = 'demandee') then
    raise exception 'Vous avez déjà une demande en attente pour cette annonce' using errcode = '23514';
  end if;
  if (select count(*) from public.reservations_keyli where voyageur_id = v_uid and statut = 'demandee') >= 10 then
    raise exception 'Trop de demandes en attente : attendez les réponses des hôtes' using errcode = '23514';
  end if;

  insert into public.reservations_keyli
    (property_id, chambre_id, voyageur_id, owner_id, date_arrivee, date_depart, voyageurs, nb_chambres,
     prix_nuit, montant_total, message)
  values
    (p_property, p_chambre, v_uid, v_owner, p_arrivee, p_depart, p_voyageurs, coalesce(p_chambres, 1),
     v_devis.prix_nuit, v_devis.montant_total, nullif(btrim(p_message), ''))
  returning id into v_id;

  -- La demande ouvre aussi la conversation dans la messagerie Keyli : l'hôte
  -- peut répondre au voyageur (règle anti-démarchage : on ne répond qu'à
  -- qui nous a écrit), et le contact entre dans son suivi (lead)
  insert into public.messages_keyli (from_user, to_user, property_id, body)
  values (v_uid, v_owner, p_property,
          format('Demande de réservation du %s au %s (%s nuit%s, %s voyageur%s).%s',
                 to_char(p_arrivee, 'DD/MM/YYYY'), to_char(p_depart, 'DD/MM/YYYY'),
                 v_devis.nuits, case when v_devis.nuits > 1 then 's' else '' end,
                 p_voyageurs, case when p_voyageurs > 1 then 's' else '' end,
                 coalesce(E'\n\n' || nullif(btrim(p_message), ''), '')));

  insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
  values (v_owner, 'reservation_demandee', 'Nouvelle demande de réservation',
          format('« %s » : du %s au %s (%s nuit%s).', v_titre, to_char(p_arrivee, 'DD/MM/YYYY'),
                 to_char(p_depart, 'DD/MM/YYYY'), v_devis.nuits, case when v_devis.nuits > 1 then 's' else '' end),
          p_property);

  return v_id;
end;
$$;

revoke execute on function public.demander_reservation_keyli(uuid, uuid, date, date, integer, integer, text)
  from public, anon;
grant execute on function public.demander_reservation_keyli(uuid, uuid, date, date, integer, integer, text)
  to authenticated;

-- ------------------------------------------------------------
-- Réponse de l'hôte : accepter (bloque les nuits) ou refuser
-- ------------------------------------------------------------
create or replace function public.repondre_reservation_keyli(
  p_reservation uuid,
  p_accepter    boolean,
  p_motif       text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_r public.reservations_keyli%rowtype;
  v_titre text;
  v_restantes integer;
  v_autre record;
begin
  select * into v_r from public.reservations_keyli where id = p_reservation for update;
  if not found or v_r.owner_id is distinct from v_uid then
    raise exception 'Réservation introuvable' using errcode = '42501';
  end if;
  if v_r.statut <> 'demandee' then
    raise exception 'Cette demande a déjà reçu une réponse' using errcode = '23514';
  end if;
  if v_r.date_arrivee < (now() at time zone 'Africa/Abidjan')::date then
    raise exception 'La date d''arrivée est passée' using errcode = '23514';
  end if;

  -- Verrou sur l'annonce : deux acceptations simultanées passent l'une après l'autre
  select title into v_titre from public.properties_keyli where id = v_r.property_id for update;

  if not coalesce(p_accepter, false) then
    update public.reservations_keyli
       set statut = 'refusee', motif = nullif(btrim(p_motif), ''), repondu_at = now()
     where id = p_reservation;
    insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
    values (v_r.voyageur_id, 'reservation_refusee', 'Demande de réservation refusée',
            format('« %s » n''est pas disponible du %s au %s.%s', v_titre, to_char(v_r.date_arrivee, 'DD/MM/YYYY'),
                   to_char(v_r.date_depart, 'DD/MM/YYYY'),
                   coalesce(' Motif : ' || nullif(btrim(p_motif), ''), '')),
            v_r.property_id);
    return;
  end if;

  select min(o.capacite - o.occupees) into v_restantes
    from public.occupation_sejour_keyli(v_r.property_id, v_r.chambre_id, v_r.date_arrivee, v_r.date_depart) o;
  if coalesce(v_restantes, 0) < v_r.nb_chambres then
    raise exception 'Ces dates ne sont plus disponibles' using errcode = '23514';
  end if;

  update public.reservations_keyli set statut = 'acceptee', repondu_at = now() where id = p_reservation;
  insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
  values (v_r.voyageur_id, 'reservation_acceptee', 'Réservation acceptée',
          format('« %s » : votre séjour du %s au %s est confirmé par l''hôte.', v_titre,
                 to_char(v_r.date_arrivee, 'DD/MM/YYYY'), to_char(v_r.date_depart, 'DD/MM/YYYY')),
          v_r.property_id);

  -- Les autres demandes devenues impossibles sur ces nuits sont refusées
  for v_autre in
    select r.id, r.voyageur_id, r.nb_chambres, r.date_arrivee, r.date_depart
      from public.reservations_keyli r
     where r.property_id = v_r.property_id and r.chambre_id is not distinct from v_r.chambre_id
       and r.statut = 'demandee' and r.id <> v_r.id
       and r.date_arrivee < v_r.date_depart and r.date_depart > v_r.date_arrivee
  loop
    select min(o.capacite - o.occupees) into v_restantes
      from public.occupation_sejour_keyli(v_r.property_id, v_r.chambre_id, v_autre.date_arrivee, v_autre.date_depart) o;
    if coalesce(v_restantes, 0) < v_autre.nb_chambres then
      update public.reservations_keyli
         set statut = 'refusee', motif = 'Dates plus disponibles', repondu_at = now()
       where id = v_autre.id;
      insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
      values (v_autre.voyageur_id, 'reservation_refusee', 'Dates plus disponibles',
              format('« %s » vient d''être réservé du %s au %s : votre demande ne peut pas aboutir.', v_titre,
                     to_char(v_autre.date_arrivee, 'DD/MM/YYYY'), to_char(v_autre.date_depart, 'DD/MM/YYYY')),
              v_r.property_id);
    end if;
  end loop;
end;
$$;

revoke execute on function public.repondre_reservation_keyli(uuid, boolean, text) from public, anon;
grant execute on function public.repondre_reservation_keyli(uuid, boolean, text) to authenticated;

-- ------------------------------------------------------------
-- Annulation : le voyageur (demande ou réservation acceptée), l'hôte (une
-- réservation acceptée, motif obligatoire) — jusqu'au jour d'arrivée
-- ------------------------------------------------------------
create or replace function public.annuler_reservation_keyli(p_reservation uuid, p_motif text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_r public.reservations_keyli%rowtype;
  v_titre text;
  v_destinataire uuid;
  v_motif text := nullif(btrim(p_motif), '');
begin
  select * into v_r from public.reservations_keyli where id = p_reservation for update;
  if not found or v_uid is null or v_uid not in (v_r.voyageur_id, v_r.owner_id) then
    raise exception 'Réservation introuvable' using errcode = '42501';
  end if;
  if v_r.date_arrivee < (now() at time zone 'Africa/Abidjan')::date then
    raise exception 'Le séjour a déjà commencé' using errcode = '23514';
  end if;

  if v_uid = v_r.voyageur_id then
    if v_r.statut not in ('demandee', 'acceptee') then
      raise exception 'Cette réservation n''est plus active' using errcode = '23514';
    end if;
    v_destinataire := v_r.owner_id;
  else
    if v_r.statut <> 'acceptee' then
      raise exception 'Seule une réservation acceptée s''annule ; refusez plutôt la demande' using errcode = '23514';
    end if;
    if v_motif is null then
      raise exception 'Indiquez au voyageur le motif de l''annulation' using errcode = '23514';
    end if;
    v_destinataire := v_r.voyageur_id;
  end if;

  update public.reservations_keyli
     set statut = 'annulee', motif = v_motif, annulee_par = v_uid
   where id = p_reservation;

  select title into v_titre from public.properties_keyli where id = v_r.property_id;
  insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
  values (v_destinataire, 'reservation_annulee', 'Réservation annulée',
          format('« %s » : le séjour du %s au %s est annulé%s.%s', v_titre, to_char(v_r.date_arrivee, 'DD/MM/YYYY'),
                 to_char(v_r.date_depart, 'DD/MM/YYYY'),
                 case when v_uid = v_r.voyageur_id then ' par le voyageur' else ' par l''hôte' end,
                 coalesce(' Motif : ' || v_motif, '')),
          v_r.property_id);
end;
$$;

revoke execute on function public.annuler_reservation_keyli(uuid, text) from public, anon;
grant execute on function public.annuler_reservation_keyli(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Publication : séjour court, nuits minimum, voyageurs max. Signature
-- modifiée : l'ancienne version est supprimée.
-- ------------------------------------------------------------
drop function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, text[], uuid, text, numeric, integer, integer, boolean, uuid[], boolean
);

create or replace function public.publier_annonce_keyli(
  p_titre               text,
  p_type                public.property_type_keyli,
  p_statut              public.property_status_keyli,
  p_prix                numeric,
  p_ville               text,
  p_latitude            double precision,
  p_longitude           double precision,
  p_photos              text[],
  p_quartier            uuid default null,
  p_description         text default null,
  p_surface             numeric default null,
  p_pieces              integer default null,
  p_salles_de_bain      integer default null,
  p_meuble              boolean default false,
  p_avantages           uuid[] default '{}',
  p_accepte_depassement boolean default false,
  p_sejour_court        boolean default false,
  p_nuits_min           integer default 1,
  p_voyageurs_max       integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_photos text[] := coalesce(p_photos, '{}');
  -- Hôtel ou auberge à louer : toujours à la nuit
  v_sejour boolean := p_statut = 'a_louer'
                      and (coalesce(p_sejour_court, false) or public.est_hotelier_keyli(p_type));
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if coalesce(btrim(p_titre), '') = '' or length(p_titre) > 120 then
    raise exception 'Le titre est obligatoire (120 caractères au plus)' using errcode = '23514';
  end if;
  if p_prix is null or p_prix <= 0 then
    raise exception 'Le prix doit être supérieur à zéro' using errcode = '23514';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Point GPS invalide' using errcode = '23514';
  end if;
  if (p_surface is not null and p_surface <= 0)
     or (p_pieces is not null and p_pieces < 0)
     or (p_salles_de_bain is not null and p_salles_de_bain < 0) then
    raise exception 'Surface, pièces et salles de bain ne peuvent pas être négatives' using errcode = '23514';
  end if;
  if coalesce(p_sejour_court, false) and p_statut <> 'a_louer' then
    raise exception 'Un séjour court est forcément une location' using errcode = '23514';
  end if;
  if v_sejour and (coalesce(p_nuits_min, 1) not between 1 and 90
                   or (p_voyageurs_max is not null and p_voyageurs_max not between 1 and 50)) then
    raise exception 'Nuits minimum (1 à 90) ou voyageurs maximum (1 à 50) invalides' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(coalesce(p_avantages, '{}')) a(id)
              where not exists (select 1 from public.avantages_keyli v where v.id = a.id and v.actif)) then
    raise exception 'Avantage inconnu' using errcode = '23514';
  end if;
  if cardinality(v_photos) < 1 then
    raise exception 'Ajoutez au moins une photo' using errcode = '23514';
  end if;
  if cardinality(v_photos) > 10 then
    raise exception 'Une annonce compte au plus 10 photos' using errcode = '23514';
  end if;
  if (select count(distinct u) from unnest(v_photos) u) <> cardinality(v_photos) then
    raise exception 'La même photo est envoyée deux fois' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(v_photos) u where not public.url_photo_keyli_valide(u, (select auth.uid()))) then
    raise exception 'Photo refusée : elle doit être envoyée depuis Keyli' using errcode = '23514';
  end if;

  insert into public.properties_keyli
    (owner_id, title, type, status, price, description, city, quartier_id, geolocation,
     area_m2, rooms, bathrooms, furnished, accepte_depassement,
     sejour_court, nuits_min, voyageurs_max)
  values
    ((select auth.uid()), btrim(p_titre), p_type, p_statut, p_prix, nullif(btrim(p_description), ''),
     btrim(p_ville), p_quartier,
     extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
     p_surface, p_pieces, p_salles_de_bain, coalesce(p_meuble, false), coalesce(p_accepte_depassement, false),
     v_sejour, case when v_sejour then coalesce(p_nuits_min, 1) else 1 end,
     case when v_sejour and not public.est_hotelier_keyli(p_type) then p_voyageurs_max end)
  returning id into v_id;

  insert into public.property_avantages_keyli (property_id, avantage_id)
  select v_id, a.id from (select distinct unnest(coalesce(p_avantages, '{}')) as id) a;

  -- L'ordre du formulaire est conservé : la première photo est la principale
  insert into public.property_media_keyli (property_id, media_type, url, order_index)
  select v_id, 'image', u.url, (u.rang - 1)::integer
    from unnest(v_photos) with ordinality as u(url, rang);

  return v_id;
end;
$$;

revoke execute on function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, text[], uuid, text, numeric, integer, integer, boolean, uuid[], boolean,
  boolean, integer, integer
) from public, anon;
grant execute on function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, text[], uuid, text, numeric, integer, integer, boolean, uuid[], boolean,
  boolean, integer, integer
) to authenticated;

-- ------------------------------------------------------------
-- Recherche : filtre « séjour court » et disponibilité sur des dates.
-- Le type de retour change (sejour_court, nuits_min) : l'ancienne version
-- est supprimée.
-- ------------------------------------------------------------
drop function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer
);

create or replace function public.rechercher_annonces_keyli(
  p_statut      public.property_status_keyli default null,
  p_type        public.property_type_keyli default null,
  p_commune     uuid default null,
  p_quartier    uuid default null,
  p_prix_min    numeric default null,
  p_prix_max    numeric default null,
  p_pieces_min  integer default null,
  p_meuble      boolean default null,
  p_avantages   uuid[] default '{}',      -- l'annonce doit les avoir TOUS
  p_tri         text default 'pertinence', -- pertinence | recent | prix_croissant | prix_decroissant
  p_limite      integer default 20,
  p_decalage    integer default 0,
  p_sejour      boolean default null,     -- true : séjours courts seulement
  p_arrivee     date default null,        -- avec p_depart : libres sur toutes ces nuits
  p_depart      date default null,
  p_voyageurs   integer default null
)
returns table (
  id              uuid,
  titre           text,
  type            public.property_type_keyli,
  statut          public.property_status_keyli,
  prix            numeric,
  ville           text,
  quartier        text,
  commune         text,
  pieces          integer,
  salles_de_bain  integer,
  surface         numeric,
  meuble          boolean,
  image           text,
  verifiee        boolean,
  publiee_le      timestamptz,
  sejour_court    boolean,
  nuits_min       integer,
  total           bigint                   -- nombre total de résultats (pagination)
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.title, p.type, p.status, p.price, p.city, q.nom, c.nom,
         p.rooms, p.bathrooms, p.area_m2, coalesce(p.furnished, false), p.main_image_url,
         coalesce(p.is_verified, false), p.created_at, p.sejour_court, p.nuits_min,
         count(*) over ()
    from public.properties_keyli p
    left join public.quartiers_keyli q on q.id = p.quartier_id
    left join public.communes_keyli c on c.id = q.commune_id
   where p.archived_at is null
     and (p_statut is null or p.status = p_statut)
     and (p_type is null or p.type = p_type)
     and (p_quartier is null or p.quartier_id = p_quartier)
     and (p_commune is null or q.commune_id = p_commune)
     and (p_prix_min is null or p.price >= p_prix_min)
     and (p_prix_max is null or p.price <= p_prix_max)
     and (p_pieces_min is null or p.rooms >= p_pieces_min)
     and (p_meuble is null or coalesce(p.furnished, false) = p_meuble)
     and (coalesce(cardinality(p_avantages), 0) = 0 or (
            select count(distinct pa.avantage_id)
              from public.property_avantages_keyli pa
             where pa.property_id = p.id and pa.avantage_id = any (p_avantages)
          ) = (select count(distinct a) from unnest(p_avantages) a))
     and (p_sejour is null or p.sejour_court = p_sejour)
     -- Dates : séjour court, durée minimum respectée, au moins une unité libre
     -- chaque nuit et assez de place pour les voyageurs
     and (p_arrivee is null or p_depart is null or (
            p.sejour_court and p_depart > p_arrivee and p_depart - p_arrivee >= p.nuits_min
            and (
              (not public.est_hotelier_keyli(p.type)
                and (p_voyageurs is null or p.voyageurs_max is null or p.voyageurs_max >= p_voyageurs)
                and not exists (select 1 from public.reservations_keyli r
                                 where r.property_id = p.id and r.chambre_id is null and r.statut = 'acceptee'
                                   and r.date_arrivee < p_depart and r.date_depart > p_arrivee))
              or
              (public.est_hotelier_keyli(p.type) and exists (
                 select 1 from public.types_chambres_keyli t
                  where t.property_id = p.id and t.actif
                    and (p_voyageurs is null or t.voyageurs_max >= p_voyageurs)
                    and (select min(o.capacite - o.occupees)
                           from public.occupation_sejour_keyli(p.id, t.id, p_arrivee, p_depart) o) >= 1))
            )))
   order by
     case when p_tri = 'pertinence' then coalesce(p.is_verified, false) end desc,
     case when p_tri = 'prix_croissant' then p.price end asc,
     case when p_tri = 'prix_decroissant' then p.price end desc,
     p.created_at desc,
     p.id
   limit least(greatest(coalesce(p_limite, 20), 1), 50)
  offset greatest(coalesce(p_decalage, 0), 0);
$$;

revoke execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer, boolean, date, date, integer
) from public;
grant execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer, boolean, date, date, integer
) to anon, authenticated;
