// Detecta el bounding box del recuadro de color de una placa de video y
// reporta centro/dimensiones en %. Uso: node scripts/detectar-recuadro.mjs <archivo.mp4> <r,g,b> <tol>
import { chromium } from "playwright";

const file = process.argv[2];
const [tr, tg, tb] = (process.argv[3] ?? "95,54,65").split(",").map(Number);
const tol = Number(process.argv[4] ?? 30);
// Banda vertical (en %) para restringir la búsqueda al recuadro y excluir títulos.
const yMinPct = Number(process.argv[5] ?? 0);
const yMaxPct = Number(process.argv[6] ?? 100);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:3000/placas/${file}`, { waitUntil: "load" });
await page.evaluate(async () => {
  const v = document.querySelector("video");
  v.muted = true;
  if (v.readyState < 2) await new Promise((r) => (v.oncanplay = r));
  v.currentTime = Math.min(4, (v.duration || 10) * 0.45);
  await new Promise((r) => (v.onseeked = r));
});
await page.waitForTimeout(300);

const box = await page.evaluate(({ tr, tg, tb, tol, yMinPct, yMaxPct }) => {
  const v = document.querySelector("video");
  const cv = document.createElement("canvas");
  cv.width = v.videoWidth; cv.height = v.videoHeight;
  const ctx = cv.getContext("2d");
  ctx.drawImage(v, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height);
  let minX = width, minY = height, maxX = 0, maxY = 0, count = 0;
  const y0 = Math.floor((yMinPct / 100) * height);
  const y1 = Math.ceil((yMaxPct / 100) * height);
  for (let y = y0; y < y1; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (Math.abs(data[i] - tr) < tol && Math.abs(data[i+1] - tg) < tol && Math.abs(data[i+2] - tb) < tol) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        count++;
      }
    }
  }
  return { minX, minY, maxX, maxY, count, width, height };
}, { tr, tg, tb, tol, yMinPct, yMaxPct });

const cx = ((box.minX + box.maxX) / 2 / box.width) * 100;
const cy = ((box.minY + box.maxY) / 2 / box.height) * 100;
const w = ((box.maxX - box.minX) / box.width) * 100;
const h = ((box.maxY - box.minY) / box.height) * 100;
console.log(`${file}: centro=(${cx.toFixed(1)}%, ${cy.toFixed(1)}%) ancho=${w.toFixed(1)}% alto=${h.toFixed(1)}% px=${box.count}`);
await browser.close();
