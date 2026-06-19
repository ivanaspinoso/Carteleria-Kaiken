// ============================================================
// Lógica de rotación de placas con desfase — pura y testeable.
// ============================================================

/**
 * Calcula qué placa toca mostrar según el reloj y el desfase de la pantalla.
 *
 * Es determinístico por reloj: ambas pantallas verticales usan el mismo
 * `nowSeg` pero distinto `desfaseSeg` (P1=0, P5=30), así nunca muestran la
 * misma placa al mismo tiempo (siempre que el desfase no sea múltiplo del
 * ciclo total).
 *
 * Soporta duraciones distintas por placa.
 *
 * @param duraciones segundos de cada placa, en orden
 * @param nowSeg     tiempo actual en segundos (Date.now()/1000)
 * @param desfaseSeg desfase de la pantalla en segundos
 * @returns índice de la placa activa (0..n-1), o 0 si no hay placas
 */
export function calcularIndiceRotacion(
  duraciones: number[],
  nowSeg: number,
  desfaseSeg: number
): number {
  const n = duraciones.length;
  if (n === 0) return 0;

  const total = duraciones.reduce((acc, d) => acc + (d > 0 ? d : 0), 0);
  if (total <= 0) return 0;

  // Módulo positivo (nowSeg podría ser grande; desfase siempre >= 0)
  let t = (((nowSeg + desfaseSeg) % total) + total) % total;

  for (let i = 0; i < n; i++) {
    const d = duraciones[i] > 0 ? duraciones[i] : 0;
    if (t < d) return i;
    t -= d;
  }
  return n - 1;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * ¿La placa está dentro de su ventana de fechas? (null = sin límite)
 *
 * `fin` es INCLUSIVO del día elegido: una fecha "2026-06-19" (que llega como
 * medianoche) vale durante todo ese día, hasta el final. Si se comparara
 * directamente, la placa vencería al instante de empezar el día indicado.
 */
export function dentroDeFechas(
  inicio: string | null,
  fin: string | null,
  nowMs: number
): boolean {
  if (inicio && new Date(inicio).getTime() > nowMs) return false;
  if (fin && new Date(fin).getTime() + UN_DIA_MS <= nowMs) return false;
  return true;
}
