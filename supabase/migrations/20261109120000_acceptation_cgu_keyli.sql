-- ============================================================
-- Acceptation des conditions générales d'utilisation (2026-11-04)
-- Décisions du porteur : textes légaux dans le code, versionnés
-- (src/pages/juridique/, docs/MODULES/juridique.md) ; acceptation
-- enregistrée avec le numéro de version ; comptes existants (ou version
-- nouvelle) : acceptation demandée à la prochaine connexion.
-- La version en vigueur est connue de la base (version_cgu_keyli) : publier
-- une nouvelle version = migration qui change cette fonction + mise à jour
-- de la constante du site (src/lib/juridique.ts).
-- ============================================================

alter table public.profiles_keyli
  add column cgu_version text,
  add column cgu_acceptees_at timestamptz;

comment on column public.profiles_keyli.cgu_version is
  'Version des CGU acceptée (date de publication, ex. 2026-11-04). NULL = jamais acceptées.';

-- Aucun droit d'écriture direct sur ces colonnes : acceptation par
-- l'inscription (déclencheur) ou par accepter_cgu_keyli().

create or replace function public.version_cgu_keyli()
returns text
language sql
immutable
set search_path = ''
as $$ select '2026-11-04'::text $$;

grant execute on function public.version_cgu_keyli() to anon, authenticated;

-- ---------- À l'inscription ----------
-- Le formulaire envoie la version acceptée dans les métadonnées
-- (cgu_version). Le profil est créé par handle_new_user_keyli ; ce
-- déclencheur complète l'acceptation à la création, sans toucher à la
-- fonction d'inscription. Version différente de celle en vigueur : non
-- enregistrée (l'acceptation sera redemandée à la connexion).
create or replace function public.cgu_a_inscription_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text;
begin
  select u.raw_user_meta_data ->> 'cgu_version' into v_version
  from auth.users u where u.id = new.user_id;
  if v_version is not null and v_version = public.version_cgu_keyli() then
    new.cgu_version := v_version;
    new.cgu_acceptees_at := now();
  else
    new.cgu_version := null;
    new.cgu_acceptees_at := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.cgu_a_inscription_keyli() from public, anon, authenticated;

create trigger trg_cgu_a_inscription
  before insert on public.profiles_keyli
  for each row execute function public.cgu_a_inscription_keyli();

-- ---------- Acceptation après coup (comptes existants, nouvelle version) ----------
create or replace function public.accepter_cgu_keyli(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if p_version is distinct from public.version_cgu_keyli() then
    raise exception 'Cette version des conditions n''est plus en vigueur : rechargez la page.'
      using errcode = '22023';
  end if;
  update public.profiles_keyli
  set cgu_version = p_version, cgu_acceptees_at = now()
  where user_id = (select auth.uid());
end;
$$;

revoke execute on function public.accepter_cgu_keyli(text) from public, anon;
grant execute on function public.accepter_cgu_keyli(text) to authenticated;
