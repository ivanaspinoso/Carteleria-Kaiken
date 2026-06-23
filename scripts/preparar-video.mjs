#!/usr/bin/env node
/**
 * Prepara un video para subir como PLACA PERSONALIZADA.
 *
 * Lo re-encodea a un MP4 "TV-safe" que los Smart TV (Samsung/LG/Android TV)
 * reproducen sin problemas, evitando el bug típico de pantalla negra con
 * H.265/HEVC, perfiles altos o 10-bit:
 *   - H.264 (AVC), perfil Main, nivel 4.0, pixel format yuv420p (8-bit)
 *   - 1080×1920 vertical (rellena y recorta al centro)
 *   - sin audio (las placas van muteadas)
 *   - moov atom al inicio (+faststart) para que arranque por streaming
 *
 * Uso:
 *   node scripts/preparar-video.mjs <entrada.mp4> [salida.mp4]
 *   npm run video:tv -- <entrada.mp4> [salida.mp4]
 *
 * Requiere ffmpeg instalado.
 */

import { spawnSync } from "child_process";
import { existsSync, statSync } from "fs";
import { parse, join } from "path";

const entrada = process.argv[2];
if (!entrada) {
  console.error("Uso: node scripts/preparar-video.mjs <entrada.mp4> [salida.mp4]");
  process.exit(1);
}
if (!existsSync(entrada)) {
  console.error(`❌ No existe el archivo: ${entrada}`);
  process.exit(1);
}

const info = parse(entrada);
const salida = process.argv[3] ?? join(info.dir || ".", `${info.name}-tv.mp4`);

// ffmpeg: primero el binario portátil de 'ffmpeg-static', sino el del sistema.
let FFMPEG = "ffmpeg";
try {
  const mod = await import("ffmpeg-static");
  if (mod.default && existsSync(mod.default)) FFMPEG = mod.default;
} catch { /* sin ffmpeg-static: probamos con el del PATH */ }

if (spawnSync(FFMPEG, ["-version"], { encoding: "utf-8" }).error) {
  console.error("❌ Falta ffmpeg. Instalá el portátil:  npm install -D ffmpeg-static");
  console.error("   o el del sistema: winget install Gyan.FFmpeg / brew install ffmpeg");
  process.exit(1);
}

const args = [
  "-y",
  "-i", entrada,
  "-c:v", "libx264",
  "-profile:v", "main",
  "-level", "4.0",
  "-pix_fmt", "yuv420p",
  "-crf", "23",
  "-preset", "medium",
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
  "-an",
  "-movflags", "+faststart",
  salida,
];

console.log(`🎬  Procesando: ${entrada}`);
console.log(`→   Salida:     ${salida}\n`);

const r = spawnSync(FFMPEG, args, { stdio: "inherit" });
if (r.status !== 0) {
  console.error("\n❌ ffmpeg terminó con error.");
  process.exit(r.status ?? 1);
}

const mb = statSync(salida).size / (1024 * 1024);
console.log(`\n✅ Listo: ${salida}  (${mb.toFixed(1)} MB)`);
if (mb > 50) {
  console.log("⚠️  Supera los 50 MB (límite de subida). Bajá la calidad subiendo el CRF:");
  console.log("    editá el script y cambiá \"-crf\", \"23\" por \"26\" o \"28\".");
}
console.log("   Subilo en el admin → Placas → Personalizadas.");
