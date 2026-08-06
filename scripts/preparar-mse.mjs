/**
 * Prepara las placas verticales para reproducirse por MSE (MediaSource).
 *
 * Por qué existe: hasta ahora las verticales reproducían UN mp4 con las placas
 * pegadas. Anda fluido, pero está horneado: si el dueño activa, desactiva o
 * reordena una placa desde el panel, el archivo deja de coincidir con la base y
 * la pantalla se cae al modo de a una placa, con los 600-800ms de freeze del
 * decoder del Samsung en CADA cambio.
 *
 * Con MSE el orden deja de estar horneado. El <video> se abre UNA vez contra un
 * MediaSource y se le hace appendBuffer() de cada placa por separado: el decoder
 * no se reinicia nunca, así que el orden pasa a ser un dato que se lee de la
 * base en vivo. Para eso hacen falta dos cosas:
 *
 *  1. Que las 13 placas compartan el MISMO init segment, byte a byte. Si el
 *     avcC (SPS/PPS) difiere, el decoder se reconfigura al cambiar de placa y
 *     volvemos al problema. Los archivos originales NO cumplían: 3 variantes
 *     distintas (cuartos y qr-delivery se salían del molde), por eso se
 *     recodifica todo con parámetros idénticos en una sola pasada.
 *  2. Que cada placa sea un media segment fragmentado que arranque en keyframe.
 *
 * Deja en public/placas/mse/:
 *   init.mp4      el init segment compartido (ftyp + moov)
 *   <slug>.m4s    el media segment de cada placa (moof + mdat)
 *   _mse.json     duraciones reales + hash del init, para el player
 *
 * Uso: node scripts/preparar-mse.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const DIR_PLACAS = join("public", "placas");
const DIR_SALIDA = join(DIR_PLACAS, "mse");
const DIR_TMP = join(DIR_SALIDA, "_tmp");

// Parámetros canónicos. La clave no son los valores en sí sino que sean los
// MISMOS para las 13: así el SPS/PPS sale idéntico y el init se comparte.
// - keyint=300 (= los 300 cuadros de una placa) + scenecut=0: UN keyframe por
//   placa, en el cuadro 0. Es todo lo que MSE necesita, porque cada placa es un
//   segmento entero y nunca se busca dentro de una. Con keyint=30 el archivo
//   pesaba 3 veces más al pedo: los keyframes son lo caro de un H.264.
// - open_gop=0: GOP cerrado, ningún cuadro depende de otro GOP. Sin esto el
//   primer cuadro de una placa podría necesitar cuadros de la anterior, que en
//   MSE puede no ser la misma de siempre.
// - crf=18: recodificar cuesta una generación; a 18 es imperceptible a la
//   distancia de un local.
const X264 = "ref=3:bframes=2:open_gop=0:keyint=300:min-keyint=300:scenecut=0";

function ffmpeg(args) {
  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
}

/** Recorre los boxes de nivel superior de un mp4. */
function boxesRaiz(buf) {
  const out = [];
  let p = 0;
  while (p + 8 <= buf.length) {
    const size = buf.readUInt32BE(p);
    const type = buf.toString("latin1", p + 4, p + 8);
    if (size < 8) break;
    out.push({ type, ini: p, fin: Math.min(p + size, buf.length) });
    p += size;
  }
  return out;
}

/**
 * Parte un mp4 fragmentado en init (ftyp+moov) y media (el resto: moof+mdat…).
 * El corte es el primer `moof`.
 */
function partir(buf) {
  const primerMoof = boxesRaiz(buf).find((b) => b.type === "moof");
  if (!primerMoof) throw new Error("el archivo no quedó fragmentado (no hay moof)");
  return { init: buf.subarray(0, primerMoof.ini), media: buf.subarray(primerMoof.ini) };
}

// Boxes que contienen otros boxes (para poder bajar hasta el avcC).
const CONTENEDORES = new Set(["moov", "trak", "mdia", "minf", "stbl", "mvex"]);

/** Busca el primer box de un tipo, a cualquier profundidad. */
function buscarBox(buf, tipo, ini = 0, fin = buf.length) {
  let p = ini;
  while (p + 8 <= fin) {
    const size = buf.readUInt32BE(p);
    const type = buf.toString("latin1", p + 4, p + 8);
    if (size < 8) break;
    if (type === tipo) return buf.subarray(p + 8, p + size);
    // stsd y avc1 tienen bytes fijos antes de sus hijos (8 y 78).
    const salto = type === "stsd" ? 8 : type === "avc1" ? 78 : 0;
    if (CONTENEDORES.has(type) || type === "stsd" || type === "avc1") {
      const r = buscarBox(buf, tipo, p + 8 + salto, p + size);
      if (r) return r;
    }
    p += size;
  }
  return null;
}

/**
 * Lo ÚNICO que tiene que coincidir entre placas para que el decoder no se
 * reconfigure: la configuración del codec (avcC = SPS/PPS) y la base de tiempo
 * del track. El resto del init (btrt con el bitrate, udta, colr) cambia de
 * archivo en archivo y no importa, porque se manda UN SOLO init compartido y
 * los media segments no llevan configuración de codec adentro.
 */
function huella(init) {
  const avcc = buscarBox(init, "avcC");
  if (!avcc) throw new Error("no se encontró el avcC");
  const mdhd = buscarBox(init, "mdhd");
  // mdhd v0: 4 (version+flags ya consumidos) → creation(4) modification(4) timescale(4)
  const timescale = mdhd ? mdhd.readUInt32BE(12) : 0;
  return {
    avcc: createHash("sha1").update(avcc).digest("hex"),
    timescale,
    hex: avcc.toString("hex"),
  };
}

