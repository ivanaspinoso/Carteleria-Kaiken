// Genera PNGs placeholder (cuadrado de color + texto) para sabores especiales
// e íconos de vasos/kilos, para que la cartelera funcione visualmente durante
// el desarrollo hasta que Mora entregue los assets reales.
//
// Uso: node scripts/generate-placeholders.mjs
//
// NO sobrescribe archivos existentes: si un slug ya tiene asset real, lo respeta.
// TODO: reemplazar estos PNGs por los assets reales cuando lleguen:
//   - public/sabores/  → potecitos de los sabores especiales (YA reales)
//   - public/iconos/   → íconos de vasos y kilos (YA reales)
//   - public/placas/   → imágenes de las 13 placas verticales (placeholder)
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Paleta de fondos (se rota para distinguir visualmente los placeholders)
const FONDOS = ["#5A2828", "#A8956A", "#7A5C3E", "#8C6570", "#4E5A3E", "#6B4A50"];

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Word-wrap simple: parte el texto en líneas de <= maxChars
function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

// Placeholder con fondo TRANSPARENTE (para imágenes que van sobre el color
// de la placa): recuadro punteado semi-transparente + label.
function buildSvgTransparente(label, w = 600, h = 600) {
  const lines = wrap(label, 14);
  const fontSize = Math.round(w * 0.07);
  const lineHeight = fontSize * 1.25;
  const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((ln, i) => `<text x="${w / 2}" y="${startY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" fill="#5f3641" font-size="${fontSize}" font-weight="700" font-family="Arial, Helvetica, sans-serif">${escapeXml(ln)}</text>`)
    .join("\n  ");
  const m = Math.round(w * 0.04);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" rx="${Math.round(w * 0.06)}" fill="#ffffff" fill-opacity="0.55" stroke="#5f3641" stroke-opacity="0.5" stroke-width="${Math.round(w * 0.008)}" stroke-dasharray="${Math.round(w * 0.03)} ${Math.round(w * 0.02)}"/>
  ${tspans}
</svg>`;
}

function buildSvg(label, fondo, size = 480) {
  const lines = wrap(label, 12);
  const fontSize = Math.round(size * 0.09);
  const lineHeight = fontSize * 1.25;
  const startY = size / 2 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((ln, i) => `<text x="${size / 2}" y="${startY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" fill="#FAF7EE" font-size="${fontSize}" font-weight="700" font-family="Arial, Helvetica, sans-serif">${escapeXml(ln)}</text>`)
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" fill="${fondo}"/>
  ${tspans}
</svg>`;
}

// slug -> etiqueta a mostrar
const SABORES = [
  ["frambuesa-patagonica", "Frambuesa Patagónica"],
  ["volcan-chocolate", "Volcán de Chocolate"],
  ["vainilla-kaiken", "Vainilla Kaikén"],
  ["pistacho", "Pistacho"],
  ["chocorock", "Chocorock"],
  ["raffaelo", "Raffaelo"],
  ["pavlova", "Pavlova"],
  ["marquise", "Marquise"],
  ["chocomenta", "ChocoMenta"],
];

const ICONOS = [
  ["vaso-grande", "Vaso Grande"],
  ["vaso-mediano", "Vaso Mediano"],
  ["vaso-chico", "Vaso Chico"],
  ["cucurucho", "Cucurucho"],
  ["milkshake", "Milkshake"],
  ["kilo", "1 Kilo"],
  ["medio-kilo", "1/2 Kilo"],
  ["cuarto-kilo", "1/4 Kilo"],
  // Kilos Especiales (Kaikén / Pistacho) no llevan imagen — solo texto.
];

// Imágenes de las 13 placas verticales (producto/decoración).
// TODO: reemplazar por las imágenes reales de Mora cuando lleguen.
const PLACAS = [
  ["antojo-tarde", "Antojo de Tarde"],
  ["promo-especial", "Promo Especial"],
  ["despues-cole-tostado", "Después del Cole — Tostado"],
  ["despues-cole-budin", "Después del Cole — Budín"],
  ["cuartos", "Cuartos"],
  ["10off", "10% OFF"],
  ["kilo-kaiken", "Kilo Kaikén"],
  ["gusto-del-dia", "Gusto del Día"],
  ["novedad-del-mes", "Novedad del Mes"],
  ["qr-delivery", "QR Delivery"],
  ["seguinos", "Seguinos en Redes"],
  ["affogato", "Affogato"],
  ["frappuccino", "Frappuccino"],
];

async function generarPlacas() {
  const destDir = join(publicDir, "placas");
  mkdirSync(destDir, { recursive: true });
  for (const [slug, label] of PLACAS) {
    const dest = join(destDir, `${slug}.png`);
    if (existsSync(dest)) {
      console.log(`• placas/${slug}.png ya existe — se respeta`);
      continue;
    }
    const svg = Buffer.from(buildSvgTransparente(label));
    await sharp(svg).png().toFile(dest);
    console.log(`✓ placas/${slug}.png`);
  }
}

async function generar(grupo, dir) {
  const destDir = join(publicDir, dir);
  mkdirSync(destDir, { recursive: true });
  let i = 0;
  for (const [slug, label] of grupo) {
    const dest = join(destDir, `${slug}.png`);
    // NO sobrescribir assets reales ya entregados.
    if (existsSync(dest)) {
      console.log(`• ${dir}/${slug}.png ya existe — se respeta`);
      i++;
      continue;
    }
    const fondo = FONDOS[i % FONDOS.length];
    const svg = Buffer.from(buildSvg(label, fondo));
    await sharp(svg).png().toFile(dest);
    console.log(`✓ ${dir}/${slug}.png`);
    i++;
  }
}

await generar(SABORES, "sabores");
await generar(ICONOS, "iconos");
// Las 13 placas verticales ahora son videos reales (public/placas/*.mp4),
// ya no se generan placeholders para ellas. (generarPlacas queda sin uso.)
void generarPlacas;
console.log("\n🎨  Placeholders generados");
