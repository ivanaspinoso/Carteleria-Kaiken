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

/**
 * Escala un tamaño de diseño (base 1080) usando la variable CSS `--escala`
 * (= anchoRealDelLienzo / 1080), que mide el contenedor por JS. A diferencia de
 * `pxV` (que usa `vw` = ancho del VIEWPORT y se rompe cuando el contenido está
 * rotado 90°), esto siempre escala respecto del lienzo real, rotado o no.
 * Requiere que un ancestro defina `--escala`.
 */
export function escalaV(designPx: number): string {
  return `calc(var(--escala, 1) * ${designPx}px)`;
}

export function pxH(designPx: number): string {
  // Para horizontales: escala según ancho del viewport horizontal (1920)
  return `${(designPx / BASE_HORIZONTAL_WIDTH) * 100}vw`;
}

/**
 * Escala de LECTURA de las horizontales. En el local las tipografías se veían
 * chicas a la distancia real de la heladería (el cuerpo estaba en 17-30px de
 * diseño contra 48px de los títulos, que sí se leían bien).
 *
 * Multiplica solo el TEXTO de producto/precio, no los títulos ni los espacios
 * ni los íconos, así crece la letra sin mover el diseño de lugar.
 *
 * HShell busca el mayor valor entre MIN y MAX con el que el contenido entra, y
 * lo aplica por pantalla: la de cafetería tiene más aire que la de sabores y
 * aprovecha más. No es un número fijo porque los productos los edita el dueño:
 * agregar uno tiene que achicar la letra, no recortar la última fila.
 *
 * - MIN: piso; si ni así entra, HShell recorta (subir MAX no lo arregla).
 * - MAX: techo, para que una pantalla con pocos productos no agigante el texto
 *   y se despegue del diseño.
 */
export const ESCALA_TEXTO_MIN = 1;
export const ESCALA_TEXTO_MAX = 1.5;

/**
 * Colchón (en px de diseño, base 1920) que HShell deja libre al elegir escala.
 * La búsqueda converge al borde exacto de lo que entra, y las fuentes no
 * rasterizan idéntico en el navegador del TV que en Chrome de escritorio: sin
 * colchón, un par de píxeles de diferencia recortan la última fila.
 */
export const MARGEN_SEGURIDAD_PX = 16;

/**
 * Igual que `pxH` pero afectado por `--escala-texto` (la variable que setea
 * HShell con ESCALA_TEXTO_HORIZONTAL). Para tamaños de fuente del cuerpo y para
 * los anchos de columna atados a esos textos (si crece la letra pero no la
 * columna del precio, se rompe la alineación).
 */
export function pxHT(designPx: number): string {
  return `calc(var(--escala-texto, 1) * ${(designPx / BASE_HORIZONTAL_WIDTH) * 100}vw)`;
}

/**
 * Escala del AIRE vertical (separación entre filas y entre secciones).
 *
 * Segunda pasada de HShell, después de la del texto: una pantalla con pocos
 * productos llega al techo de `--escala-texto` y todavía le sobra alto (le pasa
 * a la de cafetería/pastelería, que quedaba con un hueco muerto abajo y las
 * filas apretadas contra la letra ya agrandada). En vez de dejar ese sobrante
 * al final, se reparte entre los espacios.
 *
 * Se separa del texto en vez de escalar todo junto porque la prioridad es
 * distinta: primero la letra lo más grande que entre (se lee de lejos), y solo
 * lo que sobre va al aire. Si fuera una sola escala, el aire competiría con la
 * letra y las pantallas densas (sabores) perderían tamaño de fuente.
 *
 * - MIN: espaciado de diseño; en las pantallas llenas no sobra nada y queda acá.
 * - MAX: techo, para que 4 productos no queden flotando separadísimos.
 */
export const ESCALA_AIRE_MIN = 1;
export const ESCALA_AIRE_MAX = 2.5;

/**
 * Igual que `pxH` pero afectado por `--escala-aire`. Solo para separaciones
 * VERTICALES (gap entre filas, entre secciones, padding vertical). En
 * horizontales no: a lo ancho no sobra espacio y estirarlo rompe la alineación.
 */
export function pxHA(designPx: number): string {
  return `calc(var(--escala-aire, 1) * ${(designPx / BASE_HORIZONTAL_WIDTH) * 100}vw)`;
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
