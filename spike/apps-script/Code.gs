/**
 * Naslag — spike: Apps Script als login-makelaar.
 * De gebruiker autoriseert dit script (drive.readonly). Het script pakt met
 * ScriptApp.getOAuthToken() het Drive-token van de gebruiker en stuurt de browser
 * terug naar de PWA met dat token in de fragment. De PWA leest Drive daarna direct.
 *
 * Deploy: Beheren → Implementeren → Nieuwe implementatie → type "Web-app",
 *   "Uitvoeren als: Gebruiker die de web-app opent",
 *   "Wie heeft toegang: Alleen ikzelf" (voor de spike).
 */
function doGet(e) {
  var token = ScriptApp.getOAuthToken();
  var redirect = (e && e.parameter && e.parameter.redirect) || '';

  // Alleen terugsturen naar onze eigen PWA.
  if (redirect.indexOf('https://ralphoei.ai/vault') !== 0) {
    return HtmlService.createHtmlOutput('Ongeldige of ontbrekende redirect-parameter.');
  }

  var sep = redirect.indexOf('#') === -1 ? '#' : '&';
  var back = redirect + sep + 'naslag_token=' + encodeURIComponent(token);

  var html =
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{font:16px -apple-system,BlinkMacSystemFont,sans-serif;padding:44px 24px;' +
    'text-align:center;color:#22201b;background:#F4EFE6}' +
    'a{display:inline-block;margin-top:22px;background:#2E6E57;color:#fff;text-decoration:none;' +
    'padding:14px 24px;border-radius:12px;font-weight:600}</style>' +
    '<p>Ingelogd. Terug naar Naslag&hellip;</p>' +
    '<a id="go" href="' + back.replace(/"/g, '&quot;') + '" target="_top">Ga verder naar Naslag</a>' +
    '<script>try{window.top.location.href=' + JSON.stringify(back) + ';}catch(err){}<\/script>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
