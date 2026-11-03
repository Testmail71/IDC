/**
 * ISKCON Disciples Course Portal Service Worker
 * Provides offline navigation fallback, static asset caching, and PWA capabilities.
 */

const CACHE_NAME = "idc-pwa-v1";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/manifest.json",
  "/favicon.ico",
  "/idc-logo.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-192x192.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32x32.png",
  "/icons/favicon-16x16.png",
];

// Pre-cache core shell & offline assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Precache error:", err);
      }),
  );
});

// Clean up stale caches and claim clients on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Handle requests
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only intercept GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Bypass non-http(s) schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Bypass API routes, auth endpoints, and Supabase calls completely
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("razorpay.com")
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-First with Offline Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If response is valid, update page cache in background
          if (response.status === 200 && url.origin === self.location.origin) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to serve previously cached page
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fall back to pre-cached offline page
          const offlineFallback = await caches.match("/offline");
          if (offlineFallback) {
            return offlineFallback;
          }
          return new Response("Offline - ISKCON Disciples Course", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        }),
    );
    return;
  }

  // 2. Next.js static assets and icons: Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
  }
});

// Allow client pages to trigger immediate activation
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
