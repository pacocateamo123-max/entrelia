/* =========================================================
   ENTRELIA — service worker: abre sem internet
   - Arquivos do site: rede primeiro (sempre a versão mais nova),
     com a cópia guardada como reserva quando estiver offline.
   - Fontes do Google: cópia guardada primeiro (não mudam).
   ========================================================= */
const CACHE = 'entrelia-v2';
const SHELL = [
  './', 'index.html', 'app.html', 'manifest.webmanifest',
  'css/styles.css', 'css/landing.css',
  'js/util.js', 'js/ui.js', 'js/db.js', 'js/logic.js', 'js/demo.js', 'js/components.js', 'js/app.js', 'js/landing.js',
  'js/views/overview.js', 'js/views/projects.js', 'js/views/tasks.js', 'js/views/calendar.js', 'js/views/lists.js',
  'js/views/costs.js', 'js/views/compare.js', 'js/views/notes.js', 'js/views/settings.js',
  'assets/logo.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match(url.pathname.endsWith('index.html') || url.pathname.endsWith('/') ? 'index.html' : 'app.html');
        return Response.error();
      }))
  );
});
