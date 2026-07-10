const CACHE_NAME = 'checking-v1';
const ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// index.html: sempre busca da rede (nunca do cache)
// para garantir que atualizações chegam imediatamente.
// Demais assets: network first com fallback para cache.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isIndex = url.pathname.endsWith('/') ||
                  url.pathname.endsWith('/index.html') ||
                  url.pathname === url.pathname.split('/').slice(0,-1).join('/') + '/';

  if(isIndex){
    // index.html: sempre da rede, sem cache
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // outros assets: network first
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if(response && response.status === 200 && response.type === 'basic'){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
