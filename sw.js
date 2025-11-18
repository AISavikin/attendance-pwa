// sw.js - Service Worker для PWA
// Обеспечивает оффлайн-работу и кэширование ресурсов

/**
 * КОНСТАНТЫ ДЛЯ КЭШИРОВАНИЯ
 */
const CACHE_NAME = 'attendance-app-v2';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './styles.css',
    './storage.js',
    './app.js'
];

/**
 * СОБЫТИЕ УСТАНОВКИ SERVICE WORKER
 * Кэширует критические ресурсы при установке
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker: Установлен');
    
    // Принудительно активируем новый SW сразу
    self.skipWaiting();
    
    // Кэшируем все критические ресурсы
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Кэшируем основные файлы');
                return cache.addAll(urlsToCache).catch(error => {
                    console.log('Не все файлы удалось закэшировать:', error);
                });
            })
    );
});

/**
 * СОБЫТИЕ АКТИВАЦИИ SERVICE WORKER
 * Очищает старые кэши и забирает контроль над клиентами
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Активирован');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Удаляем старый кэш', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Принудительно взять контроль над всеми клиентами
            return self.clients.claim();
        }).then(() => {
            // Уведомить все вкладки о готовности
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_NAME
                    });
                });
            });
        })
    );
});

/**
 * СОБЫТИЕ ЗАПРОСА РЕСУРСОВ
 * Реализует стратегии кэширования для разных типов ресурсов
 */
self.addEventListener('fetch', (event) => {
    // Пропускаем не-GET запросы
    if (event.request.method !== 'GET') return;
    
    // Для API запросов используем Network First стратегию
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Кэшируем успешные ответы
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => {
                    // Fallback: возвращаем из кэша если сеть недоступна
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Для статических ресурсов используем Cache First стратегию
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Возвращаем из кэша если нашли
                if (response) {
                    return response;
                }
                
                // Иначе загружаем из сети
                return fetch(event.request)
                    .then(response => {
                        // Проверяем валидность ответа
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Кэшируем новый ресурс
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Fallback для различных типов ресурсов
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                        
                        if (event.request.destination === 'image') {
                            return caches.match('./icons/icon-192.png');
                        }
                        
                        return new Response('Оффлайн', {
                            status: 408,
                            statusText: 'Оффлайн'
                        });
                    });
            })
    );
});

/**
 * СОБЫТИЕ ФОНОВОЙ СИНХРОНИЗАЦИИ
 * (Заготовка для будущей реализации синхронизации с бэкендом)
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('Background sync triggered');
        // Здесь можно добавить логику синхронизации когда появится бэкенд
    }
});