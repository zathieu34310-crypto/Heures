/* ═══════════════════════════════════════════════════════
   Service Worker — Suivi des Heures  (offline-first)
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'heures-v2';

const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── INSTALL : cache chaque asset indépendamment ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On cache chaque fichier séparément : un échec n'annule pas tout
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Cache miss:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE : suppression des anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH : Cache-first, fallback réseau, fallback index.html ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // On ignore les requêtes vers d'autres origines
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // ✅ Trouvé en cache → retour immédiat (offline-first)
      if (cached) return cached;

      // 🌐 Pas en cache → on essaie le réseau
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        // On met en cache pour la prochaine fois
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // 📴 Offline et pas en cache → fallback vers index.html
        return caches.match('./index.html');
      });
    })
  );
});
