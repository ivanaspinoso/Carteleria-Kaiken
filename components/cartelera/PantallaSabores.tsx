"use client";

import type { DatosPantalla } from "@/lib/types";
import { formatPrecio } from "@/lib/format";

interface Props {
  datos: DatosPantalla;
  modo: "grande" | "fijo"; // 50" vs 43"
}

/*
 * OPCIONES DE CANVAS (elegir una, comentar la otra):
 *
 * OPCIÓN A — PNG con datos posicionados por coordenadas %:
 *   - Activa actualmente.
 *   - El fondo es un <img> o div con background-image.
 *   - Los datos se superponen con position:absolute usando top/left en % desde pantalla.config.posiciones.
 *   - Para cambiar al canvas real: reemplazar el div de fondo (marcado TODO) con <img src="..."> y
 *     ajustar pantalla.config.posiciones en la DB para que cuadren con el diseño.
 *
 * OPCIÓN B — SVG con nodos reemplazados:
 *   - Para activar: importar el SVG como React component, buscar elementos por ID desde pantalla.config.svgNodos,
 *     y reemplazar su textContent con los datos.
 *   - Ejemplo: <text id="precio-vainilla">{formatPrecio(producto.precio)}</text>
 */

export default function PantallaSabores({ datos, modo }: Props) {
  const { pantalla, productos, categorias } = datos;

  const helados = categorias.filter((c) => c.tipo === "helado" && c.activa);
  const productosPorCategoria = (catId: string) =>
    productos.filter((p) => p.categoria_id === catId && p.destacado !== false);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>

      {/* TODO: reemplazar con canvas de diseño — OPCIÓN A activa */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          // TODO: reemplazar con la imagen del canvas real: backgroundImage: "url('/canvas/sabores.png')"
          backgroundColor: "#0f172a", // placeholder azul oscuro
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Watermark de placeholder — eliminar cuando llegue el canvas real */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "rgba(255,255,255,0.05)",
          fontSize: modo === "grande" ? "8vw" : "6vw",
          fontWeight: "900",
          textAlign: "center",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        CANVAS
        <br />
        PLACEHOLDER
      </div>

      {/* ===== CAPA DE DATOS ===== */}
      {/* Posicionada según pantalla.config.posiciones (OPCIÓN A) */}
      {helados.map((cat, catIdx) => {
        const posicion = pantalla.config.posiciones?.[cat.id] ?? {
          top: `${10 + catIdx * 18}%`,
          left: "5%",
        };
        const prods = productosPorCategoria(cat.id);

        return (
          <div
            key={cat.id}
            style={{
              position: "absolute",
              top: posicion.top,
              left: posicion.left,
              // Los estilos de texto los define el canvas; acá solo datos
            }}
          >
            <p style={{
              color: "white",
              fontSize: modo === "grande" ? "1.4vw" : "1.1vw",
              fontWeight: "600",
              marginBottom: "0.3em",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              // TODO: fuente, tamaño y color los define el canvas de diseño
            }}>
              {cat.nombre}
            </p>
            {prods.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: "2em" }}>
                <span style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: modo === "grande" ? "1.1vw" : "0.9vw",
                  textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                }}>
                  {p.nombre}
                </span>
                <span style={{
                  color: p.en_stock ? "white" : "#ef4444",
                  fontSize: modo === "grande" ? "1.1vw" : "0.9vw",
                  fontWeight: "700",
                  textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                }}>
                  {formatPrecio(p.precio, { sinStock: !p.en_stock })}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
