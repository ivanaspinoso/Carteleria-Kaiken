"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type Tramo = { slug: string; duracion: number };

/**
 * Reproductor de la SECUENCIA continua de una pantalla vertical.
 *
 * Es la respuesta al problema de fondo del sistema anterior: medido en el
 * Samsung del local (tabla diag_transiciones), abrir un mp4 le lleva ~600ms al
 * decodificador AUNQUE el archivo ya esté en memoria. Con un archivo por placa
 * ese medio segundo largo se paga en cada cambio, y ahí aparece el negro. Acá
 * hay UN SOLO archivo, con todas las placas pegadas, en loop: el reproductor
 * arranca una vez y no se toca nunca más. No hay recarga que tapar.
 *
 * El texto editable sigue siendo HTML encima, y se sincroniza con el minutero
 * del video (no con un reloj aparte), así que no se puede desfasar.
 */
export default function VideoSecuencia({
  src,
  poster,
  tramos,
  onIndice,
  onFalla,
}: {
  src: string;
  // Primer cuadro del video, para que el arranque inicial no muestre negro.
  poster?: string;
  tramos: Tramo[];
  // Qué placa se está viendo, según el minutero del video.
  onIndice: (i: number) => void;
  // El video no se pudo reproducir: la pantalla vuelve al modo de a una placa.
  onFalla: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onIndiceRef = useRef(onIndice);
  onIndiceRef.current = onIndice;
  const onFallaRef = useRef(onFalla);
  onFallaRef.current = onFalla;

  // Límites acumulados: [10, 20, 30…]. Se calculan de las duraciones REALES de
  // cada mp4 (las escribe el script al pegar), no de las de la base.
  const cortesRef = useRef<number[]>([]);
  cortesRef.current = tramos.reduce<number[]>((acc, t) => {
    acc.push((acc[acc.length - 1] ?? 0) + t.duracion);
    return acc;
  }, []);

  const [listo, setListo] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const arrancar = () => {
      v.muted = true;
      v.setAttribute("muted", "");
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    arrancar();

    // Si el TV pausa el video por su cuenta (ahorro de energía, foco), volver a
    // arrancarlo: una pantalla de local no se puede quedar congelada.
    const alPausar = () => {
      if (!v.ended) arrancar();
    };
    const alPintar = () => setListo(true);
    const alFallar = () => onFallaRef.current();
    v.addEventListener("pause", alPausar);
    v.addEventListener("playing", alPintar);
    v.addEventListener("error", alFallar);

    // Qué placa se ve, leyendo el minutero. 150ms es más que suficiente para el
    // texto y no carga al procesador del TV como un callback por cuadro.
    const tic = setInterval(() => {
      const t = v.currentTime;
      const cortes = cortesRef.current;
      let i = 0;
      while (i < cortes.length - 1 && t >= cortes[i]) i++;
      onIndiceRef.current(i);
    }, 150);

    return () => {
      clearInterval(tic);
      v.removeEventListener("pause", alPausar);
      v.removeEventListener("playing", alPintar);
      v.removeEventListener("error", alFallar);
    };
  }, [src]);

  const estilo: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", overflow: "hidden" }}>
      {/* El póster tapa SOLO el arranque inicial (antes del primer cuadro). De
          ahí en más el video no vuelve a cargar nunca, así que no hay más huecos
          que tapar. */}
      {poster && !listo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" style={{ ...estilo, zIndex: 2 }} />
      )}
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{ ...estilo, zIndex: 1 }}
      />
    </div>
  );
}
