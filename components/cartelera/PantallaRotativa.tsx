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

  if (items.length === 0) {
    return <div style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />;
  }

  // Item activo (índice acotado por si el set de placas cambió en un refetch).
  const idx = ((indice % items.length) + items.length) % items.length;
  const activo = items[idx];

  // Medio (src + tipo) que recibe el VideoEngine persistente. Los videos fijos
  // se guardan ACOSTADOS 1920×1080 con la rotación HORNEADA (transpose=1), así
  // el plano de video del TV los muestra ya girados, sin transform CSS.
  let src = "";
  let tipo: MediaTipo = "video";
  if (activo.kind === "fija") {
    src = `/placas/${activo.data.slug}.mp4`;
    tipo = "video";
  } else {
    src = activo.data.imagen_url;
    tipo = esVideoUrl(src) ? "video" : "imagen";
  }

  // Overlay del activo (solo las placas fijas tienen texto editable encima).
  let overlay: ReactNode = null;
  if (activo.kind === "fija") {
    const Placa = COMPONENTES_PLACA[activo.data.componente];
    if (Placa) {
      const cfg = parsePlacaConfig(activo.data.config);
      const precioProp = cfg.precio != null ? { precio: formatPrecio(cfg.precio) } : {};
      const precioAltProp = cfg.precio_alt != null ? { precioAlt: formatPrecio(cfg.precio_alt) } : {};
      // Kilo Kaikén: precio y gustos salen del PRODUCTO (editable en /postres).
      const kilo =
        activo.data.slug === "kilo-kaiken"
          ? (() => {
              const prod = datos.productos.find((p) => p.nombre === "Kilo Kaikén");
              return {
                precio: formatPrecio(prod?.precio ?? null) || "$0000",
                gustos: parseGustos(prod?.gustos_incluidos).join(" - "),
              };
            })()
          : {};
      overlay = (
        <Placa {...(propsPorSlug[activo.data.slug] ?? {})} {...precioProp} {...precioAltProp} {...kilo} activo />
      );
    }
  }

  // El <video> persistente se renderiza en la capa full-screen de atrás (portal),
  // así llena la pantalla 16:9 sin recortarse contra el marco 9:16. Si no hay
  // capa (SSR / horizontal), se renderiza inline como fallback.
  const motor = <VideoEngine src={src} tipo={tipo} />;

  return (
    <div ref={rootRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {videoLayer ? createPortal(motor, videoLayer) : motor}
      {/* Capa de overlay (texto editable) desacoplada del ciclo del video. */}
      {overlay && (
        <ModoOverlay.Provider value={true}>
          <div key={activo.key} style={{ position: "absolute", inset: 0 }}>
            {overlay}
          </div>
        </ModoOverlay.Provider>
      )}
    </div>
  );
}
