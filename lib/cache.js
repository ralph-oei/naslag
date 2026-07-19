// Persistente cache (IndexedDB) voor offline lezen: notitie-tekst, afbeeldingen en
// map-listings. Best-effort: als IndexedDB niet beschikbaar is (privémodus e.d.),
// no-op — de app werkt dan gewoon zonder offline-cache.
const DB_NAME = 'naslag';
const STORE = 'cache';
let dbPromise = null;

function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(() => null);
  return dbPromise;
}

async function withStore(mode, fn) {
  const d = await db();
  if (!d) return undefined;
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
  }).catch(() => undefined);
}

export function cacheGet(key) { return withStore('readonly', (s) => s.get(key)); }
export function cacheSet(key, value) { return withStore('readwrite', (s) => s.put(value, key)); }
