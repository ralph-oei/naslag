// Auth via de Apps Script login-makelaar (route B, op iPhone-standalone bewezen):
// de gebruiker autoriseert het Google-gehoste script (drive.readonly), het script
// stuurt het access-token terug in de fragment, en de app leest Drive daarna direct.
// Redirect-flow (geen popup → werkt in de standalone-PWA), geen client-secret op een server.
import { APPS_SCRIPT_URL } from './config.js';

const STORE_KEY = 'naslag.token';
// Apps Script-tokens leven ~1 uur. We behandelen ze als geldig tot ~50 min; een 401
// op een Drive-call (zie drive.js) is de harde trigger om opnieuw in te loggen.
const ASSUMED_LIFETIME_MS = 50 * 60 * 1000;

// ── Pure helpers (testbaar) ──────────────────────────────────────────────────

/** Bouwt de makelaar-URL die naar Google stuurt en met een token terugkeert naar `redirectUri`. */
export function buildBrokerUrl(scriptUrl, redirectUri) {
  const sep = scriptUrl.includes('?') ? '&' : '?';
  return scriptUrl + sep + 'redirect=' + encodeURIComponent(redirectUri);
}

/** Haalt het token uit de terugkeer-fragment. Null als er geen token in staat. */
export function parseTokenFromFragment(hash) {
  const m = (hash || '').match(/naslag_token=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Is dit opgeslagen record (nog) bruikbaar? `now` = Date.now(). */
export function tokenValid(rec, now) {
  return !!rec && typeof rec.token === 'string' && rec.token.length > 0
    && typeof rec.obtainedAt === 'number' && (now - rec.obtainedAt) < ASSUMED_LIFETIME_MS;
}

// ── Runtime (browser) ────────────────────────────────────────────────────────

/** Canonieke app-URL (zonder fragment) — moet in het script als redirect toegestaan zijn. */
function appRedirectUri() {
  return location.origin + location.pathname;
}

export function loadToken() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
}
function saveToken(token, now) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ token, obtainedAt: now }));
}
export function clearToken() { localStorage.removeItem(STORE_KEY); }

/** Start de login: navigeer naar de makelaar (volledige redirect, standalone-proof). */
export function beginSignIn() {
  location.assign(buildBrokerUrl(APPS_SCRIPT_URL, appRedirectUri()));
}

/** Bij paginalaad: token uit de fragment oppikken, opslaan, fragment strippen. Token of null. */
export function handleRedirectReturn(now = Date.now()) {
  const token = parseTokenFromFragment(location.hash);
  if (!token) return null;
  saveToken(token, now);
  history.replaceState(null, '', location.pathname + location.search);
  return token;
}

/** Het huidige geldige token, of null. */
export function currentToken(now = Date.now()) {
  const rec = loadToken();
  return tokenValid(rec, now) ? rec.token : null;
}
