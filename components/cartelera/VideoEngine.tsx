"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type MediaTipo = "video" | "imagen";

// El póster tapa al <video> DESDE ARRIBA. Medido en el TV (grabación de la
// cartelera, 2026-07-29): con el póster DEBAJO del <video> (z-index 1) seguía
// habiendo ~230ms de NEGRO en cada cambio de placa (t=0.20→0.43s y
// t=10.20→10.43s del video de control). O sea: el plano de video por HARDWARE
// del TV perfora en negro su rectángulo aunque el <video> esté en opacity 0 —
// no alcanza con "dejar la opacidad quieta", el hueco tapa igual a todo lo que
// tenga DEBAJO. Lo que sí se ve por encima del plano es la capa HTML (prueba:
// el texto editable se lee perfecto sobre el video). Por eso el póster va
// ARRIBA (z-index 2) y el <video> abajo (z-index 1): así el póster cubre el
// hueco pase lo que pase, y NUNCA hay que animar ni apagar la opacidad del
// <video>. Como el póster ES el frame 0 del video, el corte póster→video es
// invisible.
//
// Margen (ms) entre poner el póster y recargarle el src al <video>: le da al
// compositor del TV un par de frames para pintar el póster antes de que el
// plano se ponga negro por la recarga.
const TAPADO_MS = 60;

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
 * placa, una imagen estática que SÍ renderiza POR ENCIMA del plano de video del
 * TV) tapa el hueco de carga con el CONTENIDO de la placa — nunca negro. Como el
 * póster es el frame 0 del video, cuando el <video> revela y arranca en 0 el
 * cruce es invisible. NADA de esto usa fundidos: todos los cambios de capa son
 * CORTES SECOS, y la opacidad del <video> no se toca nunca (ver la nota de
 * TAPADO_MS arriba).
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
  // Se llama cuando el CONTENIDO de la placa nueva ya está en pantalla: con el
  // póster pintado (que ES el frame 0 de la placa), no cuando el <video> arranca.
  // PantallaRotativa lo usa para mostrar el texto editable. Medido en el TV: el
  // mp4 tarda hasta 1.7s en cargar, así que atar el texto al <video> dejaba la
  // placa 1.7s SIN precio ni título en pantalla.
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

    // ARQUITECTURA anti-negro: el PÓSTER (cover) TAPA DESDE ARRIBA (z-index 2)
    // y el <video> vive abajo (z-index 1) con la opacidad SIEMPRE en 1. La
    // transición es: póster ON (de golpe, tapa la placa vieja) → recargar el src
    // del video debajo → cuando el video ya pinta, póster OFF (de golpe, revela
    // el video en el frame 0 = mismo pixel que el póster). El <video> nunca
    // cambia de opacidad, así que su plano de hardware nunca queda al aire.
    // Ese era el bug medido el 2026-07-29: con el póster DEBAJO, el hueco negro
    // que perfora el plano del TV mientras recarga tapaba al póster igual, y
    // salían ~230ms de negro por cambio de placa.

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
        // video está tapado por el póster mientras tanto.
        try {
          video.currentTime = 0;
        } catch {
          /* el metadata podría no haber cargado todavía */
        }
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});

        // Cuando el video está PINTANDO ('timeupdate' = avanzó el tiempo = hay
        // frames en el plano), sacar el póster DE GOLPE. Como el video sólo se
        // movió unos frames desde 0 y el póster ES el frame 0, el corte
        // póster→video es invisible. Esperar a 'timeupdate' es lo que evita
        // destapar un plano todavía negro.
        let destapado = false;
        const destapar = () => {
          if (destapado || cancel) return;
          destapado = true;
          video.removeEventListener("timeupdate", destapar);
          if (poster) cover.style.opacity = "0";
          else onReadyRef.current?.(); // sin póster, el texto entra recién acá
        };
        video.addEventListener("timeupdate", destapar);
        // Fallback largo a propósito: si 'timeupdate' no llega, el video está
        // trabado y quedarse con el póster (frame 0, placa completa y quieta) es
        // MUCHO mejor que destapar el plano en negro.
        timers.push(setTimeout(destapar, 1000));
      };
      video.addEventListener("canplay", revelar, { once: true });
      video.addEventListener("loadeddata", revelar, { once: true });
      timers.push(setTimeout(revelar, 1500)); // por si no llegan eventos
    };

    // Arranca la transición: sube el póster de la placa NUEVA por encima de todo
    // y, un par de frames después, recarga el src del video debajo.
    const arrancar = () => {
      if (cancel) return;
      cover.style.opacity = "1"; // tapa de golpe (instantáneo, sin fundido)
      video.style.opacity = "1"; // por si venía de una placa tipo "imagen"
      // El contenido de la placa nueva YA está en pantalla (el póster es su
      // frame 0): avisar acá para que el texto editable entre junto con él, en
      // vez de esperar el hasta-1.7s que tarda el TV en cargar el mp4.
      onReadyRef.current?.();
      timers.push(setTimeout(cargar, primeraVez ? 0 : TAPADO_MS));
    };

    if (poster) {
      // El póster tiene que estar DECODIFICADO antes de taparlo con él y, sobre
      // todo, antes de recargarle el src al <video> de abajo. Si se sube un cover
      // todavía sin píxeles, el hueco negro que perfora el plano de hardware del
      // TV se ve a través → eso es el negro de ~300ms que aparecía SOLO en la
      // primera transición (medido 2026-07-29): a los ~1.3s de cargar la página
      // el póster de la 2ª placa todavía venía bajando (compitiendo con el HTML y
      // el 1er mp4) y el fallback de 600ms arrancaba igual. En las transiciones
      // siguientes el prefetch tiene 10s de ventaja y nunca fallaba.
      //
      // Mientras esperamos NO se toca nada: la placa vieja sigue reproduciendo en
      // loop. Quedarse un instante de más en la placa anterior es infinitamente
      // mejor que un flash negro.
      const precargar = new Image();
      let arrancado = false;
      const arrancarUnaVez = () => {
        if (arrancado || cancel) return;
        arrancado = true;
        cover.src = poster;
        arrancar();
      };
      precargar.src = poster;
      if (precargar.complete && precargar.naturalWidth > 0) {
        arrancarUnaVez();
      } else if (typeof precargar.decode === "function") {
        precargar.decode().then(arrancarUnaVez, arrancarUnaVez);
      } else {
        precargar.addEventListener("load", arrancarUnaVez, { once: true });
        precargar.addEventListener("error", arrancarUnaVez, { once: true });
      }
      // Fallback largo (la red del TV puede ser lenta): si el póster no llegó,
      // seguir igual — la rotación no se puede quedar clavada para siempre.
      timers.push(setTimeout(arrancarUnaVez, 3000));
    } else {
      // Sin póster (personalizada sin póster): no hay con qué tapar el hueco de
      // carga del plano → se ve el negro del contenedor. Modo degradado.
      cover.style.opacity = "0";
      video.style.opacity = "1";
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
        {/* Video ABAJO (z-index 1) y con la opacidad SIEMPRE en 1: el effect no
            se la toca nunca. Quien tapa/destapa es el póster de arriba. Sin
            autoPlay: el play lo maneja el effect para arrancar la animación
            desde 0. */}
        <video
          ref={videoRef}
          muted loop playsInline preload="auto"
          style={{
            ...mediaStyle,
            zIndex: 1,
            opacity: 1,
            // SIN transición a propósito: fundir esta capa pone el TV en negro
            // durante todo el fundido (ver nota de TAPADO_MS).
            transition: "none",
          }}
        />
        {/* Póster ENCIMA del video (z-index 2). Es la única capa que se prende y
            apaga, siempre DE GOLPE (sin transición): tapa mientras el <video> de
            abajo recarga el src —momento en que el plano de hardware del TV
            perfora en negro— y se saca cuando el video ya está pintando. Al ir
            ARRIBA, ese hueco negro no lo puede tapar (a diferencia de cuando
            estaba debajo, que es lo que dejaba ~230ms de negro por cambio). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={coverRef}
          alt=""
          style={{
            ...mediaStyle,
            zIndex: 2,
            opacity: 0,
            pointerEvents: "none",
            transition: "none",
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
