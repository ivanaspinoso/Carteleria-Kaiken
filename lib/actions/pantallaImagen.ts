"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TemplatePantalla } from "@/lib/types";
import { MAX_BYTES_PANTALLA } from "@/lib/cartelera/validarImagen";

export type Resultado = { error: string } | { ok: true };

const BUCKET = "pantallas-imagen";

/**
 * Página del admin desde la que se sube la imagen de cada pantalla horizontal.
 * Se usa para revalidar la ruta correcta: sin esto, subir desde /postres
 * revalidaba /sabores y el panel seguía mostrando la imagen vieja hasta un
 * refresh a mano.
 */
const PAGINA_ADMIN: Record<number, string> = {
  2: "/sabores",
  3: "/postres",
  4: "/cafeteria",
};

/**
 * Template "automático" de cada pantalla horizontal: el que dibuja el contenido
 * a partir de los productos cargados. Es a lo que se vuelve al salir del modo
 * imagen, y está acá (server) a propósito: el cliente NUNCA manda un template,
 * solo pide "imagen" o "automático". Así una pantalla no puede terminar con un
 * template que no le corresponde ni con uno inventado desde el navegador.
 */
const TEMPLATE_AUTOMATICO: Record<number, TemplatePantalla> = {
  2: "sabores-clasicos-especiales",
  3: "tamanos-postres",
  4: "cafeteria-pasteleria",
};

/**
 * Cambia una pantalla horizontal entre "modo imagen" y "modo automático".
 *
 * Es el interruptor que antes había que correr a mano en el SQL Editor de
 * Supabase (supabase/activar-horizontales-imagen.sql). El cambio sale al TV del
 * local en segundos por realtime, así que se confirma en el cliente antes de
 * llamar acá.
 *
 * Ida y vuelta son simétricos y no destruyen nada: los productos, precios y
 * stock nunca se tocan, y la imagen subida queda guardada en su tabla. Volver
 * al modo automático y regresar al de imagen deja todo como estaba.
 */
export async function cambiarModoPantalla(formData: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const pantallaId = Number(formData.get("pantalla_id"));
  const modo = String(formData.get("modo") ?? "");

  const templateAuto = TEMPLATE_AUTOMATICO[pantallaId];
  if (!templateAuto) return { error: "Esa pantalla no tiene modo imagen" };
  if (modo !== "imagen" && modo !== "automatico") return { error: "Modo inválido" };

  // Pasar a modo imagen SIN imagen subida dejaría el TV del local mostrando el
  // cartel de "No hay imagen cargada". Se corta acá.
  if (modo === "imagen") {
    const { data: img } = await supabase
      .from("pantallas_imagen")
      .select("pantalla_id")
      .eq("pantalla_id", pantallaId)
      .maybeSingle();
    if (!img) {
      return { error: "Primero subí una imagen: si no, el TV queda con un cartel de aviso." };
    }
  }

  const { error: updErr } = await supabase
    .from("pantallas")
    .update({ template: modo === "imagen" ? "imagen-unica" : templateAuto })
    .eq("id", pantallaId);

  if (updErr) return { error: "No se pudo cambiar el modo de la pantalla" };

  const pagina = PAGINA_ADMIN[pantallaId];
  if (pagina) revalidatePath(pagina);
  revalidatePath("/pantallas");
  return { ok: true };
}

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

  const pagina = PAGINA_ADMIN[pantallaId];
  if (pagina) revalidatePath(pagina);
  return { ok: true };
}
