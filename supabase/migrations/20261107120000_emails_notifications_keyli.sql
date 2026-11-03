-- ============================================================
-- Emails de notification (décision du porteur, 2026-11-02)
-- Architecture : file d'envoi en base + tâche planifiée (pg_cron, chaque
-- minute) qui appelle l'Edge Function envoyer-emails (envoi via Resend).
-- * chaque notification d'un type retenu et chaque nouveau message
--   ajoutent une ligne dans emails_sortants_keyli (déclencheurs) ;
-- * l'Edge Function prend un lot (prendre_emails_keyli), envoie, puis
--   rend compte (terminer_email_keyli) : nouvel essai espacé si échec,
--   abandon après 5 tentatives ;
-- * messages regroupés : au plus un email par conversation toutes les
--   15 minutes, envoyé seulement si des messages sont encore non lus ;
-- * préférence de l'utilisateur (profil) et lien de désinscription sans
--   connexion (jeton). Emails de service (compte suspendu / réactivé,
--   badge retiré) toujours envoyés.
-- Détail : docs/MODULES/emails.md.
-- ============================================================

-- ---------- Préférence et jeton de désinscription ----------
alter table public.profiles_keyli
  add column emails_notifications boolean not null default true,
  add column jeton_desinscription uuid not null default gen_random_uuid();

alter table public.profiles_keyli
  add constraint profiles_keyli_jeton_desinscription_key unique (jeton_desinscription);

-- L'utilisateur règle lui-même sa préférence (droits accordés colonne par colonne)
grant update (emails_notifications) on public.profiles_keyli to authenticated;

