// UI-helpers voor de app-schil. Unit 1: de off-canvas navigatie op smal scherm
// en het opvangen van de Android/desktop install-prompt. De boom-rendering en
// notitie-weergave komen in latere units.

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
