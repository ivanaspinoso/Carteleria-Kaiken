// Utilidades de formateo — testeables con Vitest (ver tests/format.test.ts)

export function formatPrecio(
  precio: number | null | undefined,
  opciones?: { sinStock?: boolean; unidad?: string | null }
): string {
  if (opciones?.sinStock) return "Sin Stock";
  if (precio == null) return "";

  const formateado = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio);

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
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function estaOnline(ultimaConex: string | null, umbralMs = 90_000): boolean {
  if (!ultimaConex) return false;
  return Date.now() - new Date(ultimaConex).getTime() < umbralMs;
}
