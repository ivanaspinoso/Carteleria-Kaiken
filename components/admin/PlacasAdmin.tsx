"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import type { PlacaFija, PlacaPersonalizada, Producto } from "@/lib/types";
import { parsePlacaConfig, parseGustos } from "@/lib/types";
import {
  actualizarPlacaFija,
  actualizarPlacaPersonalizada,
  crearPlacaPersonalizada,
  borrarPlacaPersonalizada,
} from "@/lib/actions/placas";
import { actualizarPrecio, actualizarGustosIncluidos } from "@/lib/actions/productos";
import { validarArchivoPlaca, esVideoUrl } from "@/lib/cartelera/validarImagen";
import type { GrupoGustos } from "@/lib/cartelera/gustos";
import GustosEditor from "./GustosEditor";

// Placas fijas (video) con precio(s) editable(s) superpuesto(s). Cada placa
// define qué campos de precio tiene y su etiqueta. Se amplía placa por placa.
type CampoPrecio = "precio" | "precio_alt";
const PLACAS_PRECIOS: Record<string, { campo: CampoPrecio; label: string }[]> = {
  "antojo-de-tarde": [{ campo: "precio", label: "Precio" }],
  "despues-cole-tostado": [{ campo: "precio", label: "Precio" }],
  "despues-cole-budin": [{ campo: "precio", label: "Precio" }],
  cuartos: [
    { campo: "precio", label: "Por unidad" },
    { campo: "precio_alt", label: "x4" },
  ],
  // kilo-kaiken NO va acá: su precio y gustos salen del producto "Kilo Kaikén"
  // y se editan en el panel expandido debajo de su fila (ver FijasList).
};

interface Props {
  fijas: PlacaFija[];
  personalizadas: PlacaPersonalizada[];
  /** Producto "Kilo Kaikén": su precio y gustos se superponen en esa placa. */
  kilo?: Producto | null;
  /** Sabores clásicos (agrupados por categoría) para el multi-select del Kilo Kaikén. */
  gruposGustos?: GrupoGustos[];
}

type Pantalla = 1 | 5;
type Tab = "fijas" | "personalizadas";

export default function PlacasAdmin({ fijas, personalizadas, kilo = null, gruposGustos = [] }: Props) {
  const [tab, setTab] = useState<Tab>("fijas");
  const [pantalla, setPantalla] = useState<Pantalla>(1);

  const fijasP = fijas.filter((p) => p.pantalla_id === pantalla).sort((a, b) => a.orden - b.orden);
  const persP = personalizadas.filter((p) => p.pantalla_id === pantalla).sort((a, b) => a.orden - b.orden);

  return (
    <div className="space-y-4">
      {/* Selector de pantalla */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Pantalla:</span>
        {([1, 5] as Pantalla[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPantalla(n)}
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
              pantalla === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {n === 1 ? "Vertical Izquierda (1)" : "Vertical Derecha (5)"}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["fijas", "personalizadas"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "fijas" ? "Placas fijas" : "Placas personalizadas"}
          </button>
        ))}
      </div>

      {tab === "fijas" ? (
        <FijasList fijas={fijasP} kilo={kilo} gruposGustos={gruposGustos} />
      ) : (
        <PersonalizadasTab pantalla={pantalla} placas={persP} />
      )}
    </div>
  );
}

// ── Tab 1: Placas fijas ───────────────────────────────────────────────────────

function FijasList({ fijas, kilo, gruposGustos }: { fijas: PlacaFija[]; kilo: Producto | null; gruposGustos: GrupoGustos[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function accion(fn: () => Promise<{ error: string } | { ok: true }>) {
    startTransition(async () => {
      const res = await fn();
      if (!("error" in res)) router.refresh();
    });
  }

  function mover(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= fijas.length) return;
    const a = fijas[idx];
    const b = fijas[j];
    accion(async () => {
      const r1 = await actualizarPlacaFija(a.id, { orden: b.orden });
      if ("error" in r1) return r1;
      return actualizarPlacaFija(b.id, { orden: a.orden });
    });
  }

  return (
    <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
      {fijas.map((p, idx) => (
        <div key={p.id}>
          <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <div className="flex flex-col">
              <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0 || isPending} className="disabled:opacity-30">
                <ArrowUp size={15} />
              </button>
              <button type="button" onClick={() => mover(idx, 1)} disabled={idx === fijas.length - 1 || isPending} className="disabled:opacity-30">
                <ArrowDown size={15} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.nombre}</p>
              <p className="text-xs text-muted-foreground">{p.slug}</p>
            </div>
            {PLACAS_PRECIOS[p.slug]?.map((f) => (
              <PrecioPlacaInput
                key={f.campo}
                placa={p}
                campo={f.campo}
                label={f.label}
                disabled={isPending}
                onGuardar={(campo, precio) =>
                  accion(() =>
                    actualizarPlacaFija(p.id, { config: { ...parsePlacaConfig(p.config), [campo]: precio } })
                  )
                }
              />
            ))}
            <DuracionInput
              valor={p.duracion}
              disabled={isPending}
              onGuardar={(d) => accion(() => actualizarPlacaFija(p.id, { duracion: d }))}
            />
            <ActivaToggle
              activa={p.activa}
              disabled={isPending}
              onToggle={() => accion(() => actualizarPlacaFija(p.id, { activa: !p.activa }))}
            />
          </div>

          {/* Kilo Kaikén: precio y gustos se editan acá (sobre el producto). */}
          {p.slug === "kilo-kaiken" && kilo && (
            <div className="rounded-b-xl border border-t-0 bg-muted/20 px-4 py-3 -mt-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Precio (a solo $…)</span>
                <PrecioProductoInput
                  valor={kilo.precio}
                  disabled={isPending}
                  onGuardar={(precio) => accion(() => actualizarPrecio(kilo.id, precio))}
                />
              </div>
              <GustosEditor
                seleccionados={parseGustos(kilo.gustos_incluidos)}
                grupos={gruposGustos}
                disabled={isPending}
                onGuardar={(g) => accion(() => actualizarGustosIncluidos(kilo.id, g))}
              />
            </div>
          )}
        </div>
      ))}
      {fijas.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay placas fijas.</p>}
    </div>
  );
}

