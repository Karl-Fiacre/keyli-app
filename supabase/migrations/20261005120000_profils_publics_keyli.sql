-- Keyli — Profil public (fiche annonce, avis, page vendeur)
--
-- Décisions du porteur de projet du 2026-10-05 :
--   - particuliers : « Prénom I. » (initiale du nom), photo, rôle, badge
--     Vérifié, note moyenne, ancienneté ;
--   - agences : nom complet (entreprise identifiée par son registre) ;
--   - visible de tous, visiteurs compris (comme les annonces et les notes).
-- Jamais exposés : email, téléphone, n° et validité de pièce d'identité,
-- date de vérification.
--
-- profiles_keyli reste lisible par son seul titulaire (et l'admin) : le
-- public passe par cette vue, qui ne contient que les champs autorisés.
-- Vue volontairement exécutée avec les droits de son propriétaire
-- (security_invoker = false) : c'est elle qui fait le tri des colonnes.
-- Les comptes admin et super_admin n'y figurent pas.

create view public.profils_publics_keyli
with (security_invoker = false) as
select
  p.user_id,
  case
    when p.role_keyli = 'agency' then
      coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Agence Keyli')
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

comment on view public.profils_publics_keyli is
  'Profil public : nom affiché (Prénom I. / nom complet pour une agence), photo, rôle, badge, note, ancienneté — jamais email, téléphone ni pièce.';

revoke all on public.profils_publics_keyli from anon, authenticated;
grant select on public.profils_publics_keyli to anon, authenticated;
