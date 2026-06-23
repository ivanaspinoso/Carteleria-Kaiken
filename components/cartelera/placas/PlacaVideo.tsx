"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { pxV, escalaV } from "@/lib/cartelera/tokens";

// useLayoutEffect avisa en SSR; usamos useEffect del lado servidor.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Nombre corto del archivo para los logs (ej. "gusto-del-dia.mp4").
const nombreSrc = (src: string) => src.split("/").pop() ?? src;

/**
 * Cuando es true, PlacaVideo NO renderiza su <video> (el video lo maneja el
 * VideoEngine persistente) y solo renderiza los overlays (texto). Permite reusar
 * las placas existentes como capa de overlay sin tocar sus archivos.
 */
export const ModoOverlay = createContext(false);

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
  const soloOverlay = useContext(ModoOverlay);

  // Reproducir SOLO la placa activa. Antes se reproducían las ~11 placas a la
  // vez, pero los decoders por HARDWARE de las Smart TV soportan 1-2 streams
  // H.264 simultáneos → las demás quedaban en negro (en la compu no se nota
  // porque decodifica por software). Con play sólo en la activa + pausa + sin
  // precarga en las inactivas, se usa un único decoder a la vez.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Asegurar muted en el DOM (algunos TV exigen el atributo, no solo el prop)
    v.muted = true;
    v.setAttribute("muted", "");

    // Logs de diagnóstico (visibles con depuración remota del TV).
    const onEvt = (e: Event) => console.log(`[placa] ${nombreSrc(src)} → ${e.type}`);
    const onError = () =>
      console.error(`[placa] ${nombreSrc(src)} ERROR`, v.error?.code, v.error?.message);
    const EVENTOS = ["loadeddata", "canplay", "playing", "stalled", "suspend", "waiting"];
    EVENTOS.forEach((ev) => v.addEventListener(ev, onEvt));
    v.addEventListener("error", onError);

    let cancelado = false;
    const intentarPlay = () => {
      if (cancelado) return;
      const p = v.play();
      // Antes el error se silenciaba; ahora lo logueamos para diagnosticar.
      if (p && typeof p.catch === "function")
        p.catch((err) =>
          console.warn(`[placa] ${nombreSrc(src)} play() rechazado:`, err?.name, err?.message)
        );
    };

    if (activo) {
      try {
        v.currentTime = 0; // reiniciar para ver la animación de entrada
      } catch {
        /* el metadata podría no haber cargado todavía */
      }
      intentarPlay();
      // Reintentos: el TV a veces recién deja reproducir con datos suficientes.
      v.addEventListener("canplay", intentarPlay);
      v.addEventListener("loadeddata", intentarPlay);
    } else {
      v.pause();
    }

    return () => {
      cancelado = true;
      EVENTOS.forEach((ev) => v.removeEventListener(ev, onEvt));
      v.removeEventListener("error", onError);
      v.removeEventListener("canplay", intentarPlay);
      v.removeEventListener("loadeddata", intentarPlay);
    };
  }, [activo, src]);

  // Modo overlay: el video lo maneja el VideoEngine; acá solo el texto.
  if (soloOverlay) {
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", aspectRatio: "9 / 16", overflow: "hidden", backgroundColor: "#000" }}>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        // Solo la activa precarga/decodifica; las inactivas no reservan decoder.
        // (Sin autoPlay: el play lo controla el effect SOLO en la activa.)
        preload={activo ? "auto" : "none"}
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
        // escalaV (no pxV): el tamaño sigue al lienzo real, también rotado.
        fontSize: escalaV(fontPx),
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

/**
 * Texto editable que LLENA su recuadro: mide el texto contra el tamaño real del
 * recuadro y busca el MAYOR tamaño de fuente que entra, entre `minFontPx` y
 * `maxFontPx`. Así una palabra corta crece y llena el fondo, y una larga
 * (ej. "Frambuesa Patagónica") se achica para no salirse — pero ambas usan
 * todo el espacio disponible, no quedan chicas por igual.
 *
 * - `boxWidthPct`/`boxHeightPct`: tamaño del recuadro en % del lienzo.
 *   En modo `wrap` el alto es lo que limita; sin `wrap` (una línea) limita el
 *   ancho y `maxFontPx` es el tope para que una palabra corta no se agigante.
 * - Tamaños en px de diseño sobre la base vertical (1080), igual que `pxV`.
 * - Mide el layout real con ResizeObserver, así funciona rotado o sin rotar.
 */
export function AutoFitTexto({
  children,
  topPct,
  leftPct = 50,
  boxWidthPct,
  boxHeightPct,
  maxFontPx,
  minFontPx,
  color,
  weight = 700,
  wrap = false,
  textAlign = "center",
  lineHeight = 1.1,
}: {
  children: ReactNode;
  topPct: number;
  leftPct?: number;
  boxWidthPct: number;
  boxHeightPct?: number;
  maxFontPx: number;
  minFontPx: number;
  color: string;
  weight?: number;
  wrap?: boolean;
  textAlign?: "center" | "left";
  lineHeight?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontPx, setFontPx] = useState<number | null>(null);

  useIsoLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;

    const ajustar = () => {
      const anchoBox = box.clientWidth;
      if (anchoBox === 0) return;
      // px reales por cada px de diseño (base 1080): el recuadro mide
      // boxWidthPct% del lienzo, así reconstruimos el ancho del lienzo.
      const factor = (anchoBox * 100) / boxWidthPct / 1080;
      const maxReal = maxFontPx * factor;
      const minReal = minFontPx * factor;

      const entra = () =>
        text.offsetWidth <= box.clientWidth + 0.5 &&
        (boxHeightPct == null || text.offsetHeight <= box.clientHeight + 0.5);

      // Si entra al tope, usamos el tope (palabra corta llena el recuadro).
      text.style.fontSize = `${maxReal}px`;
      if (entra()) {
        setFontPx(maxReal);
        return;
      }
      // Si no, búsqueda binaria del MAYOR tamaño que entra, entre min y max.
      let lo = minReal;
      let hi = maxReal;
      let best = minReal;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        text.style.fontSize = `${mid}px`;
        if (entra()) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      setFontPx(best);
    };

    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(box);
    return () => ro.disconnect();
  }, [children, boxWidthPct, boxHeightPct, maxFontPx, minFontPx, wrap]);

  return (
    <div
      ref={boxRef}
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: "translate(-50%, -50%)",
        width: `${boxWidthPct}%`,
        height: boxHeightPct != null ? `${boxHeightPct}%` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: textAlign === "left" ? "flex-start" : "center",
        overflow: "hidden",
      }}
    >
      <div
        ref={textRef}
        style={{
          display: "inline-block",
          maxWidth: wrap ? "100%" : "none",
          textAlign,
          fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
          fontWeight: weight,
          lineHeight,
          color,
          whiteSpace: wrap ? "normal" : "nowrap",
          fontSize: fontPx != null ? `${fontPx}px` : pxV(maxFontPx),
        }}
      >
        {children}
      </div>
    </div>
  );
}
