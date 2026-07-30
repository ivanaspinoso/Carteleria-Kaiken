"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types";
import { MAX_BYTES, MAX_VIDEO_BYTES } from "@/lib/cartelera/validarImagen";

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

  // El archivo NO viaja por acá: lo sube el navegador directo a Storage y este
  // action recibe la ruta. Mandarlo dentro del server action era imposible para
  // videos: Next acepta 1MB por defecto y Vercel corta el cuerpo en 4,5MB,
  // mientras que acá se permiten videos de hasta 50MB. El error que eso tiraba
  // no estaba atrapado y salía como "Application error" en el panel.
  const path = String(formData.get("path") ?? "");
  const posterPathSubido = String(formData.get("poster_path") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const pantallaId = Number(formData.get("pantalla_id"));
  const duracion = Number(formData.get("duracion") ?? 10);
  const inicio = (formData.get("inicio") as string) || null;
  const fin = (formData.get("fin") as string) || null;

  if (!path) return { error: "Falta el archivo" };
  if (!nombre) return { error: "Falta el nombre" };
  if (![1, 5].includes(pantallaId)) return { error: "Pantalla inválida (solo 1 o 5)" };
  if (!path.startsWith(`${pantallaId}/`) || path.includes("..")) return { error: "Ruta inválida" };

  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const esVideo = ["mp4", "webm"].includes(extension);
  const esImagen = ["jpg", "jpeg", "png"].includes(extension);
  if (!esVideo && !esImagen) return { error: "Formato inválido (JPG, PNG, MP4 o WEBM)" };

  // Que el archivo exista de verdad y respete el máximo.
  const { data: enBucket } = await supabase.storage
    .from(BUCKET)
    .list(String(pantallaId), { search: path.split("/").pop() });
  const subido = enBucket?.[0];
  if (!subido) return { error: "No se encontró el archivo subido" };
  const peso = (subido.metadata as { size?: number } | null)?.size ?? 0;
  const tope = esVideo ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (peso > tope) {
    await supabase.storage.from(BUCKET).remove([path]).then(() => {}, () => {});
    return { error: esVideo ? "El video supera los 50MB" : "La imagen supera los 5MB" };
  }

  // orden global = (máximo entre fijas y personalizadas de esa pantalla) + 1
  const [{ data: maxFija }, { data: maxPers }] = await Promise.all([
    supabase.from("placas_fijas").select("orden").eq("pantalla_id", pantallaId).order("orden", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("placas_personalizadas").select("orden").eq("pantalla_id", pantallaId).order("orden", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const orden = Math.max(maxFija?.orden ?? 0, maxPers?.orden ?? 0) + 1;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Póster: el admin genera el primer frame de los VIDEOS en el navegador y lo
  // manda como `poster` (JPEG). Lo subimos junto al video para que la cartelera
  // tape el hueco de carga sin negro en el TV. Si falla, seguimos sin póster
  // (la placa cae al modo directo, sin romper la subida).
  let posterUrl: string | null = null;
  let posterPath: string | null = null;
  if (esVideo && posterPathSubido && posterPathSubido.startsWith(`${pantallaId}/`)) {
    posterPath = posterPathSubido;
    posterUrl = supabase.storage.from(BUCKET).getPublicUrl(posterPathSubido).data.publicUrl;
  }

  const { error: insErr } = await supabase.from("placas_personalizadas").insert({
    pantalla_id: pantallaId,
    imagen_url: pub.publicUrl,
    imagen_path: path,
    poster_url: posterUrl,
    poster_path: posterPath,
    nombre,
    orden,
    duracion: Number.isFinite(duracion) && duracion > 0 ? duracion : 10,
    inicio,
    fin,
    created_by: user.id,
  });

  if (insErr) {
    // Rollback de los archivos si falló la fila
    const aBorrar = posterPath ? [path, posterPath] : [path];
    await supabase.storage.from(BUCKET).remove(aBorrar).then(() => {}, () => {});
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
    .select("imagen_path, poster_path")
    .eq("id", id)
    .maybeSingle();

  // Borrar los archivos primero (video/imagen + póster); si falla, log pero
  // igual borramos la fila.
  const paths = [fila?.imagen_path, fila?.poster_path].filter(Boolean) as string[];
  if (paths.length > 0) {
    const { error: stErr } = await supabase.storage.from(BUCKET).remove(paths);
    if (stErr) console.error("No se pudo borrar el archivo de Storage:", stErr.message);
  }

  const { error } = await supabase.from("placas_personalizadas").delete().eq("id", id);
  if (error) return { error: "Error al borrar la placa" };

  revalidatePath("/placas");
  return { ok: true };
}
