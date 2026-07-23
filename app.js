// Naslag — bootstrap. Unit 2: echte login via de Apps Script-makelaar (route B).
// Token uit een redirect oppikken → ingelogd-staat tonen; anders de login aanbieden.
// De vault-boom en notitie-weergave volgen in unit 3+.
import { initNav, capturePwaInstall, initOfflineBanner, initA2HSHint } from './lib/ui.js';
import { handleRedirectReturn, currentToken, beginSignIn, clearToken } from './lib/auth.js';
import { about, AuthError } from './lib/drive.js';
import { getVaultRoot } from './lib/vault.js';
import { renderVaultPicker, renderTree, renderSidebarFoot } from './lib/vaultview.js';
import { initSearch } from './lib/searchview.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW niet geregistreerd:', err));
  });
}

initNav();
capturePwaInstall();
initOfflineBanner();
initA2HSHint();

// Token uit een terugkeer-redirect oppikken, of een bestaande sessie gebruiken.
handleRedirectReturn();
const token = currentToken();

if (token) showSignedIn(token);
else showSignedOut();

function showSignedOut() {
  document.getElementById('signinMain')?.addEventListener('click', beginSignIn);
}

async function showSignedIn(token) {
  const reauth = () => { clearToken(); beginSignIn(); };

  // Account ophalen (bevestigt meteen dat het token nog geldig is).
  let email = '';
  try {
    email = (await about(token)).user?.emailAddress || '';
  } catch (err) {
    if (err instanceof AuthError) return reauth();
    // geen net / andere fout: toch doorgaan; de vault-calls tonen de fout wel.
  }

  const onVaultPicked = () => initSearch(reauth);
  renderSidebarFoot(email, { token, reauth, onSignOut: () => { clearToken(); location.reload(); }, onVaultPicked });

  if (getVaultRoot()) { renderTree(token, reauth); initSearch(reauth); }
  else renderVaultPicker(token, reauth, onVaultPicked);
}
