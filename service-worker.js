// Service worker básico: cachea el app shell para que la PWA funcione
// offline (no hay llamadas a backend, todo el contenido vive en el bundle).

const CACHE_NAME = 'bandogym-v10';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles.css',
  './src/app.js',
  './src/theory.js',
  './src/util.js',
  './src/data.js',
  './src/store.js',
  './src/ui.js',
  './src/metronome.js',
  './src/zoom.js',
  './src/screens/today.js',
  './src/screens/library.js',
  './src/screens/player.js',
  './src/screens/newExercise.js',
  './src/screens/profile.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') return caches.match('./index.html');
          return undefined;
        });
    })
  );
});
