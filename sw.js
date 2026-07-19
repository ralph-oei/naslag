// Naslag service worker — precachet de app-schil zodat het icoon offline opent.
// Vault-inhoud wordt later (unit 7) apart runtime-gecachet in IndexedDB; deze
// worker dekt alleen de statische schil.
const SHELL = 'naslag-shell-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './lib/ui.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Alleen GET's op de eigen origin uit de schil bedienen; Drive/OAuth/fonts
  // gaan altijd rechtstreeks naar het netwerk (nooit cachen, nooit onderscheppen).
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // Runtime-schilbestanden meenemen (bv. lib/* die later bijkomen).
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
