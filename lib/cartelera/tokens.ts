// ============================================================
// TOKENS DE ESTILO DE LA CARTELERA — Kaikén
// ------------------------------------------------------------
// Paleta de marca OFICIAL (la pasó la diseñadora). Si cambia algún
// color o resolución base, se ajusta acá y se propaga a toda la cartelera.
// ============================================================

export const COLORS = {
  // Paleta de marca Kaikén (oficial)
  verde: "#b0a882",
  blancoSobreFondo: "#eeeddb",
  cremaClaro: "#fefff8",
  cremaHorizontal: "#fffff9", // fondo de horizontales (variante más clara)
  violeta: "#5f3641",
  rosa: "#f3d9e1",
};

export const FONT_FAMILY = "Montserrat";

// Resoluciones base de diseño
export const BASE_VERTICAL_WIDTH = 1080;
export const BASE_VERTICAL_HEIGHT = 1920;
export const BASE_HORIZONTAL_WIDTH = 1920;
export const BASE_HORIZONTAL_HEIGHT = 1080;

// Helpers de escalado proporcional al viewport.
// Los tamaños de diseño están en px sobre las resoluciones base; estos
// helpers los convierten a vw para que escalen con el viewport real.
export function pxV(designPx: number): string {
  // Para verticales: escala según ancho del viewport vertical (1080)
  return `${(designPx / BASE_VERTICAL_WIDTH) * 100}vw`;
}

export function pxH(designPx: number): string {
  // Para horizontales: escala según ancho del viewport horizontal (1920)
  return `${(designPx / BASE_HORIZONTAL_WIDTH) * 100}vw`;
}

// Tokens compartidos por las pantallas horizontales (Cambio 6).
export const TYPOGRAPHY_HORIZONTAL = {
  papelFondo: COLORS.cremaHorizontal, // #fffff9
  textoPrincipal: COLORS.violeta, // #5f3641
  lineasYDetalle: COLORS.verde, // #b0a882
};

// Letter-spacing de los títulos con líneas decorativas (TituloConLineas).
// TODO: ajustar entre 0.05em y 0.1em hasta coincidir con el diseño de Mora.
export const LETTER_SPACING_TITULO = "0.08em";

/**
 * Tamaño de fuente que se achica según el largo del texto, para que el texto
 * editable de las placas entre siempre dentro de su recuadro. `base` es el
 * tamaño para textos cortos; baja por tramos hasta `min`.
 */
export function fontPorLargo(texto: string, base: number, min: number): number {
  const len = texto.trim().length;
  if (len <= 12) return base;
  if (len <= 18) return Math.max(min, Math.round(base * 0.82));
  if (len <= 26) return Math.max(min, Math.round(base * 0.66));
  return min;
}

/**
 * Tamaño de fuente según la CANTIDAD de palabras: una palabra usa `base`,
 * dos o más se achican para entrar en una sola línea (ej. "Dulce de Leche"
 * en el recuadro de Gusto del Día). Combina con el largo para el peor caso.
 */
export function fontPorPalabras(texto: string, base: number, min: number): number {
  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
  if (palabras <= 1) return base;            // una palabra: tamaño base
  if (palabras === 2) return Math.round(base * 0.9); // dos palabras: 18 si base=20
  return Math.max(min, Math.round(base * 0.7));      // tres o más
}
