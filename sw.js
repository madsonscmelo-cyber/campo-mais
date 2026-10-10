/* Campo+ service worker — v1 */
const CACHE = 'campomais-v4'
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  // Supabase: sempre rede (dados vivos); falha → deixa passar
  if (url.hostname.includes('supabase')) return
  // assets: cache-first com atualização em background
  if (url.origin === location.origin && (url.pathname.startsWith('/assets/') || CORE.includes(url.pathname))) {
    e.respondWith(
      caches.match(e.request).then(hit => {
        const rede = fetch(e.request).then(r => {
          if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()))
          return r
        }).catch(() => hit)
        return hit || rede
      })
    )
    return
  }
  // navegação: network-first com fallback ao cache (offline shell)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put('/index.html', r.clone())); return r })
        .catch(() => caches.match('/index.html'))
    )
  }
})

// estrutura pronta para push (desativado por enquanto)
self.addEventListener('push', e => {
  let data = {}
  try { data = e.data.json() } catch (_) {}
  e.waitUntil(self.registration.showNotification(data.titulo || 'Campo+', {
    body: data.corpo || 'Você tem uma atualização de solicitação.',
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data,
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})
