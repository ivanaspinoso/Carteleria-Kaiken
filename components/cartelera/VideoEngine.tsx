"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type MediaTipo = "video" | "imagen";

/**
 * Motor de medios para signage en Smart TV (Tizen / WebOS / Android WebView).
 *
 * Principios (por qué el sistema anterior fallaba en TVs):
 *  - Antes había ~11 <video> montados a la vez → los decoders por HARDWARE de
 *    los Smart TV soportan 1-2 streams → casi todos quedaban en negro.
 *  - El playback dependía del render de React (montar/desmontar, autoplay).
 *
 * Acá hay UN SOLO <video> PERSISTENTE: nunca se desmonta ni cambia de key; solo
 * se cambia su `.src`. PROBLEMA: al recargar el src, el plano de video por
 * HARDWARE del TV se pone NEGRO mientras decodifica, y NO se puede congelar el
 * último frame en un <canvas> (el plano de hardware no es accesible por canvas:
 * sale negro). SOLUCIÓN: un <img> "cover" con el PÓSTER (primer frame de la
 * placa, una imagen estática que SÍ renderiza sobre el plano de video del TV)
 * tapa el hueco de carga con el CONTENIDO de la placa — nunca negro. Como el
 * póster es el frame 0 del video, cuando el <video> revela y arranca en 0 el
 * cruce es invisible. El cover hace crossfade desde la placa anterior y, al
 * revelarse el video nuevo, se desvanece hacia el vivo.
 */
export default function VideoEngine({
  src,
  tipo,
  poster,
  onReady,
}: {
  src: string;
  tipo: MediaTipo;
  // Primer frame del medio (imagen estática) para tapar el hueco de carga del
  // <video> sin que aparezca negro. Si falta, se carga directo (puede haber un
  // parpadeo negro en ese caso — solo placas personalizadas sin póster).
  poster?: string;
  // Se llama cuando el medio NUEVO ya está revelado (video pintando / imagen
  // cargada). PantallaRotativa lo usa para recién entonces mostrar el texto.
  onReady?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const coverRef = useRef<HTMLImageElement>(null);
  const srcRef = useRef<string | null>(null);

  // Ref siempre fresca para no re-disparar el effect de carga al cambiar onReady.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const mediaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  useEffect(() => {
    const video = videoRef.current;
    const cover = coverRef.current;
    if (!video || !cover || !src) return;
    if (src === srcRef.current) return; // sin cambios
    const primeraVez = srcRef.current === null;
    srcRef.current = src;

    // Imagen (placa personalizada tipo imagen): pintar en el cover y pausar el
    // video (libera el decoder mientras se ve una imagen).
    if (tipo === "imagen") {
      cover.src = src;
      cover.style.opacity = "1";
      try {
        video.pause();
      } catch {
        /* noop */
      }
      onReadyRef.current?.();
      return;
    }

    // Video: tapar con el PÓSTER (contenido, nunca negro). En una transición el
    // cover hace crossfade desde la placa anterior (video vivo debajo); en el
    // arranque aparece directo.
    if (poster) cover.src = poster;
    cover.style.opacity = poster ? "1" : "0";

    let cancel = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cargar = () => {
      if (cancel) return;
      video.muted = true;
      video.setAttribute("muted", "");
      video.src = src;
      video.load();

      let listo = false;
      const revelar = () => {
        if (listo || cancel) return;
        listo = true;
        try {
          video.currentTime = 0; // arrancar en 0 = el frame del póster (cruce invisible)
        } catch {
          /* el metadata podría no haber cargado todavía */
        }
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
        // Un par de frames para que el <video> ya pinte su cuadro y recién ahí
        // desvanecer el cover (del póster estático al video vivo).
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (cancel) return;
            cover.style.opacity = "0";
            onReadyRef.current?.();
          })
        );
      };
      video.addEventListener("canplay", revelar, { once: true });
      video.addEventListener("loadeddata", revelar, { once: true });
      timers.push(setTimeout(revelar, 1500)); // por si no llegan eventos
    };

    // Con póster y NO en el arranque: dejar que el cover (póster nuevo) TERMINE
    // de cruzar sobre la placa anterior antes de recargar el <video> (cuyo plano
    // se pone negro al cargar) → el negro queda SIEMPRE detrás del cover. Sin
    // póster, cargar ya (caso degradado).
    if (poster && !primeraVez) {
      timers.push(setTimeout(cargar, 300)); // ≈ duración del crossfade del cover
    } else {
      cargar();
    }

    return () => {
      cancel = true;
      timers.forEach(clearTimeout);
    };
  }, [src, tipo, poster]);

  // Diagnóstico EN PANTALLA (abrir con ?diag=1): estado real del <video>.
  const [diag, setDiag] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("diag") !== "1") return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const e = v.error;
      setDiag(
        `src=${(v.currentSrc || "").split("/").pop() || "—"}\n` +
          `ready=${v.readyState} net=${v.networkState} pause=${v.paused}\n` +
          `vid=${v.videoWidth}x${v.videoHeight} t=${v.currentTime.toFixed(1)}\n` +
          `err=${e ? `${e.code} ${e.message || ""}` : "none"}`
      );
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", overflow: "hidden" }}>
      <video ref={videoRef} autoPlay muted loop playsInline preload="auto" style={mediaStyle} />
      {diag && (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 80,
          background: "rgba(0,0,0,0.85)", color: "#4ade80",
          font: "14px/1.5 monospace", padding: "8px 10px",
          whiteSpace: "pre", pointerEvents: "none", borderRadius: 4,
        }}>
          {diag}
        </div>
      )}
      {/* Cover de contenido (póster / imagen). Renderiza SOBRE el plano de video
          del TV, así tapa el hueco de carga con el frame de la placa, no negro. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={coverRef}
        alt=""
        style={{
          ...mediaStyle,
          opacity: 0,
          transition: "opacity 300ms ease",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
