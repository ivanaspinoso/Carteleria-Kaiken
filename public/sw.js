const CACHE_VERSION = "v7";
const CACHE_STATIC = `kaiken-static-${CACHE_VERSION}`;
const CACHE_PAGES = `kaiken-pages-${CACHE_VERSION}`;
const ALL_CACHES = [CACHE_STATIC, CACHE_PAGES];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((c) => c.add("/offline"))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Supabase: siempre red (datos en tiempo real)
  if (url.hostname.includes("supabase.co")) return;

  // Assets estáticos de Next.js: cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            // Clonar YA (sincrónico), antes de devolver `res`: si se clona
            // dentro del .then async, el body ya está en uso y falla.
            const copia = res.clone();
            caches
              .open(CACHE_STATIC)
              .then((c) => c.put(request, copia))
              .catch(() => {});
            return res;
          })
      )
    );
    return;
  }

  // Navegación: red primero, fallback a /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline").then(
          (r) => r ?? new Response("Sin conexión", { status: 503 })
        )
      )
    );
  }
});
