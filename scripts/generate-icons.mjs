// Genera los íconos PNG del PWA usando sharp (incluido con Next.js)
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// SVG sin emoji para garantizar render cross-platform
function buildSvg(size) {
  const rx = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.47);
  const y = Math.round(size * 0.635);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#1a1a2e"/>
  <text
    x="${size / 2}"
    y="${y}"
    text-anchor="middle"
    fill="white"
    font-size="${fontSize}"
    font-weight="700"
    font-family="Arial, Helvetica, sans-serif"
  >K</text>
</svg>`;
}

for (const size of [192, 512]) {
  const svg = Buffer.from(buildSvg(size));
  const dest = join(publicDir, `icon-${size}.png`);
  await sharp(svg).png().toFile(dest);
  console.log(`✓ icon-${size}.png`);
}

// Apple touch icon (180×180)
const svgApple = Buffer.from(buildSvg(180));
await sharp(svgApple).png().toFile(join(publicDir, "apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png");
