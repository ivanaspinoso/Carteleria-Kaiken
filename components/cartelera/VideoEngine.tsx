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
  mediaSrc,
  tipo,
  poster,
  rotar = 0,
  vp,
  ajuste = "cover",
  duracion,
  onReady,
}: {
  src: string;
  // De dónde CARGA el medio, si es distinto de `src`. PantallaRotativa baja el
  // próximo mp4 entero a memoria y pasa acá su blob: URL, así el <video> no
  // toca la red al cambiar de placa (era hasta 1.5s con el póster congelado en
  // pantalla). `src` sigue siendo la identidad lógica de la placa: si el blob
  // llega tarde, cambia `mediaSrc` pero NO se recarga el video a mitad de placa.
  mediaSrc?: string;
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
  // Cuánto dura la placa en pantalla (segundos). Sirve para decidir si el video
  // REPITE o se queda quieto en su último cuadro al terminar: los mp4 fijos duran
  // exactamente lo mismo que la placa, así que con `loop` volvían a empezar unos
  // milisegundos antes del cambio y se veía la placa VACIARSE y re-animarse justo
  // antes de irse (visible en la grabación del cliente, kaiken30.mp4 t≈41.9).
  duracion?: number;
  // Se llama cuando la placa nueva está VIVA en pantalla: el <video> ya está
  // pintando su animación de entrada. PantallaRotativa lo usa para meter el texto
  // editable, así entra JUNTO con los gráficos. Antes se avisaba con el póster
  // (frame 0), pero el frame 0 de varias placas está casi VACÍO — el título y el
  // producto entran animados después — y se veía la placa en blanco con el precio
  // flotando 1.5s (grabación del cliente, 2026-07-29). Igual hay un fallback por
  // tiempo: si el video no arranca, el texto entra solo para no perderlo.
  onReady?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const coverRef = useRef<HTMLImageElement>(null);
  const srcRef = useRef<string | null>(null);

  // Ref siempre fresca para no re-disparar el effect de carga al cambiar onReady.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Ídem con la URL de carga: si el blob del próximo video llega tarde, se usa en
  // la PRÓXIMA transición, sin recargar el <video> a mitad de placa.
  const mediaSrcRef = useRef(mediaSrc);
  mediaSrcRef.current = mediaSrc;

  const duracionRef = useRef(duracion);
  duracionRef.current = duracion;

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
    // ¿Este pase llegó a cargarle el src al <video>? Si se cancela ANTES (React
    // monta-desmonta-remonta los efectos en dev, y Fast Refresh también), hay que
    // soltar srcRef: si no, el pase siguiente ve el mismo src, sale por el early
    // return y la placa se queda en el póster hasta el próximo cambio de reloj.
    let cargado = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const rafs: number[] = [];

    // El texto editable entra UNA sola vez por placa, y con los gráficos vivos.
    let avisado = false;
    const avisarListo = () => {
      if (avisado || cancel) return;
      avisado = true;
      onReadyRef.current?.();
    };

    // Espera a que un <img> tenga PÍXELES USABLES: bajado (load) y decodificado
    // (decode). Resuelve igual si falla — nunca deja la rotación colgada.
    const conPixeles = (img: HTMLImageElement) =>
      new Promise<void>((resolve) => {
        const decodificar = () => {
          if (typeof img.decode === "function") img.decode().then(() => resolve(), () => resolve());
          else resolve();
        };
        if (img.complete && img.naturalWidth > 0) {
          decodificar();
          return;
        }
        const fin = () => {
          img.removeEventListener("load", fin);
          img.removeEventListener("error", fin);
          decodificar();
        };
        img.addEventListener("load", fin);
        img.addEventListener("error", fin);
      });

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
      avisarListo();
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
      cargado = true;
      video.muted = true;
      video.setAttribute("muted", "");
      // Blob en memoria si PantallaRotativa alcanzó a bajarlo; si no, la URL.
      video.src = mediaSrcRef.current || src;
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

        // Al terminar: repetir SOLO si todavía queda un rato de placa. Los mp4
        // fijos duran lo mismo que la placa, así que acá el video se queda quieto
        // en su último cuadro (la placa completa) hasta el corte, en vez de
        // vaciarse y re-animarse los últimos milisegundos. Un video más corto que
        // la placa (personalizadas) sí vuelve a empezar.
        const revelado = Date.now();
        const alTerminar = () => {
          if (cancel) return;
          const dur = duracionRef.current;
          const restante = dur ? dur * 1000 - (Date.now() - revelado) : 0;
          if (restante > 1200) {
            try {
              video.currentTime = 0;
            } catch {
              /* noop */
            }
            const p2 = video.play();
            if (p2 && typeof p2.catch === "function") p2.catch(() => {});
          }
        };
        video.addEventListener("ended", alTerminar);

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
          // Los gráficos de la placa están VIVOS (animación de entrada corriendo):
          // recién ahora entra el texto editable, para que no quede flotando sobre
          // una placa a medio dibujar.
          avisarListo();
        };
        // Señal preferida: requestVideoFrameCallback dispara en el frame EXACTO
        // en que el video presenta imagen (Chromium 83+, o sea Tizen 7/8 de P1/P5).
        // 'timeupdate' sirve de respaldo pero llega cada ~250ms: destapar con eso
        // se comía un pedazo de la animación de entrada y se notaba como salto.
        const conFrame = (
          video as HTMLVideoElement & {
            requestVideoFrameCallback?: (cb: () => void) => number;
          }
        ).requestVideoFrameCallback;
        if (typeof conFrame === "function") conFrame.call(video, destapar);
        video.addEventListener("timeupdate", destapar);
        // Fallback largo a propósito: si no llega ninguna señal, el video está
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
      // Red de seguridad del texto: si el <video> no llega a pintar (mp4 trabado),
      // el texto entra igual a los 900ms para que la placa no quede sin precio.
      // El camino normal es que lo dispare `destapar`, con los gráficos ya vivos.
      timers.push(setTimeout(avisarListo, 900));
      // DOS frames de compositor con el póster ya visible ANTES de tocar el
      // <video>. Sin esto, subir la opacidad y recargar el src caen en el mismo
      // frame: el plano de hardware se perfora en negro antes de que el póster
      // llegue a pintarse y se ve el negro con el texto viejo flotando encima
      // (medido en el TV el 2026-07-29 con revisionkaiken.mp4, frames t=2.40 y
      // t=2.60). El setTimeout solo NO alcanza: cuenta tiempo, no frames.
      const dosFrames = () => {
        if (cancel) return;
        rafs.push(
          requestAnimationFrame(() => {
            if (cancel) return;
            rafs.push(
              requestAnimationFrame(() => {
                timers.push(setTimeout(cargar, primeraVez ? 0 : TAPADO_MS));
              })
            );
          })
        );
      };
      dosFrames();
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
      //
      // Son DOS esperas, y hacen falta las dos:
      //  1. una Image() aparte → garantiza que el JPG está BAJADO y decodificado
      //     (mata la espera de red, que era el negro de la 1ª transición);
      //  2. el <img> del DOM con ese mismo src → garantiza que ESE elemento ya
      //     tiene los píxeles. Saltarse esta segunda fue la regresión medida en
      //     revisionkaiken.mp4: el bitmap estaba en cache pero el cover todavía
      //     no lo había pintado cuando se recargaba el <video> → negro en TODAS
      //     las transiciones, no solo en la primera.
      let arrancado = false;
      const arrancarUnaVez = () => {
        if (arrancado || cancel) return;
        arrancado = true;
        arrancar();
      };
      const precargar = new Image();
      precargar.src = poster;
      conPixeles(precargar).then(() => {
        if (cancel || arrancado) return;
        cover.src = poster; // ya en cache: el <img> del DOM lo toma sin red
        return conPixeles(cover).then(arrancarUnaVez);
      });
      // Fallback largo (la red del TV puede ser lenta): si el póster no llegó,
      // seguir igual — la rotación no se puede quedar clavada para siempre.
      timers.push(
        setTimeout(() => {
          if (arrancado || cancel) return;
          cover.src = poster; // último intento: mejor un cover a medio pintar que nada
          arrancarUnaVez();
        }, 3000)
      );
    } else {
      // Sin póster (personalizada sin póster): no hay con qué tapar el hueco de
      // carga del plano → se ve el negro del contenedor. Modo degradado.
      cover.style.opacity = "0";
      video.style.opacity = "1";
      cargar();
    }

    return () => {
      cancel = true;
      if (!cargado) srcRef.current = null;
      timers.forEach(clearTimeout);
      rafs.forEach(cancelAnimationFrame);
    };
  }, [src, tipo, poster]);

  // Diagnóstico EN PANTALLA (abrir con ?diag=1): estado real del <video> más un
  // REGISTRO de los últimos eventos con su hora. Filmar la TV con ?diag=1 y leer
  // este registro es la única forma de saber qué pasa allá: el destello negro no
  // se reproduce en Chromium de escritorio.
  const [diag, setDiag] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("diag") !== "1") return;
    const v = videoRef.current;
    const cover = coverRef.current;
    if (!v || !cover) return;

    const registro: string[] = [];
    const hora = () => new Date().toTimeString().slice(3, 8) + "." + String(Date.now() % 1000).padStart(3, "0");
    const anotar = (que: string) => {
      registro.push(`${hora()} ${que} t=${v.currentTime.toFixed(1)}`);
      if (registro.length > 7) registro.shift();
    };
    const eventos = ["loadstart", "playing", "ended", "waiting", "stalled", "error"];
    const manejadores = eventos.map((e) => {
      const h = () => anotar(e);
      v.addEventListener(e, h);
      return h;
    });
    const mo = new MutationObserver(() => anotar("poster=" + (cover.style.opacity === "1" ? "TAPA" : "off")));
    mo.observe(cover, { attributes: true, attributeFilter: ["style"] });

    const id = setInterval(() => {
      const e = v.error;
      setDiag(
        `src=${(v.currentSrc || "").split("/").pop() || "—"}\n` +
          `ready=${v.readyState} net=${v.networkState} pause=${v.paused}\n` +
          `vid=${v.videoWidth}x${v.videoHeight} t=${v.currentTime.toFixed(1)}\n` +
          `err=${e ? `${e.code} ${e.message || ""}` : "none"}\n` +
          registro.join("\n")
      );
    }, 250);
    return () => {
      clearInterval(id);
      mo.disconnect();
      eventos.forEach((e, i) => v.removeEventListener(e, manejadores[i]));
    };
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
        {/* Sin `loop`: el repetido lo decide `alTerminar` según cuánto quede de
            placa (ver nota de `duracion`). */}
        <video
          ref={videoRef}
          muted playsInline preload="auto"
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
            // Capa de composición PROPIA. En la grabación del TV, durante el negro
            // se ve el texto (capa HTML de arriba) pero NO el póster, que vive en
            // el mismo contenedor que el <video>: el plano de hardware parece
            // tragarse todo lo que comparte capa con él. Sacando el póster a su
            // propia capa deja de estar en esa bolsa.
            transform: "translateZ(0)",
            willChange: "transform",
            backfaceVisibility: "hidden",
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
