"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { Promo, Producto } from "@/lib/types";
import { guardarPromoKaiken, type CamposPromoKaiken, type PromoKaikenTipo } from "@/lib/actions/promos";

type PromoRow = Promo & { producto: Pick<Producto, "id" | "nombre"> | null };
type ProductoLite = Pick<Producto, "id" | "nombre">;

interface Props {
  gusto: PromoRow | null;
  novedad: PromoRow | null;
  especial: PromoRow | null;
  heladoProductos: ProductoLite[];
  todosProductos: ProductoLite[];
}

export default function PromosEditorKaiken({ gusto, novedad, especial, heladoProductos, todosProductos }: Props) {
  return (
    <div className="space-y-5">
      <GustoDelDia promo={gusto} productos={heladoProductos} />
      <NovedadDelMes promo={novedad} productos={todosProductos} />
      <PromoEspecial promo={especial} />
    </div>
  );
}

// ── Wrapper común ─────────────────────────────────────────────────────────────

function Seccion({
  titulo,
  descripcion,
  activa,
  onToggleActiva,
  onGuardar,
  isPending,
  estado,
  children,
}: {
  titulo: string;
  descripcion: string;
  activa: boolean;
  onToggleActiva: () => void;
  onGuardar: () => void;
  isPending: boolean;
  estado: { error: string | null; exito: boolean };
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 transition-opacity ${isPending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">{titulo}</h2>
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        </div>
        <button
          type="button"
          onClick={onToggleActiva}
          disabled={isPending}
          className={`text-sm sm:text-xs font-semibold px-4 py-2 sm:px-3 sm:py-1 rounded-full transition-all active:scale-95 ${
            activa
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {activa ? "Activa" : "Inactiva"}
        </button>
      </div>

      {children}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onGuardar}
          disabled={isPending}
          className="text-sm sm:text-xs bg-primary text-primary-foreground rounded-lg px-5 py-2.5 sm:px-4 sm:py-1.5 font-medium disabled:opacity-50 active:scale-95 transition-transform"
        >
          Guardar
        </button>
        {estado.exito && <span className="text-xs text-emerald-600 font-medium">Guardado ✓</span>}
        {estado.error && <span className="text-xs text-destructive">{estado.error}</span>}
      </div>
    </div>
  );
}

function useGuardar(tipo: PromoKaikenTipo) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function guardar(campos: CamposPromoKaiken) {
    startTransition(async () => {
      setError(null);
      setExito(false);
      const res = await guardarPromoKaiken(tipo, campos);
      if ("error" in res) {
        setError(res.error);
      } else {
        setExito(true);
        setTimeout(() => setExito(false), 2000);
      }
    });
  }

  return { isPending, estado: { error, exito }, guardar };
}

const selectClass =
  "w-full border rounded-md px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

// ── Gusto del Día ─────────────────────────────────────────────────────────────

function GustoDelDia({ promo, productos }: { promo: PromoRow | null; productos: ProductoLite[] }) {
  const { isPending, estado, guardar } = useGuardar("sabor_dia");
  const [productoId, setProductoId] = useState(promo?.producto_id ?? "");
  const [activa, setActiva] = useState(promo?.activa ?? false);

  return (
    <Seccion
      titulo="Gusto del Día"
      descripcion="Elegí el sabor que se muestra en la placa (pantallas 1 y 5)."
      activa={activa}
      onToggleActiva={() => setActiva((a) => !a)}
      onGuardar={() => guardar({ producto_id: productoId || null, contenido: null, activa })}
      isPending={isPending}
      estado={estado}
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Sabor</label>
        <select value={productoId} onChange={(e) => setProductoId(e.target.value)} disabled={isPending} className={selectClass}>
          <option value="">— Elegir sabor —</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>
    </Seccion>
  );
}

// ── Novedad del Mes ───────────────────────────────────────────────────────────

function NovedadDelMes({ promo, productos }: { promo: PromoRow | null; productos: ProductoLite[] }) {
  const { isPending, estado, guardar } = useGuardar("novedad_mes");
  const [modo, setModo] = useState<"producto" | "texto">(promo?.producto_id ? "producto" : "texto");
  const [productoId, setProductoId] = useState(promo?.producto_id ?? "");
  const [texto, setTexto] = useState(promo?.contenido ?? "");
  const [activa, setActiva] = useState(promo?.activa ?? false);

  return (
    <Seccion
      titulo="Novedad del Mes"
      descripcion="Un producto existente o un texto libre."
      activa={activa}
      onToggleActiva={() => setActiva((a) => !a)}
      onGuardar={() =>
        guardar(
          modo === "producto"
            ? { producto_id: productoId || null, contenido: null, activa }
            : { producto_id: null, contenido: texto.trim() || null, activa }
        )
      }
      isPending={isPending}
      estado={estado}
    >
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer py-1.5 pr-3 select-none">
          <input type="radio" checked={modo === "producto"} onChange={() => setModo("producto")} disabled={isPending} className="size-4 accent-primary" />
          Producto
        </label>
        <label className="flex items-center gap-2 cursor-pointer py-1.5 pr-3 select-none">
          <input type="radio" checked={modo === "texto"} onChange={() => setModo("texto")} disabled={isPending} className="size-4 accent-primary" />
          Texto libre
        </label>
      </div>
      {modo === "producto" ? (
        <select value={productoId} onChange={(e) => setProductoId(e.target.value)} disabled={isPending} className={selectClass}>
          <option value="">— Elegir producto —</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={isPending}
          placeholder="Ej: Volvió el Pistacho"
          className={selectClass}
        />
      )}
    </Seccion>
  );
}

// ── Promo Especial ────────────────────────────────────────────────────────────

function PromoEspecial({ promo }: { promo: PromoRow | null }) {
  const { isPending, estado, guardar } = useGuardar("promo_especial");
  const [texto, setTexto] = useState(promo?.contenido ?? "");
  const [fin, setFin] = useState(promo?.fin ? promo.fin.slice(0, 10) : "");
  const [activa, setActiva] = useState(promo?.activa ?? false);

  return (
    <Seccion
      titulo="Promo Especial"
      descripcion="El combo (recuadro verde) y la fecha de validez (debajo de VÁLIDO POR)."
      activa={activa}
      onToggleActiva={() => setActiva((a) => !a)}
      onGuardar={() => guardar({ contenido: texto.trim() || null, fin: fin || null, precio: null, activa })}
      isPending={isPending}
      estado={estado}
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Combo (recuadro verde)</label>
        <textarea
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={isPending}
          placeholder="Ej: 2 Cuartos + 2 Conos"
          className={`${selectClass} resize-none`}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Válido por (fecha de fin)</label>
        <input
          type="date"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
          disabled={isPending}
          className={selectClass}
        />
      </div>
    </Seccion>
  );
}
