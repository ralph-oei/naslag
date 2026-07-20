// Pure zoeklogica voor Naslag: titel-/pad-zoeken met ranking, snippet-extractie en
// het escapen van een Drive-query-waarde. Geen DOM- of netwerk-afhankelijkheden →
// volledig unit-testbaar (spiegelt vaultindex.js t.o.v. vaultview.js).
import { isMarkdown } from './vaultindex.js';

const stripMd = (name) => name.replace(/\.md$/i, '');

/** Escape een waarde voor een Drive-query tussen enkele quotes: `\` en `'`. */
export function escapeDriveValue(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Zoekt titels/paden in een platte bestandenlijst. Alleen markdown.
 * Rang: 0 = naam begint met query, 1 = naam bevat query, 2 = alleen pad bevat query.
 * `ranges` = [start,end]-paren in de getoonde string (naam-zonder-.md, of het pad).
 */
export function searchTitles(files, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const f of files || []) {
    if (!isMarkdown(f.name)) continue;
    const disp = stripMd(f.name);
    const pos = disp.toLowerCase().indexOf(q);
    if (pos === 0) out.push({ file: f, field: 'name', rank: 0, ranges: [[pos, pos + q.length]] });
    else if (pos > 0) out.push({ file: f, field: 'name', rank: 1, ranges: [[pos, pos + q.length]] });
    else {
      const pp = String(f.path).toLowerCase().indexOf(q);
      if (pp >= 0) out.push({ file: f, field: 'path', rank: 2, ranges: [[pp, pp + q.length]] });
    }
  }
  out.sort((a, b) =>
    a.rank - b.rank ||
    a.file.path.length - b.file.path.length ||
    a.file.path.localeCompare(b.file.path));
  return out;
}

/**
 * Bouwt een leesbaar fragment rond het eerste query-woord in `text`.
 * Slaat whitespace plat en zet ellipsis-tekens als er afgekapt is.
 * `ranges` markeren elk voorkomen van het gevonden woord binnen de snippet.
 */
export function makeSnippet(text, query, windowSize = 120) {
  const t = String(text || '');
  const tl = t.toLowerCase();
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  let idx = -1, word = '';
  for (const w of words) {
    const i = tl.indexOf(w);
    if (i >= 0 && (idx === -1 || i < idx)) { idx = i; word = w; }
  }
  if (idx === -1) return null;
  const half = Math.floor(windowSize / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(t.length, idx + word.length + half);
  const core = t.slice(start, end).replace(/\s+/g, ' ').trim();
  const snippet = (start > 0 ? '… ' : '') + core + (end < t.length ? ' …' : '');
  const ranges = [];
  const sl = snippet.toLowerCase();
  let p = sl.indexOf(word);
  while (p >= 0) { ranges.push([p, p + word.length]); p = sl.indexOf(word, p + word.length); }
  return { text: snippet, ranges };
}

/** Set van alle bestands-id's — om Drive-treffers tot de vault te beperken. */
export function vaultIdSet(files) {
  return new Set((files || []).map((f) => f.id));
}

/** Houd alleen Drive-treffers over die in de vault zitten én markdown zijn. */
export function filterVaultMarkdown(driveFiles, vaultIds) {
  return (driveFiles || []).filter((f) => vaultIds.has(f.id) && isMarkdown(f.name));
}
