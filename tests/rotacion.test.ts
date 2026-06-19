import { describe, it, expect } from "vitest";
import { calcularIndiceRotacion, dentroDeFechas } from "@/lib/cartelera/rotacion";

describe("calcularIndiceRotacion", () => {
  const trece = Array(13).fill(10); // 13 placas de 10s → ciclo 130s

  it("arranca en la placa 0 con now=0 y desfase=0", () => {
    expect(calcularIndiceRotacion(trece, 0, 0)).toBe(0);
  });

  it("avanza una placa cada 10s", () => {
    expect(calcularIndiceRotacion(trece, 10, 0)).toBe(1);
    expect(calcularIndiceRotacion(trece, 25, 0)).toBe(2);
    expect(calcularIndiceRotacion(trece, 125, 0)).toBe(12);
  });

  it("cicla al completar el ciclo total", () => {
    expect(calcularIndiceRotacion(trece, 130, 0)).toBe(0);
    expect(calcularIndiceRotacion(trece, 140, 0)).toBe(1);
  });

  it("el desfase de 30s adelanta 3 placas", () => {
    expect(calcularIndiceRotacion(trece, 0, 30)).toBe(3);
  });

  it("P1 (desfase 0) y P5 (desfase 30) NUNCA coinciden", () => {
    for (let now = 0; now < 130; now += 1) {
      const p1 = calcularIndiceRotacion(trece, now, 0);
      const p5 = calcularIndiceRotacion(trece, now, 30);
      expect(p1).not.toBe(p5);
    }
  });

  it("soporta duraciones distintas", () => {
    const dur = [5, 20, 5]; // ciclo 30s
    expect(calcularIndiceRotacion(dur, 0, 0)).toBe(0);
    expect(calcularIndiceRotacion(dur, 4, 0)).toBe(0);
    expect(calcularIndiceRotacion(dur, 5, 0)).toBe(1);
    expect(calcularIndiceRotacion(dur, 24, 0)).toBe(1);
    expect(calcularIndiceRotacion(dur, 25, 0)).toBe(2);
  });

  it("devuelve 0 con lista vacía o duración total 0", () => {
    expect(calcularIndiceRotacion([], 100, 0)).toBe(0);
    expect(calcularIndiceRotacion([0, 0], 100, 0)).toBe(0);
  });
});

describe("dentroDeFechas", () => {
  const now = new Date("2026-06-17T12:00:00Z").getTime();

  it("sin límites siempre está dentro", () => {
    expect(dentroDeFechas(null, null, now)).toBe(true);
  });

  it("respeta inicio futuro", () => {
    expect(dentroDeFechas("2026-06-18T00:00:00Z", null, now)).toBe(false);
    expect(dentroDeFechas("2026-06-01T00:00:00Z", null, now)).toBe(true);
  });

  it("respeta fin pasado", () => {
    expect(dentroDeFechas(null, "2026-06-10T00:00:00Z", now)).toBe(false);
    expect(dentroDeFechas(null, "2026-06-30T00:00:00Z", now)).toBe(true);
  });

  it("fin es inclusivo de todo el día elegido", () => {
    // fin = el mismo día (medianoche). Debe seguir vigente durante ese día.
    const mediodia17 = new Date("2026-06-17T12:00:00Z").getTime();
    expect(dentroDeFechas(null, "2026-06-17T00:00:00Z", mediodia17)).toBe(true);
    // recién al día siguiente queda fuera
    const dia18 = new Date("2026-06-18T01:00:00Z").getTime();
    expect(dentroDeFechas(null, "2026-06-17T00:00:00Z", dia18)).toBe(false);
  });
});
