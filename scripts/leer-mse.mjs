/**
 * Lee el resultado de la sonda de MSE que dejan las TV en diag_transiciones.
 *
 * La sonda (lib/cartelera/diagMse.ts) corre sola al cargar una pantalla vertical
 * y deja una fila por pantalla por día con slug `_mse-probe`. Esto la muestra
 * legible, para decidir si el modo MSE es viable en el Samsung del local.
 *
 * Uso: node scripts/leer-mse.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_SUPABASE || !ANON) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY en .env.local");
  process.exit(1);
}

const url =
  `${URL_SUPABASE}/rest/v1/diag_transiciones` +
  `?select=creado_en,pantalla,eventos&slug=eq._mse-probe&order=creado_en.desc&limit=20`;

const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
if (!r.ok) {
  console.error(`Supabase respondió ${r.status}: ${await r.text()}`);
  process.exit(1);
}

const filas = await r.json();
if (filas.length === 0) {
  console.log("\nTodavía no reportó ninguna pantalla.");
  console.log("La TV tiene que cargar /pantalla/1 o /pantalla/5 con el deploy nuevo.\n");
  process.exit(0);
}

const si = (v) => (v ? "SI" : "no");

for (const f of filas) {
  let d;
  try {
    d = JSON.parse(f.eventos);
  } catch {
    console.log(`P${f.pantalla}  ${f.creado_en}  (payload ilegible: ${f.eventos})`);
    continue;
  }
  // Las TV del local se identifican por el user agent (Tizen); lo local es Chrome.
  const equipo = /Tizen|SMART-TV|Web0S/i.test(d.ua ?? "") ? "TV" : "escritorio";
  const veredicto = d.soportaPlacas && d.sourceBuffer && d.modoSecuencia ? "VERDE" : "ROJO";

  console.log(`\nP${f.pantalla}  ${f.creado_en.slice(0, 19).replace("T", " ")}  [${equipo}]  → ${veredicto}`);
  console.log(`   MediaSource existe : ${si(d.mediaSource)}`);
  console.log(`   codec de las placas: ${si(d.soportaPlacas)}   (avc1.640028 = High 4.0)`);
  console.log(`   codec de control   : ${si(d.soportaControl)}  (Baseline 3.0; si esto es "no", isTypeSupported miente)`);
  console.log(`   SourceBuffer       : ${si(d.sourceBuffer)}`);
  console.log(`   mode="sequence"    : ${si(d.modoSecuencia)}`);
  if (d.error) console.log(`   error              : ${d.error}`);
  console.log(`   ua                 : ${(d.ua ?? "").slice(0, 110)}`);
}

console.log("");
