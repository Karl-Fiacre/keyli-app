-- ============================================================
-- Sprint 7 — aide et support (2026-11-07)
-- Décision du porteur : passage grand public, aide et support
-- (docs/MODULES/ouverture-grand-public.md).
--
-- Les utilisateurs connectés ont déjà leur canal : les retours
-- (feedback_keyli), avec réponse de l'équipe et notification. Il manquait
-- un moyen pour un visiteur SANS compte (ou qui ne peut plus se connecter)
-- de joindre l'équipe : demandes_support_keyli.
--
-- 1. Table demandes_support_keyli : RLS, lecture et suivi réservés aux admins.
-- 2. Envoi par envoyer_demande_support_keyli (visiteurs compris) : la
--    fonction valide et limite le débit ; aucune insertion directe.
-- ============================================================

-- ---------- 1. Table ----------
create table public.demandes_support_keyli (
  id          uuid primary key default gen_random_uuid(),
  -- Expéditeur connecté, s'il l'était au moment de l'envoi
  user_id     uuid references auth.users (id) on delete set null,
  email       text not null,
  nom         text not null,
  sujet       text not null,
  message     text not null,
  statut      text not null default 'nouvelle',
  note_admin  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint demandes_support_email_format
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  constraint demandes_support_nom_longueur check (char_length(nom) between 1 and 80),
  constraint demandes_support_sujet
    check (sujet in ('compte', 'annonce', 'verification', 'paiement', 'partenariat', 'autre')),
  constraint demandes_support_message_longueur check (char_length(message) between 10 and 2000),
  constraint demandes_support_statut check (statut in ('nouvelle', 'en_cours', 'traitee', 'classee')),
  constraint demandes_support_note_longueur check (char_length(note_admin) <= 2000)
);

comment on table public.demandes_support_keyli is
  'Demandes d''aide envoyées depuis la page Aide (visiteurs compris). Envoi par envoyer_demande_support_keyli.';

-- File de l'équipe (statut puis date) et limite de débit (email, date)
create index idx_demandes_support_statut on public.demandes_support_keyli (statut, created_at);
create index idx_demandes_support_email on public.demandes_support_keyli (email, created_at desc);

create trigger trg_demandes_support_updated_at
  before update on public.demandes_support_keyli
  for each row execute function public.set_updated_at_keyli();

alter table public.demandes_support_keyli enable row level security;

-- Aucune insertion directe (anti-abus, voir la fonction) ; l'équipe lit et
-- suit les demandes (statut, note interne).
revoke all on public.demandes_support_keyli from anon, authenticated;
grant select on public.demandes_support_keyli to authenticated;
grant update (statut, note_admin) on public.demandes_support_keyli to authenticated;

create policy "Support : lecture admin" on public.demandes_support_keyli
  for select to authenticated
  using ((select public.est_admin_keyli()));

create policy "Support : suivi admin" on public.demandes_support_keyli
  for update to authenticated
  using ((select public.est_admin_keyli()))
  with check ((select public.est_admin_keyli()));

-- ---------- 2. Envoi ----------
create or replace function public.envoyer_demande_support_keyli(
  p_email   text,
  p_nom     text,
  p_sujet   text,
  p_message text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse email invalide.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_nom, ''))) not between 1 and 80 then
    raise exception 'Votre nom est requis (80 caractères au plus).' using errcode = '22023';
  end if;
  if p_sujet is null or p_sujet not in ('compte', 'annonce', 'verification', 'paiement', 'partenariat', 'autre') then
    raise exception 'Sujet inconnu.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 10 and 2000 then
    raise exception 'Le message doit compter entre 10 et 2000 caractères.' using errcode = '22023';
  end if;

  -- Anti-abus : 3 demandes par heure pour une même adresse, et 200 par
  -- heure sur toute la plateforme (protège la file de l'équipe)
  if (select count(*) from public.demandes_support_keyli d
       where d.email = v_email and d.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Vous avez déjà envoyé plusieurs demandes : l''équipe vous répond au plus vite.'
      using errcode = '23514';
  end if;
  if (select count(*) from public.demandes_support_keyli d
       where d.created_at > now() - interval '1 hour') >= 200 then
    raise exception 'Trop de demandes en ce moment : réessayez dans une heure.' using errcode = '23514';
  end if;

  insert into public.demandes_support_keyli (user_id, email, nom, sujet, message)
  values ((select auth.uid()), v_email, btrim(p_nom), p_sujet, btrim(p_message));
end;
$$;

revoke execute on function public.envoyer_demande_support_keyli(text, text, text, text) from public;
grant execute on function public.envoyer_demande_support_keyli(text, text, text, text) to anon, authenticated;
