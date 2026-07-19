/**
 * Naslag — login-makelaar (Google Apps Script web-app).
 *
 * De gebruiker autoriseert dit Google-gehoste script (drive.readonly). Het script
 * pakt met ScriptApp.getOAuthToken() het Drive-token van de gebruiker en stuurt de
 * browser terug naar de Naslag-PWA met dat token in de fragment. De PWA leest Drive
 * daarna direct. Zo is er geen client-secret op een eigen server nodig, en werkt het
 * voor elke Google-gebruiker.
 *
 * ZELF HOSTEN:
 *  1. Zet ALLOWED hieronder op de URL van je eigen Naslag-app.
 *  2. Deploy als web-app: Uitvoeren als = "Gebruiker die de web-app opent",
 *     Wie heeft toegang = "Iedereen met een Google-account" (of "Alleen ikzelf").
 *  3. Zet de Drive-API aan in het Google Cloud-project achter dit script.
 *  4. Kopieer de /exec-URL naar lib/config.js in de app.
 */
var ALLOWED = 'https://ralphoei.ai/vault';

function doGet(e) {
  var token = ScriptApp.getOAuthToken();
  var redirect = (e && e.parameter && e.parameter.redirect) || '';

  // Alleen terugsturen naar de eigen app-URL (voorkomt token-exfiltratie).
  if (redirect.indexOf(ALLOWED) !== 0) {
    return HtmlService.createHtmlOutput('Ongeldige of ontbrekende redirect-parameter.');
  }

  var sep = redirect.indexOf('#') === -1 ? '#' : '&';
  var back = redirect + sep + 'naslag_token=' + encodeURIComponent(token);

  var html =
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{font:16px -apple-system,sans-serif;padding:44px 24px;text-align:center;color:#22201b;background:#F4EFE6}' +
    'a{display:inline-block;margin-top:22px;background:#2E6E57;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600}</style>' +
    '<p>Ingelogd. Terug naar Naslag&hellip;</p>' +
    '<a id="go" href="' + back.replace(/"/g, '&quot;') + '" target="_top">Ga verder naar Naslag</a>' +
    '<script>try{window.top.location.href=' + JSON.stringify(back) + ';}catch(err){}<\/script>';

  return HtmlService.createHtmlOutput(html)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
