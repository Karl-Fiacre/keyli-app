import { useCallback, useState, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Image qui apparaît en fondu une fois chargée (classe kf-photo,
// docs/ANIMATIONS.md). Une image déjà en cache est affichée tout de suite.
// En cas d'erreur, l'image reste visible (texte alternatif du navigateur).
export function ImageFondu({ className, onLoad, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [chargee, setChargee] = useState(false)
  // Image déjà complète au montage (cache) : pas d'attente du fondu
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setChargee(true)
  }, [])

  return (
    <img
      ref={ref}
      {...props}
      data-chargee={chargee || undefined}
      onLoad={(e) => {
        setChargee(true)
        onLoad?.(e)
      }}
      onError={(e) => {
        setChargee(true)
        onError?.(e)
      }}
      className={cn('kf-photo', className)}
    />
  )
}
