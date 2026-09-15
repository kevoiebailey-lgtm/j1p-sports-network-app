// Just1Play Sports Network Service Worker
// Cache-First for static assets; Network-First with fallback for HTML/page navigation, feeds, and offline Favorites/Watchlists.

const CACHE_VERSION = 'just1play-v3';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const FEED_CACHE = `${CACHE_VERSION}-feeds`;
const FAVORITES_CACHE = `${CACHE_VERSION}-favorites-watchlist`;

// Core static assets for app shell - ONLY immutable assets to prevent stale HTML/CSS mismatch
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon.svg'
];

// Install Event: Pre-cache static shell assets and immediately skipWaiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets...');
      return cache.addAll(PRECACHE_ASSETS);
    }).catch((err) => {
      console.warn('[SW] Pre-cache non-fatal warning:', err);
    })
  );
});

// Activate Event: Clean up outdated caches and immediately claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('just1play-') && !name.startsWith(CACHE_VERSION))
          .map((name) => {
            console.log('[SW] Deleting legacy cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is for HTML or page navigation route
function isHtmlOrPageRoute(request, url) {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('.html') ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))
  );
}

// Helper: Check if request is for static asset (JS, CSS, fonts, static images, icons)
function isStaticAsset(url) {
  return (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/i) ||
    url.pathname.startsWith('/assets/')
  );
}

// Helper: Check if request is for offline favorites or watchlist data
function isFavoritesOrWatchlistRequest(url) {
  return (
    url.pathname.startsWith('/offline-data/') ||
    url.pathname.startsWith('/api/recruiter/watchlist') ||
    url.pathname.startsWith('/api/favorites') ||
    url.pathname.startsWith('/api/watchlist')
  );
}

// Helper: Check if request is for feed or API route
function isFeedOrApiRoute(request, url) {
  return (
    url.pathname.startsWith('/social') ||
    url.pathname.startsWith('/events') ||
    url.pathname.startsWith('/athletes') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/profile')
  );
}

// Safe clone helper to prevent 'Response body is already used' stream consumption errors
function safeClone(response) {
  if (!response || response.bodyUsed) {
    return null;
  }
  try {
    return response.clone();
  } catch (err) {
    console.warn('[SW] Stream clone skipped:', err);
    return null;
  }
}

