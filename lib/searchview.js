// Zoek-overlay (command-palette). Titels/paden instant uit de geheugen-index; inhoud
// via Drive fullText (online) met snippets. Pure logica leeft in search.js; dit bestand
// doet uitsluitend UI + orchestratie. (Resultaten komen in de volgende stap erbij.)
const $ = (id) => document.getElementById(id);

export function initSearch(reauth) {
  const btn = $('searchBtn');
  if (btn) { btn.hidden = false; btn.addEventListener('click', openSearch); }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    else if (e.key === 'Escape' && !$('search')?.hidden) closeSearch();
  });
  $('searchClose')?.addEventListener('click', closeSearch);
  $('searchBackdrop')?.addEventListener('click', closeSearch);
}

function openSearch() {
  const ov = $('search'); if (!ov) return;
  ov.hidden = false;
  document.body.classList.add('search-open');
  const input = $('searchInput'); input.value = ''; input.focus();
  $('searchResults').innerHTML = '<div class="s-hint">Zoek op titel of inhoud van je notities.</div>';
}

function closeSearch() {
  const ov = $('search'); if (!ov) return;
  ov.hidden = true;
  document.body.classList.remove('search-open');
}
