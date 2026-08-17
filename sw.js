// ---------- Service Worker do "Minha Voz" ----------
// IMPORTANTE: toda vez que você hospedar uma atualização do app,
// mude o número da versão abaixo (ex: 'v3' -> 'v4'). Isso avisa o
// navegador que existe uma versão nova e ele troca o cache sozinho,
// sem precisar limpar dados manualmente no tablet.
const CACHE_VERSION = 'v3';
const CACHE_NAME = 'minha-voz-' + CACHE_VERSION;

// Arquivos essenciais para o app abrir offline.
// Ajuste os nomes/caminhos se os seus arquivos tiverem outros nomes.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// ---------- Instalação: baixa e guarda os arquivos essenciais ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => {
        // Não trava a instalação se algum asset opcional (ex: ícone) faltar
        console.warn('Falha ao pré-cachear algum arquivo:', err);
      })
  );
  // Faz o novo service worker assumir imediatamente, sem esperar
  // todas as abas antigas fecharem.
  self.skipWaiting();
});

// ---------- Ativação: apaga caches de versões antigas ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('minha-voz-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------- Estratégia de busca ----------
// Para o HTML/JS/CSS do próprio app: tenta a rede primeiro (pra sempre
// pegar a versão mais nova quando tiver internet) e só usa o cache como
// reserva se estiver offline. Para os símbolos (arasaac.org) e fontes,
// usa cache-first (eles raramente mudam e assim carregam mais rápido).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só trata pedidos GET.
  if(req.method !== 'GET') return;

  const isSameOrigin = url.origin === self.location.origin;

  if(isSameOrigin){
    // Network-first para os arquivos do próprio app.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
  }else{
    // Cache-first para recursos externos (símbolos, fontes etc).
    event.respondWith(
      caches.match(req).then((cached) => {
        if(cached) return cached;
        return fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        }).catch(() => cached);
      })
    );
  }
});

// Permite que a página force a ativação imediata do novo service worker
// (útil se você quiser adicionar um botão "atualizar app" no futuro).
self.addEventListener('message', (event) => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});
