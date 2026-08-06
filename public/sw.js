const CACHE_VERSION = "v33";
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

  // Segmentos MSE de las placas personalizadas. Viven en Storage (supabase.co)
  // pero son archivos estáticos, no datos: van cache-first, ANTES de la regla
  // de abajo. Sin esto la pantalla los volvería a bajar en cada vuelta de la
  // rotación y una red lenta se notaría como un tirón.
  if (
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("/placas-personalizadas/") &&
    (url.pathname.endsWith(".m4s") || url.pathname.endsWith(".init.mp4"))
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
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

  // Pósters de las placas: cache-first. Son el backstop que tapa el hueco negro
  // que perfora el plano de video del TV mientras el <video> recarga el src. Si
  // dependen de la red, en la PRIMERA transición después de cargar la página el
  // póster llega tarde y se ve el negro (medido 2026-07-29). Cacheados, cualquier
  // transición los tiene al instante. Se invalidan al bumpear CACHE_VERSION.
  // (Los .mp4 NO se cachean acá: las Smart TV los piden con Range y devolverles
  // una respuesta 200 completa desde el cache rompe la reproducción.)
  if (url.pathname.startsWith("/placas/posters/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
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

  // Segmentos MSE (init.mp4 + los .m4s de cada placa): cache-first sin más
  // vueltas. A diferencia de los mp4 sueltos, estos NUNCA se piden con Range:
  // el player los baja enteros con fetch() y se los pasa a appendBuffer(). Que
  // salgan del cache es justamente lo que hace que appendear la próxima placa
  // no dependa de la red. Se invalidan al bumpear CACHE_VERSION.
  if (url.pathname.startsWith("/placas/mse/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
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

  // Videos de las placas fijas: cache-first, pero SOLO para pedidos sin Range.
  // PantallaRotativa los baja con fetch() entero (sin Range) y se los pasa al
  // <video> como blob:, así que el camino normal se sirve del cache y la placa
  // arranca sin ir a la red. Si algún día cae en el camino viejo (video.src con
  // la URL), el <video> pide con Range y ahí NO tocamos nada: devolverle un 200
  // completo desde el cache rompe la reproducción en Smart TV.
  if (url.pathname.startsWith("/placas/") && url.pathname.endsWith(".mp4")) {
    if (request.headers.get("range")) return;
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
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
