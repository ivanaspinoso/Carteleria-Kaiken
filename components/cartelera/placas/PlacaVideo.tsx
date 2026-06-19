"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { pxV } from "@/lib/cartelera/tokens";

/**
 * Placa basada en el video animado de Mora (1080×1920, ~10s).
 * Cuando la placa pasa a estar activa, reinicia el video a 0 para que la
 * animación de entrada se vea en cada aparición. `children` se superpone
 * (texto editable: precio, sabor, etc.).
 */
export default function PlacaVideo({
  src,
  activo,
  children,
}: {
  src: string;
  activo?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // Mantener TODOS los videos reproduciéndose siempre (muted), así ninguna
  // animación se traba al aparecer y las dos pantallas verticales andan
  // fluidas en simultáneo. Los videos son livianos (~0.5 MB c/u), el costo es
  // bajo. El `play()` se reintenta por si el navegador bloquea el autoplay.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const intentarPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    intentarPlay();
    // Reintentos: algunos navegadores/TVs recién dejan reproducir cuando el
    // video tiene datos suficientes o tras el primer gesto.
    v.addEventListener("canplay", intentarPlay);
    v.addEventListener("loadeddata", intentarPlay);
    return () => {
      v.removeEventListener("canplay", intentarPlay);
      v.removeEventListener("loadeddata", intentarPlay);
    };
  }, []);

  // Al volver a estar activa, reiniciar a 0 para ver la animación de entrada.
  useEffect(() => {
    const v = ref.current;
    if (!v || !activo) return;
    try {
      v.currentTime = 0;
    } catch {
      /* el metadata podría no haber cargado todavía */
    }
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [activo]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", aspectRatio: "9 / 16", overflow: "hidden", backgroundColor: "#000" }}>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {children}
    </div>
  );
}

/**
 * Texto editable superpuesto sobre el video. Posición en % del lienzo (escala
 * con la pantalla). TODO: ajustar `top` por placa según el hueco del diseño.
 */
export function OverlayTexto({
  children,
  topPct,
  fontPx,
  color,
  weight = 700,
  style,
}: {
  children: ReactNode;
  topPct: number;
  fontPx: number;
  color: string;
  weight?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: `${topPct}%`,
        transform: "translate(-50%, -50%)",
        width: "84%",
        textAlign: "center",
        fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
        fontSize: pxV(fontPx),
        fontWeight: weight,
        lineHeight: 1.1,
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
