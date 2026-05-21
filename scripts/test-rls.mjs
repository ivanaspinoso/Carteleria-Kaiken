#!/usr/bin/env node
/**
 * Test de RLS (Row Level Security) — Supabase Cartelería.
 *
 * Comportamiento correcto de PostgREST + RLS:
 *   - SELECT sin policy → 200 con [] (0 filas visibles)
 *   - INSERT con WITH CHECK fallido → 401
 *   - UPDATE bloqueado por USING → 200 con [] (0 filas modificadas — dato intacto)
 *   - DELETE bloqueado por USING → 200 con [] (0 filas borradas — dato intacto)
 *
 * El test de UPDATE/DELETE NO busca un error HTTP, sino que verifica
 * que el dato realmente NO cambió (verificación post-operación).
 *
 * Uso: node scripts/test-rls.mjs  |  npm run test:rls
 */

import { readFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  try {
    const content = readFileSync(join(ROOT, ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("❌  Variables de entorno no definidas");
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const H = {
  "apikey": ANON_KEY,
  "Authorization": `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

let passed = 0;
let failed = 0;

function ok(msg, extra = "") {
  console.log(`  ✅  PASS — ${msg}${extra ? `\n       ${extra}` : ""}`);
  passed++;
}
function fail(msg, extra = "") {
  console.log(`  ❌  FAIL — ${msg}${extra ? `\n       ${extra}` : ""}`);
  failed++;
}

async function get(path) {
  const r = await fetch(`${REST}${path}`, { headers: H });
  const text = await r.text();
  try { return { status: r.status, data: JSON.parse(text) }; }
  catch { return { status: r.status, data: text }; }
}

async function patch(path, body) {
  const r = await fetch(`${REST}${path}`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
  const text = await r.text();
  try { return { status: r.status, data: JSON.parse(text) }; }
  catch { return { status: r.status, data: text }; }
}

async function post(path, body) {
  const r = await fetch(`${REST}${path}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  const text = await r.text();
  try { return { status: r.status, data: JSON.parse(text) }; }
  catch { return { status: r.status, data: text }; }
}

async function del(path) {
  const r = await fetch(`${REST}${path}`, { method: "DELETE", headers: H });
  const text = await r.text();
  try { return { status: r.status, data: JSON.parse(text) }; }
  catch { return { status: r.status, data: text }; }
}

// ============================================================
console.log("\n🔐  Test de RLS — Supabase Cartelería");
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Key: anon (${ANON_KEY.slice(0, 20)}...)\n`);

// ============================================================
// 1. SELECT público — debe devolver filas
// ============================================================
console.log("1️⃣   SELECT PÚBLICO (debe devolver datos)");

const selProd = await get("/productos?limit=3&select=id,nombre,precio");
if (selProd.status === 200 && Array.isArray(selProd.data) && selProd.data.length > 0) {
  ok("SELECT productos", `${selProd.data.length} filas — ej: "${selProd.data[0].nombre}"`);
} else {
  fail("SELECT productos", `status=${selProd.status}, datos=${JSON.stringify(selProd.data).slice(0,100)}`);
}

const selCat = await get("/categorias?select=id,nombre");
if (selCat.status === 200 && Array.isArray(selCat.data) && selCat.data.length > 0) {
  ok("SELECT categorias", `${selCat.data.length} filas`);
} else {
  fail("SELECT categorias");
}

const selProm = await get("/promos?select=id,titulo");
if (selProm.status === 200 && Array.isArray(selProm.data) && selProm.data.length > 0) {
  ok("SELECT promos", `${selProm.data.length} filas`);
} else {
  fail("SELECT promos");
}

const selPant = await get("/pantallas?select=id,nombre");
if (selPant.status === 200 && Array.isArray(selPant.data) && selPant.data.length > 0) {
  ok("SELECT pantallas", `${selPant.data.length} filas`);
} else {
  fail("SELECT pantallas");
}

// ============================================================
// 2. UPDATE sin login — PostgREST devuelve 200 [] pero el dato NO cambia
// ============================================================
console.log("\n2️⃣   UPDATE SIN LOGIN (dato no debe cambiar)");

const prod0 = selProd.data?.[0];
if (prod0) {
  const precioOriginal = prod0.precio;
  const PRECIO_ESPÍA = 999999.99;

  await patch(`/productos?id=eq.${prod0.id}`, { precio: PRECIO_ESPÍA });

  // Verificar que el dato sigue igual
  const postUpdate = await get(`/productos?id=eq.${prod0.id}&select=id,precio`);
  const precioActual = postUpdate.data?.[0]?.precio;

  if (Number(precioActual) === Number(precioOriginal)) {
    ok("UPDATE productos rechazado", `precio sigue siendo $${precioOriginal} (no cambió a $${PRECIO_ESPÍA})`);
  } else {
    fail("UPDATE productos NO fue rechazado", `precio cambió de $${precioOriginal} a $${precioActual} — RLS roto`);
  }
} else {
  fail("UPDATE productos", "no hay datos en la tabla (aplicar seed primero)");
}

const cat0 = selCat.data?.[0];
if (cat0) {
  const nombreOriginal = cat0.nombre;
  await patch(`/categorias?id=eq.${cat0.id}`, { nombre: "HACKEADO" });
  const postUpdate = await get(`/categorias?id=eq.${cat0.id}&select=id,nombre`);
  const nombreActual = postUpdate.data?.[0]?.nombre;
  if (nombreActual === nombreOriginal) {
    ok("UPDATE categorias rechazado", `nombre sigue siendo "${nombreOriginal}"`);
  } else {
    fail("UPDATE categorias NO fue rechazado", `nombre cambió a "${nombreActual}"`);
  }
}

const prom0 = selProm.data?.[0];
if (prom0) {
  await patch(`/promos?id=eq.${prom0.id}`, { titulo: "HACKEADO" });
  const postUpdate = await get(`/promos?id=eq.${prom0.id}&select=id,titulo`);
  const tituloActual = postUpdate.data?.[0]?.titulo;
  if (tituloActual === prom0.titulo) {
    ok("UPDATE promos rechazado", `título sigue siendo "${prom0.titulo}"`);
  } else {
    fail("UPDATE promos NO fue rechazado", `cambió a "${tituloActual}"`);
  }
}

await patch("/pantallas?id=eq.1", { nombre: "HACKEADO" });
const postPant = await get("/pantallas?id=eq.1&select=id,nombre");
const nombrePantActual = postPant.data?.[0]?.nombre;
if (nombrePantActual && nombrePantActual !== "HACKEADO") {
  ok("UPDATE pantallas rechazado", `nombre sigue siendo "${nombrePantActual}"`);
} else {
  fail("UPDATE pantallas NO fue rechazado");
}

// ============================================================
// 3. DELETE sin login — el conteo no debe bajar
// ============================================================
console.log("\n3️⃣   DELETE SIN LOGIN (filas no deben borrarse)");

const countAntes = await get("/productos?select=id");
const nAntes = Array.isArray(countAntes.data) ? countAntes.data.length : 0;

if (prod0) await del(`/productos?id=eq.${prod0.id}`);

const countDespues = await get("/productos?select=id");
const nDespues = Array.isArray(countDespues.data) ? countDespues.data.length : 0;

if (nDespues === nAntes) {
  ok("DELETE productos rechazado", `conteo estable: ${nAntes} filas`);
} else {
  fail("DELETE productos NO fue rechazado", `filas bajaron de ${nAntes} a ${nDespues}`);
}

// ============================================================
// 4. INSERT sin login — debe dar 401
// ============================================================
console.log("\n4️⃣   INSERT SIN LOGIN (debe dar error 401)");

const insRes = await post("/productos", {
  categoria_id: "11111111-1111-1111-1111-000000000001",
  nombre: "Sabor Intruso",
  en_stock: true,
  orden: 999,
});
if (insRes.status === 401 || insRes.status === 403) {
  ok("INSERT productos rechazado", `HTTP ${insRes.status}`);
} else {
  fail("INSERT productos NO rechazado", `HTTP ${insRes.status}`);
}

const insLog = await post("/logs", {
  usuario_id: "00000000-0000-0000-0000-000000000000",
  accion: "hack", tabla: "productos", registro_id: "0",
});
if (insLog.status === 401 || insLog.status === 403) {
  ok("INSERT logs rechazado", `HTTP ${insLog.status}`);
} else {
  fail("INSERT logs NO rechazado", `HTTP ${insLog.status}`);
}

// ============================================================
// 5. LOGS SELECT — anon no ve filas (RLS silencioso)
// ============================================================
console.log("\n5️⃣   SELECT LOGS SIN LOGIN (debe devolver 0 filas)");

const selLogs = await get("/logs?limit=10&select=id");
if (selLogs.status === 200 && Array.isArray(selLogs.data) && selLogs.data.length === 0) {
  ok("SELECT logs devuelve 0 filas (anon no ve nada)", "RLS correcto — solo admin ve logs");
} else if (selLogs.status === 401) {
  ok("SELECT logs rechazado con 401");
} else {
  fail("SELECT logs", `status=${selLogs.status}, filas=${Array.isArray(selLogs.data) ? selLogs.data.length : "N/A"}`);
}

// ============================================================
// RESUMEN
// ============================================================
const total = passed + failed;
console.log(`\n${"─".repeat(52)}`);
console.log(`  Total: ${total} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failed}`);
if (failed === 0) {
  console.log("  🎉  RLS configurado correctamente\n");
  process.exit(0);
} else {
  console.log("  ⚠️   Revisar políticas RLS en Supabase Dashboard\n");
  process.exit(1);
}
