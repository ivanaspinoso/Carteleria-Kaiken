import { Fragment } from "react";
import type { DatosPantalla, Producto } from "@/lib/types";
import { COLORS, pxH } from "@/lib/cartelera/tokens";
import TituloConLineas from "../TituloConLineas";
import HShell from "./HShell";
import { DivisorH, IconoImg, Precio, Relleno, productosDe } from "./helpers";

// Pantalla 3 (horizontal) — Tamaños (Vasos + Kilos) + Postres Helados.
export default function PantallaTamanosPostres({ datos }: { datos: DatosPantalla }) {
  const { categorias, productos } = datos;

  const tamano = categorias.filter((c) => c.tipo === "tamano" && c.activa);
  const catVasos = tamano.find((c) => c.nombre === "Vasos");
  const catKilos = tamano.find((c) => c.nombre === "Kilos");
  const catKilosEsp = tamano.find((c) => c.nombre === "Kilos Especiales");
  const catPostres = categorias.find((c) => c.tipo === "postre" && c.activa);

  const vasos = catVasos ? productosDe(productos, catVasos.id) : [];
  const kilos = catKilos ? productosDe(productos, catKilos.id) : [];
  const kilosEsp = catKilosEsp ? productosDe(productos, catKilosEsp.id) : [];
  const postres = catPostres ? productosDe(productos, catPostres.id) : [];

  // Postres en 2 columnas por orden: izquierda = un solo precio, derecha =
  // Chico/Grande. El criterio es la columna (no `precio_alt`, que arranca null
  // hasta que el dueño carga los precios) — así la derecha siempre muestra los
  // dos slots de precio aunque todavía estén en $0000.
  const mitad = Math.ceil(postres.length / 2);
  const postresCols = [postres.slice(0, mitad), postres.slice(mitad)];

  return (
    <HShell>
      {/* ===== Tamaños ===== */}
      <section style={{ display: "grid", gap: pxH(30) }}>
        <TituloConLineas textoBold="TAMAÑOS" textoLight="" sizePx={48} bleedX={72} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: pxH(44) }}>
          {/* Columna izquierda: Vasos */}
          <div style={{ display: "grid", gap: pxH(16) }}>
            <div style={{ fontSize: pxH(23), fontWeight: 400 }}>Vasos</div>
            {vasos.map((p, i) => (
              <Fragment key={p.id}>
                {/* Divisor entre los vasos (GRANDE/MEDIANO/CHICO) y CUCURUCHO/MILKSHAKE */}
                {i === 3 ? <DivisorH style={{ margin: `${pxH(7)} 0` }} /> : null}
                <div style={{ display: "flex", alignItems: "center", opacity: p.en_stock ? 1 : 0.5 }}>
                  {p.imagen_url ? <IconoImg src={p.imagen_url} sizePx={52} style={{ marginRight: pxH(8) }} /> : null}
                  <span style={{ fontSize: pxH(23), fontWeight: 700, textTransform: "uppercase", textDecoration: p.en_stock ? undefined : "line-through" }}>{p.nombre}</span>
                  <Relleno />
                  <Precio precio={p.precio} enStock={p.en_stock} fontPx={24} />
                </div>
              </Fragment>
            ))}
          </div>

          {/* Columna derecha: Kilos + Kilos Especiales */}
          <div style={{ display: "grid", gap: pxH(16) }}>
            <div style={{ display: "grid", gridAutoFlow: "column", justifyContent: "start", alignItems: "end", gap: pxH(40) }}>
              {kilos.map((p) => (
                <div key={p.id} style={{ display: "grid", justifyItems: "center", gap: pxH(8), opacity: p.en_stock ? 1 : 0.5 }}>
                  {p.imagen_url ? <IconoImg src={p.imagen_url} sizePx={150} /> : null}
                  <Precio precio={p.precio} enStock={p.en_stock} fontPx={24} />
                </div>
              ))}
            </div>
            <DivisorH style={{ margin: `${pxH(4)} 0` }} />
            <div style={{ fontSize: pxH(23), fontWeight: 400 }}>Kilos Especiales</div>
            {/* minHeight = alto del ícono de vasos (52) para que el paso vertical
                de estas filas coincida con CUCURUCHO/MILKSHAKE de la izquierda */}
            {kilosEsp.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", minHeight: pxH(52), opacity: p.en_stock ? 1 : 0.5 }}>
                <span style={{ fontSize: pxH(23), fontWeight: 700, textTransform: "uppercase" }}>{p.nombre}</span>
                <Relleno />
                <Precio precio={p.precio} enStock={p.en_stock} fontPx={24} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Postres Helados ===== */}
      <section style={{ display: "grid", gap: pxH(30) }}>
        <TituloConLineas textoLight="POSTRES" textoBold="HELADOS" sizePx={48} bleedX={72} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: pxH(60) }}>
          {postresCols.map((col, i) => (
            <div key={i} style={{ display: "grid", gap: pxH(14) }}>
              {/* Headers Chico / Grande — visibles solo en la columna con precio_alt
                  (derecha). En la izquierda se renderiza igual pero oculto, para que
                  las filas de postres queden alineadas verticalmente entre columnas. */}
              <div style={{ display: "grid", gridAutoFlow: "column", justifyContent: "end", gap: pxH(8), visibility: i === 1 ? "visible" : "hidden" }}>
                <span style={{ width: pxH(90), textAlign: "right", fontSize: pxH(21), textDecoration: "underline", textDecorationColor: COLORS.violeta, textDecorationThickness: "1px", textUnderlineOffset: pxH(5) }}>Chico</span>
                <span style={{ width: pxH(90), textAlign: "right", fontSize: pxH(21), textDecoration: "underline", textDecorationColor: COLORS.violeta, textDecorationThickness: "1px", textUnderlineOffset: pxH(5) }}>Grande</span>
              </div>
              {col.map((p) => (
                <PostreRow key={p.id} p={p} dosPrecios={i === 1} />
              ))}
            </div>
          ))}
        </div>
      </section>
    </HShell>
  );
}

function PostreRow({ p, dosPrecios }: { p: Producto; dosPrecios: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", opacity: p.en_stock ? 1 : 0.5 }}>
      <span style={{ fontSize: pxH(24), fontWeight: 700, textDecoration: p.en_stock ? undefined : "line-through" }}>{p.nombre}</span>
      <Relleno />
      {dosPrecios ? (
        <>
          <span style={{ width: pxH(90), textAlign: "right" }}>
            <Precio precio={p.precio} enStock={p.en_stock} fontPx={24} />
          </span>
          <span style={{ width: pxH(90), textAlign: "right", marginLeft: pxH(8) }}>
            <Precio precio={p.precio_alt} enStock={p.en_stock} fontPx={24} />
          </span>
        </>
      ) : (
        <span style={{ width: pxH(188), textAlign: "right" }}>
          <Precio precio={p.precio} enStock={p.en_stock} fontPx={24} />
        </span>
      )}
    </div>
  );
}
