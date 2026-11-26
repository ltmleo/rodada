// Service worker da Rodada: abre offline. Navegação = rede primeiro (pega versão nova), arquivos = cache e atualiza em segundo plano.
const VERSION = 'rodada-1';
const SHELL = ['./', 'index.html', 'privacidade.html', 'css/app.css', 'js/app.js', 'js/parse.js', 'js/analytics.js', 'js/extras.js', 'config.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.svg'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;           // Google Analytics, banners e formulário passam direto
  if (req.mode === 'navigate'){
    e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
