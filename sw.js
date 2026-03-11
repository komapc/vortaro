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
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
