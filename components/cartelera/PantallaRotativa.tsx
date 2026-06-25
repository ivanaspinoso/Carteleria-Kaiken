"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DatosPantalla, PlacaFija, PlacaPersonalizada as TPlacaPersonalizada } from "@/lib/types";
import { parsePlacaConfig, parseGustos } from "@/lib/types";
import { formatPrecio, formatFecha } from "@/lib/format";
import { calcularIndiceRotacion, dentroDeFechas } from "@/lib/cartelera/rotacion";
import { esVideoUrl } from "@/lib/cartelera/validarImagen";
import { COMPONENTES_PLACA, type PlacaProps } from "./placas";
import { ModoOverlay } from "./placas/PlacaVideo";
import VideoEngine, { type MediaTipo } from "./VideoEngine";

interface Props {
  datos: DatosPantalla;
  // Contenedor full-screen (fuera del rotador) donde se portalea el <video>.
  videoLayer?: HTMLElement | null;
}

type Item =
  | { key: string; orden: number; duracion: number; kind: "fija"; data: PlacaFija }
  | { key: string; orden: number; duracion: number; kind: "pers"; data: TPlacaPersonalizada };

/*
 * Rotación de las placas verticales (pantallas 1 y 5) — arquitectura de signage:
 *
 *  - UN SOLO <video> persistente (VideoEngine): nunca se desmonta ni cambia de
 *    key; solo cambia su src. Antes se montaban las ~11 placas a la vez y los
 *    decoders por hardware de las Smart TV (1-2 streams) se saturaban → negro.
 *  - Los OVERLAYS (texto editable) van en una capa HTML separada, encima del
 *    video, manejada por estado → desacoplados del ciclo del <video>.
 *  - El índice se calcula por reloj + desfase (P1=0s, P5=30s) para que las dos
 *    pantallas nunca coincidan.
 */
