"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types";
import { FORMATOS_OK, FORMATOS_VIDEO, MAX_BYTES, MAX_VIDEO_BYTES } from "@/lib/cartelera/validarImagen";

export type Resultado = { error: string } | { ok: true };

const BUCKET = "placas-personalizadas";

// ── Placas fijas: solo se editan duración / activa / orden ───────────────────
export async function actualizarPlacaFija(
  id: string,
  cambios: TablesUpdate<"placas_fijas">
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("placas_fijas").update(cambios).eq("id", id);
  if (error) return { error: "Error al guardar la placa fija" };

  revalidatePath("/placas");
  return { ok: true };
}

// ── Placas personalizadas: editar campos ─────────────────────────────────────
export async function actualizarPlacaPersonalizada(
  id: string,
  cambios: TablesUpdate<"placas_personalizadas">
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("placas_personalizadas").update(cambios).eq("id", id);
  if (error) return { error: "Error al guardar la placa" };

  revalidatePath("/placas");
  return { ok: true };
}

// ── Crear (subir imagen + insertar fila) ─────────────────────────────────────
export async function crearPlacaPersonalizada(formData: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const file = formData.get("file");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const pantallaId = Number(formData.get("pantalla_id"));
  const duracion = Number(formData.get("duracion") ?? 10);
  const inicio = (formData.get("inicio") as string) || null;
  const fin = (formData.get("fin") as string) || null;

  if (!(file instanceof File) || file.size === 0) return { error: "Falta el archivo" };
  if (!nombre) return { error: "Falta el nombre" };
  if (![1, 5].includes(pantallaId)) return { error: "Pantalla inválida (solo 1 o 5)" };

  // Re-chequeo de seguridad en el server (formato + peso; dimensiones se validan en el cliente)
  const esVideo = FORMATOS_VIDEO.includes(file.type);
  const esImagen = FORMATOS_OK.includes(file.type);
  if (!esVideo && !esImagen) return { error: "Formato inválido (JPG, PNG, MP4 o WEBM)" };
  if (esVideo && file.size > MAX_VIDEO_BYTES) return { error: "El video supera los 50MB" };
  if (esImagen && file.size > MAX_BYTES) return { error: "La imagen supera los 5MB" };

  // orden global = (máximo entre fijas y personalizadas de esa pantalla) + 1
  const [{ data: maxFija }, { data: maxPers }] = await Promise.all([
    supabase.from("placas_fijas").select("orden").eq("pantalla_id", pantallaId).order("orden", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("placas_personalizadas").select("orden").eq("pantalla_id", pantallaId).order("orden", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const orden = Math.max(maxFija?.orden ?? 0, maxPers?.orden ?? 0) + 1;

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${pantallaId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return { error: "Error al subir la imagen" };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: insErr } = await supabase.from("placas_personalizadas").insert({
    pantalla_id: pantallaId,
    imagen_url: pub.publicUrl,
    imagen_path: path,
    nombre,
    orden,
    duracion: Number.isFinite(duracion) && duracion > 0 ? duracion : 10,
    inicio,
    fin,
    created_by: user.id,
  });

  if (insErr) {
    // Rollback del archivo si falló la fila
    await supabase.storage.from(BUCKET).remove([path]).then(() => {}, () => {});
    return { error: "Error al guardar la placa" };
  }

  revalidatePath("/placas");
  return { ok: true };
}

// ── Borrar (archivo de Storage + fila, en orden) ─────────────────────────────
export async function borrarPlacaPersonalizada(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: fila } = await supabase
    .from("placas_personalizadas")
    .select("imagen_path")
    .eq("id", id)
    .maybeSingle();

  // Borrar el archivo primero; si falla, log pero igual borramos la fila.
  if (fila?.imagen_path) {
    const { error: stErr } = await supabase.storage.from(BUCKET).remove([fila.imagen_path]);
    if (stErr) console.error("No se pudo borrar el archivo de Storage:", stErr.message);
  }

  const { error } = await supabase.from("placas_personalizadas").delete().eq("id", id);
  if (error) return { error: "Error al borrar la placa" };

  revalidatePath("/placas");
  return { ok: true };
}
