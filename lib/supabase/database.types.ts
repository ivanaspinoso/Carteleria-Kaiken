// ============================================================
// TIPOS GENERADOS MANUALMENTE — estructura idéntica a:
//   supabase gen types typescript --project-id qfqlmgitzbyoctotlgoa
//
// TODO: cuando tengas la DB aplicada, regenerar con:
//   npx supabase gen types typescript --project-id qfqlmgitzbyoctotlgoa \
//     --schema public > lib/supabase/database.types.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string;
          nombre: string;
          tipo: Database["public"]["Enums"]["tipo_categoria"];
          orden: number;
          activa: boolean;
        };
        Insert: {
          id?: string;
          nombre: string;
          tipo: Database["public"]["Enums"]["tipo_categoria"];
          orden?: number;
          activa?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          tipo?: Database["public"]["Enums"]["tipo_categoria"];
          orden?: number;
          activa?: boolean;
        };
        Relationships: [];
      };
      productos: {
        Row: {
          id: string;
          categoria_id: string;
          nombre: string;
          descripcion: string | null;
          precio: number | null;
          precio_alt: number | null;
          unidad: string | null;
          imagen_url: string | null;
          gustos_incluidos: Json | null;
          en_stock: boolean;
          destacado: boolean;
          orden: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          categoria_id: string;
          nombre: string;
          descripcion?: string | null;
          precio?: number | null;
          precio_alt?: number | null;
          unidad?: string | null;
          imagen_url?: string | null;
          gustos_incluidos?: Json | null;
          en_stock?: boolean;
          destacado?: boolean;
          orden?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          categoria_id?: string;
          nombre?: string;
          descripcion?: string | null;
          precio?: number | null;
          precio_alt?: number | null;
          unidad?: string | null;
          imagen_url?: string | null;
          gustos_incluidos?: Json | null;
          en_stock?: boolean;
          destacado?: boolean;
          orden?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
      promos: {
        Row: {
          id: string;
          tipo: Database["public"]["Enums"]["tipo_promo"];
          titulo: string;
          contenido: string | null;
          producto_id: string | null;
          precio: number | null;
          activa: boolean;
          orden: number;
          inicio: string | null;
          fin: string | null;
        };
        Insert: {
          id?: string;
          tipo: Database["public"]["Enums"]["tipo_promo"];
          titulo: string;
          contenido?: string | null;
          producto_id?: string | null;
          precio?: number | null;
          activa?: boolean;
          orden?: number;
          inicio?: string | null;
          fin?: string | null;
        };
        Update: {
          id?: string;
          tipo?: Database["public"]["Enums"]["tipo_promo"];
          titulo?: string;
          contenido?: string | null;
          producto_id?: string | null;
          precio?: number | null;
          activa?: boolean;
          orden?: number;
          inicio?: string | null;
          fin?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "promos_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      pantallas: {
        Row: {
          id: number;
          nombre: string;
          template: Database["public"]["Enums"]["template_pantalla"];
          pulgadas: number;
          orientacion: Database["public"]["Enums"]["orientacion_pantalla"];
          config: Json;
          ultima_conex: string | null;
          activa: boolean;
        };
        Insert: {
          id: number;
          nombre: string;
          template: Database["public"]["Enums"]["template_pantalla"];
          pulgadas: number;
          orientacion?: Database["public"]["Enums"]["orientacion_pantalla"];
          config?: Json;
          ultima_conex?: string | null;
          activa?: boolean;
        };
        Update: {
          id?: number;
          nombre?: string;
          template?: Database["public"]["Enums"]["template_pantalla"];
          pulgadas?: number;
          orientacion?: Database["public"]["Enums"]["orientacion_pantalla"];
          config?: Json;
          ultima_conex?: string | null;
          activa?: boolean;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          id: number;
          usuario_id: string;
          accion: string;
          tabla: string;
          registro_id: string;
          antes: Json | null;
          despues: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          usuario_id: string;
          accion: string;
          tabla: string;
          registro_id: string;
          antes?: Json | null;
          despues?: Json | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "logs_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      placas_fijas: {
        Row: {
          id: string;
          pantalla_id: number;
          slug: string;
          nombre: string;
          componente: string;
          orden: number;
          duracion: number;
          activa: boolean;
          inicio: string | null;
          fin: string | null;
          config: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          pantalla_id: number;
          slug: string;
          nombre: string;
          componente: string;
          orden?: number;
          duracion?: number;
          activa?: boolean;
          inicio?: string | null;
          fin?: string | null;
          config?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          pantalla_id?: number;
          slug?: string;
          nombre?: string;
          componente?: string;
          orden?: number;
          duracion?: number;
          activa?: boolean;
          inicio?: string | null;
          fin?: string | null;
          config?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "placas_fijas_pantalla_id_fkey";
            columns: ["pantalla_id"];
            isOneToOne: false;
            referencedRelation: "pantallas";
            referencedColumns: ["id"];
          },
        ];
      };
      placas_personalizadas: {
        Row: {
          id: string;
          pantalla_id: number;
          imagen_url: string;
          imagen_path: string;
          poster_url: string | null;
          poster_path: string | null;
          nombre: string;
          orden: number;
          duracion: number;
          activa: boolean;
          inicio: string | null;
          fin: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          pantalla_id: number;
          imagen_url: string;
          imagen_path: string;
          poster_url?: string | null;
          poster_path?: string | null;
          nombre: string;
          orden?: number;
          duracion?: number;
          activa?: boolean;
          inicio?: string | null;
          fin?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          pantalla_id?: number;
          imagen_url?: string;
          imagen_path?: string;
          poster_url?: string | null;
          poster_path?: string | null;
          nombre?: string;
          orden?: number;
          duracion?: number;
          activa?: boolean;
          inicio?: string | null;
          fin?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "placas_personalizadas_pantalla_id_fkey";
            columns: ["pantalla_id"];
            isOneToOne: false;
            referencedRelation: "pantallas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tipo_categoria:
        // Viejos (ficticios) — quedan por compatibilidad
        | "helado"
        | "combo"
        // Reales de Kaikén
        | "helado-clasico"
        | "helado-especial"
        | "tamano"
        | "postre"
        | "cafeteria"
        | "pasteleria";
      tipo_promo:
        // Viejos (compatibilidad)
        | "sabor_semana"
        | "combo"
        | "mensaje"
        // Reales de Kaikén (placas editables)
        | "sabor_dia"
        | "novedad_mes"
        | "promo_especial";
      template_pantalla:
        // Viejos (ficticios) — ya no se usan, quedan por compatibilidad
        | "cafeteria"
        | "sabores_grande"
        | "sabores_fijo"
        | "postres"
        // Reales de Kaikén
        | "rotativa"
        | "sabores-clasicos-especiales"
        | "tamanos-postres"
        | "cafeteria-pasteleria";
      // No es un enum real de Postgres (es un CHECK sobre text), pero lo
      // modelamos como unión para tipado fuerte en el front.
      orientacion_pantalla: "horizontal" | "vertical";
    };
    CompositeTypes: Record<string, never>;
  };
};

// Helpers idiomáticos (igual que los que genera supabase gen types)
type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
