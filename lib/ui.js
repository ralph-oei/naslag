// UI-helpers voor de app-schil: off-canvas navigatie, install-prompt, offline-balk,
// iOS "aan beginscherm"-tip, en foutclassificatie.
import { AuthError } from './drive.js';

/** Maakt een fout begrijpelijk: 'auth' (verlopen), 'offline', 'notfound', 'unknown'. */
export function classifyError(err) {
  if (err instanceof AuthError) return 'auth';
  if (err instanceof TypeError) return 'offline';           // fetch-netwerkfout
  if (err && /\b404\b/.test(err.message || '')) return 'notfound';
  return 'unknown';
}

/** Toont een balk zodra het toestel offline is. */
export function initOfflineBanner() {
  const el = document.getElementById('offline');
  if (!el) return;
  const set = () => { el.hidden = navigator.onLine; };   // onLine=true → verbergen
  set();
  window.addEventListener('online', set);
  window.addEventListener('offline', set);
}

/** Eenmalige tip om de app aan het beginscherm toe te voegen (alleen iOS-Safari, niet standalone). */
export function initA2HSHint() {
  const el = document.getElementById('a2hs');
  if (!el) return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (!isIOS || standalone || localStorage.getItem('naslag.a2hs') === '1') return;
  el.hidden = false;
  el.querySelector('.a2hs-x')?.addEventListener('click', () => {
    el.hidden = true;
    localStorage.setItem('naslag.a2hs', '1');
  });
}

/** Bedraadt de hamburger, de backdrop en Escape om de sidebar te openen/sluiten. */
export function initNav() {
  const toggle = document.getElementById('navToggle');
  const backdrop = document.getElementById('backdrop');
  const open = () => document.body.classList.add('nav-open');
  const close = () => document.body.classList.remove('nav-open');
  const isOpen = () => document.body.classList.contains('nav-open');

  toggle?.addEventListener('click', () => (isOpen() ? close() : open()));
  backdrop?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Sluit de overlay automatisch weer als het scherm breed wordt (dan is de
  // sidebar vast) zodat de nav-open-state geen rare reststand achterlaat.
  const wide = window.matchMedia('(min-width: 820px)');
  wide.addEventListener('change', (e) => { if (e.matches) close(); });
}

/** Vangt de Android/desktop install-prompt en toont 'm later on demand. */
export function capturePwaInstall() {
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    // Voor nu alleen bewaren; unit 7 hangt er een "installeer"-hint aan.
    window.__naslagInstall = () => { deferred?.prompt(); deferred = null; };
  });
}
