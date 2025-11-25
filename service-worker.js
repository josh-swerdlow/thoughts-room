const CACHE_NAME = 'thoughts-room-v1';
const RUNTIME_CACHE = 'thoughts-room-runtime-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/dist/main.css',
  '/dist/main.js',
  '/animation-settings.json',
  '/assets/fonts/Inter-static/Inter_24pt-Light.woff2',
  '/assets/fonts/Inter-static/Inter_24pt-Regular.woff2',
  '/audio/deference-for-darkness-cut.webm',
  '/audio/deference-for-darkness-cut.m4a',
  // Background images - cache all variants
  '/images/desktop/hubble-m44-optimized.webp',
  '/images/desktop/hubble-m48-optimized.webp',
  '/images/desktop/wild-duck-cluster-optimized.webp',
  '/images/mobile/hubble-m44-mobile.webp',
  '/images/mobile/hubble-m48-mobile.webp',
  '/images/mobile/wild-duck-cluster-mobile.webp',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use Promise.allSettled to cache assets even if some fail
        return Promise.allSettled(
          PRECACHE_ASSETS.map(asset => {
            return cache.add(asset).catch(err => {
              console.warn(`Failed to cache ${asset}:`, err);
              // Return null so Promise.allSettled doesn't fail
              return null;
            });
          })
        );
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('Service Worker install failed:', err);
        // Still skip waiting even if caching fails
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  const requestPath = url.pathname;

  // Normalize paths for comparison (remove trailing slashes, handle root)
  const normalizePath = (path) => {
    if (path === '/' || path === '') return '/';
    return path.endsWith('/') ? path.slice(0, -1) : path;
  };

  const normalizedRequestPath = normalizePath(requestPath);

  // Check if this is a precached asset
  const isPrecached = PRECACHE_ASSETS.some(asset => {
    const assetPath = normalizePath(asset.startsWith('/') ? asset : '/' + asset);
    return normalizedRequestPath === assetPath ||
           normalizedRequestPath === asset ||
           requestPath === asset ||
           requestPath === assetPath;
  });

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cachedResponse) => {
        // For precached assets, prefer cache (cache-first strategy)
        if (cachedResponse && isPrecached) {
          // Still try to update cache in background
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
            })
            .catch(() => {
              // Network failed, that's okay - we have cache
            });
          return cachedResponse;
        }

        // For other requests, try network first (network-first strategy)
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              // If network fails but we have cache, use it
              if (cachedResponse) {
                return cachedResponse;
              }
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache in appropriate cache
            const cacheToUse = isPrecached ? CACHE_NAME : RUNTIME_CACHE;
            caches.open(cacheToUse)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(() => {
                // Cache put failed, that's okay
              });

            return response;
          })
          .catch((error) => {
            // Network failed - try cache
            if (cachedResponse) {
              return cachedResponse;
            }

            // If it's a navigation request and we have index.html cached, return that
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html', { ignoreSearch: true }) ||
                     caches.match('/', { ignoreSearch: true });
            }

            // For other requests, return a basic error response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

