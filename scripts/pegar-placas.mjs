/**
 * Pega las placas de una pantalla vertical en UN SOLO mp4 continuo.
 *
 * Por qué: medido en el Samsung del local (tabla diag_transiciones), abrir un
 * mp4 le lleva ~600ms al decodificador AUNQUE el archivo ya esté en memoria. Con
 * un archivo por placa, cada cambio paga ese medio segundo largo y ahí aparece
 * el negro. Con un único archivo en loop el reproductor no se reinicia nunca:
 * el hueco no se disimula, deja de existir.
 *
 * Los 13 mp4 son idénticos en formato (1920x1080, H.264, 10.000s), así que se
 * copian tal cual — sin recodificar, sin perder calidad, en segundos.
 *
 * Uso:
 *   node scripts/pegar-placas.mjs 5        (una pantalla)
 *   node scripts/pegar-placas.mjs 1 5      (varias)
 *
 * Deja en public/placas/secuencias/:
 *   p<id>.mp4   el video continuo
 *   p<id>.json  qué placas contiene y en qué orden (la cartelera lo compara con
 *               la base: si no coincide, vuelve sola al modo de a una placa)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DIR_PLACAS = join("public", "placas");
const DIR_SALIDA = join(DIR_PLACAS, "secuencias");

if (!URL_SUPABASE || !ANON) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY en .env.local");
  process.exit(1);
}

const pantallas = process.argv.slice(2).map(Number).filter(Boolean);
if (pantallas.length === 0) {
  console.error("Indicá qué pantallas pegar. Ej: node scripts/pegar-placas.mjs 5");
  process.exit(1);
}

async function placasDe(pantallaId) {
  const url =
    `${URL_SUPABASE}/rest/v1/placas_fijas` +
    `?select=slug,orden,duracion,activa,inicio,fin&pantalla_id=eq.${pantallaId}` +
    `&activa=is.true&order=orden.asc,slug.asc`;
  const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!r.ok) throw new Error(`Supabase respondió ${r.status} al pedir las placas`);
  return r.json();
}

async function personalizadasDe(pantallaId) {
  const url =
    `${URL_SUPABASE}/rest/v1/placas_personalizadas` +
    `?select=id&pantalla_id=eq.${pantallaId}&activa=is.true`;
  const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!r.ok) throw new Error(`Supabase respondió ${r.status} al pedir las personalizadas`);
  return r.json();
}

function duracionReal(archivo) {
  const salida = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo],
    { encoding: "utf8" }
  );
  return Number(salida.trim());
}

for (const id of pantallas) {
  console.log(`\n── Pantalla ${id}`);

  const placas = await placasDe(id);
  if (placas.length === 0) {
    console.log("   sin placas activas, no hay nada que pegar");
    continue;
  }

  // Las placas con fechas de vigencia entran y salen solas: pegarlas dejaría un
  // archivo que caduca sin aviso. Esas pantallas siguen con el modo de a una.
  const conFechas = placas.filter((p) => p.inicio || p.fin);
  if (conFechas.length > 0) {
    console.log(`   ⚠ hay placas con vigencia (${conFechas.map((p) => p.slug).join(", ")}): no se pega`);
    continue;
  }

  const personalizadas = await personalizadasDe(id);
  if (personalizadas.length > 0) {
    console.log(`   ⚠ hay ${personalizadas.length} placa(s) personalizada(s): no se pega`);
    continue;
  }

  const faltantes = placas.filter((p) => !existsSync(join(DIR_PLACAS, `${p.slug}.mp4`)));
  if (faltantes.length > 0) {
    console.log(`   ⚠ faltan videos: ${faltantes.map((p) => p.slug).join(", ")}`);
    continue;
  }

  // La duración que manda es la REAL del archivo, no la de la base: en el video
  // pegado cada placa dura lo que dura su mp4, y los textos se sincronizan con
  // eso. Si no coincidieran, el texto se adelantaría o atrasaría acumulando.
  const tramos = placas.map((p) => ({
    slug: p.slug,
    duracion: duracionReal(join(DIR_PLACAS, `${p.slug}.mp4`)),
  }));

  const desajustadas = placas.filter((p, i) => Math.abs(tramos[i].duracion - p.duracion) > 0.5);
  if (desajustadas.length > 0) {
    console.log(
      "   ⚠ la duración configurada no coincide con la del video en: " +
        desajustadas.map((p) => p.slug).join(", ") +
        " — se usa la del video"
    );
  }

  mkdirSync(DIR_SALIDA, { recursive: true });
  const lista = join(DIR_SALIDA, `_lista-p${id}.txt`);
  writeFileSync(lista, tramos.map((t) => `file '../${t.slug}.mp4'`).join("\n") + "\n");

  const salida = join(DIR_SALIDA, `p${id}.mp4`);
  execFileSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", "-movflags", "+faststart", salida],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  const total = tramos.reduce((a, t) => a + t.duracion, 0);
  const manifiesto = {
    pantalla: id,
    generado: new Date().toISOString(),
    total,
    // Orden y duración de cada tramo: la cartelera lo usa para saber qué placa
    // está en pantalla según el minutero del video, y para detectar si la
    // configuración de la base cambió después de generar el archivo.
    tramos,
  };
  writeFileSync(join(DIR_SALIDA, `p${id}.json`), JSON.stringify(manifiesto, null, 2) + "\n");

  const mb = (statSync(salida).size / 1024 / 1024).toFixed(1);
  console.log(`   ✔ ${tramos.length} placas · ${total.toFixed(1)}s · ${mb} MB`);
  console.log(`     ${tramos.map((t) => t.slug).join(" → ")}`);
}

console.log("\nListo. Acordate de commitear public/placas/secuencias/.\n");
