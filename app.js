// Naslag — bootstrap. Unit 2: echte login via de Apps Script-makelaar (route B).
// Token uit een redirect oppikken → ingelogd-staat tonen; anders de login aanbieden.
// De vault-boom en notitie-weergave volgen in unit 3+.
import { initNav, capturePwaInstall } from './lib/ui.js';
import { handleRedirectReturn, currentToken, beginSignIn, clearToken } from './lib/auth.js';
import { about, AuthError } from './lib/drive.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW niet geregistreerd:', err));
  });
}

initNav();
capturePwaInstall();

// Token uit een terugkeer-redirect oppikken, of een bestaande sessie gebruiken.
handleRedirectReturn();
const token = currentToken();

if (token) showSignedIn(token);
else showSignedOut();

function showSignedOut() {
  document.getElementById('signinMain')?.addEventListener('click', beginSignIn);
}

async function showSignedIn(token) {
  document.getElementById('tree').textContent = 'Ingelogd. De vault-weergave komt in de volgende stap.';
  const reader = document.getElementById('reader');
  reader.innerHTML =
    '<section class="welcome">' +
    '<svg class="glyph" viewBox="0 0 48 48" aria-hidden="true"><use href="#naslag-mark"/></svg>' +
    '<h2 id="greet">Ingelogd</h2>' +
    '<p id="who">Even je account ophalen&hellip;</p>' +
    '<button class="cta" id="signout">Uitloggen</button>' +
    '<div class="fine">De vault-weergave (mappen + notities) bouwen we in de volgende stap.</div>' +
    '</section>';
  document.getElementById('signout').addEventListener('click', () => { clearToken(); location.reload(); });

  try {
    const info = await about(token);
    const u = info.user || {};
    document.getElementById('greet').textContent = 'Ingelogd als ' + (u.displayName || 'jij');
    document.getElementById('who').textContent = u.emailAddress || '';
  } catch (err) {
    if (err instanceof AuthError) { clearToken(); beginSignIn(); return; }
    document.getElementById('who').textContent = 'Kon je account niet ophalen: ' + err.message;
  }
}
