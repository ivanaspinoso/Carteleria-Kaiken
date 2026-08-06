import { Muxer, ArrayBufferTarget } from "mp4-muxer";

/**
 * Recodifica en el NAVEGADOR una placa personalizada al formato canónico, para
 * que pueda reproducirse dentro del flujo continuo (MSE) igual que las fijas.
 *
 * Por qué acá y no en el servidor: el archivo va directo del navegador a
 * Storage (los server actions no bancan el peso: 1MB de Next, 4,5MB de Vercel)
 * y no hay ffmpeg en ningún lado — el proyecto es Vercel + Supabase y nada más.
 *
 * Qué hace: toma el video vertical que sube el dueño, en el formato que venga, y
 * saca dos archivos con la MISMA forma que tienen las 13 placas fijas:
 *  - horneado APAISADO 1920×1080 (las verticales se rotan 90° por software con
 *    .rotador-90, así que el video ya viene acostado y la pantalla lo endereza
 *    junto con el texto),
 *  - H.264 High 4.0, 30fps, sin audio,
 *  - fragmentado, partido en init segment + media segment.
 *
 * El init NO va a coincidir byte a byte con el de las fijas (lo genera el
 * encoder del navegador, no x264), así que el reproductor appendea el init
 * propio de esta placa antes de su segmento. El decoder se reconfigura una vez
 * al entrar y otra al salir, no en cada placa como pasaba antes.
 *
 * Si el navegador no tiene WebCodecs, esto no corre: la placa se sube igual y la
 * pantalla la reproduce con el modo viejo. Ver `soportaRecodificar`.
 */

// El mismo perfil/nivel que las fijas: H.264 High, nivel 4.0.
export const CODEC_CANONICO = "avc1.640028";
export const ANCHO = 1920;
export const ALTO = 1080;
export const FPS = 30;
// A 10s por placa da ~2,5MB, en línea con lo que pesan los segmentos de las
// fijas (0,15-0,9MB) sin arriesgar que se vea peor que el original.
const BITRATE = 2_000_000;
// Techo de seguridad: una placa dura 10s. Si suben algo largo por error, no
// dejamos al navegador recodificando cinco minutos.
const MAX_SEGUNDOS = 30;

export type ProgresoRecodificacion = {
  fase: "preparando" | "recodificando" | "empaquetando";
  // 0 a 1, solo durante "recodificando".
  avance: number;
};

export type PlacaRecodificada = {
  init: Blob;
  segmento: Blob;
  ancho: number;
  alto: number;
  duracion: number;
};

type VentanaWebCodecs = {
  VideoEncoder?: typeof VideoEncoder;
  VideoFrame?: typeof VideoFrame;
};

/** ¿Este navegador puede recodificar? (WebCodecs + el perfil que necesitamos) */
export async function soportaRecodificar(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const w = window as unknown as VentanaWebCodecs;
  if (!w.VideoEncoder || !w.VideoFrame) return false;
  try {
    const r = await VideoEncoder.isConfigSupported({
      codec: CODEC_CANONICO,
      width: ANCHO,
      height: ALTO,
      framerate: FPS,
      bitrate: BITRATE,
      avc: { format: "avc" },
    });
    return !!r.supported;
  } catch {
    return false;
  }
}

/** Carga el archivo en un <video> y espera a tener metadata. */
function abrirVideo(file: File): Promise<{ v: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    const limpiar = () => {
      v.onloadedmetadata = null;
      v.onerror = null;
    };
    v.onloadedmetadata = () => {
      limpiar();
      resolve({ v, url });
    };
    v.onerror = () => {
      limpiar();
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer el video"));
    };
  });
}

/** Posiciona el <video> en un tiempo exacto y espera a que el cuadro esté ahí. */
function irA(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const listo = () => {
      v.onseeked = null;
      v.onerror = null;
      resolve();
    };
    v.onseeked = listo;
    v.onerror = () => {
      v.onseeked = null;
      reject(new Error("El video falló mientras se recodificaba"));
    };
    v.currentTime = Math.min(t, Math.max(0, v.duration - 0.001));
  });
}

/** Encuentra el primer `moof`: ahí termina el init y empieza el media segment. */
function partirFragmentado(buf: ArrayBuffer): { init: ArrayBuffer; media: ArrayBuffer } {
  const dv = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let p = 0;
  while (p + 8 <= bytes.length) {
    const size = dv.getUint32(p);
    const tipo = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    if (tipo === "moof") break;
    if (size < 8) throw new Error("mp4 ilegible");
    p += size;
  }
  if (p === 0 || p >= bytes.length) throw new Error("El mp4 no quedó fragmentado");
  return { init: buf.slice(0, p), media: buf.slice(p) };
}

