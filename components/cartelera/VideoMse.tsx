"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type TramoMse = { slug: string; duracion: number };

/** Lo que el player necesita saber de los assets (lo escribe preparar-mse.mjs). */
export type ManifiestoMse = {
  codec: string;
  tramos: TramoMse[];
};

/**
 * Una placa lista para appendear.
 *
 * Las 13 fijas comparten `init` (mismo avcC, garantizado por preparar-mse.mjs).
 * Las personalizadas traen el suyo: lo genera el encoder del navegador del
 * dueño al subirlas, así que no puede coincidir byte a byte con el de x264. El
 * player appendea el init solo cuando cambia, así que el decoder se reconfigura
 * al entrar y al salir de una personalizada, no en cada placa.
 */
export type PlacaMse = {
  // Identifica la placa para el overlay de texto.
  clave: string;
  segmento: string;
  init: string;
};

// Cuántas placas mantener appendeadas por delante de la que se está viendo. Con
// 2 alcanza para que nunca se quede sin buffer y no obliga a decidir el orden
// con mucha anticipación (cuanto menos adelantado, antes se nota un cambio que
// hizo el dueño desde el panel).
const ADELANTO = 2;

// Cuánto pasado se conserva antes de liberar. El decoder del TV no tiene RAM de
// sobra; no hay ninguna razón para guardar placas ya reproducidas.
const PASADO_MAX_S = 20;

// Segmentos crudos que se mantienen en memoria. Los demás se vuelven a pedir
// (salen del cache del service worker, no de la red).
const CACHE_MAX = 3;

type Appendeado = { slug: string; ini: number; fin: number };

/**
 * Reproductor de las placas verticales por MSE (MediaSource).
 *
 * Reemplaza al mp4 pegado. El problema del pegado no era la fluidez —esa la
 * resolvía— sino que el orden quedaba horneado en el archivo: activar,
 * desactivar o reordenar una placa desde el panel lo dejaba inservible y la
 * pantalla se caía al modo de a una placa, con los 600-800ms de freeze del
 * decoder del Samsung en cada cambio.
 *
 * Acá el <video> se abre UNA sola vez contra un MediaSource y se le va haciendo
 * appendBuffer() de cada placa por separado, con mode="sequence" (que reescribe
 * los timestamps para que una quede pegada atrás de la otra). El decoder nunca
 * se reinicia. Y como el orden se decide en el momento de appendear, cambiarlo
 * desde el panel es cambiar un dato: la placa nueva entra en el próximo límite,
 * sin recargar nada y sin un cuadro negro.
 *
 * Las 13 placas comparten un solo init segment (mismo avcC), condición sin la
 * cual el decoder se reconfiguraría igual. Lo garantiza scripts/preparar-mse.mjs.
 */
