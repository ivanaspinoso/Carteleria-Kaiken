// ============================================================
// Tipos del dominio — derivados de database.types.ts
// NO duplicar tipos aquí: importar y re-exportar desde database.types.ts
// ============================================================
import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./supabase/database.types";

// Re-exports para consumo fácil en el resto del proyecto
export type { Database, Tables, TablesInsert, TablesUpdate, Enums };

// Alias de filas (Row types)
export type Categoria = Tables<"categorias">;
export type Producto  = Tables<"productos">;
export type Promo     = Tables<"promos">;
export type Pantalla  = Tables<"pantallas">;
export type Log       = Tables<"logs">;
export type PlacaFija = Tables<"placas_fijas">;
export type PlacaPersonalizada = Tables<"placas_personalizadas">;
export type PlacaPersonalizadaInsert = TablesInsert<"placas_personalizadas">;

/**
 * El producto "Kilo Kaikén" alimenta la placa vertical homónima (precio +
 * gustos). Para que renombrarlo desde el admin NO rompa ese vínculo, lo
 * identificamos por un `slug` estable; si todavía no tiene slug (base sin la
 * migración 014), cae al nombre original. Así funciona antes y después.
 */
export function esKiloKaiken(p: { slug?: string | null; nombre?: string | null }): boolean {
  return p.slug === "kilo-kaiken" || p.nombre === "Kilo Kaikén";
}

// Alias de enums
export type TipoCategoria      = Enums<"tipo_categoria">;
export type TipoPromo          = Enums<"tipo_promo">;
export type TemplatePantalla   = Enums<"template_pantalla">;
export type OrientacionPantalla = Enums<"orientacion_pantalla">;

// Alias de Insert/Update
export type ProductoInsert = TablesInsert<"productos">;
export type ProductoUpdate = TablesUpdate<"productos">;
export type PromoInsert    = TablesInsert<"promos">;
export type PromoUpdate    = TablesUpdate<"promos">;
export type CategoriaInsert = TablesInsert<"categorias">;
export type CategoriaUpdate = TablesUpdate<"categorias">;

// Tipos de join — no vienen de la DB, son para queries con relaciones
export type ProductoConCategoria = Producto & {
  categoria: Categoria;
};

export type PromoConProducto = Promo & {
  producto: Producto | null;
};

// Configuración JSONB de pantalla (tipada sobre el Json genérico de Supabase)
export interface PantallaConfig {
  // Opción A: posiciones en % para superponer sobre PNG del canvas
  posiciones?: Record<string, { top: string; left: string; fontSize?: string }>;
  // Opción B: IDs de nodos SVG a reemplazar (activar en PantallaSabores.tsx)
  svgNodos?: Record<string, string>;
  // Solo para el template rotativo
  rotacion?: { intervalMs: number; categorias?: string[] };
  // Desfase de la rotación de placas verticales (P1 = 0s, P5 = 30s).
  // Asegura que las dos pantallas verticales nunca muestren la misma placa.
  desfase_segundos?: number;
}

// Estado completo que consume cada cartelera (hook usePantallaData)
export interface DatosPantalla {
  pantalla: Omit<Pantalla, "config"> & { config: PantallaConfig };
  categorias: Categoria[];
  productos: Producto[];
  promos: PromoConProducto[];
  // Placas fijas de la pantalla actual (solo verticales 1 y 5; [] en horizontales).
  placas_fijas: PlacaFija[];
  // Placas personalizadas que subió el cliente (solo verticales 1 y 5).
  placas_personalizadas: PlacaPersonalizada[];
}

// Helper para parsear el config JSONB desde la DB
export function parsePantallaConfig(raw: unknown): PantallaConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PantallaConfig;
}

// Config editable de una placa fija (overlay sobre el video). Se guarda en
// placas_fijas.config (jsonb). Por ahora un precio que se superpone en una
// posición fija del diseño (ej. antojo-de-tarde, después del cole).
export interface PlacaFijaConfig {
  precio?: number | null;
  // Segundo precio para placas con dos valores (ej. cuartos: "A $X" y el x4).
  precio_alt?: number | null;
}

export function parsePlacaConfig(raw: unknown): PlacaFijaConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PlacaFijaConfig;
}

// gustos_incluidos (jsonb en productos) → array de strings. Ej. los sabores
// que entran en el Kilo Kaikén, que se superponen sobre la placa de video.
export function parseGustos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  return [];
}
