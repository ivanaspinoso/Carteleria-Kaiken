import type { CSSProperties, ReactNode } from "react";
import { COLORS, FONT_FAMILY, pxH } from "@/lib/cartelera/tokens";

/**
 * Contenedor común de las pantallas horizontales (1920×1080, 16/9).
 * Fondo papel crema, texto violeta. El lienzo padre (marco-pantalla) ya
 * fuerza la proporción; acá llenamos el 100% en columna con dos secciones.
 */
export default function HShell({
  children,
  style,
  justify = "center",
}: {
  children: ReactNode;
  style?: CSSProperties;
  /** Distribución vertical de las dos secciones. Default "center". */
  justify?: CSSProperties["justifyContent"];
}) {
  return (
    <div
      className="pantalla-horizontal"
      style={{
        aspectRatio: "16 / 9",
        width: "100%",
        height: "100%",
        backgroundColor: COLORS.cremaHorizontal,
        color: COLORS.violeta,
        fontFamily: `var(--font-montserrat), ${FONT_FAMILY}, sans-serif`,
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
        padding: `${pxH(48)} ${pxH(72)}`,
        gap: pxH(72),
        boxSizing: "border-box",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
