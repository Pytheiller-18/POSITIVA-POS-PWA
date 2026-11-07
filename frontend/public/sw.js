const CACHE_NAME = 'positiva-pos-pwa-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon.svg',
  './vendor/html5-qrcode.min.js'
];

// Instalación: Pre-cachear App Shell esencial y motor óptico de códigos de barras
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia Fetch:
// - /api/: Network-First con respuesta controlada 503 en modo sin red
// - Activos estáticos y bundles Vite (/assets/*): Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          offline: true,
          message: 'Sin conexión a internet. Operación respaldada en IndexedDB local.'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
