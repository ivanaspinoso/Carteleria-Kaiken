// Helper para el multi-select de "gustos incluidos" del Kilo Kaikén.
// Agrupa los sabores clásicos por su categoría (Cremas, Chocolate, Frutales,
// Dulce de Leche, Sin Azúcar). El nombre que se guarda / se ve en la placa
// lleva la categoría como prefijo en "Dulce de Leche", "Sin Azúcar" y
// "Chocolate" (ej. "Dulce de Leche Con Brownie", "Chocolate Blanco",
// "Sin Azúcar Americana"), porque ahí el sabor solo es ambiguo. El resto va con
// el sabor a secas (ej. "Vainilla", "Mandarina"). Excepción: si el sabor ya
// contiene la palabra de la categoría no se duplica (ej. "Volcán de Chocolate"
// queda así, no "Chocolate Volcán de Chocolate").

export interface GrupoGustos {
  /** Nombre de la categoría (encabezado en el admin). */
  categoria: string;
  sabores: {
    /** Nombre que se guarda y se ve en la placa (con prefijo solo si hace falta). */
    valor: string;
    /** Nombre corto del sabor: la etiqueta del chip bajo el encabezado. */
    etiqueta: string;
  }[];
}

// Categorías cuyo sabor necesita el prefijo de categoría para no ser ambiguo.
const CATEGORIAS_CON_PREFIJO = new Set(["dulce de leche", "sin azucar", "chocolate"]);

const sinAcentos = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Construye los grupos a partir de las categorías y productos clásicos.
 * `categorias` y `productos` deben venir ya ordenados (por `orden`).
 */
export function construirGruposGustos(
  categorias: { id: string; nombre: string }[],
  productos: { nombre: string; categoria_id: string }[],
): GrupoGustos[] {
  return categorias
    .map((cat) => {
      const catNorm = sinAcentos(cat.nombre);
      const conPrefijo = CATEGORIAS_CON_PREFIJO.has(catNorm);
      return {
        categoria: cat.nombre,
        sabores: productos
          .filter((p) => p.categoria_id === cat.id)
          .map((p) => {
            // No duplicar si el sabor ya contiene la palabra de la categoría
            // (ej. "Volcán de Chocolate" en la categoría "Chocolate").
            const yaLaContiene = sinAcentos(p.nombre).includes(catNorm);
            return {
              valor: conPrefijo && !yaLaContiene ? `${cat.nombre} ${p.nombre}` : p.nombre,
              etiqueta: p.nombre,
            };
          }),
      };
    })
    .filter((g) => g.sabores.length > 0);
}
