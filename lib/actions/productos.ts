"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { TablesUpdate } from "@/lib/types";

export type Resultado = { error: string } | { ok: true };

function revalidarProductos() {
  revalidatePath("/sabores");
  revalidatePath("/cafeteria");
  revalidatePath("/postres");
  // /promos y /placas leen productos en sus selectores (Gusto del Día, Novedad
  // del Mes, gustos del Kilo) → revalidar para que muestren el nombre nuevo.
  revalidatePath("/promos");
  revalidatePath("/placas");
}

function validarPrecio(precio: number | null): string | null {
  if (precio === null) return null;
  if (precio < 0.5) return "El precio mínimo es $0,50";
  if (precio > 100_000) return "El precio máximo es $100.000";
  return null;
}

async function insertarLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  accion: string,
  tabla: string,
  registroId: string,
  antes: Json,
  despues: Json
) {
  // No bloquear la operación principal si el log falla
  await supabase
    .from("logs")
    .insert({ usuario_id: userId, accion, tabla, registro_id: registroId, antes, despues })
    .then(() => {}, () => {});
}

export async function actualizarPrecio(
  id: string,
  nuevoPrecio: number | null,
  // "precio" = precio principal (o "Chico" en postres con dos tamaños);
  // "precio_alt" = segundo precio ("Grande").
  campo: "precio" | "precio_alt" = "precio"
): Promise<Resultado> {
  const errorValidacion = validarPrecio(nuevoPrecio);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Leer valor anterior para el log
  const { data: anterior } = await supabase
    .from("productos")
    .select("precio, precio_alt")
    .eq("id", id)
    .single();

  const update: TablesUpdate<"productos"> =
    campo === "precio_alt" ? { precio_alt: nuevoPrecio } : { precio: nuevoPrecio };

  const { error } = await supabase.from("productos").update(update).eq("id", id);

  if (error) return { error: "Error al guardar el precio" };

  await insertarLog(supabase, user.id, `update_${campo}`, "productos", id,
    { [campo]: anterior?.[campo] ?? null },
    { [campo]: nuevoPrecio }
  );

  revalidarProductos();
  return { ok: true };
}

// ── Textos editables del producto (nombre / descripción / unidad) ────────────
const LIMITES_TEXTO = {
  nombre: { max: 80, requerido: true, label: "nombre" },
  descripcion: { max: 300, requerido: false, label: "descripción" },
  unidad: { max: 30, requerido: false, label: "unidad" },
} as const;

export type CampoTexto = keyof typeof LIMITES_TEXTO;

export async function actualizarTextoProducto(
  id: string,
  campo: CampoTexto,
  valor: string
): Promise<Resultado> {
  const limite = LIMITES_TEXTO[campo];
  const limpio = valor.trim();
  if (limite.requerido && limpio === "") return { error: `El ${limite.label} no puede quedar vacío` };
  if (limpio.length > limite.max) return { error: `El ${limite.label} supera los ${limite.max} caracteres` };
  // Campos opcionales vacíos se guardan como null (el nombre es requerido).
  const valorFinal: string | null = limpio === "" ? null : limpio;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Leer valor anterior para el log
  const { data: anterior } = await supabase
    .from("productos")
    .select("nombre, descripcion, unidad")
    .eq("id", id)
    .single();

  const update = { [campo]: valorFinal } as TablesUpdate<"productos">;
  const { error } = await supabase.from("productos").update(update).eq("id", id);
  if (error) return { error: "Error al guardar el texto" };

  await insertarLog(supabase, user.id, `update_${campo}`, "productos", id,
    { [campo]: anterior?.[campo] ?? null },
    { [campo]: valorFinal }
  );

  revalidarProductos();
  return { ok: true };
}

export async function actualizarGustosIncluidos(
  id: string,
  gustos: string[]
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: anterior } = await supabase
    .from("productos")
    .select("gustos_incluidos")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("productos")
    .update({ gustos_incluidos: gustos })
    .eq("id", id);

  if (error) return { error: "Error al guardar los gustos" };

  await insertarLog(supabase, user.id, "update_gustos", "productos", id,
    { gustos_incluidos: (anterior?.gustos_incluidos as Json) ?? null },
    { gustos_incluidos: gustos as unknown as Json }
  );

  revalidarProductos();
  return { ok: true };
}

export async function toggleStock(
  id: string,
  enStock: boolean
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("productos")
    .update({ en_stock: enStock })
    .eq("id", id);

  if (error) return { error: "Error al actualizar stock" };

  await insertarLog(supabase, user.id,
    enStock ? "marcar_en_stock" : "marcar_sin_stock",
    "productos", id,
    { en_stock: !enStock },
    { en_stock: enStock }
  );

  revalidarProductos();
  return { ok: true };
}
