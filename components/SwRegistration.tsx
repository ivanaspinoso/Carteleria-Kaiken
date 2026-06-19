"use client";

import { useEffect } from "react";

export default function SwRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      // Producción: PWA con auto-actualización. Como las carteleras son TVs
      // que nunca cierran la pestaña, hay que forzar que tomen la versión
      // nueva tras cada deploy sin intervención manual.
      let recargando = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Cuando el SW nuevo toma control, recargar una sola vez para cargar
        // los assets nuevos (evita quedar pegado a una versión vieja).
        if (recargando) return;
        recargando = true;
        window.location.reload();
      });

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Buscar updates al cargar y cada 15 min (el TV está siempre prendido).
          reg.update().catch(() => {});
          setInterval(() => reg.update().catch(() => {}), 15 * 60 * 1000);
        })
        .catch(console.error);
      return;
    }

    // Desarrollo: NO usamos el service worker. Evita que la pantalla offline
    // secuestre localhost cuando el dev server se reinicia o hay un microcorte.
    // Desregistramos cualquier SW ya instalado y limpiamos las cachés para
    // que el navegador se "auto-cure" en el próximo refresh.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);

  return null;
}
