import { z } from "zod";

export const precioSchema = z
  .number()
  .min(0.5, "El precio mínimo es $0,50")
  .max(100_000, "El precio máximo es $100.000")
  .nullable();

export const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100),
  descripcion: z.string().max(300).nullable().optional(),
  precio: precioSchema,
  precio_alt: precioSchema,
  unidad: z.string().max(20).nullable().optional(),
  imagen_url: z.string().max(300).nullable().optional(),
  en_stock: z.boolean(),
  destacado: z.boolean(),
  orden: z.number().int().min(0),
  categoria_id: z.string().uuid("Categoría inválida"),
});

export const productoUpdateSchema = productoSchema.partial().extend({
  id: z.string().uuid(),
});

export const promoSchema = z.object({
  tipo: z.enum([
    "sabor_semana", "combo", "mensaje",
    "sabor_dia", "novedad_mes", "promo_especial",
  ]),
  titulo: z.string().min(1).max(100),
  contenido: z.string().max(500).nullable().optional(),
  producto_id: z.string().uuid().nullable().optional(),
  activa: z.boolean(),
  orden: z.number().int().min(0),
  inicio: z.string().datetime().nullable().optional(),
  fin: z.string().datetime().nullable().optional(),
});

export const categoriaSchema = z.object({
  nombre: z.string().min(1).max(100),
  tipo: z.enum([
    // Viejos (compatibilidad)
    "helado", "combo",
    // Reales de Kaikén
    "helado-clasico", "helado-especial", "tamano", "postre", "cafeteria", "pasteleria",
  ]),
  orden: z.number().int().min(0),
  activa: z.boolean(),
});

// Para el login
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type ProductoInput = z.infer<typeof productoSchema>;
export type ProductoUpdate = z.infer<typeof productoUpdateSchema>;
export type PromoInput = z.infer<typeof promoSchema>;
export type CategoriaInput = z.infer<typeof categoriaSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
