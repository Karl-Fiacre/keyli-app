-- ============================================================
-- Connexion Google, Apple, Facebook (demande du porteur, 2026-11-22)
-- ------------------------------------------------------------
-- Ces fournisseurs ne remplissent pas first_name / last_name : ils donnent
-- given_name / family_name (Google), ou full_name / name (Google, Facebook).
-- Le trigger de création de profil prend ces valeurs à défaut. Le rôle d'un
-- compte créé ainsi reste « user » (pas de role_keyli dans les métadonnées),
-- et les CGU sont acceptées à l'écran dédié au premier lancement.
-- Aucune table ni policy nouvelle : seule la fonction change.
-- ============================================================

create or replace function public.handle_new_user_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta         jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role_demande text := nullif(v_meta ->> 'role_keyli', '');
  v_nom_agence   text := nullif(btrim(v_meta ->> 'nom_agence'), '');
  v_nom_complet  text := nullif(btrim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name')), '');
  v_prenom       text := coalesce(nullif(btrim(v_meta ->> 'first_name'), ''), nullif(btrim(v_meta ->> 'given_name'), ''));
  v_nom          text := coalesce(nullif(btrim(v_meta ->> 'last_name'), ''), nullif(btrim(v_meta ->> 'family_name'), ''));
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

  -- Nom complet seul (Facebook) : premier mot = prénom, le reste = nom
  if v_prenom is null and v_nom is null and v_nom_complet is not null then
    v_prenom := split_part(v_nom_complet, ' ', 1);
    v_nom    := nullif(btrim(substr(v_nom_complet, length(v_prenom) + 1)), '');
  end if;

  insert into public.profiles_keyli (user_id, email, first_name, last_name, phone, role_keyli, nom_agence)
  values (
    new.id,
    new.email,
    v_prenom,
    v_nom,
    nullif(v_meta ->> 'phone', ''),
    coalesce(v_role_demande, 'user')::public.user_role_keyli,
    case when v_role_demande = 'agency' then v_nom_agence end
  );
  return new;
end;
$$;
