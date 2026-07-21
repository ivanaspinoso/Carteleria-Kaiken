import type { DatosPantalla, Producto } from "@/lib/types";
import { COLORS, pxH, pxHA, pxHT } from "@/lib/cartelera/tokens";
import TituloConLineas from "../TituloConLineas";
import HShell from "./HShell";
import { Precio, Relleno, productosDe } from "./helpers";

// Pantalla 4 (horizontal) — Cafetería (con volumen) + Pastelería.
export default function PantallaCafeteriaPasteleria({ datos }: { datos: DatosPantalla }) {
  const { categorias, productos } = datos;

  const catCafeteria = categorias.find((c) => c.tipo === "cafeteria" && c.activa);
  const catPasteleria = categorias.find((c) => c.tipo === "pasteleria" && c.activa);

  const cafeteria = catCafeteria ? productosDe(productos, catCafeteria.id) : [];
  const pasteleria = catPasteleria ? productosDe(productos, catPasteleria.id) : [];

  const dosColumnas = (items: Producto[]) => {
    const mitad = Math.ceil(items.length / 2);
    return [items.slice(0, mitad), items.slice(mitad)];
  };

  return (
    <HShell justify="flex-start">
      {/* ===== Cafetería ===== */}
      <section style={{ display: "grid", gap: pxHA(44) }}>
        <TituloConLineas textoBold="CAFETERÍA" textoLight="" sizePx={48} bleedX={72} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: pxH(80) }}>
          {dosColumnas(cafeteria).map((col, i) => (
            <div key={i} style={{ position: "relative", display: "grid", gap: pxHA(42) }}>
              {col.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "flex-end", opacity: p.en_stock ? 1 : 0.5 }}>
                  <span style={{ fontSize: pxHT(24), fontWeight: 700, textDecoration: p.en_stock ? undefined : "line-through" }}>{p.nombre}</span>
                  <Relleno />
                  <Precio precio={p.precio} enStock={p.en_stock} fontPx={24} />
                  {p.unidad ? (
                    <span
                      style={{
                        width: pxHT(70),
                        textAlign: "right",
                        marginLeft: pxH(20),
                        paddingLeft: pxH(18),
                        fontSize: pxHT(18),
                        fontWeight: 600,
                        color: COLORS.violeta,
                        opacity: 0.85,
                      }}
                    >
                      {p.unidad}
                    </span>
                  ) : null}
                </div>
              ))}
              {/* Línea vertical continua (unificada) que separa precios de los ml */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  // Debe coincidir con el `width` de la columna de ml (pxHT(70)):
                  // si crece la letra y la línea no, se despega del texto.
                  right: pxHT(70),
                  width: 0,
                  borderLeft: `1px solid ${COLORS.violeta}`,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== Pastelería ===== */}
      <section style={{ display: "grid", gap: pxHA(44) }}>
        <TituloConLineas textoBold="PASTELERÍA" textoLight="" sizePx={48} bleedX={72} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: pxH(80) }}>
          {dosColumnas(pasteleria).map((col, i) => (
            <div key={i} style={{ display: "grid", gap: pxHA(42) }}>
              {col.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "flex-end", opacity: p.en_stock ? 1 : 0.5 }}>
                  <span style={{ fontSize: pxHT(24), fontWeight: 700, textDecoration: p.en_stock ? undefined : "line-through" }}>{p.nombre}</span>
                  <Relleno />
                  <Precio precio={p.precio} enStock={p.en_stock} fontPx={24} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </HShell>
  );
}
