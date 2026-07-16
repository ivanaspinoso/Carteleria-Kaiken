import type { CSSProperties } from "react";
import { COLORS, pxH, pxHT } from "@/lib/cartelera/tokens";
import { formatPrecio } from "@/lib/format";
import type { Producto } from "@/lib/types";

/** Productos de una categoría, ordenados por `orden`. */
export function productosDe(productos: Producto[], categoriaId: string): Producto[] {
  return productos
    .filter((p) => p.categoria_id === categoriaId)
    .sort((a, b) => a.orden - b.orden);
}

/**
 * Precio de un producto. Si está sin stock muestra "Sin Stock" con opacity 0.5;
 * si el precio es null (todavía sin cargar) queda vacío.
 */
export function Precio({
  precio,
  enStock,
  fontPx = 24,
  style,
}: {
  precio: number | null;
  enStock: boolean;
  fontPx?: number;
  style?: CSSProperties;
}) {
  const sinStock = !enStock;
  return (
    <span
      style={{
        fontSize: pxHT(fontPx),
        fontWeight: 400,
        color: COLORS.violeta,
        opacity: sinStock ? 0.5 : 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {/* null → "$0000" (placeholder hasta que el dueño cargue el precio) */}
      {formatPrecio(precio, { sinStock }) || "$0000"}
    </span>
  );
}

/** Ícono chico (vaso/kilo) renderizado como background-image. */
export function IconoImg({
  src,
  sizePx,
  style,
}: {
  src: string;
  sizePx: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        backgroundImage: `url('${src}')`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        width: pxH(sizePx),
        height: pxH(sizePx),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/**
 * Espaciador flexible que empuja el precio hacia la derecha de la fila.
 * En el diseño de Kaikén NO hay línea punteada: es aire en blanco.
 */
export function Relleno() {
  return <span style={{ flex: 1 }} />;
}

/**
 * Línea divisoria horizontal: color del texto (violeta), grosor fino y parejo.
 * Se dibuja con `border-top` (no con altura de fondo) porque los navegadores
 * "snapean" los bordes a la grilla de píxeles de forma más consistente, así
 * todos los divisores se ven con el MISMO grosor aunque el monitor tenga un
 * device pixel ratio fraccionario (escalado de Windows 125%/150%).
 */
export function DivisorH({ style }: { style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        height: 0,
        borderTop: `1px solid ${COLORS.violeta}`,
        width: "100%",
        ...style,
      }}
    />
  );
}
