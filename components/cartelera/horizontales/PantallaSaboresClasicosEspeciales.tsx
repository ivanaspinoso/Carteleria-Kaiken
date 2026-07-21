import type { DatosPantalla } from "@/lib/types";
import { COLORS, pxH, pxHT } from "@/lib/cartelera/tokens";
import TituloConLineas from "../TituloConLineas";
import HShell from "./HShell";
import { IconoImg, productosDe } from "./helpers";

// Pantalla 2 (horizontal) — Sabores Clásicos (5 columnas) + Especiales (3×3).
export default function PantallaSaboresClasicosEspeciales({ datos }: { datos: DatosPantalla }) {
  const { categorias, productos } = datos;

  const clasicas = categorias
    .filter((c) => c.tipo === "helado-clasico" && c.activa)
    .sort((a, b) => a.orden - b.orden);

  const catEspeciales = categorias.find((c) => c.tipo === "helado-especial" && c.activa);
  const especiales = catEspeciales ? productosDe(productos, catEspeciales.id) : [];

  return (
    <HShell>
      {/* ===== Sección superior: Sabores Clásicos ===== */}
      <section style={{ display: "grid", gap: pxH(28) }}>
        <TituloConLineas textoLight="SABORES" textoBold="CLÁSICOS" sizePx={48} bleedX={72} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: pxH(28) }}>
          {clasicas.map((cat) => (
            // alignContent start: las columnas se estiran al alto de la más larga
            // (Cremas). Sin esto, el sobrante se reparte entre las filas y las
            // columnas cortas quedan con los sabores separados, como si faltara uno.
            <div key={cat.id} style={{ display: "grid", gap: pxH(12), textAlign: "left", alignContent: "start" }}>
              {/* minHeight de 2 renglones (30px × 1.2 × 2 = 72): "DULCE DE
                  LECHE" no entra en una línea a este ancho y empujaba su lista
                  más abajo que la de las otras 4 columnas. Reservando el alto
                  de 2 renglones para todos, los sabores arrancan parejos.
                  Se hace con minHeight y no con subgrid: Chromium 76 (el TV
                  Samsung) no lo soporta. */}
              <div
                style={{
                  fontSize: pxHT(30),
                  fontWeight: 700,
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                  minHeight: pxHT(72),
                }}
              >
                {cat.nombre}
              </div>
              <div style={{ display: "grid", gap: pxH(6), alignContent: "start" }}>
                {productosDe(productos, cat.id).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      fontSize: pxHT(21),
                      fontWeight: 400,
                      opacity: p.en_stock ? 1 : 0.5,
                      // Sin stock: tachado para que se note de un vistazo
                      textDecoration: p.en_stock ? undefined : "line-through",
                    }}
                  >
                    {p.nombre}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Sección inferior: Sabores Especiales ===== */}
      <section style={{ display: "grid", gap: pxH(28) }}>
        <TituloConLineas textoLight="SABORES" textoBold="ESPECIALES" sizePx={48} bleedX={72} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: `${pxH(18)} ${pxH(48)}` }}>
          {especiales.map((p) => (
            <div key={p.id} style={{ display: "grid", gridAutoFlow: "column", justifyContent: "start", alignItems: "center", gap: pxH(20), opacity: p.en_stock ? 1 : 0.5 }}>
              {/* TODO: los potecitos reales tienen fondo negro — recortar transparencia */}
              {p.imagen_url ? <IconoImg src={p.imagen_url} sizePx={96} /> : null}
              <div style={{ display: "grid", gap: pxH(4), textAlign: "left" }}>
                <div style={{ fontSize: pxHT(24), fontWeight: 700, textDecoration: p.en_stock ? undefined : "line-through" }}>{p.nombre}</div>
                {p.descripcion ? (
                  <div style={{ fontSize: pxHT(17), fontWeight: 400, color: COLORS.violeta, opacity: 0.7, lineHeight: 1.25 }}>
                    {p.descripcion}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </HShell>
  );
}
