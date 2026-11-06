// Indicateur affiché pendant le chargement d'une page à la demande
// (découpage du code, App.tsx). Discret, sans décalage de mise en page.
export function ChargementPage() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-primary-glow motion-reduce:animate-none"
        aria-hidden
      />
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
