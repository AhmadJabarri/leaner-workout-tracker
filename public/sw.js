// Cache the app shell and same-origin static assets so Leaner can open offline.
// Never intercept /api: workout records, credentials, and session responses stay network-only.
const CACHE_NAME = 'leaner-app-shell-v2'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/leaner-icon.svg',
  '/leaner-icon-180.png',
  '/leaner-icon-192.png',
  '/leaner-icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('leaner-app-shell-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    // Prefer the current page from the network; use the saved app shell offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone())),
            )
          }
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/')),
      ),
    )
    return
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    // Cache only frontend assets; hashed Vite filenames naturally change on rebuild.
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkResponse = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        }).catch(() => cachedResponse)

        return cachedResponse ?? networkResponse
      }),
    )
  }
})