export default function VideoMse({
  manifiesto,
  orden,
  poster,
  onIndice,
  onFalla,
}: {
  manifiesto: ManifiestoMse;
  // Placas activas, en orden, como están en la base AHORA. Puede cambiar en
  // cualquier momento: el player lo lee al appendear la próxima placa.
  orden: PlacaMse[];
  poster?: string;
  // Qué placa se está viendo (su `clave`).
  onIndice: (clave: string) => void;
  // No se pudo: la pantalla cae al modo anterior.
  onFalla: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onIndiceRef = useRef(onIndice);
  onIndiceRef.current = onIndice;
  const onFallaRef = useRef(onFalla);
  onFallaRef.current = onFalla;
  // El orden vive en un ref: si cambia, NO se reinicia el reproductor (ese es
  // todo el punto), simplemente la próxima placa que se appendee sale de la
  // lista nueva.
  const ordenRef = useRef(orden);
  ordenRef.current = orden;

  const [listo, setListo] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (typeof window === "undefined" || typeof window.MediaSource === "undefined") {
      onFallaRef.current();
      return;
    }
    if (!MediaSource.isTypeSupported(manifiesto.codec)) {
      onFallaRef.current();
      return;
    }

    let vivo = true;
    const fallar = () => {
      if (!vivo) return;
      vivo = false;
      onFallaRef.current();
    };

    const ms = new MediaSource();
    const url = URL.createObjectURL(ms);
    v.src = url;

    // Segmentos crudos ya bajados (url → bytes).
    const cache = new Map<string, ArrayBuffer>();
    const bajar = async (url: string): Promise<ArrayBuffer> => {
      const hit = cache.get(url);
      if (hit) return hit;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`no se pudo bajar ${url} (${r.status})`);
      const buf = await r.arrayBuffer();
      cache.set(url, buf);
      // Cache chico: el TV no tiene RAM para las 13 crudas.
      while (cache.size > CACHE_MAX) {
        const primera = cache.keys().next().value;
        if (primera === undefined) break;
        cache.delete(primera);
      }
      return buf;
    };

    let sb: SourceBuffer | null = null;
    // Qué se appendeó y en qué franja de la línea de tiempo quedó. Las franjas
    // se leen de `buffered` (la verdad del navegador), no se calculan sumando
    // duraciones, para que no se acumule deriva.
    const appendeados: Appendeado[] = [];
    // Puntero circular sobre `orden`: qué placa toca appendear.
    let proximo = 0;

    /** Espera a que el SourceBuffer deje de estar ocupado. */
    const libre = (buffer: SourceBuffer) =>
      new Promise<void>((res) => {
        if (!buffer.updating) return res();
        buffer.addEventListener("updateend", () => res(), { once: true });
      });

    const finBuffer = (buffer: SourceBuffer) =>
      buffer.buffered.length ? buffer.buffered.end(buffer.buffered.length - 1) : 0;

    // Qué init está cargado en el SourceBuffer ahora mismo. Solo se vuelve a
    // appendear cuando la placa que viene usa otro (o sea: al entrar o salir de
    // una personalizada). Appendearlo de gusto reconfiguraría el decoder.
    let initActual: string | null = null;

    /** Appendea UNA placa al final de la línea de tiempo. */
    const appendearUna = async (buffer: SourceBuffer) => {
      const lista = ordenRef.current;
      if (lista.length === 0) return;
      const placa = lista[proximo % lista.length];
      proximo = (proximo + 1) % lista.length;

      const bytes = await bajar(placa.segmento);
      if (!vivo) return;

      if (placa.init !== initActual) {
        const init = await bajar(placa.init);
        if (!vivo) return;
        await libre(buffer);
        if (!vivo) return;
        buffer.appendBuffer(init);
        await libre(buffer);
        if (!vivo) return;
        initActual = placa.init;
      }

      await libre(buffer);
      if (!vivo) return;

      const ini = finBuffer(buffer);
      buffer.appendBuffer(bytes);
      await libre(buffer);
      if (!vivo) return;
      appendeados.push({ slug: placa.clave, ini, fin: finBuffer(buffer) });
    };

    /** Libera lo ya reproducido para no crecer sin límite. */
    const limpiar = async (buffer: SourceBuffer, ahora: number) => {
      if (buffer.buffered.length === 0) return;
      const desde = buffer.buffered.start(0);
      const hasta = ahora - PASADO_MAX_S;
      if (hasta <= desde + 1) return;
      await libre(buffer);
      if (!vivo) return;
      buffer.remove(desde, hasta);
      await libre(buffer);
      while (appendeados.length && appendeados[0].fin <= hasta) appendeados.shift();
    };

    let tic: ReturnType<typeof setInterval> | null = null;
    let trabajando = false;

    const abrir = async () => {
      try {
        sb = ms.addSourceBuffer(manifiesto.codec);
        // sequence: cada segmento se pega atrás del anterior sin importar los
        // timestamps que traiga adentro. Es lo que permite mezclar placas en
        // cualquier orden sin recalcular nada.
        sb.mode = "sequence";

        // El init lo appendea appendearUna() según la placa que toque; acá solo
        // se llena el colchón inicial.
        for (let i = 0; i < ADELANTO && vivo; i++) await appendearUna(sb);
        if (!vivo) return;

        v.muted = true;
        v.setAttribute("muted", "");
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});

        tic = setInterval(() => {
          if (!vivo || !sb || trabajando) return;
          const ahora = v.currentTime;

          // Qué placa se ve.
          const actual = appendeados.find((a) => ahora >= a.ini && ahora < a.fin);
          if (actual) onIndiceRef.current(actual.slug);

          // Mantener el colchón y liberar el pasado.
          const restantes = appendeados.filter((a) => a.fin > ahora).length;
          if (restantes <= ADELANTO) {
            trabajando = true;
            appendearUna(sb)
              .then(() => limpiar(sb!, ahora))
              .catch(fallar)
              .finally(() => {
                trabajando = false;
              });
          }
        }, 250);
      } catch (e) {
        console.error("[mse]", e);
        fallar();
      }
    };

    ms.addEventListener("sourceopen", abrir, { once: true });
    ms.addEventListener("sourceclose", () => {
      if (vivo) fallar();
    });

    const alPintar = () => setListo(true);
    // Si el TV pausa por su cuenta (ahorro de energía, foco), volver a arrancar:
    // una pantalla de local no se puede quedar congelada.
    const alPausar = () => {
      if (!vivo || v.ended) return;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    v.addEventListener("playing", alPintar);
    v.addEventListener("pause", alPausar);
    v.addEventListener("error", fallar);

    return () => {
      vivo = false;
      if (tic) clearInterval(tic);
      v.removeEventListener("playing", alPintar);
      v.removeEventListener("pause", alPausar);
      v.removeEventListener("error", fallar);
      try {
        if (ms.readyState === "open") ms.endOfStream();
      } catch {
        /* ya cerrado */
      }
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      cache.clear();
    };
    // El orden NO va en las dependencias a propósito: cambia sin reiniciar nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifiesto.codec]);

  const estilo: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", overflow: "hidden" }}>
      {/* Tapa SOLO el arranque, antes del primer cuadro. Después el video no
          vuelve a cargar nunca, así que no hay más huecos que tapar. */}
      {poster && !listo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" style={{ ...estilo, zIndex: 2 }} />
      )}
      <video ref={videoRef} muted playsInline autoPlay preload="auto" style={{ ...estilo, zIndex: 1 }} />
    </div>
  );
}
