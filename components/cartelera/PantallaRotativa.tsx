"use client";

import { useEffect, useMemo, useState } from "react";
import type { DatosPantalla, PlacaFija, PlacaPersonalizada as TPlacaPersonalizada } from "@/lib/types";
import { parsePlacaConfig, parseGustos } from "@/lib/types";
import { formatPrecio, formatFecha } from "@/lib/format";
import { calcularIndiceRotacion, dentroDeFechas } from "@/lib/cartelera/rotacion";
import { COMPONENTES_PLACA, type PlacaProps } from "./placas";
import PlacaPersonalizada from "./placas/PlacaPersonalizada";

interface Props {
  datos: DatosPantalla;
}

type Item =
  | { key: string; orden: number; duracion: number; kind: "fija"; data: PlacaFija }
  | { key: string; orden: number; duracion: number; kind: "pers"; data: TPlacaPersonalizada };

/*
 * Rotación de las placas verticales (pantallas 1 y 5).
 * Mezcla placas_fijas + placas_personalizadas respetando `orden` global,
 * filtra por activa + ventana de fechas, y calcula la placa actual por
 * reloj + desfase (P1=0s, P5=30s) para que nunca coincidan.
 * Crossfade con opacity (400ms).
 */
export default function PantallaRotativa({ datos }: Props) {
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

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {items.map((item, idx) => {
        let contenido = null;
        if (item.kind === "fija") {
          const Placa = COMPONENTES_PLACA[item.data.componente];
          if (Placa) {
            // Precio(s) editable(s) guardado(s) en config (overlay sobre el video)
            const cfg = parsePlacaConfig(item.data.config);
            const precioProp = cfg.precio != null ? { precio: formatPrecio(cfg.precio) } : {};
            const precioAltProp = cfg.precio_alt != null ? { precioAlt: formatPrecio(cfg.precio_alt) } : {};
            // Kilo Kaikén: precio y gustos salen del PRODUCTO (no del config),
            // así el dueño los edita en /postres (Kilos Especiales) y la lista
            // de gustos en el multi-select.
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
            contenido = <Placa {...(propsPorSlug[item.data.slug] ?? {})} {...precioProp} {...precioAltProp} {...kilo} activo={idx === indice} />;
          }
        } else {
          contenido = <PlacaPersonalizada imagenUrl={item.data.imagen_url} nombre={item.data.nombre} activo={idx === indice} />;
        }
        if (!contenido) return null;
        return (
          <div
            key={item.key}
            style={{
              position: "absolute",
              inset: 0,
              opacity: idx === indice ? 1 : 0,
              // Fusión entre placas (crossfade), no un corte seco.
              transition: "opacity 900ms ease-in-out",
            }}
          >
            {contenido}
          </div>
        );
      })}
    </div>
  );
}
