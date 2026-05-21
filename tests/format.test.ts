import { describe, it, expect } from "vitest";
import {
  formatPrecio,
  formatPrecioCorto,
  esCambioGrande,
  calcularVariacionPrecio,
  estaOnline,
} from "@/lib/format";

describe("formatPrecio", () => {
  it("formatea un precio en pesos argentinos", () => {
    const r = formatPrecio(1500);
    expect(r).toContain("1.500");
  });

  it("devuelve '' cuando el precio es null", () => {
    expect(formatPrecio(null)).toBe("");
  });

  it("devuelve 'Sin Stock' cuando sinStock es true", () => {
    expect(formatPrecio(1000, { sinStock: true })).toBe("Sin Stock");
  });

  it("sin stock ignora el valor del precio", () => {
    expect(formatPrecio(null, { sinStock: true })).toBe("Sin Stock");
  });

  it("agrega la unidad al final cuando se indica", () => {
    const r = formatPrecio(500, { unidad: "kg" });
    expect(r).toContain("/ kg");
  });

  it("sin stock tiene precedencia sobre precio null", () => {
    expect(formatPrecio(0, { sinStock: true })).toBe("Sin Stock");
  });
});

describe("formatPrecioCorto", () => {
  it("formatea sin símbolo de moneda", () => {
    const r = formatPrecioCorto(2000);
    expect(r).not.toContain("$");
    expect(r).toContain("2.000");
  });

  it("devuelve '' para null", () => {
    expect(formatPrecioCorto(null)).toBe("");
  });

  it("devuelve '' para undefined", () => {
    expect(formatPrecioCorto(undefined)).toBe("");
  });
});

describe("calcularVariacionPrecio", () => {
  it("calcula variación porcentual correctamente", () => {
    expect(calcularVariacionPrecio(100, 150)).toBeCloseTo(50);
  });

  it("variación en baja también es positiva (valor absoluto)", () => {
    expect(calcularVariacionPrecio(200, 100)).toBeCloseTo(50);
  });

  it("anterior 0 devuelve 100", () => {
    expect(calcularVariacionPrecio(0, 500)).toBe(100);
  });
});

describe("esCambioGrande", () => {
  it("es cambio grande si supera el umbral (50% por defecto)", () => {
    expect(esCambioGrande(100, 200)).toBe(true);
  });

  it("no es cambio grande si está por debajo del umbral", () => {
    expect(esCambioGrande(100, 140)).toBe(false);
  });

  it("acepta umbral personalizado", () => {
    expect(esCambioGrande(100, 120, 10)).toBe(true);
    expect(esCambioGrande(100, 108, 10)).toBe(false);
  });
});

describe("estaOnline", () => {
  it("devuelve true si la última conexión es reciente", () => {
    const hace30s = new Date(Date.now() - 30_000).toISOString();
    expect(estaOnline(hace30s)).toBe(true);
  });

  it("devuelve false si la última conexión supera el umbral (90s por defecto)", () => {
    const hace2min = new Date(Date.now() - 120_000).toISOString();
    expect(estaOnline(hace2min)).toBe(false);
  });

  it("devuelve false si ultima_conex es null", () => {
    expect(estaOnline(null)).toBe(false);
  });

  it("respeta un umbral personalizado", () => {
    const hace10s = new Date(Date.now() - 10_000).toISOString();
    expect(estaOnline(hace10s, 5_000)).toBe(false);
    expect(estaOnline(hace10s, 20_000)).toBe(true);
  });
});