export default function PantallaRotativa({ datos, videoLayer }: Props) {
  const desfase = datos.pantalla.config.desfase_segundos ?? 0;

  const items = useMemo<Item[]>(() => {
    const nowMs = Date.now();
    const fijas: Item[] = (datos.placas_fijas ?? [])
      .filter((pf) => pf.activa && dentroDeFechas(pf.inicio, pf.fin, nowMs))
      .map((pf) => ({ key: `f-${pf.id}`, orden: pf.orden, duracion: pf.duracion, kind: "fija", data: pf }));
    const pers: Item[] = (datos.placas_personalizadas ?? [])
      .filter((pp) => pp.activa && dentroDeFechas(pp.inicio, pp.fin, nowMs))
      .map((pp) => ({ key: `p-${pp.id}`, orden: pp.orden, duracion: pp.duracion, kind: "pers", data: pp }));
    return [...fijas, ...pers].sort((a, b) => a.orden - b.orden || a.key.localeCompare(b.key));
  }, [datos.placas_fijas, datos.placas_personalizadas]);

  const [indice, setIndice] = useState(() =>
    calcularIndiceRotacion(items.map((i) => i.duracion), Date.now() / 1000, desfase)
  );

  // El índice MOSTRADO (overlay de texto + placa visible) va un paso atrás del
  // índice por reloj: solo avanza cuando el VideoEngine avisa (onReady) que el
  // video nuevo ya está revelado. Así el texto editable nunca aparece sobre
  // negro mientras la placa siguiente todavía carga — entran sincronizados.
  const [indiceMostrado, setIndiceMostrado] = useState(indice);

  useEffect(() => {
    const duraciones = items.map((i) => i.duracion);
    const tick = () => {
      const i = calcularIndiceRotacion(duraciones, Date.now() / 1000, desfase);
      setIndice((prev) => (prev === i ? prev : i));
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [items, desfase]);

  // Escala real del lienzo (--escala = anchoLienzo / 1080) para que los overlays
  // sigan al video también cuando el contenido está rotado 90° (vw no sirve ahí).
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const set = () => el.style.setProperty("--escala", String(el.clientWidth / 1080));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Contenido editable de las 3 placas (promo activa de cada tipo).
  const promoActiva = (tipo: string) => datos.promos.find((p) => p.tipo === tipo && p.activa) ?? null;
  const gusto = promoActiva("sabor_dia");
  const novedad = promoActiva("novedad_mes");
  const especial = promoActiva("promo_especial");

  const propsPorSlug: Record<string, PlacaProps> = {
    "gusto-del-dia": { sabor: gusto?.producto?.nombre ?? gusto?.contenido ?? undefined },
    "novedad-del-mes": { novedad: novedad?.producto?.nombre ?? novedad?.contenido ?? undefined },
    "promo-especial": {
      texto: especial?.contenido ?? undefined,
      validez: especial?.fin ? formatFecha(especial.fin) : undefined,
    },
  };

  // Construye el overlay (texto editable) de un item; solo las placas fijas lo
  // tienen. Se usa con el item MOSTRADO, no con el objetivo, para que el texto
  // siga al video revelado.
  const buildOverlay = (item: Item): ReactNode => {
    if (item.kind !== "fija") return null;
    const Placa = COMPONENTES_PLACA[item.data.componente];
    if (!Placa) return null;
    const cfg = parsePlacaConfig(item.data.config);
    const precioProp = cfg.precio != null ? { precio: formatPrecio(cfg.precio) } : {};
    const precioAltProp = cfg.precio_alt != null ? { precioAlt: formatPrecio(cfg.precio_alt) } : {};
    // Kilo Kaikén: precio y gustos salen del PRODUCTO (editable en /postres).
    const kilo =
      item.data.slug === "kilo-kaiken"
        ? (() => {
            const prod = datos.productos.find((p) => p.nombre === "Kilo Kaikén");
            return {
              precio: formatPrecio(prod?.precio ?? null) || "$0000",
              gustos: parseGustos(prod?.gustos_incluidos).join(" - "),
            };
          })()
        : {};
    return (
      <Placa {...(propsPorSlug[item.data.slug] ?? {})} {...precioProp} {...precioAltProp} {...kilo} activo />
    );
  };

  if (items.length === 0) {
    return <div style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />;
  }

  // Índices acotados (por si el set de placas cambió en un refetch). El OBJETIVO
  // (reloj) define qué medio carga el VideoEngine; el MOSTRADO define el texto.
  const idxObjetivo = ((indice % items.length) + items.length) % items.length;
  const idxMostrado = ((indiceMostrado % items.length) + items.length) % items.length;
  const objetivo = items[idxObjetivo];
  const mostrado = items[idxMostrado];

  // Medio (src + tipo) que recibe el VideoEngine persistente. Los videos fijos
  // se guardan ACOSTADOS 1920×1080 con la rotación HORNEADA (transpose=1), así
  // el plano de video del TV los muestra ya girados, sin transform CSS.
  let src = "";
  let tipo: MediaTipo = "video";
  if (objetivo.kind === "fija") {
    src = `/placas/${objetivo.data.slug}.mp4`;
    tipo = "video";
  } else {
    src = objetivo.data.imagen_url;
    tipo = esVideoUrl(src) ? "video" : "imagen";
  }

  // Overlay del item MOSTRADO (no del objetivo): aparece recién cuando el video
  // nuevo está revelado (ver onReady), nunca sobre negro.
  const overlay = buildOverlay(mostrado);

  // El <video> persistente se renderiza en la capa full-screen de atrás (portal),
  // así llena la pantalla 16:9 sin recortarse contra el marco 9:16. Si no hay
  // capa (SSR / horizontal), se renderiza inline como fallback. Cuando el medio
  // objetivo se revela, avanzamos el índice mostrado → el texto entra en sync.
  const motor = (
    <VideoEngine src={src} tipo={tipo} onReady={() => setIndiceMostrado(indice)} />
  );

  return (
    <div ref={rootRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {videoLayer ? createPortal(motor, videoLayer) : motor}
      {/* Capa de overlay (texto editable). Hace fade-in en sincronía con el
          crossfade del video, así texto y placa entran juntos. */}
      {overlay && (
        <ModoOverlay.Provider value={true}>
          <OverlayFade key={mostrado.key}>{overlay}</OverlayFade>
        </ModoOverlay.Provider>
      )}
    </div>
  );
}

/**
 * Envuelve el overlay de texto y lo hace aparecer con un fade-in al montar.
 * Se remonta en cada cambio de placa (key) → cada texto entra suave, en
 * sincronía con el crossfade del video (misma duración).
 */
function OverlayFade({ children }: { children: ReactNode }) {
  const [op, setOp] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOp(1))
    );
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op, transition: "opacity 900ms ease-in-out" }}>
      {children}
    </div>
  );
}
