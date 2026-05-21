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

// Alias de enums
export type TipoCategoria    = Enums<"tipo_categoria">;
export type TipoPromo        = Enums<"tipo_promo">;
export type TemplatePantalla = Enums<"template_pantalla">;

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
}

// Estado completo que consume cada cartelera (hook usePantallaData)
export interface DatosPantalla {
  pantalla: Omit<Pantalla, "config"> & { config: PantallaConfig };
  categorias: Categoria[];
  productos: Producto[];
  promos: PromoConProducto[];
}

// Helper para parsear el config JSONB desde la DB
export function parsePantallaConfig(raw: unknown): PantallaConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PantallaConfig;
}
