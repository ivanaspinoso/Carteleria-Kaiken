"use client";

import type { DatosPantalla } from "@/lib/types";
import { formatPrecio } from "@/lib/format";

interface Props {
  datos: DatosPantalla;
}

/*
 * OPCIONES DE CANVAS — ver comentario en PantallaSabores.tsx
 * Actualmente: OPCIÓN A (PNG + posiciones %)
 */

export default function PantallaCafeteria({ datos }: Props) {
  const { pantalla, productos, categorias } = datos;

  const cats = categorias.filter((c) => c.tipo === "cafeteria" && c.activa);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>

      {/* TODO: reemplazar con canvas de diseño */}
      <div style={{
        position: "absolute", inset: 0,
        // TODO: backgroundImage: "url('/canvas/cafeteria.png')"
        backgroundColor: "#1c0a00", // placeholder marrón oscuro (café)
        backgroundSize: "cover",
      }} />

      {/* Watermark placeholder */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        color: "rgba(255,255,255,0.04)", fontSize: "7vw",
        fontWeight: "900", textAlign: "center", pointerEvents: "none",
      }}>
        CANVAS<br />PLACEHOLDER
      </div>

      {/* ===== CAPA DE DATOS ===== */}
      {cats.map((cat, catIdx) => {
        const posicion = pantalla.config.posiciones?.[cat.id] ?? {
          top: `${8 + catIdx * 20}%`,
          left: "5%",
        };
        const prods = productos.filter((p) => p.categoria_id === cat.id);

        return (
          <div key={cat.id} style={{ position: "absolute", top: posicion.top, left: posicion.left }}>
            <p style={{ color: "#d4a574", fontSize: "1.3vw", fontWeight: "700", marginBottom: "0.4em" }}>
              {/* TODO: color y fuente del diseño */}
              {cat.nombre}
            </p>
            {prods.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: "2em", alignItems: "baseline" }}>
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "1vw" }}>
                  {p.nombre}
                  {p.descripcion && (
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75vw", marginLeft: "0.5em" }}>
                      {p.descripcion}
                    </span>
                  )}
                </span>
                <span style={{ color: p.en_stock ? "#fbbf24" : "#ef4444", fontSize: "1vw", fontWeight: "700" }}>
                  {formatPrecio(p.precio, { sinStock: !p.en_stock, unidad: p.unidad })}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