/**
 * Recodifica el archivo. Devuelve el init y el media segment listos para subir.
 * Lanza si el navegador no puede: el que llama debe seguir sin esto.
 */
export async function recodificarPlaca(
  file: File,
  onProgreso?: (p: ProgresoRecodificacion) => void
): Promise<PlacaRecodificada> {
  if (!(await soportaRecodificar())) {
    throw new Error("Este navegador no puede preparar el video");
  }

  onProgreso?.({ fase: "preparando", avance: 0 });
  const { v, url } = await abrirVideo(file);

  try {
    const duracion = Math.min(v.duration || 0, MAX_SEGUNDOS);
    if (!Number.isFinite(duracion) || duracion <= 0) {
      throw new Error("El video no tiene duración válida");
    }
    const totalCuadros = Math.max(1, Math.round(duracion * FPS));

    const lienzo = document.createElement("canvas");
    lienzo.width = ANCHO;
    lienzo.height = ALTO;
    const ctx = lienzo.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("No se pudo crear el lienzo");

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width: ANCHO, height: ALTO },
      // Fragmentado: es el único formato que MSE puede appendear.
      fastStart: "fragmented",
    });

    let errorEncoder: Error | null = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        errorEncoder = e instanceof Error ? e : new Error(String(e));
      },
    });
    encoder.configure({
      codec: CODEC_CANONICO,
      width: ANCHO,
      height: ALTO,
      framerate: FPS,
      bitrate: BITRATE,
      // 'avc' (no 'annexb'): así el chunk trae el avcC que el muxer necesita.
      avc: { format: "avc" },
      latencyMode: "quality",
    });

    onProgreso?.({ fase: "recodificando", avance: 0 });

    for (let i = 0; i < totalCuadros; i++) {
      if (errorEncoder) throw errorEncoder;
      await irA(v, i / FPS);

      // Hornear la rotación: el video llega vertical y las placas fijas están
      // guardadas acostadas, porque la pantalla entera se rota 90° por software.
      // Sin esto, la personalizada saldría girada respecto de las demás.
      ctx.save();
      ctx.translate(ANCHO, 0);
      ctx.rotate(Math.PI / 2);
      // En el sistema ya rotado el destino mide ALTO×ANCHO (1080×1920), que es
      // la forma vertical del archivo original: entra sin deformarse.
      dibujarCubriendo(ctx, v, ALTO, ANCHO);
      ctx.restore();

      const cuadro = new VideoFrame(lienzo, {
        timestamp: Math.round((i * 1_000_000) / FPS),
        duration: Math.round(1_000_000 / FPS),
      });
      // Un keyframe al principio y nada más: es lo único que MSE necesita, y los
      // keyframes son lo caro de un H.264.
      encoder.encode(cuadro, { keyFrame: i === 0 });
      cuadro.close();

      // Sin esto la cola del encoder crece sin límite y el celular se queda sin
      // memoria antes de terminar.
      if (encoder.encodeQueueSize > 8) {
        await new Promise((r) => setTimeout(r, 0));
        while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 15));
      }
      if (i % 5 === 0) onProgreso?.({ fase: "recodificando", avance: i / totalCuadros });
    }

    onProgreso?.({ fase: "empaquetando", avance: 1 });
    await encoder.flush();
    encoder.close();
    if (errorEncoder) throw errorEncoder;

    muxer.finalize();
    const salida = (muxer.target as ArrayBufferTarget).buffer;
    if (!salida) throw new Error("El empaquetado no devolvió nada");

    const { init, media } = partirFragmentado(salida);
    return {
      init: new Blob([init], { type: "video/mp4" }),
      segmento: new Blob([media], { type: "video/iso.segment" }),
      ancho: ANCHO,
      alto: ALTO,
      duracion: totalCuadros / FPS,
    };
  } finally {
    v.pause();
    v.removeAttribute("src");
    v.load();
    URL.revokeObjectURL(url);
  }
}

/** Dibuja el video cubriendo el destino (como object-fit: cover). */
function dibujarCubriendo(
  ctx: CanvasRenderingContext2D,
  v: HTMLVideoElement,
  anchoDestino: number,
  altoDestino: number
) {
  const sw = v.videoWidth;
  const sh = v.videoHeight;
  if (!sw || !sh) return;
  const escala = Math.max(anchoDestino / sw, altoDestino / sh);
  const w = sw * escala;
  const h = sh * escala;
  ctx.drawImage(v, (anchoDestino - w) / 2, (altoDestino - h) / 2, w, h);
}
