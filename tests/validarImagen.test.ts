import { describe, it, expect } from "vitest";
import { validarPlaca, validarVideo, esVideoUrl, MAX_BYTES, MAX_VIDEO_BYTES } from "@/lib/cartelera/validarImagen";

const base = { type: "image/png", size: 1_000_000, width: 1080, height: 1920 };

describe("validarPlaca", () => {
  it("acepta PNG 1080×1920 < 5MB", () => {
    expect(validarPlaca(base)).toEqual({ ok: true });
  });

  it("acepta JPG también", () => {
    expect(validarPlaca({ ...base, type: "image/jpeg" }).ok).toBe(true);
  });

  it("rechaza formato no permitido", () => {
    const r = validarPlaca({ ...base, type: "image/webp" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Formato/);
  });

  it("rechaza imágenes de más de 5MB", () => {
    const r = validarPlaca({ ...base, size: MAX_BYTES + 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/5MB/);
  });

  it("rechaza resolución menor a la mínima", () => {
    const r = validarPlaca({ ...base, width: 720, height: 1280 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Resolución/);
  });

  it("acepta pero advierte si la proporción no es 9:16", () => {
    // 1080×2400 supera el mínimo (1080×1920) pero es más alta que 9:16
    const r = validarPlaca({ ...base, width: 1080, height: 2400 });
    expect(r.ok).toBe(true);
    expect(r.warn).toMatch(/vertical/i);
  });

  it("acepta 9:16 exacto a mayor resolución sin warn", () => {
    const r = validarPlaca({ ...base, width: 1440, height: 2560 });
    expect(r).toEqual({ ok: true });
  });
});

const baseVid = { type: "video/mp4", size: 8_000_000, width: 1080, height: 1920 };

describe("validarVideo", () => {
  it("acepta MP4 1080×1920 dentro del límite", () => {
    expect(validarVideo(baseVid)).toEqual({ ok: true });
  });

  it("acepta WEBM", () => {
    expect(validarVideo({ ...baseVid, type: "video/webm" }).ok).toBe(true);
  });

  it("rechaza formato de video no permitido", () => {
    const r = validarVideo({ ...baseVid, type: "video/quicktime" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Formato/);
  });

  it("rechaza videos de más de 50MB", () => {
    const r = validarVideo({ ...baseVid, size: MAX_VIDEO_BYTES + 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/50MB/);
  });

  it("advierte (no bloquea) si la resolución es baja", () => {
    const r = validarVideo({ ...baseVid, width: 720, height: 1280 });
    expect(r.ok).toBe(true);
    expect(r.warn).toBeTruthy();
  });
});

describe("esVideoUrl", () => {
  it("detecta videos por extensión", () => {
    expect(esVideoUrl("https://x.co/placas/5/abc.mp4")).toBe(true);
    expect(esVideoUrl("https://x.co/a.webm?token=1")).toBe(true);
    expect(esVideoUrl("https://x.co/a.png")).toBe(false);
    expect(esVideoUrl("https://x.co/a.jpg")).toBe(false);
  });
});
