"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type MediaTipo = "video" | "imagen";

// Duración del crossfade entre placas. Corto = ágil; largo = más suave.
const CROSSFADE_MS = 320;

// requestVideoFrameCallback: avisa cuando el <video> PRESENTÓ un frame en el
// plano (Chromium 83+, o sea Tizen 7/8 de las verticales). Es la señal más
// confiable de "ya hay imagen, no negro" — mejor que canplay/loadeddata, que
// avisan que hay datos pero no que se pintó.
type VideoRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number;
};

/**
 * Motor de medios para signage en Smart TV (Tizen 7/8 en las verticales).
 *
 * DOBLE BUFFER: dos <video> superpuestos. El que se VE nunca recarga su `.src`,
 * así su plano de hardware nunca se pone negro. El próximo medio se carga en el
 * <video> de ATRÁS (oculto, opacity 0); recién cuando ese video PINTÓ un frame
 * (requestVideoFrameCallback) se hace el crossfade por opacidad y se pausa el
 * anterior. Resultado: nunca se ve el negro de carga, y la transición es un
 * fundido limpio.
 *
 * Por qué NO un solo <video> (diseño anterior): al cambiar el `.src` el plano de
 * video por HARDWARE del TV se pone negro mientras decodifica, y ese negro puede
 * pintarse POR ENCIMA del <img> de póster (overlay de hardware) → parpadeo negro
 * imposible de tapar. Con dos videos el plano visible nunca se recarga.
 *
 * Por qué DOS y no once (que saturaba el decoder): en régimen sólo reproduce uno;
 * el segundo está pausado y sólo decodifica durante el crossfade (~0.3s). Dos
 * streams simultáneos los Tizen 7/8 los manejan sin problema.
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
  // Primer frame del medio (imagen estática). Se usa SOLO en el primer arranque
  // (antes de que haya ningún video pintado) para no ver negro inicial. En las
  // transiciones ya no hace falta: el video anterior tapa el hueco.
  poster?: string;
  // Rotación del MEDIO (no de la placa). Las fijas vienen horneadas (rotar=0);
  // las personalizadas verticales se rotan acá 90°.
  rotar?: 0 | 90 | -90;
  // Tamaño real del viewport (px), para rotar sin vw/vh (los Smart TV los
  // calculan mal).
  vp?: { w: number; h: number };
  // "cover" llena recortando (placas fijas 9:16); "contain" muestra completo
  // (personalizadas de otra proporción).
  ajuste?: "cover" | "contain";
  // Se llama cuando el medio NUEVO ya está revelado (arrancó el crossfade).
  // PantallaRotativa lo usa para recién entonces mostrar el texto.
  onReady?: () => void;
}) {
  // Dos <video> (doble buffer) + una <img> (póster inicial e imágenes).
  const vidRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const imgRef = useRef<HTMLImageElement>(null);
  // Qué buffer está VISIBLE (0 o 1). El próximo video carga en el otro.
  const frenteRef = useRef(0);
  const srcRef = useRef<string | null>(null);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const mediaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: ajuste,
  };

  // Wrapper de rotación (solo personalizadas verticales). Replica el `.rotador-90`
  // de pantalla con px reales + origen 0,0 + traslación.
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
    const frente = frenteRef.current;
    const vFrente = vidRefs[frente].current;
    const vAtras = vidRefs[1 - frente].current;
    const img = imgRef.current;
    if (!vFrente || !vAtras || !img || !src) return;
    if (src === srcRef.current) return; // sin cambios
    const primeraVez = srcRef.current === null;
    srcRef.current = src;

    let cancel = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ---- Placa tipo IMAGEN (personalizada) ----
    if (tipo === "imagen") {
      img.src = src;
      img.style.opacity = "1";
      // Fundir a la imagen y pausar ambos videos (libera el decoder).
      vFrente.style.opacity = "0";
      vAtras.style.opacity = "0";
      timers.push(
        setTimeout(() => {
          if (cancel) return;
          try { vFrente.pause(); } catch { /* noop */ }
          try { vAtras.pause(); } catch { /* noop */ }
        }, CROSSFADE_MS)
      );
      onReadyRef.current?.();
      return () => {
        cancel = true;
        timers.forEach(clearTimeout);
      };
    }

    // ---- Placa tipo VIDEO ----
    // Cargar el próximo en el buffer de ATRÁS (oculto). El de adelante sigue
    // reproduciéndose y visible → no hay negro.
    vAtras.muted = true;
    vAtras.setAttribute("muted", "");
    vAtras.style.opacity = "0";
    vAtras.src = src;
    vAtras.load();

    // Primer arranque: no hay video anterior que tape el hueco → mostrar el
    // póster hasta que el primer video pinte.
    if (primeraVez && poster) {
      img.src = poster;
      img.style.opacity = "1";
    }

    let revelado = false;
    const revelar = () => {
      if (revelado || cancel) return;
      revelado = true;
      // Arrancar la reproducción desde el frame 0 (animación de entrada completa)
      // y hacer el crossfade: mostrar el de atrás, ocultar el de adelante.
      try {
        vAtras.currentTime = 0;
      } catch { /* metadata podría no estar */ }
      const p = vAtras.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      vAtras.style.opacity = "1";
      vFrente.style.opacity = "0";
      img.style.opacity = "0"; // por si estaba el póster inicial
      frenteRef.current = 1 - frente;
      onReadyRef.current?.();
      // Al terminar el fundido, pausar el que quedó atrás (libera decoder).
      timers.push(
        setTimeout(() => {
          if (cancel) return;
          try { vFrente.pause(); } catch { /* noop */ }
        }, CROSSFADE_MS + 60)
      );
    };

    // Señal preferida: requestVideoFrameCallback (frame realmente presentado).
    const vRVFC = vAtras as VideoRVFC;
    if (typeof vRVFC.requestVideoFrameCallback === "function") {
      // Hay que estar reproduciendo para que emita frames; arrancamos oculto,
      // pedimos el primer frame y ahí revelamos (ya reposicionado a 0 en revelar).
      const pp = vAtras.play();
      if (pp && typeof pp.catch === "function") pp.catch(() => {});
      vRVFC.requestVideoFrameCallback(() => revelar());
    } else {
      // Fallback (navegadores sin rVFC): canplay/loadeddata.
      vAtras.addEventListener("canplay", revelar, { once: true });
      vAtras.addEventListener("loadeddata", revelar, { once: true });
    }
    // Red de seguridad: si no llega ninguna señal, revelar igual.
    timers.push(setTimeout(revelar, 1800));

    return () => {
      cancel = true;
      timers.forEach(clearTimeout);
    };
  }, [src, tipo, poster]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diagnóstico EN PANTALLA (abrir con ?diag=1): estado real de ambos <video>.
  const [diag, setDiag] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("diag") !== "1") return;
    const id = setInterval(() => {
      const linea = (v: HTMLVideoElement | null, i: number) => {
        if (!v) return `v${i}=—`;
        const e = v.error;
        return (
          `v${i} ${i === frenteRef.current ? "◀frente" : ""} ${(v.currentSrc || "").split("/").pop() || "—"}\n` +
          `  ready=${v.readyState} net=${v.networkState} pause=${v.paused} op=${v.style.opacity || "1"}\n` +
          `  t=${v.currentTime.toFixed(1)} err=${e ? `${e.code}` : "none"}`
        );
      };
      setDiag(`${linea(vidRefs[0].current, 0)}\n${linea(vidRefs[1].current, 1)}`);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", overflow: "hidden" }}>
      {/* Wrapper de rotación: los dos videos + la imagen giran juntos. */}
      <div style={rotadorStyle}>
        {/* Buffer 0: visible al arranque. Buffer 1: oculto. El effect los alterna. */}
        <video
          ref={vidRefs[0]}
          muted loop playsInline preload="auto"
          style={{ ...mediaStyle, opacity: 1, transition: `opacity ${CROSSFADE_MS}ms ease-in-out` }}
        />
        <video
          ref={vidRefs[1]}
          muted loop playsInline preload="auto"
          style={{ ...mediaStyle, opacity: 0, transition: `opacity ${CROSSFADE_MS}ms ease-in-out` }}
        />
        {/* Imagen: póster del primer arranque y placas tipo imagen. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          alt=""
          style={{
            ...mediaStyle,
            opacity: 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
            pointerEvents: "none",
          }}
        />
      </div>
      {diag && (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 80,
          background: "rgba(0,0,0,0.85)", color: "#4ade80",
          font: "13px/1.4 monospace", padding: "8px 10px",
          whiteSpace: "pre", pointerEvents: "none", borderRadius: 4,
        }}>
          {diag}
        </div>
      )}
    </div>
  );
}
