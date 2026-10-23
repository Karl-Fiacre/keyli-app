import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Message d'état : erreur (rouge, réservé aux erreurs), succès (vert),
// information (navy) — DESIGN_SYSTEM.md
const alertVariants = cva('rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      info: 'border-primary/20 bg-secondary text-foreground',
      erreur: 'border-destructive/40 bg-destructive/10 text-destructive',
      succes: 'border-success/40 bg-success/10 text-foreground',
    },
  },
  defaultVariants: { variant: 'info' },
})

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role={variant === 'erreur' ? 'alert' : 'status'} className={cn(alertVariants({ variant }), className)} {...props} />
}
