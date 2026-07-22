"use client";

import { useEffect } from "react";

export default function SwRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      // Producción: PWA con auto-actualización. Como las carteleras son TVs
      // que nunca cierran la pestaña, hay que forzar que tomen la versión
      // nueva tras cada deploy sin intervención manual.
      //
      // ANTI-LOOP: recargar en cada `controllerchange` sin límite genera un bucle
      // de recargas. Durante la propagación de un deploy en Vercel, los edges de
      // la CDN sirven `sw.js` inconsistente por unos minutos; cada `reg.update()`
      // (que corre en cada carga) ve un SW "distinto" → instala → controllerchange
      // → reload → y otra vez, cada pocos segundos. El guard por-carga no sirve
      // porque la recarga lo resetea. Capamos por TIEMPO en localStorage (persiste
      // entre recargas): como mucho UNA recarga cada 10 min. Rompe el bucle y deja
      // que la CDN se estabilice; los updates legítimos igual entran (espaciados).
      const CLAVE_TS = "sw-ultima-recarga";
      const MIN_ENTRE_RECARGAS_MS = 10 * 60 * 1000;
      // Sin controller previo = primera instalación (no un update): no recargar,
      // la página ya está corriendo el código nuevo.
      const habiaControlador = !!navigator.serviceWorker.controller;
      let recargando = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (recargando || !habiaControlador) return;
        let ultima = 0;
        try {
          ultima = Number(localStorage.getItem(CLAVE_TS) || 0);
        } catch {
          /* localStorage podría fallar en algún TV: seguir igual */
        }
        if (Date.now() - ultima < MIN_ENTRE_RECARGAS_MS) return; // recargó recién
        try {
          localStorage.setItem(CLAVE_TS, String(Date.now()));
        } catch {
          /* noop */
        }
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
