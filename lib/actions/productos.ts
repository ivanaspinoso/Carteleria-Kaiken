"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type Resultado = { error: string } | { ok: true };

function revalidarProductos() {
  revalidatePath("/sabores");
  revalidatePath("/cafeteria");
  revalidatePath("/postres");
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
  nuevoPrecio: number | null
): Promise<Resultado> {
  const errorValidacion = validarPrecio(nuevoPrecio);
  if (errorValidacion) return { error: errorValidacion };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Leer precio anterior para el log
  const { data: anterior } = await supabase
    .from("productos")
    .select("precio")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("productos")
    .update({ precio: nuevoPrecio })
    .eq("id", id);

  if (error) return { error: "Error al guardar el precio" };

  await insertarLog(supabase, user.id, "update_precio", "productos", id,
    { precio: anterior?.precio ?? null },
    { precio: nuevoPrecio }
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
