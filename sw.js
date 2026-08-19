const CACHE_NAME = 'vortaro-v1.3.1';
// dictionary.json is deliberately NOT precached: at 7MB it would be
// re-downloaded by every user on every version bump, and one flaky request
// would fail the whole atomic cache.addAll install. The runtime
// stale-while-revalidate handler caches it on first fetch instead, so
// offline still works after the first visit.
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
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
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-First for navigation requests
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
          // caches.match returns a Promise (always truthy), so `||` between the
          // two calls never reached the shell fallback — chain instead.
          return caches.match(event.request)
            .then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // Stale-While-Revalidate for static assets
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
        // Fallback for redirected responses causing the error
        if (err.name === 'TypeError' && event.request.redirect !== 'follow') {
            return fetch(event.request, { redirect: 'follow' });
        }
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
