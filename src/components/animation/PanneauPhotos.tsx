import { useEffect, useState } from "react";
import photo1 from "@/assets/bienvenue/bienvenue-1.jpg";
import photo2 from "@/assets/bienvenue/bienvenue-2.jpg";
import photo3 from "@/assets/bienvenue/bienvenue-3.jpg";
import { cn } from "@/lib/utils";

// Panneau de photos des pages de connexion (demande du porteur,
// 2026-11-14) : les trois mêmes logements que l'écran de bienvenue de
// l'application mobile (DefilementPhotos.tsx, photos Unsplash — crédits
// dans docs/MODULES/mobile.md), même rythme : 6 s par photo, fondu
// enchaîné de 1,4 s et zoom lent. Mouvements réduits : fondu seul
// (dashboard-animations.css).
const PHOTOS = [photo1, photo2, photo3];
const DUREE = 6000;

export function PanneauPhotos({ className }: { className?: string }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const minuteur = setInterval(
      () => setIndice((i) => (i + 1) % PHOTOS.length),
      DUREE,
    );
    return () => clearInterval(minuteur);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-primary text-primary-foreground",
        className,
      )}
    >
      {PHOTOS.map((src, i) => (
        <img
          // La clé change à chaque passage : le zoom lent repart de zéro
          key={i === indice ? `${i}-actif` : i}
          src={src}
          alt=""
          aria-hidden
          className={cn(
            "kf-defile absolute inset-0 h-full w-full object-cover",
            i === indice ? "kf-defile-active" : "opacity-0",
          )}
        />
      ))}
      {/* Voile : léger en haut (logo), sombre en bas (texte) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-primary/55 via-primary/10 via-40% to-primary"
      />

      <div className="relative flex h-full flex-col justify-between p-10">
        <img
          src="/keyli-logo-full-blanc.svg"
          alt="Keyli"
          className="h-10 w-auto self-start"
        />
        <div className="space-y-5">
          <div className="flex gap-2" aria-hidden>
            {PHOTOS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-pill transition-all duration-500",
                  i === indice
                    ? "w-5 bg-turquoise"
                    : "w-1.5 bg-primary-foreground/40",
                )}
              />
            ))}
          </div>
          <p className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Le logement de confiance,{" "}
            <span className="text-turquoise">vérifié avant vous.</span>
          </p>
          <p className="flex max-w-md items-center gap-3 text-primary-foreground/80">
            <img
              src="/keyli_verified_badge.svg"
              alt=""
              aria-hidden
              className="h-6 w-6 shrink-0"
            />
            Biens vérifiés sur le terrain, contact protégé : votre numéro reste
            privé.
          </p>
        </div>
      </div>
    </div>
  );
}
