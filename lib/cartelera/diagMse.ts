import { createClient } from "@/lib/supabase/client";

/**
 * Sonda de soporte de MSE (MediaSource) en las TV del local.
 *
 * Por qué: hoy las verticales reproducen UN mp4 con las placas pegadas. Anda
 * bien, pero se hornea: si el dueño activa, desactiva o reordena una placa desde
 * el panel, el manifiesto deja de coincidir y la pantalla se cae sola al modo de
 * a una placa, con los 600-800ms de freeze del decoder en CADA cambio. Y falla
 * en silencio.
 *
 * MSE lo resuelve de raíz: el <video> se abre una vez contra un MediaSource y se
 * le hace appendBuffer() de cada placa; el decoder no se reinicia nunca, así que
 * el orden de las placas pasa a ser un dato y no algo horneado en un archivo.
 * Pero antes hay que saber si el Samsung lo banca — el decoder de estas TV ya
 * nos sorprendió una vez (el límite de altura de 1088px).
 *
 * Esta sonda NO decodifica nada: solo pregunta por las capacidades y prueba
 * crear un SourceBuffer sobre un <video> que no está en el DOM. No toca el
 * reproductor de la cartelera ni ocupa el plano de video del TV.
 *
 * Es TEMPORAL, igual que ./diag.ts: cuando esté decidido, borrar.
 */

// El formato real de las 13 placas: H.264 High (0x64) nivel 4.0 (0x28), sin audio.
const CODEC_PLACAS = 'video/mp4; codecs="avc1.640028"';
// Control: Baseline 3.0, el perfil más conservador que existe. Si ni esto da
// true, el "false" del de arriba no significa "no soporta High", significa que
// isTypeSupported no es confiable en este equipo.
const CODEC_CONTROL = 'video/mp4; codecs="avc1.42E01E"';

type Reporte = {
  mediaSource: boolean;
  soportaPlacas: boolean;
  soportaControl: boolean;
  // Se pudo abrir un MediaSource y crear el SourceBuffer del formato real.
  sourceBuffer: boolean;
  // Se pudo poner mode="sequence" (lo que reescribe los timestamps al pegar una
  // placa atrás de otra sin recalcular nada).
  modoSecuencia: boolean;
  error?: string;
};

/** Crea un SourceBuffer del formato real y lo descarta. No decodifica. */
function probarSourceBuffer(): Promise<{ sourceBuffer: boolean; modoSecuencia: boolean; error?: string }> {
  return new Promise((resolve) => {
    let listo = false;
    const terminar = (r: { sourceBuffer: boolean; modoSecuencia: boolean; error?: string }) => {
      if (listo) return;
      listo = true;
      resolve(r);
    };

    // Si el TV se queda colgado en "opening", no dejamos la promesa viva.
    const reloj = setTimeout(() => terminar({ sourceBuffer: false, modoSecuencia: false, error: "timeout" }), 4000);

    try {
      const ms = new MediaSource();
      // Un <video> que NUNCA entra al DOM y al que no se le llama play():
      // alcanza para que el MediaSource pase a "open", sin usar el decoder.
      const v = document.createElement("video");
      const url = URL.createObjectURL(ms);
      v.src = url;

      ms.addEventListener("sourceopen", () => {
        let sourceBuffer = false;
        let modoSecuencia = false;
        let error: string | undefined;
        try {
          const sb = ms.addSourceBuffer(CODEC_PLACAS);
          sourceBuffer = true;
          try {
            sb.mode = "sequence";
            modoSecuencia = sb.mode === "sequence";
          } catch (e) {
            error = `mode: ${e instanceof Error ? e.message : String(e)}`;
          }
        } catch (e) {
          error = `addSourceBuffer: ${e instanceof Error ? e.message : String(e)}`;
        }
        clearTimeout(reloj);
        URL.revokeObjectURL(url);
        v.removeAttribute("src");
        terminar({ sourceBuffer, modoSecuencia, error });
      });
    } catch (e) {
      clearTimeout(reloj);
      terminar({
        sourceBuffer: false,
        modoSecuencia: false,
        error: `MediaSource: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  });
}

let yaCorrio = false;

/**
 * Corre la sonda y deja el resultado en `diag_transiciones` (slug `_mse-probe`),
 * para poder leerlo desde afuera con la anon key sin ir al local.
 *
 * Manda UNA fila por pantalla por día: las TV recargan sola a las 4am y no
 * queremos que un bucle de recargas llene la tabla.
 */
export async function registrarSoporteMse(pantalla: number): Promise<void> {
  if (typeof window === "undefined" || yaCorrio) return;
  yaCorrio = true;

  const hoy = new Date().toISOString().slice(0, 10);
  const marca = `mse-probe-${pantalla}-${hoy}`;
  try {
    if (localStorage.getItem(marca)) return;
  } catch {
    // Sin localStorage (modo privado del TV): se manda igual, es una fila.
  }

  const hayMs = typeof window.MediaSource !== "undefined";
  const reporte: Reporte = {
    mediaSource: hayMs,
    soportaPlacas: hayMs && MediaSource.isTypeSupported(CODEC_PLACAS),
    soportaControl: hayMs && MediaSource.isTypeSupported(CODEC_CONTROL),
    sourceBuffer: false,
    modoSecuencia: false,
  };

  if (reporte.soportaPlacas) {
    const r = await probarSourceBuffer();
    reporte.sourceBuffer = r.sourceBuffer;
    reporte.modoSecuencia = r.modoSecuencia;
    if (r.error) reporte.error = r.error;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from("diag_transiciones").insert({
      pantalla,
      slug: "_mse-probe",
      espera_poster_ms: 0,
      hueco_ms: 0,
      carga_ms: 0,
      desde_blob: false,
      // La tabla es de transiciones; reusamos `eventos` (text) como payload en
      // vez de migrar una tabla que es temporal igual.
      eventos: JSON.stringify({ ...reporte, ua: navigator.userAgent.slice(0, 180) }),
      repitio: false,
    } as never);
    if (!error) {
      try {
        localStorage.setItem(marca, "1");
      } catch {
        /* ver arriba */
      }
    }
  } catch {
    // Diagnóstico: si no se puede reportar, no pasa nada.
  }
}
