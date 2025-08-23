self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('static-v1').then(cache => cache.addAll(['/', '/manifest.json']))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
