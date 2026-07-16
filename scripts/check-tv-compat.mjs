// Verifica que el JS que se sirve al navegador NO use sintaxis que los Smart TV
// viejos del local no saben leer.
//
// Por qué existe: el Samsung TU5300 (2020, Tizen 5.5 = Chromium 76) no parsea
// `?.` ni `??` (son Chrome 80). Un solo uso rompe el ARCHIVO ENTERO con
// SyntaxError, no una función: la cartelera se sigue viendo (el HTML lo manda
// el server) pero NADA de JS corre → el botón de pantalla completa no responde
// y el Realtime nunca conecta, así que los cambios del panel no llegan a esa TV.
// Es un fallo mudo: no hay pantalla de error, solo una cartelera congelada.
//
// El browserslist del package.json cubre el código propio, pero NO alcanza para
// las dependencias (Next no compila node_modules salvo que estén en
// `transpilePackages` de next.config.ts) ni para el runtime de Turbopack (por
// eso el build de producción usa Webpack).
//
// Uso: node scripts/check-tv-compat.mjs   (corre solo después de `npm run build`)

import { parse } from "acorn";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = ".next/static/chunks";

// Sintaxis posterior a Chromium 76, con la versión de Chrome que la introdujo.
const PROHIBIDO = {
  ChainExpression: "optional chaining (?.) — Chrome 80",
  StaticBlock: "bloque static de clase — Chrome 94",
};
const OPERADORES = {
  "??": "nullish coalescing (??) — Chrome 80",
  "??=": "asignación nullish (??=) — Chrome 85",
  "||=": "asignación lógica (||=) — Chrome 85",
  "&&=": "asignación lógica (&&=) — Chrome 85",
};

function recorrer(nodo, visitar) {
  if (!nodo || typeof nodo !== "object") return;
  if (Array.isArray(nodo)) {
    for (const n of nodo) recorrer(n, visitar);
    return;
  }
  if (typeof nodo.type === "string") visitar(nodo);
  for (const k of Object.keys(nodo)) {
    if (k === "type" || k === "start" || k === "end") continue;
    recorrer(nodo[k], visitar);
  }
}

if (!existsSync(DIR)) {
  console.error(`No existe ${DIR}. Corré \`npm run build\` primero.`);
  process.exit(1);
}

const archivos = readdirSync(DIR).filter((f) => f.endsWith(".js"));
const problemas = [];

for (const f of archivos) {
  const code = readFileSync(join(DIR, f), "utf8");
  let ast;
  try {
    ast = parse(code, { ecmaVersion: "latest", sourceType: "script" });
  } catch {
    try {
      ast = parse(code, { ecmaVersion: "latest", sourceType: "module" });
    } catch (e) {
      problemas.push({ f, motivo: `no parsea ni como ES moderno: ${e.message}` });
      continue;
    }
  }

  recorrer(ast, (n) => {
    let motivo = null;
    if (PROHIBIDO[n.type]) motivo = PROHIBIDO[n.type];
    else if (
      (n.type === "LogicalExpression" || n.type === "AssignmentExpression") &&
      OPERADORES[n.operator]
    ) motivo = OPERADORES[n.operator];
    // Métodos privados (#m()) son Chrome 84; los campos privados, 74.
    else if (n.type === "MethodDefinition" && n.key?.type === "PrivateIdentifier")
      motivo = "método privado (#m()) — Chrome 84";

    if (motivo) {
      problemas.push({ f, motivo, frag: code.slice(Math.max(0, n.start - 50), n.start + 50) });
    }
  });
}

if (problemas.length === 0) {
  console.log(`✔ ${archivos.length} chunks OK: nada que Chromium 76 (Samsung TU5300) no pueda leer.`);
  process.exit(0);
}

// Un solo reporte por archivo+motivo: un chunk roto suele tener muchos usos.
const vistos = new Set();
console.error(`✖ Sintaxis no soportada por los Smart TV viejos (Chromium 76):\n`);
for (const p of problemas) {
  const clave = `${p.f}|${p.motivo}`;
  if (vistos.has(clave)) continue;
  vistos.add(clave);
  console.error(`  ${p.f}\n    ${p.motivo}`);
  if (p.frag) console.error(`    ...${p.frag.replace(/\n/g, " ")}...`);
}
console.error(
  `\nArreglo: si viene de una dependencia, agregala a \`transpilePackages\` en\n` +
  `next.config.ts. Si es del runtime del bundler, revisá que el build NO use\n` +
  `--turbopack (no transpila su propio runtime).`,
);
process.exit(1);
