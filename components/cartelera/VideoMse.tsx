"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type TramoMse = { slug: string; duracion: number };

/** Lo que el player necesita saber de los assets (lo escribe preparar-mse.mjs). */
export type ManifiestoMse = {
  codec: string;
  tramos: TramoMse[];
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
  // Slugs activos, en orden, como están en la base AHORA. Puede cambiar en
  // cualquier momento: el player lo lee al appendear la próxima placa.
  orden: string[];
  poster?: string;
  // Qué placa se está viendo (índice dentro de `orden` al momento de appendear).
  onIndice: (slug: string) => void;
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

    // Segmentos crudos ya bajados (slug → bytes).
    const cache = new Map<string, ArrayBuffer>();
    const bajar = async (slug: string): Promise<ArrayBuffer> => {
      const hit = cache.get(slug);
      if (hit) return hit;
      const r = await fetch(`/placas/mse/${slug}.m4s`);
      if (!r.ok) throw new Error(`no se pudo bajar ${slug}.m4s (${r.status})`);
      const buf = await r.arrayBuffer();
      cache.set(slug, buf);
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

    /** Appendea UNA placa al final de la línea de tiempo. */
    const appendearUna = async (buffer: SourceBuffer) => {
      const lista = ordenRef.current;
      if (lista.length === 0) return;
      const slug = lista[proximo % lista.length];
      proximo = (proximo + 1) % lista.length;

      const bytes = await bajar(slug);
      if (!vivo) return;
      await libre(buffer);
      if (!vivo) return;

      const ini = finBuffer(buffer);
      buffer.appendBuffer(bytes);
      await libre(buffer);
      if (!vivo) return;
      appendeados.push({ slug, ini, fin: finBuffer(buffer) });
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

        const rInit = await fetch("/placas/mse/init.mp4");
        if (!rInit.ok) throw new Error(`init ${rInit.status}`);
        const init = await rInit.arrayBuffer();
        if (!vivo) return;
        sb.appendBuffer(init);
        await libre(sb);
        if (!vivo) return;

        // Arrancar con algo de colchón y recién ahí reproducir.
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
