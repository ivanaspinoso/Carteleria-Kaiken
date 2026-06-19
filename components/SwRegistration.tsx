"use client";

import { useEffect } from "react";

export default function SwRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      // Producción: PWA normal.
      navigator.serviceWorker.register("/sw.js").catch(console.error);
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
