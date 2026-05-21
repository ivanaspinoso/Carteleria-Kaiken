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

export default function PantallaPostres({ datos }: Props) {
  const { pantalla, productos, categorias, promos } = datos;

  const cats = categorias.filter(
    (c) => (c.tipo === "postre" || c.tipo === "combo") && c.activa
  );
  const promoActiva = promos.find((p) => p.activa && p.tipo !== "sabor_semana");

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>

      {/* TODO: reemplazar con canvas de diseño */}
      <div style={{
        position: "absolute", inset: 0,
        // TODO: backgroundImage: "url('/canvas/postres.png')"
        backgroundColor: "#1a0a1a", // placeholder violeta oscuro
        backgroundSize: "cover",
      }} />

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
          top: `${8 + catIdx * 22}%`,
          left: "5%",
        };
        const prods = productos.filter((p) => p.categoria_id === cat.id);

        return (
          <div key={cat.id} style={{ position: "absolute", top: posicion.top, left: posicion.left }}>
            <p style={{ color: "#e879f9", fontSize: "1.3vw", fontWeight: "700", marginBottom: "0.4em" }}>
              {cat.nombre}
            </p>
            {prods.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: "2em" }}>
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "1vw" }}>{p.nombre}</span>
                <span style={{ color: p.en_stock ? "white" : "#ef4444", fontSize: "1vw", fontWeight: "700" }}>
                  {formatPrecio(p.precio, { sinStock: !p.en_stock })}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      {/* Promo activa (si hay) */}
      {promoActiva && (
        <div style={{
          position: "absolute",
          bottom: "8%", left: "5%", right: "5%",
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: "0.5vw",
          padding: "1vw 2vw",
          // TODO: posición y estilo del canvas real
        }}>
          <p style={{ color: "#fbbf24", fontSize: "1.2vw", fontWeight: "700" }}>
            {promoActiva.titulo}
          </p>
          {promoActiva.contenido && (
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9vw" }}>
              {promoActiva.contenido}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
