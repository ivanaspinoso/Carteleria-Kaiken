// Captura una pantalla de la cartelera a 1920x1080 para comparar pixel-perfect.
// Uso: node scripts/screenshot-pantalla.mjs <id> <archivoSalida>
import { chromium } from "playwright";

const id = process.argv[2] ?? "3";
const out = process.argv[3] ?? `scripts/_pantalla-${id}.png`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://localhost:3000/pantalla/${id}`, { waitUntil: "networkidle" });
// Pequeña espera extra para fuentes/imágenes
await page.waitForTimeout(1500);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
await browser.close();
console.log(`OK -> ${out}`);
