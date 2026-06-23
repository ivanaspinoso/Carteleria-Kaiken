#!/usr/bin/env node
/**
 * Re-encodea TODOS los videos de public/placas/ a un MP4 "TV-safe":
 *   H.264 perfil Main, Level 4.0, yuv420p, faststart, sin audio.
 *
 * Los originales venían en High@Level 5.0, que muchos navegadores de Smart TV
 * (Samsung Tizen / LG webOS) rechazan → el video queda NEGRO en el TV aunque
 * en la compu se vea bien. Bajar el level a 4.0 lo arregla.
 *
 * Sobrescribe los archivos (git guarda el original como respaldo: si algo sale
 * mal, `git checkout public/placas/`).
 *
 * Uso:  node scripts/preparar-placas.mjs   |   npm run placas:tv
 * Requiere ffmpeg (winget install Gyan.FFmpeg / brew install ffmpeg).
 */
import { spawnSync } from "child_process";
import { existsSync, readdirSync, statSync, copyFileSync, rmSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "placas");

// ffmpeg: primero el binario portátil de 'ffmpeg-static', sino el del sistema.
let FFMPEG = "ffmpeg";
try {
  const mod = await import("ffmpeg-static");
  if (mod.default && existsSync(mod.default)) FFMPEG = mod.default;
} catch { /* sin ffmpeg-static: probamos con el del PATH */ }

if (spawnSync(FFMPEG, ["-version"]).error) {
  console.error("❌ Falta ffmpeg. Instalá el portátil:  npm install -D ffmpeg-static");
  console.error("   o el del sistema: winget install Gyan.FFmpeg / brew install ffmpeg");
  process.exit(1);
}

const videos = readdirSync(DIR).filter(
  (f) => f.toLowerCase().endsWith(".mp4") && !f.endsWith(".tmp.mp4")
);
if (videos.length === 0) {
  console.log("No hay .mp4 en public/placas/");
  process.exit(0);
}

let ok = 0;
for (const name of videos) {
  const src = join(DIR, name);
  const tmp = join(DIR, name.replace(/\.mp4$/i, ".tmp.mp4"));
  const antes = (statSync(src).size / 1024).toFixed(0);
  process.stdout.write(`🎬 ${name} (${antes} KB) … `);

  const r = spawnSync(
    FFMPEG,
    [
      "-y", "-i", src,
      "-c:v", "libx264", "-profile:v", "main", "-level", "4.0",
      "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow",
      "-an", "-movflags", "+faststart",
      tmp,
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  if (r.status !== 0) {
    console.log("ERROR");
    if (existsSync(tmp)) rmSync(tmp);
    console.error((r.stderr?.toString() ?? "").split("\n").slice(-4).join("\n"));
    continue;
  }

  copyFileSync(tmp, src); // sobrescribe el original (git es el respaldo)
  rmSync(tmp);
  const desp = (statSync(src).size / 1024).toFixed(0);
  console.log(`OK → ${desp} KB`);
  ok++;
}

console.log(`\n✅ ${ok}/${videos.length} videos re-encodeados a H.264 Main / Level 4.0.`);
console.log("   Probá uno en el TV; si andan, commiteá y deployá.");
