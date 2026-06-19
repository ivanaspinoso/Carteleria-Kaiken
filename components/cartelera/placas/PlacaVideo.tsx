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

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let pauseTimer: ReturnType<typeof setTimeout> | undefined;
    if (activo) {
      try {
        v.currentTime = 0;
      } catch {
        /* algunos browsers tiran si el metadata no cargó aún */
      }
      v.play().catch(() => {});
    } else {
      // Seguir reproduciendo durante el crossfade y recién ahí pausar
      // (así no se reproducen los 13 videos a la vez en el TV).
      pauseTimer = setTimeout(() => v.pause(), 1000);
    }
    return () => {
      if (pauseTimer) clearTimeout(pauseTimer);
    };
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
