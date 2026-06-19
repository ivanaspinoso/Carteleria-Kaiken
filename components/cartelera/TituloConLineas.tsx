import type { CSSProperties } from "react";
import { COLORS, LETTER_SPACING_TITULO, FONT_FAMILY, pxH } from "@/lib/cartelera/tokens";

interface Props {
  /** Primera palabra, peso Regular (puede ir vacía para títulos de 1 palabra). */
  textoLight: string;
  /** Segunda palabra, peso Bold. */
  textoBold: string;
  /** Tamaño de la tipografía en px de diseño (default 48). */
  tamano?: number;
  /** @deprecated alias de `tamano` (compat). */
  sizePx?: number;
  /**
   * Conversor de px de diseño a unidad de viewport. Default `pxH` (horizontales).
   * Las verticales pueden pasar `pxV`.
   */
  scale?: (designPx: number) => string;
  /** Color del texto y de las líneas/guion (default verde dorado de marca). */
  color?: string;
  /**
   * Px de diseño que el título se extiende a cada lado (margen negativo).
   * Sirve para que las líneas lleguen al borde de la pantalla cancelando el
   * padding lateral del contenedor (ej. el padding de HShell). Default 0.
   */
  bleedX?: number;
}

/**
 * Título decorativo de marca: "───  SABORES CLÁSICOS  ───".
 * Las líneas son un solo trazo limpio (`border-top` del `<span>`, flex-grow),
 * sin guion separado (ver `.titulo-lineas__linea` en globals.css). Hay aire
 * entre la línea y el texto. Primera palabra Regular y más translúcida, segunda
 * palabra Bold. Color verde/dorado (NO violeta). Soporta 1 sola palabra
 * (textoLight vacío). Sin coordenadas absolutas para la maquetación.
 */
export default function TituloConLineas({
  textoLight,
  textoBold,
  tamano,
  sizePx,
  scale = pxH,
  color = COLORS.verde,
  bleedX = 0,
}: Props) {
  const size = tamano ?? sizePx ?? 48;
  const bleed = bleedX ? scale(bleedX) : "0px";

  // Variables consumidas por `.titulo-lineas__linea` en globals.css.
  const lineaVars = {
    "--tl-grosor": scale(2), // grosor del trazo (~1.5-2px en diseño)
    "--tl-color": color,
  } as CSSProperties;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: scale(size * 1.5), // respiración línea ↔ texto (~1.5em)
        width: "auto",
        marginLeft: `calc(-1 * ${bleed})`,
        marginRight: `calc(-1 * ${bleed})`,
        fontFamily: `var(--font-montserrat), ${FONT_FAMILY}, sans-serif`,
        color,
        ...lineaVars,
      }}
    >
      <span className="titulo-lineas__linea titulo-lineas__linea--izq" aria-hidden />

      <div
        style={{
          fontSize: scale(size),
          letterSpacing: LETTER_SPACING_TITULO,
          whiteSpace: "nowrap",
          lineHeight: 1,
          textTransform: "uppercase",
        }}
      >
        {textoLight ? <span style={{ fontWeight: 400, opacity: 0.7 }}>{textoLight}</span> : null}
        {textoBold ? (
          <span style={{ fontWeight: 700 }}>
            {textoLight ? " " : ""}
            {textoBold}
          </span>
        ) : null}
      </div>

      <span className="titulo-lineas__linea titulo-lineas__linea--der" aria-hidden />
    </div>
  );
}
