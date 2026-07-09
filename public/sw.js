/* Service Worker:網站外殼離線快取(stale-while-revalidate)
   - 只處理同網域的 GET;/api/ 一律直接走網路(資料離線備援由前端 localStorage 負責)
   - 更新版本號讓舊快取汰換(跟隨 package.json 手動同步即可,不精確也無妨,
     因為 SWR 策略本來就會在背景更新) */

const CACHE = 'bakery-shell-v3'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (url.origin !== location.origin) return
  if (url.pathname.includes('/api/')) return

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request)
      const network = fetch(e.request)
        .then(res => {
          if (res.ok) cache.put(e.request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
