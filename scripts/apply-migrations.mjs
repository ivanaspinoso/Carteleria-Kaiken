#!/usr/bin/env node
/**
 * Aplica las migraciones SQL y el seed a Supabase.
 *
 * Requiere: DATABASE_URL en .env.local
 * Obtener en: Supabase Dashboard → Settings → Database →
 *   Connection string → Transaction pooler (puerto 6543)
 * Formato: postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
 *
 * Uso:
 *   npm run db:migrate          # solo migraciones
 *   npm run db:migrate --seed   # migraciones + seed
 */

import { readFileSync, readdirSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Cargar .env.local manualmente (sin dotenv para no agregar deps)
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
  } catch {
    // .env.local opcional
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL no está definida en .env.local");
  console.error("   Ir a Supabase Dashboard → Settings → Database → Connection string (Transaction pooler)");
  process.exit(1);
}

// Importar pg dinámicamente
let pg;
try {
  pg = await import("pg");
} catch {
  console.error("❌  Módulo 'pg' no instalado. Ejecutar: npm install pg");
  process.exit(1);
}

const { default: { Client } } = pg;
const client = new Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log("✅  Conectado a la base de datos");

  // Aplicar migraciones en orden
  const migrationsDir = join(ROOT, "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // orden cronológico por nombre de archivo

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    console.log(`\n📄  Aplicando: ${file}`);
    try {
      await client.query(sql);
      console.log(`   ✅  OK`);
    } catch (err) {
      // Ignorar errores de "ya existe" (idempotencia parcial)
      if (err.code === "42P07" || err.code === "42710") {
        console.log(`   ⚠️   Ya existe, saltando: ${err.message.split("\n")[0]}`);
      } else {
        throw err;
      }
    }
  }

  // Seed opcional
  if (process.argv.includes("--seed")) {
    const seedPath = join(ROOT, "supabase", "seed.sql");
    console.log("\n🌱  Aplicando seed de datos de prueba...");
    const seedSql = readFileSync(seedPath, "utf-8");
    await client.query(seedSql);
    console.log("   ✅  Seed aplicado");
  }

  console.log("\n🎉  Migraciones completadas");
} catch (err) {
  console.error("\n❌  Error:", err.message);
  if (err.detail) console.error("   Detalle:", err.detail);
  process.exit(1);
} finally {
  await client.end();
}
