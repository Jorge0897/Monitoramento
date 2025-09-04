// Nome do cache para armazenar os dashboards. Mudar este nome invalida o cache antigo.
const CACHE_NAME = 'dashboard-cache-v2';

// Domínios que queremos que o Service Worker gerencie
const CACHEABLE_DOMAINS = [
    'https://docs.google.com/spreadsheets/d/e/',
    'https://app.powerbi.com/view'
];

/**
 * Evento 'install': Acionado quando o Service Worker é instalado pela primeira vez.
 * self.skipWaiting() força o novo Service Worker a se tornar ativo imediatamente.
 */
self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

/**
 * Evento 'activate': Acionado quando o Service Worker se torna ativo.
 * self.clients.claim() permite que o SW controle clientes (abas) abertos imediatamente.
 */
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

/**
 * Evento 'fetch': A mágica acontece aqui! Intercepta todas as requisições de rede da página.
 * @param {FetchEvent} event O evento de fetch.
 */
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Verifica se a URL da requisição pertence a um dos nossos domínios-alvo.
    const isCacheable = CACHEABLE_DOMAINS.some(domain => url.startsWith(domain));

    if (isCacheable) {
        // Usa a estratégia "Stale-While-Revalidate":
        // 1. Responde IMEDIATAMENTE com a versão em cache (se existir). É super rápido!
        // 2. Em paralelo, busca a versão mais recente na rede.
        // 3. Se a busca na rede for bem-sucedida, atualiza o cache para a próxima visita.
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        // Clona a resposta da rede antes de colocá-la no cache,
                        // pois uma resposta só pode ser consumida uma vez.
                        if (networkResponse.ok) {
                           cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(err => {
                        // Se a rede falhar, não faz nada, a resposta em cache (se houver) já foi enviada.
                        console.error("Fetch de rede falhou:", err);
                    });

                    // Retorna a resposta do cache imediatamente (se houver), ou espera a resposta da rede.
                    return cachedResponse || fetchPromise;
                });
            })
        );
    }
    // Para todas as outras requisições (CSS, JS, etc.), deixa o navegador lidar com elas.
});
