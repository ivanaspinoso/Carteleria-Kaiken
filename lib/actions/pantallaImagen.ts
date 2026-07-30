"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_BYTES_PANTALLA } from "@/lib/cartelera/validarImagen";

export type Resultado = { error: string } | { ok: true };

const BUCKET = "pantallas-imagen";

/**
 * Registra (o reemplaza) la imagen única de una pantalla.
 *
 * El archivo NO viaja por acá: lo sube el navegador directo a Supabase Storage y
 * este action recibe sólo la ruta. Antes se mandaba el File dentro del server
 * action y eso rompía: los server actions de Next aceptan 1MB por defecto y
 * Vercel corta en 4,5MB, así que cualquier imagen un poco pesada explotaba con
 * un error sin atrapar → el dueño veía "Application error: a client-side
 * exception has occurred". La única imagen que había entrado pesaba 231KB.
 *
 * El archivo nuevo se sube con un nombre nuevo — nunca se pisa el anterior — y
 * recién cuando la fila quedó apuntando al nuevo se borra el viejo. Así, si algo
 * falla en el medio, la cartelera nunca queda apuntando a un archivo que ya no
 * existe (se vería el placeholder en el TV).
 */
export async function subirImagenPantalla(formData: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const path = String(formData.get("path") ?? "");
  const pantallaId = Number(formData.get("pantalla_id"));

  if (!path) return { error: "Falta el archivo" };
  if (!Number.isInteger(pantallaId) || pantallaId < 1) return { error: "Pantalla inválida" };
  // La ruta la arma el navegador: se verifica que caiga en la carpeta de ESTA
  // pantalla y que la extensión sea de las permitidas.
  if (!path.startsWith(`${pantallaId}/`) || path.includes("..")) {
    return { error: "Ruta inválida" };
  }
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (!["jpg", "jpeg", "png"].includes(extension)) {
    return { error: "Formato inválido (solo JPG o PNG)" };
  }

  // Que el archivo exista de verdad y no supere el máximo. Si el navegador
  // mandó una ruta de un archivo que nunca subió, se corta acá.
  const { data: enBucket } = await supabase.storage
    .from(BUCKET)
    .list(String(pantallaId), { search: path.split("/").pop() });
  const subido = enBucket?.[0];
  if (!subido) return { error: "No se encontró el archivo subido" };
  const peso = (subido.metadata as { size?: number } | null)?.size ?? 0;
  if (peso > MAX_BYTES_PANTALLA) {
    await supabase.storage.from(BUCKET).remove([path]).then(() => {}, () => {});
    return { error: "La imagen supera los 10MB" };
  }

  // Path anterior, para borrarlo después de que la fila apunte al nuevo.
  const { data: actual } = await supabase
    .from("pantallas_imagen")
    .select("imagen_path")
    .eq("pantalla_id", pantallaId)
    .maybeSingle();

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: insErr } = await supabase.from("pantallas_imagen").upsert(
    {
      pantalla_id: pantallaId,
      imagen_url: pub.publicUrl,
      imagen_path: path,
      actualizada_en: new Date().toISOString(),
      actualizada_por: user.id,
    },
    { onConflict: "pantalla_id" }
  );

  if (insErr) {
    // Rollback: la fila sigue apuntando a la imagen vieja, así que el archivo
    // nuevo no sirve para nada.
    await supabase.storage.from(BUCKET).remove([path]).then(() => {}, () => {});
    return { error: "Error al guardar la imagen" };
  }

  // Recién ahora se puede borrar la vieja. Si falla, no es grave (queda un
  // archivo huérfano en el bucket) — la pantalla ya muestra la nueva.
  if (actual?.imagen_path && actual.imagen_path !== path) {
    const { error: delErr } = await supabase.storage.from(BUCKET).remove([actual.imagen_path]);
    if (delErr) console.error("No se pudo borrar la imagen anterior:", delErr.message);
  }

  revalidatePath("/sabores");
  return { ok: true };
}