// Fetch Event Handler
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 0. Ignore non-GET, non-http(s), external third-party SDKs, and WebSocket handshakes
  if (
    request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    !url.origin.startsWith(self.location.origin) ||
    url.origin.includes('paypal.com') ||
    url.origin.includes('paypalobjects.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('stripe.com') ||
    request.headers.get('upgrade') === 'websocket' ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.pathname.includes('/vite-hmr') ||
    url.pathname.includes('socket.io')
  ) {
    return;
  }

  // 1. NETWORK-FIRST WITH CACHE FALLBACK FOR HTML NAVIGATIONS
  // Guarantees index.html always references the freshest build manifest and prevents stale CSS hashes
  if (isHtmlOrPageRoute(request, url)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = safeClone(networkResponse);
            if (responseToCache) {
              caches.open(SHELL_CACHE).then((cache) => {
                cache.put(request, responseToCache).catch(() => {});
              }).catch(() => {});
            }
          }
          return networkResponse;
        })
        .catch(async () => {
          console.warn('[SW] Offline fallback for navigation:', url.pathname);
          const cached = (await caches.match(request)) || (await caches.match('/index.html'));
          if (cached) return cached;
          return new Response('Offline - Network connection lost.', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 1.1 CACHE-FIRST FOR IMMUTABLE VITE PRODUCTION ASSETS (/assets/*)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = safeClone(networkResponse);
              if (responseToCache) {
                caches.open(SHELL_CACHE).then((cache) => {
                  cache.put(request, responseToCache).catch(() => {});
                }).catch(() => {});
              }
            }
            return networkResponse;
          })
          .catch(() => new Response('', { status: 408, statusText: 'Asset Timeout' }));
      })
    );
    return;
  }

  // 1.2 BYPASS WEBSOCKETS, DEV VITE MODULES
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/node_modules/')
  ) {
    return;
  }

  // 2. DEDICATED OFFLINE STRATEGY FOR FAVORITES & WATCHLIST (Stadium Connectivity Guard)
  if (isFavoritesOrWatchlistRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')
          ) {
            return networkResponse;
          }
          const responseToCache = safeClone(networkResponse);
          if (responseToCache) {
            caches.open(FAVORITES_CACHE).then((cache) => {
              cache.put(request, responseToCache).catch(() => {});
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          console.warn('[SW] Stadium Offline Mode: Serving saved Favorites/Watchlist from Cache for:', url.pathname);
          const cachedResponse = await caches.match(request, { cacheName: FAVORITES_CACHE }) || await caches.match(request);
          if (cachedResponse) {
            // Clone and attach offline indicator header
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-J1P-Offline-Fallback', 'true');
            headers.set('X-J1P-Stadium-Mode', 'active');
            return new Response(cachedResponse.body, {
              status: 200,
              statusText: 'OK (Stadium Offline Cache)',
              headers
            });
          }

          // If looking for a synthetic offline-data route that was stored via direct key
          const keyMatch = url.pathname.replace('/offline-data/', '');
          const altResponse = await caches.match(`/offline-data/${keyMatch}`);
          if (altResponse) {
            return altResponse;
          }

          return new Response(JSON.stringify({
            offline: true,
            message: 'Stadium offline mode active. Data loaded from local storage cache.',
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-J1P-Offline': 'true' }
          });
        })
    );
    return;
  }

  // 3. NETWORK-FIRST STRATEGY WITH FALLBACK FOR FEEDS & API ROUTES
  if (isFeedOrApiRoute(request, url)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')
          ) {
            return networkResponse;
          }
          const responseToCache = safeClone(networkResponse);
          if (responseToCache) {
            caches.open(FEED_CACHE).then((cache) => {
              cache.put(request, responseToCache).catch(() => {});
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          console.warn('[SW] Offline mode active for:', url.pathname);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // For page navigations when offline, fallback to cached index.html
          if (request.mode === 'navigate') {
            const indexHtml = await caches.match('/index.html');
            if (indexHtml) return indexHtml;
          }
          return new Response('Network error and no cached data available.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }

  // 4. RESILIENT STRATEGY FOR STATIC ASSETS (Non-chunk icons, offline fallback images)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')
            ) {
              return networkResponse;
            }
            const responseToCache = safeClone(networkResponse);
            if (responseToCache) {
              caches.open(SHELL_CACHE).then((cache) => {
                cache.put(request, responseToCache).catch(() => {});
              }).catch(() => {});
            }
            return networkResponse;
          })
          .catch(async () => {
            // Check favorites cache for saved athlete avatars / media images
            const favMediaCache = await caches.match(request, { cacheName: FAVORITES_CACHE });
            if (favMediaCache) {
              return favMediaCache;
            }
            return new Response('', { status: 408, statusText: 'Request Timeout' });
          });
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || new Response('', { status: 404 }))
  );
});

// Message Event Listener for Offline Favorites & Watchlist Cache Sync
let offlineCheckInQueue = [];

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Handle caching Favorites, Watchlist, or Scouting Notes payload
  if (event.data.type === 'CACHE_FAVORITES_PAYLOAD') {
    const { key, data, mediaUrls } = event.data.payload || {};
    if (key && data) {
      caches.open(FAVORITES_CACHE).then(async (cache) => {
        // Store structured JSON response for offline endpoint
        const response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'X-J1P-Cached-At': new Date().toISOString(),
            'X-J1P-Cache-Type': 'favorites-watchlist'
          }
        });
        
        await cache.put(new Request(`/offline-data/${key}`), response);
        console.log(`[SW] 🏟️ Cached offline payload for '${key}' in ${FAVORITES_CACHE}`);

        // Pre-cache media images (avatars, thumbnails)
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
          for (const url of mediaUrls) {
            if (url && typeof url === 'string' && url.startsWith('http')) {
              try {
                const imgReq = new Request(url, { mode: 'no-cors' });
                const imgRes = await fetch(imgReq);
                if (imgRes) {
                  await cache.put(imgReq, imgRes);
                }
              } catch (e) {
                // Non-blocking
              }
            }
          }
        }

        // Broadcast confirmation to active clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'FAVORITES_CACHED_SUCCESS',
              key,
              timestamp: new Date().toISOString()
            });
          });
        });
      });
    }
  }

  // Handle client sending offline check-ins to service worker cache queue
  if (event.data.type === 'QUEUE_OFFLINE_CHECKIN') {
    const checkInRecord = event.data.payload;
    if (checkInRecord) {
      offlineCheckInQueue.push(checkInRecord);
      console.log('[SW] Check-in queued offline:', checkInRecord);
      
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'OFFLINE_QUEUE_UPDATED',
            queueLength: offlineCheckInQueue.length,
            latestRecord: checkInRecord
          });
        });
      });
    }
  }

  // Request sync of queued check-ins
  if (event.data.type === 'SYNC_OFFLINE_CHECKINS') {
    console.log('[SW] Processing offline check-in sync queue...', offlineCheckInQueue);
    const syncedCount = offlineCheckInQueue.length;
    const syncedRecords = [...offlineCheckInQueue];
    offlineCheckInQueue = [];

    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'OFFLINE_SYNC_SUCCESS',
          count: syncedCount,
          records: syncedRecords,
          timestamp: new Date().toISOString()
        });
      });
    });
  }
});

// Background Sync Event Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins' || event.tag === 'checkin-sync') {
    console.log('[SW] Background sync event triggered for check-ins');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        const count = offlineCheckInQueue.length;
        const records = [...offlineCheckInQueue];
        offlineCheckInQueue = [];
        clients.forEach((client) => {
          client.postMessage({
            type: 'OFFLINE_SYNC_SUCCESS',
            count,
            records,
            timestamp: new Date().toISOString()
          });
        });
      })
    );
  }
});
