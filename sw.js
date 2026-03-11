const CACHE_NAME = 'vortaro-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './dictionary.json',
  './favicon.png',
  './favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Only handle http/https requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 2. Skip Analytics
  if (url.hostname.includes('google-analytics') || url.hostname.includes('googletagmanager')) {
    return;
  }

  // 3. Network-First for navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match('./index.html');
        })
    );
    return;
  }

  // 4. Stale-While-Revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(err => {
        if (err.name === 'TypeError' && event.request.redirect !== 'follow') {
            return fetch(event.request, { redirect: 'follow' });
        }
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