-- ---------- Types de notification envoyés par email ----------
-- Choix du porteur : réservations et visites, compte et vérification
-- (abonnement compris), alertes de recherche. Exclus : recommandation de
-- forfait (commerciale) et visite effectuée (invitation à noter, in-app).
create or replace function public.notification_par_email_keyli(p_type text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_type in (
    'reservation_demandee', 'reservation_acceptee', 'reservation_refusee', 'reservation_annulee',
    'visite_planifiee', 'visite_modifiee', 'visite_annulee',
    'document_approuve', 'document_rejete', 'verification_retiree',
    'compte_suspendu', 'compte_reactive',
    'abonnement_rappel', 'abonnement_expire', 'depassement_cycle',
    'alerte_recherche'
  )
$$;

-- Emails de service : envoyés même si l'utilisateur a coupé les notifications
create or replace function public.email_de_service_keyli(p_type text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_type in ('compte_suspendu', 'compte_reactive', 'verification_retiree')
$$;

-- ---------- File d'envoi ----------
create table public.emails_sortants_keyli (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  categorie      text not null check (categorie in ('notification', 'message')),
  notification_id uuid references public.notifications_keyli(id) on delete cascade,
  type           text,
  property_id    uuid references public.properties_keyli(id) on delete cascade,
  expediteur_id  uuid references auth.users(id) on delete cascade,
  statut         text not null default 'en_attente'
                   check (statut in ('en_attente', 'en_cours', 'envoye', 'ignore', 'echec')),
  tentatives     integer not null default 0,
  erreur         text,
  envoyer_apres  timestamptz not null default now(),
  envoye_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Une notification porte sa référence ; un message sa conversation
  constraint emails_sortants_keyli_notification check (
    categorie <> 'notification' or (notification_id is not null and type is not null)
  ),
  constraint emails_sortants_keyli_message check (
    categorie <> 'message' or (expediteur_id is not null and property_id is not null)
  )
);

comment on table public.emails_sortants_keyli is
  'File des emails de notification (docs/MODULES/emails.md). Écrite par déclencheurs, vidée par l''Edge Function envoyer-emails.';

create index idx_emails_sortants_a_envoyer on public.emails_sortants_keyli (envoyer_apres)
  where statut = 'en_attente';
create index idx_emails_sortants_conversation on public.emails_sortants_keyli (user_id, property_id, expediteur_id, created_at desc)
  where categorie = 'message';
create index idx_emails_sortants_notification on public.emails_sortants_keyli (notification_id);

-- RLS : lecture réservée aux admins (suivi des envois) ; aucune écriture
-- directe — seuls les déclencheurs et les fonctions serveur écrivent.
alter table public.emails_sortants_keyli enable row level security;

create policy "Admins : lecture de la file d'emails"
  on public.emails_sortants_keyli for select
  to authenticated
  using ((select public.est_admin_keyli()));

grant select on public.emails_sortants_keyli to authenticated;

-- ---------- Déclencheur : notification → email ----------
create or replace function public.file_email_notification_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.notification_par_email_keyli(new.type) then
    return new;
  end if;
  -- Préférence vérifiée dès la mise en file (et de nouveau à l'envoi)
  if not public.email_de_service_keyli(new.type) and not exists (
    select 1 from public.profiles_keyli p
    where p.user_id = new.user_id and p.emails_notifications
  ) then
    return new;
  end if;
  insert into public.emails_sortants_keyli (user_id, categorie, notification_id, type, property_id)
  values (new.user_id, 'notification', new.id, new.type, new.property_id);
  return new;
end;
$$;

create trigger trg_file_email_notification
  after insert on public.notifications_keyli
  for each row execute function public.file_email_notification_keyli();

-- ---------- Déclencheur : message → email (regroupé) ----------
-- Un email déjà en attente pour la conversation suffit (il couvrira les
-- messages suivants). Sinon : départ dans 5 minutes (le temps de lire le
-- message dans l'application), et pas moins de 15 minutes après le
-- précédent email de cette conversation.
create or replace function public.file_email_message_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dernier timestamptz;
begin
  if new.property_id is null or new.from_user = new.to_user then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles_keyli p
    where p.user_id = new.to_user and p.emails_notifications
  ) then
    return new;
  end if;
  if exists (
    select 1 from public.emails_sortants_keyli e
    where e.categorie = 'message' and e.user_id = new.to_user
      and e.property_id = new.property_id and e.expediteur_id = new.from_user
      and e.statut in ('en_attente', 'en_cours')
  ) then
    return new;
  end if;

  select max(coalesce(e.envoye_at, e.created_at)) into v_dernier
  from public.emails_sortants_keyli e
  where e.categorie = 'message' and e.user_id = new.to_user
    and e.property_id = new.property_id and e.expediteur_id = new.from_user
    and e.statut = 'envoye';

  insert into public.emails_sortants_keyli (user_id, categorie, property_id, expediteur_id, envoyer_apres)
  values (
    new.to_user, 'message', new.property_id, new.from_user,
    greatest(now() + interval '5 minutes', coalesce(v_dernier + interval '15 minutes', now()))
  );
  return new;
end;
$$;

create trigger trg_file_email_message
  after insert on public.messages_keyli
  for each row execute function public.file_email_message_keyli();

-- ---------- Prise d'un lot à envoyer (Edge Function, service_role) ----------
-- Verrouille le lot (skip locked : deux exécutions simultanées ne prennent
-- jamais le même email), écarte ce qui n'a plus lieu d'être (préférence
-- coupée, adresse absente, messages déjà lus, conversation ouverte par une
-- demande de réservation déjà annoncée par email) et renvoie le contenu.
create or replace function public.prendre_emails_keyli(p_limite integer default 25)
returns table (
  id uuid,
  categorie text,
  type text,
  destinataire text,
  prenom text,
  titre text,
  contenu text,
  property_id uuid,
  titre_annonce text,
  expediteur_id uuid,
  expediteur text,
  extrait text,
  non_lus integer,
  jeton uuid
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ids uuid[];
begin
  -- Envois interrompus (fonction arrêtée en plein lot) : remis en file
  update public.emails_sortants_keyli e
  set statut = 'en_attente', updated_at = now()
  where e.statut = 'en_cours' and e.updated_at < now() - interval '10 minutes';

  with lot as (
    select e.id from public.emails_sortants_keyli e
    where e.statut = 'en_attente' and e.envoyer_apres <= now()
    order by e.envoyer_apres
    limit greatest(1, least(coalesce(p_limite, 25), 100))
    for update skip locked
  ), pris as (
    update public.emails_sortants_keyli e
    set statut = 'en_cours', tentatives = e.tentatives + 1, updated_at = now()
    from lot where e.id = lot.id
    returning e.id
  )
  select array_agg(pris.id) into v_ids from pris;

  if v_ids is null then
    return;
  end if;

  -- Écartés : plus d'adresse, préférence coupée (hors emails de service)
  update public.emails_sortants_keyli e
  set statut = 'ignore', erreur = 'Notifications par email désactivées ou adresse absente', updated_at = now()
  from public.profiles_keyli p
  where e.id = any (v_ids) and p.user_id = e.user_id
    and (p.email is null or (not p.emails_notifications
         and not (e.categorie = 'notification' and public.email_de_service_keyli(e.type))));

  -- Écartés : messages tous lus entre-temps
  update public.emails_sortants_keyli e
  set statut = 'ignore', erreur = 'Messages déjà lus', updated_at = now()
  where e.id = any (v_ids) and e.statut = 'en_cours' and e.categorie = 'message'
    and not exists (
      select 1 from public.messages_keyli m
      where m.to_user = e.user_id and m.from_user = e.expediteur_id
        and m.property_id = e.property_id and not m.read
    );

  -- Écartés : conversation ouverte par une demande de réservation, déjà
  -- annoncée par son propre email
  update public.emails_sortants_keyli e
  set statut = 'ignore', erreur = 'Couvert par l''email de demande de réservation', updated_at = now()
  where e.id = any (v_ids) and e.statut = 'en_cours' and e.categorie = 'message'
    and exists (
      select 1 from public.emails_sortants_keyli r
      where r.categorie = 'notification' and r.type = 'reservation_demandee'
        and r.user_id = e.user_id and r.property_id = e.property_id
        and r.created_at between e.created_at - interval '1 minute' and e.created_at + interval '1 minute'
    )
    and (
      select count(*) from public.messages_keyli m
      where m.to_user = e.user_id and m.from_user = e.expediteur_id
        and m.property_id = e.property_id and not m.read
    ) <= 1;

  return query
  select
    e.id,
    e.categorie,
    e.type,
    p.email,
    nullif(trim(coalesce(p.first_name, '')), ''),
    n.titre,
    n.contenu,
    e.property_id,
    pr.title,
    e.expediteur_id,
    case when e.categorie = 'message' then
      coalesce(nullif(x.nom_agence, ''), nullif(trim(coalesce(x.first_name, '')), ''), 'Un utilisateur')
    end,
    case when e.categorie = 'message' then (
      select left(m.body, 160) from public.messages_keyli m
      where m.to_user = e.user_id and m.from_user = e.expediteur_id
        and m.property_id = e.property_id and not m.read
      order by m.created_at desc limit 1
    ) end,
    case when e.categorie = 'message' then (
      select count(*)::integer from public.messages_keyli m
      where m.to_user = e.user_id and m.from_user = e.expediteur_id
        and m.property_id = e.property_id and not m.read
    ) end,
    p.jeton_desinscription
  from public.emails_sortants_keyli e
  join public.profiles_keyli p on p.user_id = e.user_id
  left join public.notifications_keyli n on n.id = e.notification_id
  left join public.properties_keyli pr on pr.id = e.property_id
  left join public.profiles_keyli x on x.user_id = e.expediteur_id
  where e.id = any (v_ids) and e.statut = 'en_cours';
end;
$$;

-- ---------- Compte rendu d'envoi ----------
-- Succès : envoyé. Échec : nouvel essai dans 5, 10, 15, 20 minutes, puis
-- abandon (« echec ») à la 5e tentative.
create or replace function public.terminer_email_keyli(p_id uuid, p_ok boolean, p_erreur text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.emails_sortants_keyli e
  set statut = case
        when p_ok then 'envoye'
        when e.tentatives >= 5 then 'echec'
        else 'en_attente'
      end,
      envoye_at = case when p_ok then now() end,
      erreur = case when p_ok then null else left(p_erreur, 500) end,
      envoyer_apres = case when p_ok then e.envoyer_apres else now() + make_interval(mins => 5 * e.tentatives) end,
      updated_at = now()
  where e.id = p_id and e.statut = 'en_cours';
end;
$$;

revoke execute on function public.prendre_emails_keyli(integer) from public, anon, authenticated;
revoke execute on function public.terminer_email_keyli(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.prendre_emails_keyli(integer) to service_role;
grant execute on function public.terminer_email_keyli(uuid, boolean, text) to service_role;

revoke execute on function public.file_email_notification_keyli() from public, anon, authenticated;
revoke execute on function public.file_email_message_keyli() from public, anon, authenticated;

-- ---------- Désinscription sans connexion (lien dans chaque email) ----------
create or replace function public.desinscrire_emails_keyli(p_jeton uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles_keyli
  set emails_notifications = false
  where jeton_desinscription = p_jeton;
  return found;
end;
$$;

revoke execute on function public.desinscrire_emails_keyli(uuid) from public;
grant execute on function public.desinscrire_emails_keyli(uuid) to anon, authenticated;

-- ---------- Tâche planifiée : réveil de l'Edge Function ----------
-- pg_net appelle l'Edge Function seulement s'il y a des emails dus. Adresse
-- du projet et clé publique (anon) lues dans le coffre (Vault), posées une
-- fois par projet : `keyli_url_projet`, `keyli_cle_anon` (procédure dans
-- docs/MODULES/emails.md). Sans elles, la tâche ne fait rien. Ce ne sont
-- pas des secrets (valeurs publiques du site) ; l'Edge Function ne fait que
-- vider la file, un appel extérieur n'avance qu'un envoi déjà prévu.
create extension if not exists pg_net with schema extensions;

create or replace function public.declencher_envoi_emails_keyli()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_cle text;
begin
  if not exists (
    select 1 from public.emails_sortants_keyli
    where statut = 'en_attente' and envoyer_apres <= now()
  ) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'keyli_url_projet';
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'keyli_cle_anon';
  if v_url is null or v_cle is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/envoyer-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_cle),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

revoke execute on function public.declencher_envoi_emails_keyli() from public, anon, authenticated;

select cron.schedule('keyli-envoi-emails', '* * * * *', 'select public.declencher_envoi_emails_keyli()');
