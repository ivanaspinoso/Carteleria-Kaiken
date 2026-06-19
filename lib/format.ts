// Utilidades de formateo — testeables con Vitest (ver tests/format.test.ts)

export function formatPrecio(
  precio: number | null | undefined,
  opciones?: { sinStock?: boolean; unidad?: string | null }
): string {
  if (opciones?.sinStock) return "Sin Stock";
  if (precio == null) return "";

  // Formato argentino sin espacio entre el "$" y el número, punto como
  // separador de miles: 23000 → "$23.000".
  const numero = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio);
  const formateado = `$${numero}`;

  if (opciones?.unidad) return `${formateado} / ${opciones.unidad}`;
  return formateado;
}

export function formatPrecioCorto(precio: number | null | undefined): string {
  if (precio == null) return "";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio);
}

export function calcularVariacionPrecio(anterior: number, nuevo: number): number {
  if (anterior === 0) return 100;
  return Math.abs((nuevo - anterior) / anterior) * 100;
}

export function esCambioGrande(anterior: number, nuevo: number, umbral = 50): boolean {
  return calcularVariacionPrecio(anterior, nuevo) > umbral;
}

export function formatFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatFecha(iso: string): string {
  // Formato numérico DD/MM/AAAA (sin nombre de mes), p. ej. 19/01/2026.
  // Se toma la parte de fecha del ISO directamente para evitar el corrimiento
  // de día por zona horaria (una fecha "date-only" se parsea como UTC y en
  // Argentina caería un día antes).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function estaOnline(ultimaConex: string | null, umbralMs = 90_000): boolean {
  if (!ultimaConex) return false;
  return Date.now() - new Date(ultimaConex).getTime() < umbralMs;
}
