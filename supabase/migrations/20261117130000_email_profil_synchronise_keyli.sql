-- ============================================================
-- Sprint 11-12 — adresse email du profil synchronisée (2026-11-08)
-- Bug connu (docs/etat_avancement.md, « Blocages ») : profiles_keyli.email
-- est copiée à l'inscription mais ne suivait pas un changement d'adresse
-- dans Supabase Auth. Or c'est elle qui sert aux emails de notification et
-- au paiement Paystack : ils partaient à l'ancienne adresse.
--
-- Supabase Auth ne modifie auth.users.email qu'après confirmation du
-- changement (lien envoyé à la nouvelle adresse) : la copie suit donc
-- toujours une adresse confirmée. L'utilisateur ne peut pas modifier lui-même
-- profiles_keyli.email (aucun droit sur cette colonne).
-- ============================================================

create or replace function public.synchroniser_email_profil_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles_keyli
     set email = new.email
   where user_id = new.id and email is distinct from new.email;
  return new;
end;
$$;

revoke execute on function public.synchroniser_email_profil_keyli() from public, anon, authenticated;

create trigger on_auth_user_email_keyli
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.synchroniser_email_profil_keyli();

-- Rattrapage des comptes déjà décalés
update public.profiles_keyli p
   set email = u.email
  from auth.users u
 where u.id = p.user_id and p.email is distinct from u.email;
