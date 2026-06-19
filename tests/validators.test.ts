import { describe, it, expect } from "vitest";
import {
  precioSchema,
  productoSchema,
  promoSchema,
  loginSchema,
  categoriaSchema,
} from "@/lib/validators";

describe("precioSchema", () => {
  it("acepta null (sin precio)", () => {
    expect(precioSchema.safeParse(null).success).toBe(true);
  });

  it("acepta un precio válido", () => {
    expect(precioSchema.safeParse(1500).success).toBe(true);
  });

  it("rechaza precio menor a 0.5", () => {
    const r = precioSchema.safeParse(0.4);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("0,50");
  });

  it("rechaza precio mayor a 100.000", () => {
    const r = precioSchema.safeParse(100_001);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("100.000");
  });

  it("rechaza strings", () => {
    expect(precioSchema.safeParse("1000").success).toBe(false);
  });
});

describe("productoSchema", () => {
  // UUID v4 válido: tercer grupo empieza con 4, cuarto con 8/9/a/b
  const base = {
    nombre: "Vainilla",
    precio: 1200,
    precio_alt: null,
    en_stock: true,
    destacado: false,
    orden: 0,
    categoria_id: "550e8400-e29b-41d4-a716-446655440001",
  };

  it("acepta un producto válido", () => {
    expect(productoSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza nombre vacío", () => {
    const r = productoSchema.safeParse({ ...base, nombre: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza categoria_id que no es UUID válido", () => {
    const r = productoSchema.safeParse({ ...base, categoria_id: "no-uuid" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("inválida");
  });

  it("rechaza orden negativo", () => {
    expect(productoSchema.safeParse({ ...base, orden: -1 }).success).toBe(false);
  });

  it("permite descripcion y unidad opcionales", () => {
    expect(productoSchema.safeParse({ ...base, descripcion: "Cremosa", unidad: "kg" }).success).toBe(true);
  });
});

describe("promoSchema", () => {
  const base = {
    tipo: "sabor_semana" as const,
    titulo: "Promo del mes",
    activa: true,
    orden: 0,
  };

  it("acepta una promo válida", () => {
    expect(promoSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza tipo no permitido", () => {
    expect(promoSchema.safeParse({ ...base, tipo: "descuento" }).success).toBe(false);
  });

  it("rechaza título vacío", () => {
    expect(promoSchema.safeParse({ ...base, titulo: "" }).success).toBe(false);
  });

  it("acepta contenido y producto_id opcionales", () => {
    const r = promoSchema.safeParse({
      ...base,
      contenido: "Descuentos toda la semana",
      producto_id: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(r.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    expect(loginSchema.safeParse({ email: "admin@local.com", password: "secret123" }).success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const r = loginSchema.safeParse({ email: "no-es-email", password: "secret123" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("inválido");
  });

  it("rechaza contraseña menor a 6 caracteres", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("6");
  });
});

describe("categoriaSchema", () => {
  it("acepta todos los tipos de categoría válidos", () => {
    const tipos = [
      "helado", "combo",
      "helado-clasico", "helado-especial", "tamano", "postre", "cafeteria", "pasteleria",
    ] as const;
    for (const tipo of tipos) {
      expect(categoriaSchema.safeParse({ nombre: "Test", tipo, orden: 0, activa: true }).success).toBe(true);
    }
  });

  it("rechaza tipo desconocido", () => {
    expect(
      categoriaSchema.safeParse({ nombre: "Test", tipo: "bebida", orden: 0, activa: true }).success
    ).toBe(false);
  });
});
