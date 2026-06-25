// ============================================================
// Validación de imágenes para placas personalizadas (verticales 9:16).
// La parte pura (validarPlaca) es testeable; leerDimensiones usa el DOM.
// ============================================================

export const FORMATOS_OK = ["image/jpeg", "image/jpg", "image/png"];
export const FORMATOS_VIDEO = ["video/mp4", "video/webm"];
export const MAX_BYTES = 5 * 1024 * 1024; // 5MB (imágenes)
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB (videos)
export const MIN_ANCHO = 1080;
export const MIN_ALTO = 1920;
export const RATIO_OBJETIVO = 9 / 16;
export const TOLERANCIA_RATIO = 0.1; // 10%

/** ¿La URL apunta a un video (por extensión)? */
export function esVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?.*)?$/i.test(url);
}

export interface MetaImagen {
  type: string;
  size: number;
  width: number;
  height: number;
}

export interface ResultadoValidacion {
  ok: boolean;
  error?: string; // bloquea el upload
  warn?: string; // permite pero advierte
}

/** Validación pura sobre los metadatos ya extraídos de la imagen. */
export function validarPlaca(meta: MetaImagen): ResultadoValidacion {
  if (!FORMATOS_OK.includes(meta.type)) {
    return { ok: false, error: "Formato inválido: solo JPG o PNG." };
  }
  if (meta.size > MAX_BYTES) {
    return { ok: false, error: "La imagen supera los 5MB." };
  }
  if (meta.width < MIN_ANCHO || meta.height < MIN_ALTO) {
    return { ok: false, error: `Resolución mínima ${MIN_ANCHO}×${MIN_ALTO} (vertical).` };
  }
  const ratio = meta.width / meta.height;
  const desvio = Math.abs(ratio - RATIO_OBJETIVO) / RATIO_OBJETIVO;
  if (desvio > TOLERANCIA_RATIO) {
    return { ok: true, warn: "La proporción no es 9:16 — puede verse recortada en pantalla." };
  }
  return { ok: true };
}

/** Validación pura de un video. Resolución/proporción son solo advertencia. */
export function validarVideo(meta: MetaImagen): ResultadoValidacion {
  if (!FORMATOS_VIDEO.includes(meta.type)) {
    return { ok: false, error: "Formato de video inválido: solo MP4 o WEBM." };
  }
  if (meta.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "El video supera los 50MB." };
  }
  if (meta.width < MIN_ANCHO || meta.height < MIN_ALTO) {
    return { ok: true, warn: `Se recomienda al menos ${MIN_ANCHO}×${MIN_ALTO} (vertical).` };
  }
  const ratio = meta.width / meta.height;
  const desvio = Math.abs(ratio - RATIO_OBJETIVO) / RATIO_OBJETIVO;
  if (desvio > TOLERANCIA_RATIO) {
    return { ok: true, warn: "La proporción no es 9:16 — puede verse recortado en pantalla." };
  }
  return { ok: true };
}

/** Lee dimensiones de un video en el browser (metadata). */
export function leerDimensionesVideo(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: v.videoWidth, height: v.videoHeight });
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer el video."));
    };
    v.src = url;
  });
}

/**
 * Genera el PÓSTER (primer frame) de un video en el navegador: dibuja el cuadro
 * inicial en un canvas y devuelve un JPEG. La cartelera lo usa para tapar el
 * hueco de carga del <video> sin que aparezca negro en el Smart TV (el canvas
 * SÍ funciona acá, en el admin: decodifica por software). Devuelve null si no
 * se pudo (no rompe la subida; la placa simplemente cae al modo sin póster).
 */
export function generarPosterVideo(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    let listo = false;

    const limpiar = () => URL.revokeObjectURL(url);
    const fallar = () => {
      if (listo) return;
      listo = true;
      limpiar();
      resolve(null);
    };

    const capturar = () => {
      if (listo) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || !canvas.width || !canvas.height) return fallar();
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        listo = true;
        canvas.toBlob(
          (blob) => {
            limpiar();
            resolve(blob);
          },
          "image/jpeg",
          0.85
        );
      } catch {
        fallar();
      }
    };

    // Buscar el primer cuadro real (seek a 0) y capturarlo.
    v.onloadeddata = () => {
      if (v.readyState >= 2) {
        try {
          v.currentTime = 0;
        } catch {
          capturar();
        }
      }
    };
    v.onseeked = capturar;
    v.onerror = fallar;
    // Red de seguridad por si no llegan los eventos.
    setTimeout(fallar, 5000);
    v.src = url;
  });
}

/** Lee dimensiones de un File en el browser (URL.createObjectURL + Image). */
export function leerDimensiones(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

/** Valida un File completo (imagen o video) leyendo dimensiones del DOM. */
export async function validarArchivoPlaca(file: File): Promise<ResultadoValidacion> {
  // ── Video ──
  if (FORMATOS_VIDEO.includes(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: "El video supera los 50MB." };
    try {
      const { width, height } = await leerDimensionesVideo(file);
      return validarVideo({ type: file.type, size: file.size, width, height });
    } catch {
      return { ok: false, error: "No se pudo leer el video." };
    }
  }

  // ── Imagen ──
  const previo = validarPlaca({ type: file.type, size: file.size, width: MIN_ANCHO, height: MIN_ALTO });
  if (!previo.ok) return previo;
  try {
    const { width, height } = await leerDimensiones(file);
    return validarPlaca({ type: file.type, size: file.size, width, height });
  } catch {
    return { ok: false, error: "No se pudo leer la imagen." };
  }
}
