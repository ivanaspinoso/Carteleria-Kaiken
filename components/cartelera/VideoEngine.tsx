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

    // ARQUITECTURA anti-negro: el PÓSTER (cover) es un BACKSTOP SÓLIDO e
    // INSTANTÁNEO (sin fundido) DEBAJO del <video> (z-index). SOLO el <video>
    // hace fundidos por encima: el viejo sale (opacity 1→0) revelando el póster
    // sólido, el nuevo entra (0→1) tapando el póster. Como el póster está SIEMPRE
    // 100% opaco durante toda la transición, el fondo negro del contenedor nunca
    // se cuela. (Antes el póster ENTRABA con fundido a la vez que el video SALÍA
    // → en el medio ninguna capa tapaba del todo → se colaba el negro; se notaba
    // entre placas de diseño distinto. Con backstop sólido no pasa.)

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
        // invisible.
        //
        // El póster NO se apaga: queda como BACKSTOP SÓLIDO PERMANENTE debajo del
        // <video> (z-index 1). El video, opaco, lo tapa mientras pinta bien; si el
        // plano de video del TV parpadea negro en cualquier momento (durante la
        // animación de entrada o al reiniciar el loop), asoma el póster de ESTA
        // placa en vez del negro. Se re-apunta al póster nuevo en cada transición
        // (arrancar()), así siempre coincide con la placa en pantalla.
        let fundido = false;
        const fundir = () => {
          if (fundido || cancel) return;
          fundido = true;
          video.removeEventListener("timeupdate", fundir);
          video.style.opacity = "1";
          onReadyRef.current?.();
        };
        video.addEventListener("timeupdate", fundir);
        // Fallback: si no llega 'timeupdate', fundir igual tras un margen corto.
        timers.push(setTimeout(fundir, 300));
      };
      video.addEventListener("canplay", revelar, { once: true });
      video.addEventListener("loadeddata", revelar, { once: true });
      timers.push(setTimeout(revelar, 1500)); // por si no llegan eventos
    };

    // Arranca la transición: pone el póster SÓLIDO (backstop), funde el video
    // viejo por encima, y tras el fundido recarga el <video>.
    const arrancar = () => {
      if (cancel) return;
      cover.style.opacity = "1"; // backstop sólido (instantáneo)
      video.style.opacity = "0"; // funde el video viejo SOBRE el póster sólido
      timers.push(setTimeout(cargar, primeraVez ? 0 : CROSSFADE_MS));
    };

    if (poster) {
      cover.src = poster;
      // Fundir el video viejo recién cuando el póster esté PINTADO (backstop
      // sólido de verdad); si no, se revelaría un cover todavía en blanco.
      if (cover.complete && cover.naturalWidth > 0) {
        arrancar();
      } else {
        const alCargarCover = () => {
          cover.removeEventListener("load", alCargarCover);
          arrancar();
        };
        cover.addEventListener("load", alCargarCover, { once: true });
        // Fallback: si el 'load' no llega, no bloquear la rotación para siempre.
        timers.push(
          setTimeout(() => {
            cover.removeEventListener("load", alCargarCover);
            arrancar();
          }, 600)
        );
      }
    } else {
      // Sin póster (personalizada sin póster): no hay backstop → degradado.
      cover.style.opacity = "0";
      if (!primeraVez) video.style.opacity = "0";
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
        {/* Póster BACKSTOP, DEBAJO del video (z-index 1). Se prende de golpe
            (sin transición) al arrancar la transición y NO se apaga: queda como
            backstop sólido permanente. El video, opaco, lo tapa cuando pinta; si
            el plano del TV se blanquea (entrada del video o reinicio del loop),
            asoma el póster de la placa actual en vez del negro del contenedor. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={coverRef}
          alt=""
          style={{
            ...mediaStyle,
            zIndex: 1,
            opacity: 0,
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
