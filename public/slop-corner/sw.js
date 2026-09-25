// Registered from the hub in production builds only. Same-origin GETs only; ads, fonts and
// anything cross-origin go straight to the network.
//   navigations / .html  network first, cached copy when offline
//   /assets/*            cache first (Vite hashes these names, so a hit is never stale)
//   everything else      straight to the network
const CACHE = 'kerb-appeal-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch (err) {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('/slop-corner/kerb-appeal/')) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/slop-corner/assets/')) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});
