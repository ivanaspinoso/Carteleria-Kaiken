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
          config: Json;
          ultima_conex: string | null;
          activa: boolean;
        };
        Insert: {
          id: number;
          nombre: string;
          template: Database["public"]["Enums"]["template_pantalla"];
          pulgadas: number;
          config?: Json;
          ultima_conex?: string | null;
          activa?: boolean;
        };
        Update: {
          id?: number;
          nombre?: string;
          template?: Database["public"]["Enums"]["template_pantalla"];
          pulgadas?: number;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tipo_categoria: "helado" | "cafeteria" | "postre" | "combo";
      tipo_promo: "sabor_semana" | "combo" | "mensaje";
      template_pantalla:
        | "cafeteria"
        | "sabores_grande"
        | "sabores_fijo"
        | "postres"
        | "rotativa";
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
