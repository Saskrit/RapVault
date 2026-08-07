/* RapVault service worker — cache app shell so /vault works offline. */
const CACHE_VERSION = "rapvault-shell-v3";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const PRECACHE_URLS = [
  "/",
  "/~offline",
  "/manifest.json",
  "/rapvault-mark.png",
  "/logo.png",
  "/rvtxt.png",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
  "/sw.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            // Skip missing assets so install still succeeds.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("rapvault-shell-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return sameOrigin(url) && url.pathname.startsWith("/api/");
}

function isAssetRequest(url) {
  if (!sameOrigin(url)) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    PRECACHE_URLS.includes(url.pathname) ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|gif|webp|svg|ico|map)$/i.test(url.pathname)
  );
}

function isDocumentLike(request, url) {
  if (request.mode === "navigate") return true;
  if (request.headers.get("RSC") === "1") return true;
  if (url.searchParams.has("_rsc")) return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

async function matchIgnoreSearch(cacheName, request) {
  const cache = await caches.open(cacheName);
  const exact = await cache.match(request);
  if (exact) return exact;
  return cache.match(request, { ignoreSearch: true });
}

async function matchByPathname(cacheName, pathname) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  let fallback = null;
  for (const key of keys) {
    try {
      const keyUrl = new URL(key.url);
      if (keyUrl.pathname === pathname) {
        const hit = await cache.match(key);
        if (!hit) continue;
        // Prefer non-RSC HTML documents when possible.
        const ct = hit.headers.get("content-type") || "";
        if (ct.includes("text/html")) return hit;
        fallback = fallback || hit;
      }
    } catch {
      // ignore bad keys
    }
  }
  return fallback;
}

async function offlineFallback(url) {
  if (url.pathname.startsWith("/vault")) {
    const vault =
      (await matchByPathname(PAGE_CACHE, url.pathname)) ||
      (await matchByPathname(PAGE_CACHE, "/vault"));
    if (vault) return vault;
    return Response.redirect(new URL("/~offline", self.location.origin), 303);
  }

  const shell = await caches.open(SHELL_CACHE);
  return (
    (await shell.match("/~offline")) ||
    (await caches.match("/~offline")) ||
    new Response(
      "<!doctype html><title>Offline</title><h1>You are offline</h1><p><a href='/~offline'>Continue</a></p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    )
  );
}

async function networkFirstPage(request, url) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      try {
        await cache.put(request, response.clone());
      } catch {
        // Ignore quota / opaque failures.
      }
    }
    return response;
  } catch {
    return (
      (await matchIgnoreSearch(PAGE_CACHE, request)) ||
      (await matchByPathname(PAGE_CACHE, url.pathname)) ||
      (await offlineFallback(url))
    );
  }
}

async function cacheFirstAsset(request) {
  const cached =
    (await matchIgnoreSearch(ASSET_CACHE, request)) ||
    (await matchIgnoreSearch(SHELL_CACHE, request));
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(ASSET_CACHE);
      try {
        await cache.put(request, response.clone());
      } catch {
        // ignore
      }
    }
    return response;
  } catch {
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (!sameOrigin(url) || isApiRequest(url)) return;

  if (isDocumentLike(request, url)) {
    event.respondWith(networkFirstPage(request, url));
    return;
  }

  if (isAssetRequest(url)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "rapvault-skip-waiting") {
    self.skipWaiting();
  }
});
