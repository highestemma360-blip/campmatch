/* Campmatch service worker — installable app shell plus web push delivery. */

const CACHE = 'campmatch-shell-v2'
const PRECACHE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/favicon.svg']

async function precacheShell() {
  const cache = await caches.open(CACHE)
  await Promise.all(
    PRECACHE.map(async url => {
      try {
        // `no-store` bypasses the HTTP cache so a fresh deployment always
        // stores the current shell instead of a revalidated 304.
        const response = await fetch(url, { cache: 'no-store' })
        if (response.ok) await cache.put(url, response)
      } catch {
        /* A missing optional asset must not fail the whole install. */
      }
    })
  )
}

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(precacheShell())
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter(key => key.startsWith('campmatch-') && key !== CACHE).map(key => caches.delete(key))
      )
      // Fill any gaps left by an interrupted first install.
      await precacheShell()
      // Drop hashed bundles from previous deployments that the current shell
      // no longer references, so the cache cannot grow with every release.
      const cache = await caches.open(CACHE)
      const root = await cache.match('/')
      if (root) {
        const html = await root.text()
        const keep = new Set(
          Array.from(html.matchAll(/\/assets\/[^"'()\s]+/g), match => match[0])
        )
        const requests = await cache.keys()
        await Promise.all(
          requests.map(request => {
            const path = new URL(request.url).pathname
            return path.startsWith('/assets/') && !keep.has(path)
              ? cache.delete(request)
              : undefined
          })
        )
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return
  // Live data, uploads and the websocket must always hit the network.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/uploads/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          if (fresh.ok) {
            const cache = await caches.open(CACHE)
            cache.put('/', fresh.clone()).catch(() => undefined)
          }
          return fresh
        } catch {
          const cached = await caches.match('/')
          return (
            cached ||
            new Response('You are offline. Reopen Campmatch when you have a connection.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }
      })()
    )
    return
  }

  // Hashed bundles and icons are safe to serve cache-first; a new deployment
  // changes the hash, so stale entries are never reused for new markup.
  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE)
          cache.put(request, response.clone()).catch(() => undefined)
        }
        return response
      })()
    )
  }
})

self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    /* payload may be empty */
  }

  const title = data.title || 'Campmatch'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    image: data.image || undefined,
    tag: data.tag || 'campmatch',
    renotify: true,
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
