// Mise en page des emails de notification Keyli : mêmes tableaux et styles
// en ligne que les modèles d'authentification (supabase/templates/), seule
// écriture fiable dans Gmail et Outlook. Couleurs : tokens de la charte en
// hexadécimal (docs/DESIGN_SYSTEM.md, section Emails).

const POLICE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

// Échappement : tout texte venant de la base (titres, messages) est neutralisé
export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface ContenuEmail {
  titre: string
  apercu: string
  paragraphes: string[]
  citation?: string
  bouton: { libelle: string; url: string }
}

export function gabarit(c: ContenuEmail, urlApp: string, urlDesinscription: string): { html: string; texte: string } {
  const p = (t: string) =>
    `<p style="margin:0 0 14px;font-family:${POLICE};font-size:16px;line-height:24px;color:#1a1f2e;">${echapper(t)}</p>`
  const citation = c.citation
    ? `<p style="margin:4px 0 14px;padding:12px 16px;border-left:3px solid #00a898;background-color:#f4f7fb;font-family:${POLICE};font-size:15px;line-height:22px;color:#1a1f2e;font-style:italic;">${echapper(c.citation)}</p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${echapper(c.titre)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapper(c.apercu)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2f7" style="background-color:#eef2f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td align="left" style="padding:0 4px 20px;">
              <a href="${urlApp}" target="_blank"><img src="${urlApp}/keyli-logo-240.png" width="120" alt="Keyli" style="display:block;border:0;width:120px;height:auto;"></a>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e2e8f0;border-top:4px solid #00a898;border-radius:14px;padding:36px 32px;">
              <h1 style="margin:0 0 18px;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:24px;line-height:30px;font-weight:700;color:#1a1f2e;">${echapper(c.titre)}</h1>
              ${c.paragraphes.map(p).join('')}${citation}<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
                <tr>
                  <td bgcolor="#1a1f2e" style="border-radius:10px;">
                    <a href="${c.bouton.url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${POLICE};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${echapper(c.bouton.libelle)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 16px 0;font-family:${POLICE};font-size:12px;line-height:18px;color:#5c6a80;">
              Keyli — l'immobilier de confiance à Abidjan<br>
              Vous recevez cet email car vous avez un compte Keyli.<br>
              <a href="${urlApp}/profil" target="_blank" style="color:#0046b8;">Gérer mes emails</a> ·
              <a href="${urlDesinscription}" target="_blank" style="color:#0046b8;">Ne plus recevoir ces emails</a><br>
              Keyli ne vous demandera jamais votre mot de passe par email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // Version texte (clients sans HTML, filtres anti-spam)
  const texte = [
    c.titre,
    '',
    ...c.paragraphes,
    ...(c.citation ? ['', `« ${c.citation} »`] : []),
    '',
    `${c.bouton.libelle} : ${c.bouton.url}`,
    '',
    '—',
    'Keyli — l’immobilier de confiance à Abidjan',
    `Gérer mes emails : ${urlApp}/profil`,
    `Ne plus recevoir ces emails : ${urlDesinscription}`,
  ].join('\n')

  return { html, texte }
}