function duracionReal(archivo) {
  const salida = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo],
    { encoding: "utf8" }
  );
  return Number(salida.trim());
}

const slugs = readdirSync(DIR_PLACAS)
  .filter((f) => f.endsWith(".mp4") && f !== "videolocal.mp4")
  .map((f) => f.replace(/\.mp4$/, ""))
  .sort();

if (slugs.length === 0) {
  console.error(`No hay mp4 de placas en ${DIR_PLACAS}`);
  process.exit(1);
}

rmSync(DIR_TMP, { recursive: true, force: true });
mkdirSync(DIR_TMP, { recursive: true });
mkdirSync(DIR_SALIDA, { recursive: true });

console.log(`Preparando ${slugs.length} placas para MSE…\n`);

const inits = new Map();
const tramos = [];

for (const slug of slugs) {
  const origen = join(DIR_PLACAS, `${slug}.mp4`);
  const canonico = join(DIR_TMP, `${slug}.mp4`);
  const fragmentado = join(DIR_TMP, `${slug}.frag.mp4`);

  process.stdout.write(`  ${slug.padEnd(24)}`);

  // 1) Recodificar al formato canónico (mismo SPS/PPS para todas).
  //    bitexact: sin esto ffmpeg estampa la fecha de creación y el nombre del
  //    encoder en el moov, y el init sale distinto en cada corrida aunque el
  //    video sea idéntico. Con bitexact esos campos van en cero y el init de
  //    las 13 queda byte a byte igual, que es lo que permite compartirlo.
  ffmpeg([
    "-y", "-i", origen,
    "-an",
    "-fflags", "+bitexact",
    "-flags:v", "+bitexact",
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", "4.0",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-crf", "18",
    "-preset", "medium",
    // Metadata de color y relación de aspecto EXPLÍCITAS e iguales para todas.
    // Las fuentes no coinciden entre sí (qr-delivery viene sin color definido,
    // cuartos con SAR explícito) y eso se filtra al VUI del SPS: el avcC salía
    // distinto y el decoder se habría reconfigurado justo en esas placas.
    "-vf", "setsar=1",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-colorspace", "bt709",
    "-color_range", "tv",
    // Nada de metadata heredada del archivo original (queda en udta).
    "-map_metadata", "-1",
    "-x264-params", `${X264}:colorprim=bt709:transfer=bt709:colormatrix=bt709:fullrange=off`,
    "-force_key_frames", "expr:eq(n,0)",
    canonico,
  ]);

  // 2) Fragmentar. empty_moov + default_base_moof es lo que espera MSE;
  //    frag_keyframe corta los fragmentos en keyframe.
  ffmpeg([
    "-y", "-i", canonico,
    "-c", "copy",
    "-fflags", "+bitexact",
    "-flags:v", "+bitexact",
    "-movflags", "+frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    fragmentado,
  ]);

  // 3) Partir en init + media y guardar el media.
  const { init, media } = partir(readFileSync(fragmentado));
  const h = huella(init);
  const clave = `${h.avcc}-${h.timescale}`;
  inits.set(clave, [...(inits.get(clave) ?? []), slug]);

  writeFileSync(join(DIR_SALIDA, `${slug}.m4s`), media);
  // El init compartido es el de la primera placa. Da igual cuál: lo que importa
  // es que el avcC sea el mismo, y eso se verifica abajo.
  if (slug === slugs[0]) writeFileSync(join(DIR_SALIDA, "init.mp4"), init);

  const dur = duracionReal(canonico);
  tramos.push({ slug, duracion: dur, bytes: media.length });

  console.log(`${dur.toFixed(3)}s  ${(media.length / 1024 / 1024).toFixed(2)} MB`);
}

console.log("");

// El chequeo que decide si todo esto sirve: mismo avcC (SPS/PPS) y misma base
// de tiempo en las 13. Si difieren, el decoder se reconfigura al cambiar de
// placa y MSE no compra nada.
if (inits.size !== 1) {
  console.error("✖ El avcC NO es el mismo en las 13. MSE reconfiguraría el decoder.");
  for (const [h, ss] of inits) console.error(`   ${h.slice(0, 12)} → ${ss.join(", ")}`);
  console.error("\nNo se escribió el manifiesto. Revisar los parámetros de recodificación.");
  process.exit(1);
}

const init = readFileSync(join(DIR_SALIDA, "init.mp4"));
const hashInit = huella(init).avcc;

writeFileSync(
  join(DIR_SALIDA, "_mse.json"),
  JSON.stringify(
    {
      generado: new Date().toISOString(),
      // El player lo compara con lo que baja: si no coincide, no usa MSE.
      avcc_sha1: hashInit,
      init_bytes: init.length,
      codec: 'video/mp4; codecs="avc1.640028"',
      // Duración REAL de cada placa. El overlay de texto se sincroniza con esto,
      // no con la duración configurada en la base.
      tramos,
    },
    null,
    2
  ) + "\n"
);

rmSync(DIR_TMP, { recursive: true, force: true });

const totalMb = tramos.reduce((a, t) => a + t.bytes, 0) / 1024 / 1024;
console.log(`✔ mismo avcC en las ${slugs.length}: ${hashInit.slice(0, 12)} · init compartido de ${init.length} bytes`);
console.log(`✔ ${slugs.length} media segments · ${totalMb.toFixed(1)} MB en total`);
console.log(`\nListo en ${DIR_SALIDA}. Acordate de commitearlo.\n`);
