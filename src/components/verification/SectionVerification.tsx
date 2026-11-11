import { VerifiedBadge } from '@/components/VerifiedBadge'
import { EmplacementDocument } from '@/components/verification/EmplacementDocument'
import { dernierDocument, useMesDocuments } from '@/partage/hooks/useVerification'
// Pièces à fournir selon le rôle : commun avec le mobile
import { PIECES_COMPTE } from '@/partage/lib/documents'


export function SectionVerification({ role, verifie }: { role: 'owner' | 'agency'; verifie: boolean }) {
  const documents = useMesDocuments()
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Vérification du compte</h2>
        {verifie && <VerifiedBadge />}
      </div>
      <p className="text-sm text-muted-foreground">
        {role === 'agency'
          ? 'Votre registre de commerce doit être approuvé avant votre première publication.'
          : 'Une fois ces deux pièces approuvées par l\'équipe Keyli, votre profil affiche le badge « Vérifié ».'}{' '}
        Vos documents restent privés : seule l'équipe Keyli les consulte.
      </p>
      {documents.isPending ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-3">
          {PIECES_COMPTE[role].map((type) => (
            <EmplacementDocument key={type} type={type} document={dernierDocument(documents.data, type)} />
          ))}
        </div>
      )}
    </section>
  )
}
