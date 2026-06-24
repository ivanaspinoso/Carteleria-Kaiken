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
 * se cambia su `.src` de forma controlada. Para no mostrar negro durante la
 * carga del nuevo src, un <canvas> congela el último frame visible y tapa el
 * hueco; cuando el video nuevo dispara `canplay` se hace crossfade al vivo.
 * Las imágenes (placas personalizadas tipo imagen) se pintan en ese mismo canvas.
 */
export default function VideoEngine({ src, tipo }: { src: string; tipo: MediaTipo }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const srcRef = useRef<string | null>(null);
  const tipoRef = useRef<MediaTipo | null>(null);

  // El `<video>` se pinta en un PLANO DE HARDWARE del Smart TV que IGNORA el
  // transform del `.rotador-90` (ancestro): el texto rota pero el video no. Para
  // que el video acompañe SIN depender de transforms (que el plano composita
  // raro), la rotación va HORNEADA en el archivo: los videos se guardan ya
  // girados 90° (ffmpeg transpose=1) a 1920×1080. Así el video llena la pantalla
  // mostrando la placa "de costado", igual que el texto rotado por el rotador.
  const mediaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !src) return;
    if (src === srcRef.current) return; // sin cambios

    const ctx = canvas.getContext("2d");
    const prevTipo = tipoRef.current;
    srcRef.current = src;
    tipoRef.current = tipo;

    // Congela el frame actual del video en el canvas (cover de carga).
    const congelarVideo = () => {
      try {
        if (video.videoWidth && video.readyState >= 2) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.style.opacity = "1";
        }
      } catch {
        /* video cross-origin: el canvas queda "tainted" pero igual se muestra */
      }
    };

    if (tipo === "video") {
      // Tapar el hueco de carga: si veníamos de video, congelamos su último
      // frame; si veníamos de imagen, el canvas ya la está mostrando (opacity 1).
      // Así el <video> recarga su src DETRÁS del cover y nunca se ve negro.
      if (prevTipo === "video") congelarVideo();

      video.muted = true;
      video.setAttribute("muted", "");
      video.src = src;
      video.load();

      let listo = false;
      const revelar = () => {
        if (listo) return;
        listo = true;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
        // Esperar un frame para que el primer cuadro esté pintado y recién ahí
        // desvanecer el cover (crossfade del freeze al video vivo).
        requestAnimationFrame(() => {
          canvas.style.opacity = "0";
        });
      };
      video.addEventListener("canplay", revelar, { once: true });
      video.addEventListener("loadeddata", revelar, { once: true });
      const fallback = setTimeout(revelar, 2000); // por si no llegan eventos

      return () => {
        clearTimeout(fallback);
        video.removeEventListener("canplay", revelar);
        video.removeEventListener("loadeddata", revelar);
      };
    }

    // tipo === "imagen": pintar en el canvas y fundir hacia ella sobre el video.
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth || 1080;
      canvas.height = img.naturalHeight || 1920;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.style.opacity = "1";
      try {
        video.pause(); // liberar el decoder mientras se ve una imagen
      } catch {
        /* noop */
      }
    };
    img.src = src;
  }, [src, tipo]);

  // Diagnóstico EN PANTALLA (abrir con ?diag=1): muestra el estado real del
  // <video> directo en el TV, sin necesitar consola. Como es HTML, se ve aunque
  // el video (plano de hardware) no se renderice.
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
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={mediaStyle}
      />
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
      <canvas
        ref={canvasRef}
        style={{
          ...mediaStyle,
          opacity: 0,
          transition: "opacity 350ms ease",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
