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
