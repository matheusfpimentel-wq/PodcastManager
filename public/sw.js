// Service worker leve (PWA §Stack): instalável + cache de runtime do app shell.
// Estratégia network-first para conteúdo same-origin, com fallback ao cache
// quando offline. Chamadas ao Supabase (outra origem) são ignoradas — nunca
// cacheamos dados/PII.
const CACHE = 'julgados-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // não cacheia Supabase/externos

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        return response
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/')),
      ),
  )
})
