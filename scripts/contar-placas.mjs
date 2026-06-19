// Cuenta cuántas placas renderiza una pantalla vertical en el DOM.
// La rotativa apila todas las placas como divs absolutos (opacity 0/1) y
// cada PlacaVideo monta un <video>. Uso: node scripts/contar-placas.mjs <id>
import { chromium } from "playwright";

const id = process.argv[2] ?? "5";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:3000/pantalla/${id}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const lienzo = document.querySelector(".marco-pantalla__lienzo");
  const rot = lienzo?.firstElementChild; // contenedor de la rotativa
  const placas = rot ? rot.children.length : 0;
  const videos = document.querySelectorAll("video").length;
  // Texto visible (para ver qué placa/es hay)
  const textos = Array.from(document.querySelectorAll("img"))
    .map((i) => i.getAttribute("src"))
    .filter(Boolean)
    .slice(0, 20);
  return { placas, videos, imgs: textos };
});

console.log(`/pantalla/${id}:`);
console.log(`  divs de placa en la rotativa: ${info.placas}`);
console.log(`  <video> montados: ${info.videos}`);
console.log(`  imgs:`, info.imgs);
await browser.close();
