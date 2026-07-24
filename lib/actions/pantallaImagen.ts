"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FORMATOS_OK, MAX_BYTES_PANTALLA } from "@/lib/cartelera/validarImagen";

export type Resultado = { error: string } | { ok: true };

const BUCKET = "pantallas-imagen";

/**
 * Sube (o reemplaza) la imagen única de una pantalla.
 *
 * El archivo nuevo se sube con un nombre nuevo — nunca se pisa el anterior —
 * y recién cuando la fila quedó apuntando al nuevo se borra el viejo. Así, si
 * algo falla en el medio, la cartelera nunca queda apuntando a un archivo que
 * ya no existe (se vería el placeholder en el TV).
 */
export async function subirImagenPantalla(formData: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const file = formData.get("file");
  const pantallaId = Number(formData.get("pantalla_id"));

  if (!(file instanceof File) || file.size === 0) return { error: "Falta el archivo" };
  if (!Number.isInteger(pantallaId) || pantallaId < 1) return { error: "Pantalla inválida" };

  // Re-chequeo en el server (el del navegador no es garantía).
  if (!FORMATOS_OK.includes(file.type)) return { error: "Formato inválido (solo JPG o PNG)" };
  if (file.size > MAX_BYTES_PANTALLA) return { error: "La imagen supera los 10MB" };

  // Path anterior, para borrarlo después de que la fila apunte al nuevo.
  const { data: actual } = await supabase
    .from("pantallas_imagen")
    .select("imagen_path")
    .eq("pantalla_id", pantallaId)
    .maybeSingle();

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${pantallaId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return { error: "Error al subir la imagen" };

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
