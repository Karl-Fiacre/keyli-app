import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import {
  useDemarrerEnrolement,
  useValiderCode,
  type EtatDoubleAuth,
} from '@/partage/hooks/useDoubleAuth'
import { grouperSecret, nettoyerCodeTotp, schemaCodeTotp, type DonneesCodeTotp } from '@/partage/lib/doubleAuth'
import { messageErreur } from '@/partage/lib/erreurs'

// Écran affiché à un admin dont la session n'est pas encore vérifiée par
// un second facteur (docs/MODULES/admin.md). La base refuse de toute façon
// les pouvoirs d'admin sans session aal2 : cet écran explique et guide.
export function DoubleAuthAdmin({ etat }: { etat: Exclude<EtatDoubleAuth, { etape: 'verifiee' }> }) {
  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle>Double authentification</CardTitle>
          <CardDescription>
            {etat.etape === 'a_verifier'
              ? "Saisissez le code à 6 chiffres affiché par votre application d'authentification."
              : "L'administration de Keyli exige un second facteur. Configurez une application d'authentification (Google Authenticator, Microsoft Authenticator, 1Password…)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {etat.etape === 'a_verifier' ? <FormulaireCode facteurId={etat.facteurId} /> : <Enrolement />}
        </CardContent>
      </Card>
    </section>
  )
}

// Première configuration : QR code (ou clé), puis premier code pour valider
function Enrolement() {
  const enrolement = useDemarrerEnrolement()

  if (!enrolement.data) {
    return (
      <div className="space-y-4">
        {enrolement.isError && <Alert variant="erreur">{messageErreur(enrolement.error)}</Alert>}
        <Button className="w-full" onClick={() => enrolement.mutate()} disabled={enrolement.isPending}>
          {enrolement.isPending ? 'Préparation…' : 'Configurer mon application'}
        </Button>
      </div>
    )
  }

  const { qrCode, secret, facteurId } = enrolement.data
  return (
    <div className="kf-panneau-ouvre space-y-5">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Ouvrez votre application d'authentification.</li>
        <li>Scannez ce QR code (ou saisissez la clé à la main).</li>
        <li>Entrez le code à 6 chiffres qu'elle affiche.</li>
      </ol>
      <div className="flex justify-center">
        <img src={qrCode} alt="QR code à scanner avec l'application d'authentification" className="h-44 w-44 rounded-md border bg-white p-2" />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Clé : <span className="select-all font-mono text-foreground">{grouperSecret(secret)}</span>
      </p>
      <FormulaireCode facteurId={facteurId} />
    </div>
  )
}

function FormulaireCode({ facteurId }: { facteurId: string }) {
  const validation = useValiderCode()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DonneesCodeTotp>({ resolver: zodResolver(schemaCodeTotp), defaultValues: { code: '' } })

  return (
    <form
      onSubmit={handleSubmit((d) => validation.mutate({ facteurId, code: nettoyerCodeTotp(d.code) }))}
      noValidate
      className="space-y-4"
    >
      <ChampFormulaire libelle="Code à 6 chiffres" erreur={errors.code?.message}>
        {(a) => (
          <Input
            {...a}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            autoFocus
            className="text-center font-mono text-lg tracking-[0.4em]"
            {...register('code')}
          />
        )}
      </ChampFormulaire>
      {validation.isError && <Alert variant="erreur">{messageErreur(validation.error)}</Alert>}
      <Button type="submit" className="w-full" disabled={validation.isPending}>
        {validation.isPending ? 'Vérification…' : 'Valider'}
      </Button>
    </form>
  )
}
