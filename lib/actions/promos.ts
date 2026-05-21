"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types";

export type Resultado = { error: string } | { ok: true };

export async function actualizarPromo(
  id: string,
  cambios: TablesUpdate<"promos">
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("promos")
    .update(cambios)
    .eq("id", id);

  if (error) return { error: "Error al guardar la promo" };

  await supabase
    .from("logs")
    .insert({
      usuario_id: user.id,
      accion: "update_promo",
      tabla: "promos",
      registro_id: id,
      antes: null,
      despues: cambios as unknown as import("@/lib/supabase/database.types").Json,
    })
    .then(() => {}, () => {});

  revalidatePath("/promos");
  return { ok: true };
}
