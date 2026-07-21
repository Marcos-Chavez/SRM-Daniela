// Service Worker básico para SRM Daniela
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Permite que la app haga peticiones a Firebase y EmailJS en tiempo real
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});