import { createClient } from "@/lib/supabase/client";

/**
 * Telemetría de las transiciones de placa.
 *
 * El destello negro entre placas solo pasa en las Smart TV del local: en
 * Chromium de escritorio está medido que NO ocurre. Y hacer que alguien abra la
 * pantalla con `?diag=1` y filme no es práctico (el navegador del TV se maneja
 * con el control remoto). Así que la TV deja registrada cada transición rara en
 * la tabla `diag_transiciones` y el diagnóstico se lee desde acá.
 *
 * Es TEMPORAL: cuando el problema esté cerrado, borrar la tabla y este archivo.
 */
export type DiagTransicion = {
  pantalla: number;
  slug: string;
  espera_poster_ms: number;
  hueco_ms: number;
  carga_ms: number;
  desde_blob: boolean;
  eventos: string;
  repitio: boolean;
};

// Hueco (póster quieto tapando) a partir del cual la transición se considera
// mala. Local, con todo en cache, da 120-180ms.
const HUECO_MALO_MS = 400;

// De las transiciones sanas se manda 1 de cada 10, para tener referencia de
// cuánto tarda la TV cuando sale bien.
const UNA_DE_CADA = 10;

let contador = 0;
let apagado = false;

export function registrarTransicion(fila: DiagTransicion): void {
  if (apagado || typeof window === "undefined") return;

  const anomala =
    fila.hueco_ms > HUECO_MALO_MS || fila.repitio || fila.eventos.length > 0;
  contador++;
  if (!anomala && contador % UNA_DE_CADA !== 0) return;

  try {
    const supabase = createClient();
    void supabase
      .from("diag_transiciones")
      .insert(fila as never)
      .then(({ error }) => {
        // Si la tabla no existe (todavía no se corrió la migración) o RLS la
        // bloquea, no tiene sentido seguir intentando en cada placa.
        if (error) apagado = true;
      });
  } catch {
    apagado = true;
  }
}
