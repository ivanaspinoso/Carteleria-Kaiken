// Reporta qué placa está VISIBLE (wrapper con opacity 1) en una pantalla,
// con el src de su video. Uso: node scripts/placa-visible.mjs <id>
import { chromium } from "playwright";

const id = process.argv[2] ?? "5";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:3000/pantalla/${id}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const lienzo = document.querySelector(".marco-pantalla__lienzo");
  const rot = lienzo?.firstElementChild;
  const wrappers = rot ? Array.from(rot.children) : [];
  const all = wrappers.map((w) => {
    const op = getComputedStyle(w).opacity;
    const v = w.querySelector("video");
    const src = v ? (v.querySelector("source")?.getAttribute("src") ?? v.getAttribute("src")) : null;
    return { opacity: op, src };
  });
  const visible = all.find((x) => Number(x.opacity) > 0.5);
  return { total: all.length, visible, all };
});

console.log(`/pantalla/${id}: ${info.total} placas en DOM`);
console.log(`  VISIBLE ahora: opacity=${info.visible?.opacity} src=${info.visible?.src}`);
console.log("  todas:", JSON.stringify(info.all));
await browser.close();
