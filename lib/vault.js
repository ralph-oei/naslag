// Runtime-vaultlaag: onthoudt welke Drive-map de vault is, en leest mappen/notities
// via drive.js met een lichte sessie-cache (opnieuw uitklappen kost dan geen API-call).
// Persistente offline-cache (IndexedDB) komt in unit 7.
import { listFolder, getFileText, getFileBlob, isFolder } from './drive.js';
import { isMarkdown, buildNameIndex } from './vaultindex.js';

const ROOT_KEY = 'naslag.vaultRoot';   // { id, name }
const listCache = new Map();           // folderId → items (per sessie)

export function getVaultRoot() {
  try { return JSON.parse(localStorage.getItem(ROOT_KEY) || 'null'); } catch { return null; }
}
export function setVaultRoot(id, name) {
  localStorage.setItem(ROOT_KEY, JSON.stringify({ id, name }));
}
export function clearVaultRoot() {
  localStorage.removeItem(ROOT_KEY);
  listCache.clear();
  clearIndex();
}

/** Directe kinderen van een map, met sessie-cache. */
export async function list(folderId, token) {
  if (listCache.has(folderId)) return listCache.get(folderId);
  const items = await listFolder(folderId, token);
  listCache.set(folderId, items);
  return items;
}

/** Ruwe tekst van een notitie. */
export function noteText(fileId, token) {
  return getFileText(fileId, token);
}

export function noteBlob(fileId, token) {
  return getFileBlob(fileId, token);
}

// ── Volledige vault-index (voor wikilinks/embeds) ────────────────────────────
// Eenmalige recursieve wandeling door de vault die alle paden verzamelt. Deelt de
// sessie-cache met de boom, dus uitklappen wordt daarna instant. Achtergrond-taak.
let indexData = null;     // { files, nameIndex, byPath, byName }
let indexPromise = null;

export function getIndex() { return indexData; }
export function clearIndex() { indexData = null; indexPromise = null; }

export function ensureIndex(rootId, token) {
  if (indexData) return Promise.resolve(indexData);
  if (!indexPromise) {
    indexPromise = walk(rootId, '', token).then((files) => {
      const byPath = new Map();
      const byName = new Map();
      for (const f of files) {
        byPath.set(f.path.toLowerCase(), f);
        const base = f.name.toLowerCase();
        if (!byName.has(base)) byName.set(base, f);
      }
      indexData = { files, nameIndex: buildNameIndex(files), byPath, byName };
      return indexData;
    }).catch((err) => { indexPromise = null; throw err; });
  }
  return indexPromise;
}

async function walk(folderId, prefix, token) {
  const items = await list(folderId, token);
  let out = [];
  for (const it of items) {
    const path = prefix ? prefix + '/' + it.name : it.name;
    if (isFolder(it)) out = out.concat(await walk(it.id, path, token));
    else out.push({ id: it.id, name: it.name, mimeType: it.mimeType, path });
  }
  return out;
}
