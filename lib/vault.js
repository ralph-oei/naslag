// Runtime-vaultlaag: onthoudt welke Drive-map de vault is, en leest mappen/notities
// via drive.js met een lichte sessie-cache (opnieuw uitklappen kost dan geen API-call).
// Persistente offline-cache (IndexedDB) komt in unit 7.
import { listFolder, getFileText, getFileBlob, isFolder, AuthError } from './drive.js';
import { isMarkdown, buildNameIndex } from './vaultindex.js';
import { cacheGet, cacheSet } from './cache.js';

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

/** Directe kinderen van een map. Sessie-cache; offline terugval op IndexedDB. */
export async function list(folderId, token) {
  if (listCache.has(folderId)) return listCache.get(folderId);
  try {
    const items = await listFolder(folderId, token);
    listCache.set(folderId, items);
    cacheSet('list:' + folderId, items);
    return items;
  } catch (err) {
    if (err instanceof AuthError) throw err;      // token verlopen → niet uit cache maskeren
    const c = await cacheGet('list:' + folderId);
    if (c) { listCache.set(folderId, c); return c; }
    throw err;
  }
}

/** Ruwe tekst van een notitie. Network-first, offline uit cache. */
export async function noteText(fileId, token) {
  try {
    const t = await getFileText(fileId, token);
    cacheSet('text:' + fileId, t);
    return t;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    const c = await cacheGet('text:' + fileId);
    if (c != null) return c;
    throw err;
  }
}

/** Afbeelding-blob. Network-first, offline uit cache. */
export async function noteBlob(fileId, token) {
  try {
    const b = await getFileBlob(fileId, token);
    cacheSet('blob:' + fileId, b);
    return b;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    const c = await cacheGet('blob:' + fileId);
    if (c) return c;
    throw err;
  }
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
