import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { GrillePhotos } from '@/components/annonce/GrillePhotos'
import { useAjouterPhotos, usePhotosAnnonce, useReordonnerPhotos, useRetirerPhoto } from '@/hooks/usePhotos'
import { MAX_PHOTOS, MIN_PHOTOS, urlPhoto } from '@/lib/cloudinary'
import { messageErreur } from '@/partage/lib/erreurs'

// Photos d'une annonce en ligne, depuis « Mes annonces » : chaque action est
// enregistrée aussitôt (la base garde entre 1 et 10 photos).
export function GestionPhotos({ propertyId }: { propertyId: string }) {
  const photos = usePhotosAnnonce(propertyId)
  const ajouter = useAjouterPhotos(propertyId)
  const retirer = useRetirerPhoto(propertyId)
  const reordonner = useReordonnerPhotos(propertyId)
  const [progression, setProgression] = useState<number | null>(null)

  if (photos.isPending) return <p className="text-sm text-muted-foreground">Chargement des photos…</p>
  if (photos.isError) return <Alert variant="erreur">{messageErreur(photos.error)}</Alert>

  const liste = photos.data
  const erreur = ajouter.error ?? retirer.error ?? reordonner.error
  const occupe = progression !== null || retirer.isPending || reordonner.isPending

  return (
    <div className="space-y-3">
      <GrillePhotos
        photos={liste.map((p) => ({ cle: p.id, src: urlPhoto(p.url, 480, 360) ?? p.url }))}
        max={MAX_PHOTOS}
        min={MIN_PHOTOS}
        occupe={occupe}
        progression={progression}
        onAjouter={(fichiers) => {
          if (fichiers.length === 0) return
          setProgression(0)
          ajouter.mutate(
            {
              fichiers,
              ordreDepart: liste.reduce((m, p) => Math.max(m, p.order_index ?? 0), -1) + 1,
              surProgression: setProgression,
            },
            { onSettled: () => setProgression(null) },
          )
        }}
        onRetirer={(id) => retirer.mutate(id)}
        onDeplacer={(id, sens) => {
          const ids = liste.map((p) => p.id)
          const i = ids.indexOf(id)
          const j = i + sens
          if (i < 0 || j < 0 || j >= ids.length) return
          ;[ids[i], ids[j]] = [ids[j], ids[i]]
          reordonner.mutate(ids)
        }}
      />
      {erreur && <Alert variant="erreur">{messageErreur(erreur)}</Alert>}
    </div>
  )
}
