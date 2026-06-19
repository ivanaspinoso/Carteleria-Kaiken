// Screenshot vertical (1080x1920) de una pantalla. Captura 2 frames separados
// para ver placas distintas de la rotación.
// Uso: node scripts/screenshot-vertical.mjs <id>
import { chromium } from "playwright";

const id = process.argv[2] ?? "5";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:3000/pantalla/${id}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

// Qué slugs/componentes hay realmente en el DOM
const info = await page.evaluate(() => {
  const vids = Array.from(document.querySelectorAll("video")).map((v) => {
    const src = v.querySelector("source")?.getAttribute("src") ?? v.getAttribute("src");
    return src;
  });
  return { count: vids.length, sources: vids };
});
console.log(`/pantalla/${id}: ${info.count} videos`);
info.sources.forEach((s) => console.log("   -", s));

await page.screenshot({ path: `scripts/_vertical-${id}.png` });
await browser.close();
