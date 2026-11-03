// envoyer-emails — vide la file des emails de notification
// (emails_sortants_keyli, docs/MODULES/emails.md). Réveillée chaque minute
// par la tâche planifiée keyli-envoi-emails (pg_cron + pg_net) quand des
// emails sont dus. Un appel extérieur ne peut qu'avancer un envoi déjà
// prévu : la file, le contenu et les destinataires viennent de la base.
//
// Transport : Resend (RESEND_API_KEY, secret posé par le porteur). En
// local, sans clé Resend : Mailpit (MAILPIT_URL, http://127.0.0.1:54324).
// Expéditeur : EMAIL_EXPEDITEUR (défaut « Keyli <no-reply@keyli.ci> »).
import { clientServeur, json } from '../_shared/commun.ts'
import { gabarit, type ContenuEmail } from './gabarit.ts'

interface EmailDu {
  id: string
  categorie: 'notification' | 'message'
  type: string | null
  destinataire: string
  prenom: string | null
  titre: string | null
  contenu: string | null
  property_id: string | null
  titre_annonce: string | null
  expediteur_id: string | null
  expediteur: string | null
  extrait: string | null
  non_lus: number | null
  jeton: string
}

const LOT = 25

// Page ouverte par le bouton, selon le type (même table que
// src/lib/notifications.ts côté site — à garder alignées)
function chemin(type: string, bien: string | null): { libelle: string; chemin: string } {
  if (type === 'alerte_recherche')
    return { libelle: 'Voir l’annonce', chemin: bien ? `/annonce/${bien}?source=lien_direct` : '/recherche' }
  if (type.startsWith('visite_')) return { libelle: 'Voir la visite', chemin: '/messages' }
  if (type === 'reservation_demandee') return { libelle: 'Répondre à la demande', chemin: '/reservations' }
  if (type.startsWith('reservation_')) return { libelle: 'Voir ma réservation', chemin: '/reservations' }
  if (type.startsWith('abonnement_') || type === 'depassement_cycle')
    return { libelle: 'Voir mon abonnement', chemin: '/abonnement' }
  if (type.startsWith('document_')) return { libelle: 'Voir ma vérification', chemin: bien ? '/annonces' : '/profil' }
  return { libelle: 'Ouvrir Keyli', chemin: '/profil' }
}

// « de Koffi » / « d’Aminata » (élision devant une voyelle ou un h muet)
function de(nom: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(nom) ? `d’${nom}` : `de ${nom}`
}

function composer(e: EmailDu, urlApp: string): ContenuEmail & { sujet: string } {
  const bonjour = e.prenom ? `Bonjour ${e.prenom},` : 'Bonjour,'
  if (e.categorie === 'message') {
    const qui = e.expediteur ?? 'Un utilisateur'
    const n = e.non_lus ?? 1
    const annonce = e.titre_annonce ? ` à propos de « ${e.titre_annonce} »` : ''
    return {
      sujet: `${qui} vous a écrit sur Keyli`,
      titre: n > 1 ? `${n} nouveaux messages ${de(qui)}` : `Nouveau message ${de(qui)}`,
      apercu: e.extrait ?? `${qui} vous a écrit${annonce}.`,
      paragraphes: [bonjour, `${qui} vous a écrit${annonce} :`],
      citation: e.extrait ?? undefined,
      bouton: {
        libelle: 'Répondre',
        url: `${urlApp}/messages/${e.property_id}/${e.expediteur_id}`,
      },
    }
  }
  const type = e.type ?? ''
  const lien = chemin(type, e.property_id)
  const titre = e.titre ?? 'Nouvelle notification'
  return {
    sujet: `${titre} — Keyli`,
    titre,
    apercu: e.contenu ?? titre,
    paragraphes: [
      bonjour,
      ...(e.contenu ? [e.contenu] : []),
      ...(e.titre_annonce ? [`Annonce : ${e.titre_annonce}`] : []),
    ],
    bouton: { libelle: lien.libelle, url: `${urlApp}${lien.chemin}` },
  }
}

async function envoyer(a: string, sujet: string, html: string, texte: string, desinscription: string) {
  const expediteur = Deno.env.get('EMAIL_EXPEDITEUR')?.trim() || 'Keyli <no-reply@keyli.ci>'
  const cleResend = Deno.env.get('RESEND_API_KEY')?.trim()
  if (cleResend) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cleResend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: expediteur,
        to: [a],
        subject: sujet,
        html,
        text: texte,
        headers: { 'List-Unsubscribe': `<${desinscription}>` },
      }),
    })
    if (!r.ok) throw new Error(`Resend ${r.status} : ${(await r.text()).slice(0, 300)}`)
    return
  }
  const mailpit = Deno.env.get('MAILPIT_URL')?.trim()
  if (mailpit) {
    const m = /^(.*)<(.+)>$/.exec(expediteur)
    const r = await fetch(`${mailpit.replace(/\/+$/, '')}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Name: m?.[1].trim() ?? 'Keyli', Email: m?.[2] ?? expediteur },
        To: [{ Email: a }],
        Subject: sujet,
        HTML: html,
        Text: texte,
      }),
    })
    if (!r.ok) throw new Error(`Mailpit ${r.status}`)
    return
  }
  throw new Error('Aucun transport : RESEND_API_KEY non configurée')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const urlApp = (Deno.env.get('KEYLI_APP_URL') ?? 'http://127.0.0.1:5173').trim().replace(/\/+$/, '')
  const serveur = clientServeur()
  const { data, error } = await serveur.rpc('prendre_emails_keyli', { p_limite: LOT })
  if (error) return json({ erreur: error.message }, 500)

  const lot = (data ?? []) as EmailDu[]
  let envoyes = 0
  for (const e of lot) {
    const desinscription = `${urlApp}/desinscription?jeton=${e.jeton}`
    try {
      const c = composer(e, urlApp)
      const { html, texte } = gabarit(c, urlApp, desinscription)
      await envoyer(e.destinataire, c.sujet, html, texte, desinscription)
      await serveur.rpc('terminer_email_keyli', { p_id: e.id, p_ok: true })
      envoyes++
    } catch (err) {
      await serveur.rpc('terminer_email_keyli', { p_id: e.id, p_ok: false, p_erreur: (err as Error).message })
    }
    // Resend : 2 requêtes par seconde au plus sur l'offre de base
    await new Promise((r) => setTimeout(r, 550))
  }
  return json({ pris: lot.length, envoyes })
})
