// Fuerza visible una placa puntual de una pantalla vertical y la captura.
// Uso: node scripts/captura-placa.mjs <id> <slugVideo.mp4>
import { chromium } from "playwright";

const id = process.argv[2] ?? "1";
const slug = process.argv[3] ?? "antojo-de-tarde.mp4";
const frac = Number(process.argv[4] ?? 0.45); // fracción de duración del video
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:3000/pantalla/${id}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// Mostrar solo el wrapper cuyo <video> es el slug pedido
await page.evaluate(({ slug, frac }) => {
  const lienzo = document.querySelector(".marco-pantalla__lienzo");
  const rot = lienzo?.firstElementChild;
  for (const w of Array.from(rot?.children ?? [])) {
    const v = w.querySelector("video");
    const match = v && (v.currentSrc || v.src).includes(slug);
    // Ocultar del todo las otras placas para una captura limpia (sin crossfade)
    w.style.display = match ? "block" : "none";
    w.style.opacity = match ? "1" : "0";
    if (match && v) { v.pause(); v.currentTime = (v.duration || 10) * frac; }
  }
}, { slug, frac });
await page.waitForTimeout(600);
const out = `scripts/_placa-${slug.replace(/\.[^.]+$/, "")}.png`;
await page.screenshot({ path: out });
console.log("ok ->", out);
await browser.close();
