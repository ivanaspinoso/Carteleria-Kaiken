"use client";

import { useState, useEffect } from "react";
import type { DatosPantalla } from "@/lib/types";
import { formatPrecio } from "@/lib/format";

interface Props {
  datos: DatosPantalla;
}

/*
 * Template rotativo para pantallas de 50".
 * Cicla entre categorías según pantalla.config.rotacion.intervalMs (default: 8000ms).
 *
 * OPCIONES DE CANVAS — ver comentario en PantallaSabores.tsx
 * Actualmente: OPCIÓN A (PNG + posiciones %)
 */

export default function PantallaRotativa({ datos }: Props) {
  const { pantalla, productos, categorias, promos } = datos;

  const intervalMs = pantalla.config.rotacion?.intervalMs ?? 8_000;
  const catsFiltradas = categorias.filter((c) => c.tipo === "helado" && c.activa);

  const [indiceActual, setIndiceActual] = useState(0);

  useEffect(() => {
    if (catsFiltradas.length <= 1) return;
    const timer = setInterval(() => {
      setIndiceActual((i) => (i + 1) % catsFiltradas.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [catsFiltradas.length, intervalMs]);

  const catActual = catsFiltradas[indiceActual];
  const prods = catActual
    ? productos.filter((p) => p.categoria_id === catActual.id)
    : [];

  const promoSabor = promos.find((p) => p.tipo === "sabor_semana" && p.activa);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>

      {/* TODO: reemplazar con canvas de diseño */}
      <div style={{
        position: "absolute", inset: 0,
        // TODO: backgroundImage: "url('/canvas/rotativa.png')"
        backgroundColor: "#0d1b2a", // placeholder azul marino
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

      {/* ===== CAPA DE DATOS — categoría actual ===== */}
      {catActual && (
        /* Animación con transform+opacity — nunca width/height/top/left para Smart TVs */
        <div
          key={catActual.id}
          style={{
            position: "absolute",
            top: "10%", left: "5%",
            animation: "fadeIn 0.5s ease-in-out",
            // TODO: posición según config del canvas real
          }}
        >
          <p style={{ color: "white", fontSize: "2.5vw", fontWeight: "800", marginBottom: "1vw" }}>
            {catActual.nombre}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5vw" }}>
            {prods.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: "3vw", alignItems: "baseline" }}>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.4vw", minWidth: "20vw" }}>
                  {p.nombre}
                </span>
                <span style={{ color: p.en_stock ? "#fbbf24" : "#ef4444", fontSize: "1.6vw", fontWeight: "700" }}>
                  {formatPrecio(p.precio, { sinStock: !p.en_stock })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sabor de la semana */}
      {promoSabor && (
        <div style={{
          position: "absolute", bottom: "5%", right: "5%",
          backgroundColor: "rgba(251, 191, 36, 0.15)",
          border: "1px solid rgba(251, 191, 36, 0.4)",
          borderRadius: "1vw",
          padding: "1.5vw 2vw",
          maxWidth: "35%",
          // TODO: posición y estilo del canvas real
        }}>
          <p style={{ color: "#fbbf24", fontSize: "1.1vw", fontWeight: "700" }}>
            ★ {promoSabor.titulo}
          </p>
          {promoSabor.producto && (
            <p style={{ color: "white", fontSize: "1.4vw", fontWeight: "800", marginTop: "0.3vw" }}>
              {promoSabor.producto.nombre}
            </p>
          )}
          {promoSabor.contenido && (
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9vw", marginTop: "0.3vw" }}>
              {promoSabor.contenido}
            </p>
          )}
        </div>
      )}

      {/* Indicadores de categoría (dots) */}
      <div style={{
        position: "absolute", bottom: "2%", left: "50%",
        transform: "translateX(-50%)",
        display: "flex", gap: "0.8vw",
      }}>
        {catsFiltradas.map((cat, i) => (
          <div
            key={cat.id}
            style={{
              width: "0.6vw", height: "0.6vw",
              borderRadius: "50%",
              backgroundColor: i === indiceActual ? "white" : "rgba(255,255,255,0.3)",
              transition: "background-color 0.3s",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(1vw); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
