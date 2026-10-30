/* =========================================================
   Service worker: o site abre sem internet
   (criado pela skill confere-offline; troque só o que diz TROCAR)
   - Na instalação guarda as páginas, os arquivos de nome fixo (LISTA)
     e tudo o que as páginas carregam (descoberto lendo o HTML, então
     funciona também com os nomes que o build do Vite inventa).
   - Arquivos do site: rede primeiro (sempre a versão mais nova), com
     a cópia guardada como reserva quando estiver offline.
   - Fontes do Google e GUARDAR_DE_FORA: cópia guardada primeiro.
   - Mudou a LISTA? Suba a versão do CACHE (v1 → v2).
   ========================================================= */
const CACHE = 'TROCAR-v1';
const PAGINAS = ['./'];            // TROCAR: uma por página de entrada ('./', 'app.html'...)
const LISTA = [                    // TROCAR: arquivos de nome fixo, sem "/" no começo
  'manifest.webmanifest',
];
const GUARDAR_DE_FORA = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Lê o HTML e devolve os arquivos do próprio site que ele carrega (src, href, srcset).
async function arquivosDaPagina(endereco) {
  const res = await fetch(endereco, { cache: 'no-store' });
  const html = await res.text();
  const achados = [];
  for (const [, valor] of html.matchAll(/(?:src|href|srcset)=["']([^"']+)["']/g)) {
    for (const parte of valor.split(',')) {
      const caminho = parte.trim().split(/\s+/)[0];
      if (!caminho || caminho.startsWith('#') || caminho.startsWith('data:')) continue;
      const url = new URL(caminho, res.url);
      if (url.origin === self.location.origin) achados.push(url.href);
    }
  }
  return achados;
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...PAGINAS, ...LISTA]);
    for (const pagina of PAGINAS) {
      const extras = await arquivosDaPagina(pagina).catch(() => []);
      await Promise.all(extras.map((u) => cache.add(u).catch(() => {})));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (GUARDAR_DE_FORA.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
      return res;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.status === 200) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match(PAGINAS[0]);
        return Response.error();
      }))
  );
});
