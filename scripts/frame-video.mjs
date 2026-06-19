// Captura un frame de cada archivo de video para identificar su contenido real.
// Uso: node scripts/frame-video.mjs <archivo1.mp4> ...
import { chromium } from "playwright";

const files = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

for (const f of files) {
  await page.goto(`http://localhost:3000/placas/${f}`, { waitUntil: "load" });
  try {
    await page.evaluate(async () => {
      const v = document.querySelector("video");
      if (!v) return;
      v.muted = true;
      if (v.readyState < 2) await new Promise((r) => (v.oncanplay = r));
      v.currentTime = Math.min(4, (v.duration || 10) * 0.45);
      await new Promise((r) => (v.onseeked = r));
    });
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("  (warn)", f, e.message);
  }
  const out = `scripts/_frame-${f.replace(/\.[^.]+$/, "")}.png`;
  await page.screenshot({ path: out });
  console.log("frame:", f, "->", out);
}
await browser.close();
