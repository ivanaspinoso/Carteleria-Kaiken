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

// ============================================================
// Promos editables de Kaikén (las 3 placas con recuadro editable).
// Cada tipo es un "singleton": una sola fila que se upsertea.
// ============================================================
export type PromoKaikenTipo = "sabor_dia" | "novedad_mes" | "promo_especial";

const TITULO_DEFAULT: Record<PromoKaikenTipo, string> = {
  sabor_dia: "Gusto del día",
  novedad_mes: "Novedad del mes",
  promo_especial: "Promo especial",
};

export interface CamposPromoKaiken {
  contenido?: string | null;
  producto_id?: string | null;
  precio?: number | null;
  fin?: string | null;
  activa?: boolean;
}

export async function guardarPromoKaiken(
  tipo: PromoKaikenTipo,
  campos: CamposPromoKaiken
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Buscar la fila existente de ese tipo (singleton)
  const { data: existente } = await supabase
    .from("promos")
    .select("id")
    .eq("tipo", tipo)
    .order("orden")
    .limit(1)
    .maybeSingle();

  const payload = {
    tipo,
    titulo: TITULO_DEFAULT[tipo],
    contenido: campos.contenido ?? null,
    producto_id: campos.producto_id ?? null,
    precio: campos.precio ?? null,
    fin: campos.fin ?? null,
    activa: campos.activa ?? false,
  };

  const { error } = existente
    ? await supabase.from("promos").update(payload).eq("id", existente.id)
    : await supabase.from("promos").insert(payload);

  if (error) return { error: "Error al guardar la promo" };

  await supabase
    .from("logs")
    .insert({
      usuario_id: user.id,
      accion: "upsert_promo_kaiken",
      tabla: "promos",
      registro_id: existente?.id ?? tipo,
      antes: null,
      despues: payload as unknown as import("@/lib/supabase/database.types").Json,
    })
    .then(() => {}, () => {});

  revalidatePath("/promos");
  return { ok: true };
}
