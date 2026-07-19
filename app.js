// Naslag — bootstrap. Unit 1: registreer de service worker, bedraad de
// navigatie-overlay en de install-prompt. Inloggen (unit 2), vault laden
// (unit 3+) volgen. De sign-in-knoppen zijn hier nog placeholders.
import { initNav, capturePwaInstall } from './lib/ui.js';

// Service worker (alleen in een secure context: https of localhost).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker niet geregistreerd:', err);
    });
  });
}

initNav();
capturePwaInstall();

// Placeholder tot unit 2 (OAuth) er is.
const notYet = () => alert('Inloggen komt in de volgende bouwstap (unit 2: Google OAuth).');
document.getElementById('signinMain')?.addEventListener('click', notYet);
document.getElementById('signinTop')?.addEventListener('click', notYet);
