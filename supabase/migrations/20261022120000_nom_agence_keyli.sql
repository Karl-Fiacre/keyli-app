-- Keyli — Nom de l'agence (raison sociale)
--
-- Décision du porteur de projet du 2026-10-22 : le nom de l'agence est
-- obligatoire à l'inscription d'une agence ; l'agence peut le modifier tant
-- qu'elle n'est pas vérifiée ; une fois son registre approuvé, il est figé
-- (il doit correspondre au registre) et seul un admin peut le changer,
-- action journalisée. Le profil public d'une agence affiche ce nom.

alter table public.profiles_keyli add column nom_agence text;

-- ------------------------------------------------------------
-- Inscription : nom d'agence obligatoire pour une agence (redéfinition de
-- handle_new_user_keyli, seul ajout : nom_agence)
-- ------------------------------------------------------------
create or replace function public.handle_new_user_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_demande text := nullif(new.raw_user_meta_data ->> 'role_keyli', '');
  v_nom_agence   text := nullif(btrim(new.raw_user_meta_data ->> 'nom_agence'), '');
begin
  if v_role_demande is not null
     and v_role_demande not in ('user', 'owner', 'agency') then
    raise exception 'Rôle non autorisé à l''inscription : %', v_role_demande
      using errcode = '22023';
  end if;

  if v_role_demande = 'agency' and v_nom_agence is null then
    raise exception 'Le nom de l''agence est obligatoire pour inscrire une agence'
      using errcode = '22023';
  end if;

  insert into public.profiles_keyli (user_id, email, first_name, last_name, phone, role_keyli, nom_agence)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(v_role_demande, 'user')::public.user_role_keyli,
    case when v_role_demande = 'agency' then v_nom_agence end
  );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Modification : par l'agence elle-même tant qu'elle n'est pas vérifiée ;
-- ensuite uniquement via la fonction admin (qui pose un drapeau de
-- transaction). Jamais vide, jamais pour un autre rôle qu'agence.
-- ------------------------------------------------------------
create or replace function public.controler_nom_agence_keyli()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.nom_agence is not distinct from old.nom_agence then
    return new;
  end if;

  if new.role_keyli <> 'agency' then
    raise exception 'Seul un compte agence porte un nom d''agence' using errcode = '23514';
  end if;
  if nullif(btrim(new.nom_agence), '') is null then
    raise exception 'Le nom de l''agence ne peut pas être vide' using errcode = '23514';
  end if;
  if coalesce(old.verified, false)
     and coalesce(current_setting('keyli.modification_admin_nom_agence', true), '') <> 'oui' then
    raise exception 'Agence vérifiée : le nom ne se modifie plus que par un admin' using errcode = '42501';
  end if;

  new.nom_agence := btrim(new.nom_agence);
  return new;
end;
$$;

create trigger trg_profiles_keyli_nom_agence
  before update of nom_agence on public.profiles_keyli
  for each row execute function public.controler_nom_agence_keyli();

revoke execute on function public.controler_nom_agence_keyli() from public, anon, authenticated;

grant update (nom_agence) on public.profiles_keyli to authenticated;

-- ------------------------------------------------------------
-- ACTION : correction du nom d'une agence vérifiée (admin, journalisée)
-- ------------------------------------------------------------
create or replace function public.admin_modifier_nom_agence_keyli(p_user uuid, p_nom text, p_motif text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avant text;
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un motif est obligatoire' using errcode = '22023';
  end if;

  select nom_agence into v_avant from public.profiles_keyli
   where user_id = p_user and role_keyli = 'agency' for update;
  if not found then
    raise exception 'Agence introuvable' using errcode = 'P0002';
  end if;

  perform set_config('keyli.modification_admin_nom_agence', 'oui', true);
  update public.profiles_keyli set nom_agence = p_nom where user_id = p_user;
  perform set_config('keyli.modification_admin_nom_agence', '', true);

  perform public.journaliser_keyli('nom_agence_modifie', 'user', p_user::text,
    jsonb_build_object('avant', v_avant, 'apres', btrim(p_nom), 'motif', p_motif));
end;
$$;

revoke execute on function public.admin_modifier_nom_agence_keyli(uuid, text, text) from public, anon;
grant execute on function public.admin_modifier_nom_agence_keyli(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- Profil public : une agence s'affiche sous son nom d'agence
-- (mêmes colonnes que la vue du 2026-10-05)
-- ------------------------------------------------------------
create or replace view public.profils_publics_keyli
with (security_invoker = false) as
select
  p.user_id,
  case
    when p.role_keyli = 'agency' then
      coalesce(nullif(btrim(p.nom_agence), ''),
               nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
               'Agence Keyli')
    else
      coalesce(
        nullif(btrim(concat_ws(' ',
          p.first_name,
          case when nullif(btrim(p.last_name), '') is not null
               then upper(left(btrim(p.last_name), 1)) || '.' end)), ''),
        'Membre Keyli')
  end                                  as nom_affiche,
  p.photo_url,
  p.role_keyli,
  coalesce(p.verified, false)          as verified,
  coalesce(p.rating_avg, 0)            as rating_avg,
  p.created_at                         as membre_depuis
from public.profiles_keyli p
where p.role_keyli in ('user', 'owner', 'agency');
