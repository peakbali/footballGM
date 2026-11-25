/* FootballGM service worker: makes the game load and play offline. Relative paths keep it working under any base (e.g. /footballGM/). */
const VERSION = '__BUILD__';
const CACHE = 'fgm-' + VERSION;
const ASSETS = [/*__ASSETS__*/]; // filled in at build time
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...SHELL, ...ASSETS])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fgm-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // network first so a new version arrives, cached page when offline
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; }).catch(() => caches.match('./', { ignoreSearch: true })),
    );
    return;
  }
  // built assets have hashed names: cache first, fill on miss
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })),
  );
});
