// Zoek-overlay (command-palette). Titels/paden instant uit de geheugen-index; inhoud
// via Drive fullText (online) met snippets. Pure logica leeft in search.js; dit bestand
// doet uitsluitend UI + orchestratie (debounce, Drive-call, states, toetsen).
import { getIndex, noteText } from './vault.js';
import { searchFullText, AuthError } from './drive.js';
import { currentToken } from './auth.js';
import { searchTitles, makeSnippet, filterVaultMarkdown, vaultIdSet } from './search.js';
import { openNoteFromSearch } from './vaultview.js';

const $ = (id) => document.getElementById(id);
const stripMd = (name) => name.replace(/\.md$/i, '');

let onReauth = () => {};
let seq = 0;            // race-bescherming: alleen de laatste query rendert
let debounceT = null;
let rows = [];          // platte lijst files, parallel aan de .s-row-knoppen (voor toetsen)
let sel = -1;
let bound = false;      // idempotentie: initSearch kan meermaals aangeroepen worden (bv. "andere map kiezen")

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
/** Escape + wikkel de [start,end]-ranges in <mark>. */
function hl(text, ranges) {
  if (!ranges || !ranges.length) return esc(text);
  let out = '', last = 0;
  for (const [s, e] of ranges) { out += esc(text.slice(last, s)) + '<mark>' + esc(text.slice(s, e)) + '</mark>'; last = e; }
  return out + esc(text.slice(last));
}

/** Zet de rest van de app-schil (alles buiten #search) inert zodat Tab/screenreaders
 * er niet in kunnen terwijl de overlay open is. */
function setAppInert(on) {
  for (const el of document.body.children) {
    if (el.id === 'search') continue;
    if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
    else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
  }
}

export function initSearch(reauth) {
  onReauth = reauth || (() => {});
  const btn = $('searchBtn');
  if (btn) btn.hidden = false;
  if (bound) return;      // listeners maar één keer binden, ook al wordt initSearch opnieuw aangeroepen
  bound = true;
  if (btn) btn.addEventListener('click', openSearch);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    else if (e.key === 'Escape' && !$('search')?.hidden) closeSearch();
  });
  $('searchClose')?.addEventListener('click', closeSearch);
  $('searchBackdrop')?.addEventListener('click', closeSearch);
  $('searchInput')?.addEventListener('input', onInput);
  $('searchInput')?.addEventListener('keydown', onKey);
}

function openSearch() {
  const ov = $('search'); if (!ov) return;
  seq++;
  ov.hidden = false;
  document.body.classList.add('search-open');
  setAppInert(true);
  const input = $('searchInput'); input.value = ''; input.focus();
  rows = []; sel = -1;
  $('searchResults').innerHTML = '<div class="s-hint">Zoek op titel of inhoud van je notities.</div>';
}
function closeSearch() {
  const ov = $('search'); if (!ov) return;
  seq++;
  ov.hidden = true;
  document.body.classList.remove('search-open');
  setAppInert(false);
  clearTimeout(debounceT);
  $('searchBtn')?.focus();   // focus terug naar de opener, geen dropped keyboard-focus
}

function onInput(e) {
  const q = e.target.value;
  clearTimeout(debounceT);
  const my = ++seq;
  const idx = getIndex();
  const titles = idx ? searchTitles(idx.files, q).slice(0, 8) : [];
  render({ titles, content: [], q, indexReady: !!idx, loading: !!q.trim() && navigator.onLine });
  if (!q.trim() || !idx) return;
  debounceT = setTimeout(() => runContent(q, my, titles), 250);
}

async function runContent(q, my, titles) {
  const idx = getIndex();
  if (!idx || !navigator.onLine) return;
  const token = currentToken();
  if (!token) return;
  try {
    const hits = await searchFullText(q, token);
    if (my !== seq) return;                       // nieuwere query is al onderweg
    const titleIds = new Set(titles.map((t) => t.file.id));
    const vault = vaultIdSet(idx.files);
    const content = filterVaultMarkdown(hits, vault).filter((f) => !titleIds.has(f.id)).slice(0, 8);
    const withSnips = await Promise.all(content.map(async (f) => {
      try { return { file: f, snippet: makeSnippet(await noteText(f.id, token), q, 150) }; }
      catch (err) { if (err instanceof AuthError) throw err; return { file: f, snippet: null }; }
    }));
    if (my !== seq) return;
    render({ titles, content: withSnips, q, indexReady: true, loading: false });
  } catch (err) {
    if (err instanceof AuthError) { closeSearch(); onReauth(); return; }
    if (my !== seq) return;
    render({ titles, content: [], q, indexReady: true, loading: false, error: true });
  }
}

function render({ titles, content, q, indexReady = true, loading = false, error = false }) {
  const body = $('searchResults');
  rows = []; sel = -1;
  if (!q.trim()) { body.innerHTML = '<div class="s-hint">Zoek op titel of inhoud van je notities.</div>'; return; }
  if (!indexReady) { body.innerHTML = '<div class="s-hint">Vault wordt geladen…</div>'; return; }

  let html = '';
  if (titles.length) {
    html += '<div class="s-group">Titels</div>';
    for (const t of titles) {
      const i = rows.length; rows.push(t.file);
      const disp = stripMd(t.file.name);
      const titleHtml = t.field === 'name' ? hl(disp, t.ranges) : esc(disp);
      const pathHtml = t.field === 'path' ? hl(t.file.path, t.ranges) : esc(t.file.path);
      html += rowHtml(i, titleHtml, pathHtml, '');
    }
  }

  html += '<div class="s-group">In inhoud' + (!navigator.onLine ? ' <span class="s-note">— vereist verbinding</span>' : '') + '</div>';
  if (!navigator.onLine) { /* alleen de melding boven */ }
  else if (loading) html += '<div class="s-hint">Zoeken…</div>';
  else if (error) html += '<div class="s-hint">Zoeken in de inhoud lukte niet.</div>';
  else if (content.length) {
    for (const c of content) {
      const i = rows.length; rows.push(c.file);
      const snip = c.snippet ? '<div class="s-snip">' + hl(c.snippet.text, c.snippet.ranges) + '</div>' : '';
      html += rowHtml(i, esc(stripMd(c.file.name)), esc(c.file.path), snip);
    }
  } else html += '<div class="s-hint">Geen treffers in de inhoud.</div>';

  if (!titles.length && !content.length && !loading && navigator.onLine && !error)
    html = '<div class="s-hint">Geen notitie gevonden voor “' + esc(q.trim()) + '”.</div>';

  body.innerHTML = html;
  body.querySelectorAll('.s-row').forEach((el) => el.addEventListener('click', () => choose(+el.dataset.i)));
}

function rowHtml(i, titleHtml, pathHtml, snippetHtml) {
  return `<button class="s-row" data-i="${i}">
    <div class="s-title">${titleHtml}</div>
    <div class="s-path">${pathHtml}</div>
    ${snippetHtml}
  </button>`;
}

function onKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); choose(sel >= 0 ? sel : 0); }
}
function move(d) {
  if (!rows.length) return;
  sel = sel === -1 ? (d > 0 ? 0 : rows.length - 1) : (sel + d + rows.length) % rows.length;
  const els = $('searchResults').querySelectorAll('.s-row');
  els.forEach((el, i) => el.classList.toggle('sel', i === sel));
  els[sel]?.scrollIntoView({ block: 'nearest' });
}
function choose(i) {
  const f = rows[i];
  if (!f) return;
  closeSearch();
  openNoteFromSearch(f, currentToken(), onReauth);
}
