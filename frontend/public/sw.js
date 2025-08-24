const CACHE_NAME = 'api-cache-v1';
const CACHE_PATHS = ['/stops', '/routes'];
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    CACHE_PATHS.includes(url.pathname) ||
    url.pathname.startsWith('/arrivals/')
  ) {
    event.respondWith(handleRequest(event.request));
  }
});

async function handleRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (err) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache', 'HIT');
      const body = await cachedResponse.clone().blob();
      return new Response(body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      });
    }
    throw err;
  }
}