// ── Tab 2: Placas personalizadas ──────────────────────────────────────────────

function PersonalizadasTab({ pantalla, placas }: { pantalla: Pantalla; placas: PlacaPersonalizada[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function accion(fn: () => Promise<{ error: string } | { ok: true }>) {
    startTransition(async () => {
      const res = await fn();
      if (!("error" in res)) router.refresh();
    });
  }

  function mover(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= placas.length) return;
    const a = placas[idx];
    const b = placas[j];
    accion(async () => {
      const r1 = await actualizarPlacaPersonalizada(a.id, { orden: b.orden });
      if ("error" in r1) return r1;
      return actualizarPlacaPersonalizada(b.id, { orden: a.orden });
    });
  }

  return (
    <div className="space-y-4">
      <UploadForm pantalla={pantalla} />

      <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
        {placas.map((p, idx) => (
          <div key={p.id} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <div className="flex flex-col">
              <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0 || isPending} className="disabled:opacity-30">
                <ArrowUp size={15} />
              </button>
              <button type="button" onClick={() => mover(idx, 1)} disabled={idx === placas.length - 1 || isPending} className="disabled:opacity-30">
                <ArrowDown size={15} />
              </button>
            </div>
            {esVideoUrl(p.imagen_url) ? (
              <video src={p.imagen_url} muted loop playsInline autoPlay className="h-16 w-9 object-cover rounded border bg-muted" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagen_url} alt={p.nombre} className="h-16 w-9 object-cover rounded border bg-muted" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.nombre}</p>
            </div>
            <DuracionInput
              valor={p.duracion}
              disabled={isPending}
              onGuardar={(d) => accion(() => actualizarPlacaPersonalizada(p.id, { duracion: d }))}
            />
            <ActivaToggle
              activa={p.activa}
              disabled={isPending}
              onToggle={() => accion(() => actualizarPlacaPersonalizada(p.id, { activa: !p.activa }))}
            />
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Borrar "${p.nombre}"?`)) accion(() => borrarPlacaPersonalizada(p.id));
              }}
              disabled={isPending}
              className="text-destructive hover:bg-destructive/10 rounded p-1.5"
              aria-label="Borrar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {placas.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay placas personalizadas.</p>}
      </div>
    </div>
  );
}

type Destino = 1 | 5 | "ambas";

function UploadForm({ pantalla }: { pantalla: Pantalla }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [destino, setDestino] = useState<Destino>(pantalla);
  const [duracion, setDuracion] = useState(10);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  // Si cambia la pantalla seleccionada arriba, arranca el destino ahí (se puede
  // sobreescribir por upload con el selector de abajo).
  useEffect(() => setDestino(pantalla), [pantalla]);

  function reset() {
    setFile(null);
    setNombre("");
    setDestino(pantalla);
    setDuracion(10);
    setInicio("");
    setFin("");
    setWarn(null);
  }

  async function onFile(f: File | null) {
    setFile(f);
    setError(null);
    setWarn(null);
    if (!f) return;
    const r = await validarArchivoPlaca(f);
    if (!r.ok) {
      setError(r.error ?? "Imagen inválida");
      setFile(null);
    } else if (r.warn) {
      setWarn(r.warn);
    }
  }

  function subir() {
    if (!file) {
      setError("Elegí una imagen");
      return;
    }
    if (!nombre.trim()) {
      setError("Poné un nombre");
      return;
    }
    setError(null);
    const destinos: Pantalla[] = destino === "ambas" ? [1, 5] : [destino];
    startTransition(async () => {
      for (const d of destinos) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("nombre", nombre.trim());
        fd.set("pantalla_id", String(d));
        fd.set("duracion", String(duracion));
        if (inicio) fd.set("inicio", inicio);
        if (fin) fd.set("fin", fin);
        const res = await crearPlacaPersonalizada(fd);
        if ("error" in res) {
          setError(`Pantalla ${d}: ${res.error}`);
          return;
        }
      }
      reset();
      router.refresh();
    });
  }

  const inputClass = "w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="rounded-xl border border-dashed bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">Subir nueva placa</p>
      <p className="text-xs text-muted-foreground">
        Imagen (JPG/PNG, máx 5MB) o video (MP4/WEBM, máx 50MB). Vertical 1080×1920 (9:16).
      </p>

      <input
        type="file"
        accept="image/jpeg,image/png,video/mp4,video/webm"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        disabled={isPending}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium"
      />

      {/* Destino: en qué pantalla(s) verticales se muestra esta placa */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">¿En qué pantalla se ve?</label>
        <div className="flex flex-wrap gap-2">
          {([1, 5, "ambas"] as Destino[]).map((d) => (
            <button
              key={String(d)}
              type="button"
              onClick={() => setDestino(d)}
              disabled={isPending}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                destino === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d === 1 ? "Vertical Izquierda (1)" : d === 5 ? "Vertical Derecha (5)" : "Ambas"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" disabled={isPending} className={inputClass} />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Dur. (s)</label>
          <input type="number" min={1} value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} disabled={isPending} className={inputClass} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} disabled={isPending} className={inputClass} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
          <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} disabled={isPending} className={inputClass} />
        </div>
      </div>

      {warn && <p className="text-xs text-amber-600">⚠ {warn}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="button"
        onClick={subir}
        disabled={isPending || !file}
        className="text-sm bg-primary text-primary-foreground rounded px-4 py-1.5 font-medium disabled:opacity-50"
      >
        {isPending ? "Subiendo…" : "Subir placa"}
      </button>
    </div>
  );
}

// ── Sub-componentes compartidos ───────────────────────────────────────────────

function PrecioPlacaInput({
  placa,
  campo,
  label,
  disabled,
  onGuardar,
}: {
  placa: PlacaFija;
  campo: "precio" | "precio_alt";
  label: string;
  disabled?: boolean;
  onGuardar: (campo: "precio" | "precio_alt", precio: number | null) => void;
}) {
  const actual = parsePlacaConfig(placa.config)[campo] ?? null;
  const [v, setV] = useState(actual != null ? String(actual) : "");

  function guardar() {
    const raw = v.trim().replace(",", ".");
    const num = raw === "" ? null : Number(raw);
    if (num !== null && !Number.isFinite(num)) return;
    if (num !== actual) onGuardar(campo, num);
  }

  return (
    <div className="flex flex-col items-end gap-0.5" title="Precio que se muestra sobre el video">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">$</span>
        <input
          type="number"
          min={0}
          step="any"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          disabled={disabled}
          placeholder="—"
          className="w-20 border rounded px-2 py-1 text-sm bg-background text-right"
          aria-label={`Precio ${label}`}
        />
      </div>
    </div>
  );
}

function PrecioProductoInput({
  valor,
  disabled,
  onGuardar,
}: {
  valor: number | null;
  disabled?: boolean;
  onGuardar: (precio: number | null) => void;
}) {
  const [v, setV] = useState(valor != null ? String(valor) : "");

  function guardar() {
    const raw = v.trim().replace(",", ".");
    const num = raw === "" ? null : Number(raw);
    if (num !== null && !Number.isFinite(num)) return;
    if (num !== valor) onGuardar(num);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">$</span>
      <input
        type="number"
        min={0}
        step="any"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        disabled={disabled}
        placeholder="—"
        className="w-24 border rounded px-2 py-1 text-sm bg-background text-right"
        aria-label="Precio del Kilo Kaikén"
      />
    </div>
  );
}

function DuracionInput({ valor, disabled, onGuardar }: { valor: number; disabled?: boolean; onGuardar: (d: number) => void }) {
  const [d, setD] = useState(valor);
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        value={d}
        onChange={(e) => setD(Number(e.target.value))}
        onBlur={() => d !== valor && d > 0 && onGuardar(d)}
        disabled={disabled}
        className="w-14 border rounded px-2 py-1 text-sm bg-background text-center"
        aria-label="Duración en segundos"
      />
      <span className="text-xs text-muted-foreground">s</span>
    </div>
  );
}

function ActivaToggle({ activa, disabled, onToggle }: { activa: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
        activa ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {activa ? "Activa" : "Inactiva"}
    </button>
  );
}
