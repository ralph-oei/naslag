// Runtime-vaultlaag: onthoudt welke Drive-map de vault is, en leest mappen/notities
// via drive.js met een lichte sessie-cache (opnieuw uitklappen kost dan geen API-call).
// Persistente offline-cache (IndexedDB) komt in unit 7.
import { listFolder, getFileText } from './drive.js';

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
