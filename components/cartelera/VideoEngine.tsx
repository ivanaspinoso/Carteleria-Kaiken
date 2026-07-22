"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type MediaTipo = "video" | "imagen";

// Duración del crossfade del cover (póster). Corto = transición ágil/dinámica.
// El mismo valor se usa para esperar a que el cover tape antes de recargar el
// <video> (así el negro de carga queda detrás del cover, nunca a la vista).
const CROSSFADE_MS = 160;

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
  rotar = 0,
  vp,
  ajuste = "cover",
  onReady,
}: {
  src: string;
  tipo: MediaTipo;
  // Primer frame del medio (imagen estática) para tapar el hueco de carga del
  // <video> sin que aparezca negro. Si falta, se carga directo (puede haber un
  // parpadeo negro en ese caso — solo placas personalizadas sin póster).
  poster?: string;
  // Rotación del MEDIO (no de la placa). Las placas fijas vienen con la rotación
  // HORNEADA en el archivo (rotar=0). Las personalizadas que sube el dueño son
  // verticales 9:16 sin hornear → se rotan acá 90° para que se vean derechas en
  // la pantalla montada vertical, igual que las fijas. Es un transform ÚNICO
  // sobre la capa de video (que está FUERA del rotador), no anidado → el plano
  // de hardware del TV lo compone bien (a diferencia del intento anidado viejo).
  rotar?: 0 | 90 | -90;
  // Tamaño real del viewport (px), para rotar a pantalla completa sin vw/vh
  // (los navegadores de Smart TV los calculan mal).
  vp?: { w: number; h: number };
  // Cómo encaja el medio: "cover" llena la pantalla recortando lo que sobra
  // (placas fijas, ya son 9:16); "contain" muestra el medio COMPLETO acomodado
  // a su proporción (placas personalizadas: si no es 9:16 exacto, se ve entero
  // con borde negro en vez de recortarse).
  ajuste?: "cover" | "contain";
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
    objectFit: ajuste,
  };

  // Wrapper de rotación del medio. Replica EXACTO el `.rotador-90` de pantalla
  // (px reales + origen 0,0 + traslación) para que el medio vertical llene la
  // pantalla apaisada girado, idéntico a las placas fijas horneadas.
  const rotando = rotar !== 0 && vp && vp.w > 0 && vp.h > 0;
  const giro =
    rotar === 90
      ? `translateX(${vp?.w}px) rotate(90deg)`
      : `translateY(${vp?.h}px) rotate(-90deg)`;
  const rotadorStyle: CSSProperties = rotando
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        width: vp!.h,
        height: vp!.w,
        overflow: "hidden",
        transformOrigin: "0 0",
        transform: giro,
        WebkitTransform: giro,
      }
    : { position: "absolute", inset: 0 };

  useEffect(() => {
    const video = videoRef.current;
    const cover = coverRef.current;
    if (!video || !cover || !src) return;
    if (src === srcRef.current) return; // sin cambios
    const primeraVez = srcRef.current === null;
    srcRef.current = src;

    let cancel = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Imagen (placa personalizada tipo imagen): pintar en el cover, ocultar el
    // video (opacity 0) y pausarlo (libera el decoder).
    if (tipo === "imagen") {
      cover.src = src;
      cover.style.opacity = "1";
      video.style.opacity = "0";
      try {
        video.pause();
      } catch {
        /* noop */
      }
      onReadyRef.current?.();
      return () => {
        cancel = true;
        timers.forEach(clearTimeout);
      };
    }

    // ARQUITECTURA anti-negro: el PÓSTER (cover) es un BACKSTOP que queda DEBAJO
    // del <video> (z-index). El <video> se funde por ENCIMA: el viejo se va
    // (opacity → 0) y el nuevo entra (opacity → 1). Mientras el plano del video
    // está en negro (al recargar el src), el <video> está en opacity 0, así que
    // lo que se ve es el póster — NUNCA el negro del plano. El póster se oculta
    // recién cuando el video nuevo ya lo tapa (opaco).
    if (poster) cover.src = poster;
    cover.style.opacity = poster ? "1" : "0";

    // Fundir el video ACTUAL (viejo) hacia afuera → debajo aparece el póster.
    // (En el primer arranque sin póster, dejar el video visible: no hay backstop
    // ni video viejo, así que ocultarlo solo daría negro hasta que cargue.)
    if (!primeraVez || poster) video.style.opacity = "0";

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
        // Arrancar desde 0 y REPRODUCIR (el video empuja frames al plano). El
        // video sigue en opacity 0, tapado por el póster.
        try {
          video.currentTime = 0;
        } catch {
          /* el metadata podría no haber cargado todavía */
        }
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});

        // Cuando el video está PINTANDO ('timeupdate' = avanzó el tiempo = hay
        // frames en el plano), subirlo por opacidad SOBRE el póster. Como el
        // video sólo se movió unos frames desde 0, el cruce póster→video es
        // invisible. Al terminar el fundido, ocultar el póster backstop.
        let fundido = false;
        const fundir = () => {
          if (fundido || cancel) return;
          fundido = true;
          video.removeEventListener("timeupdate", fundir);
          video.style.opacity = "1";
          onReadyRef.current?.();
          timers.push(
            setTimeout(() => {
              if (!cancel) cover.style.opacity = "0";
            }, CROSSFADE_MS + 40)
          );
        };
        video.addEventListener("timeupdate", fundir);
        // Fallback: si no llega 'timeupdate', fundir igual tras un margen corto.
        timers.push(setTimeout(fundir, 300));
      };
      video.addEventListener("canplay", revelar, { once: true });
      video.addEventListener("loadeddata", revelar, { once: true });
      timers.push(setTimeout(revelar, 1500)); // por si no llegan eventos
    };

    // Recargar el <video> (que blanquea el plano) recién cuando (a) el póster
    // está PINTADO (backstop listo) y (b) el video viejo terminó de fundirse a 0
    // (~CROSSFADE_MS). Así el blanqueo ocurre con el video ya invisible y el
    // póster tapando. Sin póster / primer arranque: cargar ya.
    if (poster && !primeraVez) {
      const dispararCargar = () => {
        if (!cancel) timers.push(setTimeout(cargar, CROSSFADE_MS));
      };
      if (cover.complete && cover.naturalWidth > 0) {
        dispararCargar();
      } else {
        const alCargarCover = () => {
          cover.removeEventListener("load", alCargarCover);
          dispararCargar();
        };
        cover.addEventListener("load", alCargarCover, { once: true });
        // Fallback: si el 'load' no llega, no bloquear la rotación para siempre.
        timers.push(
          setTimeout(() => {
            cover.removeEventListener("load", alCargarCover);
            dispararCargar();
          }, 600)
        );
      }
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
      {/* Wrapper que rota el medio (solo personalizadas verticales). Video +
          cover van DENTRO, así giran juntos sin desfasarse. */}
      <div style={rotadorStyle}>
        {/* Video ARRIBA (z-index 2). Su opacidad la controla el effect: se funde
            a 0 mientras el plano se blanquea (recarga) y vuelve a 1 cuando el
            video nuevo ya está pintando. Sin autoPlay: el play lo maneja el
            effect para arrancar la animación desde 0. */}
        <video
          ref={videoRef}
          muted loop playsInline preload="auto"
          style={{
            ...mediaStyle,
            zIndex: 2,
            opacity: 1,
            transition: `opacity ${CROSSFADE_MS}ms ease-out`,
          }}
        />
        {/* Póster BACKSTOP, DEBAJO del video (z-index 1). Queda visible mientras
            el video está en opacity 0, tapando el negro del plano de carga. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={coverRef}
          alt=""
          style={{
            ...mediaStyle,
            zIndex: 1,
            opacity: 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-out`,
            pointerEvents: "none",
          }}
        />
      </div>
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
    </div>
  );
}
