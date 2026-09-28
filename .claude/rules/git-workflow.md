# Workflow Git — Keyli

- `main` reste toujours stable et déployable. Développement sur branche
  courte (`feature/nom-de-la-fonctionnalite`), fusionnée dès que la
  fonctionnalité marche et compile.
- Commits fréquents et petits (un commit par fichier ou petit groupe cohérent
  terminé), message clair sur ce qui a changé et pourquoi — pas "fix" ou
  "update" seuls.
- Ne jamais committer : `.env` avec de vraies valeurs, clé `service_role`
  Supabase, secrets Paystack/Cloudinary.
- Avant de commencer une session : `git status` et `git log -3` en
  complément de la lecture de `docs/etat_avancement.md`, pour confirmer où
  la session précédente s'est arrêtée.
- En fin de session : le code committé doit compiler (`npm run build`) —
  ne jamais laisser `main` dans un état cassé pour la session suivante, et
  mettre à jour `docs/etat_avancement.md` avant de terminer.
