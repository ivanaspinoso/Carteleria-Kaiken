// Mide la posición Y (centro) de filas clave de /pantalla/3 a 1920x1080
// (= resolución nativa del TV de 43"), para verificar alineación con números.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:3000/pantalla/3", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// Los nombres en el DOM están en su forma natural (el uppercase es solo CSS).
const nombres = ["Cucurucho", "Milkshake", "Kilo Kaikén", "Kilo Pistacho"];
const res = {};
for (const n of nombres) {
  const loc = page.getByText(n, { exact: true }).first();
  const box = await loc.boundingBox();
  res[n] = box ? Math.round(box.y + box.height / 2) : null;
}

console.log("Centro Y (px) @1920x1080:");
console.log(`  Cucurucho     : ${res["Cucurucho"]}`);
console.log(`  Kilo Kaikén   : ${res["Kilo Kaikén"]}   (Δ vs Cucurucho = ${res["Kilo Kaikén"] - res["Cucurucho"]})`);
console.log(`  Milkshake     : ${res["Milkshake"]}`);
console.log(`  Kilo Pistacho : ${res["Kilo Pistacho"]}   (Δ vs Milkshake = ${res["Kilo Pistacho"] - res["Milkshake"]})`);

await browser.close();
