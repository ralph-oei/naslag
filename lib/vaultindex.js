// Pure vault-logica: een naam→pad-index voor het oplossen van [[wikilinks]], plus
// de resolutieregel bij dubbele notitienamen (dichtstbijzijnde map, dan kortste pad,
// zoals Obsidian). Geen browser-afhankelijkheden → volledig unit-testbaar.

export const isMarkdown = (name) => /\.md$/i.test(name);

/** Naam zonder .md, kleine letters — de sleutel waarop [[Naam]] matcht. */
const noteKey = (name) => name.replace(/\.md$/i, '').toLowerCase();

/**
 * Bouwt een index van notitienaam → lijst paden, uit een platte lijst {path, name}.
 * Alleen markdown-bestanden; dubbele namen krijgen meerdere paden.
 */
export function buildNameIndex(files) {
  const idx = new Map();
  for (const f of files) {
    if (!isMarkdown(f.name)) continue;
    const key = noteKey(f.name);
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(f.path);
  }
  return idx;
}

/**
 * Lost een [[wikilink]]-doel op naar een pad. `fromPath` is de notitie waarin de link staat.
 * - `[[map/Naam]]` (met /): exact pad matchen.
 * - `[[Naam]]`: op basisnaam; bij meerdere kandidaten de dichtstbijzijnde map (langste
 *   gedeelde map-prefix met fromPath), en bij gelijkspel het kortste pad.
 * Alias (`|`) en anchor (`#`) worden genegeerd. Null als niets matcht.
 */
export function resolveWikilink(target, fromPath, index) {
  let t = String(target || '').split('|')[0].split('#')[0].trim().replace(/\.md$/i, '');
  if (!t) return null;

  if (t.includes('/')) {
    const want = (t + '.md').toLowerCase();
    for (const paths of index.values()) {
      for (const p of paths) {
        const pl = p.toLowerCase();
        if (pl === want || pl.endsWith('/' + want)) return p;
      }
    }
    return null;
  }

  const cands = index.get(t.toLowerCase());
  if (!cands || !cands.length) return null;
  if (cands.length === 1) return cands[0];

  const fromDir = String(fromPath || '').split('/').slice(0, -1);
  const commonDepth = (p) => {
    const dir = p.split('/').slice(0, -1);
    let n = 0;
    while (n < dir.length && n < fromDir.length && dir[n] === fromDir[n]) n++;
    return n;
  };
  return [...cands].sort((a, b) => commonDepth(b) - commonDepth(a) || a.length - b.length)[0];
}
