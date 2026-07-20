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
// Origin-niveau (met afsluitende / tegen subdomein-trucs): elke pad op je eigen
// domein mag, dus een latere slug-wijziging vergt geen nieuwe deploy.
var ALLOWED = 'https://ralphoei.ai/';

function doGet(e) {
  var token = ScriptApp.getOAuthToken();
  var redirect = (e && e.parameter && e.parameter.redirect) || '';

  // Alleen terugsturen naar de eigen app-URL (voorkomt token-exfiltratie).
  if (redirect.indexOf(ALLOWED) !== 0) {
    return HtmlService.createHtmlOutput('Ongeldige of ontbrekende redirect-parameter.');
  }

  var sep = redirect.indexOf('#') === -1 ? '#' : '&';
  var back = redirect + sep + 'naslag_token=' + encodeURIComponent(token);
  var hrefAttr = back.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  // Styling gelijkgetrokken met de PWA (index.html): paper-achtergrond, Newsreader-
  // serif kop, groene pill-CTA met shadow, ink-hiërarchie, dark-mode + rise-animatie.
  var html =
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600&display=swap" rel="stylesheet">' +
    '<style>' +
    ':root{--paper:#F4EFE6;--ink-1:#22201B;--ink-2:#6B655A;--ink-3:#9A9384;' +
    '--accent:#2E6E57;--accent-ink:#FBF8F2;--accent-soft:rgba(46,110,87,.12);' +
    '--shadow:0 10px 40px rgba(40,34,20,.14);' +
    "--serif:'Newsreader',Georgia,'Times New Roman',serif;" +
    '--sans:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '@media(prefers-color-scheme:dark){:root{--paper:#15140F;--ink-1:#EDE7D8;--ink-2:#A59D8A;' +
    '--ink-3:#6E6656;--accent:#5FB894;--accent-ink:#15140F;--accent-soft:rgba(95,184,148,.14);' +
    '--shadow:0 12px 44px rgba(0,0,0,.5)}}' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:var(--sans);background:var(--paper);color:var(--ink-1);min-height:100dvh;' +
    'display:flex;align-items:center;justify-content:center;padding:40px 24px;' +
    '-webkit-font-smoothing:antialiased;line-height:1.5}' +
    '.card{max-width:23rem;text-align:center;animation:rise .5s cubic-bezier(.2,.7,.2,1) both}' +
    '.badge{width:66px;height:66px;margin:0 auto 22px;border-radius:50%;background:var(--accent-soft);' +
    'display:flex;align-items:center;justify-content:center;color:var(--accent)}' +
    '.badge svg{width:32px;height:32px}' +
    'h1{font-family:var(--serif);font-weight:500;font-size:27px;letter-spacing:-.01em;margin-bottom:9px}' +
    'p.sub{color:var(--ink-2);font-size:15px;margin-bottom:24px}' +
    'a.cta{font-family:var(--sans);font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;' +
    'display:inline-flex;align-items:center;gap:9px;background:var(--accent);color:var(--accent-ink);' +
    'padding:13px 24px;border-radius:13px;box-shadow:var(--shadow);transition:transform .15s,filter .15s}' +
    'a.cta:hover{filter:brightness(1.05)}a.cta:active{transform:translateY(1px)}' +
    'a.cta svg{width:16px;height:16px;flex:none}' +
    '.fine{margin-top:18px;font-size:12.5px;color:var(--ink-3);font-family:var(--serif);font-style:italic}' +
    '@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
    '</style>' +
    '<div class="card">' +
    '<div class="badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
    '<h1>Je bent ingelogd</h1>' +
    '<p class="sub">We sturen je terug naar Naslag&hellip;</p>' +
    '<a id="go" class="cta" href="' + hrefAttr + '" target="_top">' +
    '<span>Ga verder naar Naslag</span>' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
    '</a>' +
    '<div class="fine">Naslag &middot; je vault, om te lezen</div>' +
    '</div>' +
    '<script>try{window.top.location.href=' + JSON.stringify(back) + ';}catch(err){}<\/script>';

  return HtmlService.createHtmlOutput(html)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
