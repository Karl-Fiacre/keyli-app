import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { ZoneRevele } from '@/components/animation/ZoneRevele'
import { TexteCinema } from '@/components/animation/TexteCinema'

// Vidéo de présentation des atouts (recherche, carte et GPS, vérification,
// contact) — produite avec Remotion (dossier video/, docs/MODULES/videos.md).
// Muette, lue seulement quand elle est visible ; jamais chargée d'avance
// (connexions mobiles) ; sans lecture automatique si l'utilisateur limite
// les animations (les commandes restent disponibles). L'écran grandit et
// s'arrondit moins en approchant du centre de la fenêtre (défilement).
export function VideoAtouts() {
  const video = useRef<HTMLVideoElement>(null)
  const ecran = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ecran, offset: ['start end', 'center center'] })
  const echelle = useTransform(scrollYProgress, [0, 1], [0.82, 1])
  const inclinaison = useTransform(scrollYProgress, [0, 1], [14, 0])
  const arrondi = useTransform(scrollYProgress, [0, 1], [48, 20])
  const [mouvementReduit] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    const v = video.current
    if (!v || mouvementReduit || !('IntersectionObserver' in window)) return
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          // La lecture peut être refusée (économie de données) : sans gravité
          v.play().catch(() => undefined)
        } else {
          v.pause()
        }
      },
      { threshold: 0.4 },
    )
    observateur.observe(v)
    return () => observateur.disconnect()
  }, [mouvementReduit])

  return (
    <section className="container py-16 md:py-20" aria-labelledby="titre-video">
      <ZoneRevele>
        <div className="kf-revele mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-glow">Keyli en 45 secondes</p>
          <TexteCinema
            id="titre-video"
            as="h2"
            quandVisible
            delai={0.2}
            segments={[
              { texte: 'Chercher, situer, ' },
              { texte: 'visiter en confiance', className: 'text-primary-glow' },
            ]}
            className="mt-1 font-titre text-3xl font-bold md:text-4xl"
          />
          <p className="mt-2 text-muted-foreground">
            Recherche précise, carte et position GPS, annonces vérifiées, messagerie et avis après visite.
          </p>
        </div>
        <div ref={ecran} className="mt-8" style={{ perspective: 1400 }}>
          <motion.div
            className="overflow-hidden border bg-primary shadow-card"
            style={{ scale: echelle, rotateX: inclinaison, borderRadius: arrondi }}
          >
            <video
              ref={video}
              className="aspect-video w-full"
              src="/videos/keyli-accueil.mp4"
              poster="/videos/keyli-accueil.jpg"
              muted
              loop
              playsInline
              preload="none"
              controls={mouvementReduit}
              aria-label="Présentation de Keyli : recherche, carte et GPS, vérification, contact et avis"
            />
          </motion.div>
        </div>
      </ZoneRevele>
    </section>
  )
}
