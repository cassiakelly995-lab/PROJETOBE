// Service worker do "Minha Voz" — cacheia a estrutura do app (não os dados,
// que ficam no Firestore com sua própria persistência offline).
const CACHE_NAME = 'minha-voz-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só cuida de navegação/arquivos do próprio app (mesmo domínio).
  // Pictogramas do ARASAAC e chamadas do Firebase seguem direto pra rede,
  // já que eles têm seus próprios mecanismos de cache/offline.
  if(new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkResp) => {
          if(networkResp && networkResp.ok){
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResp;
        })
        .catch(() => cached); // sem internet: usa o que tiver em cache

      // Mostra o cache na hora (rápido) e atualiza em segundo plano
      return cached || fetchPromise;
    })
  );
});
