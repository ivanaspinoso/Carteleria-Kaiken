"use client";

import { useState, useTransition } from "react";
import type { Promo, Producto } from "@/lib/types";
import { actualizarPromo } from "@/lib/actions/promos";

type PromoConProducto = Promo & { producto: Pick<Producto, "id" | "nombre"> | null };

interface Props {
  promos:    PromoConProducto[];
  productos: Pick<Producto, "id" | "nombre" | "categoria_id">[];
}

const TIPO_LABEL: Record<string, string> = {
  sabor_semana: "⭐ Sabor de la semana",
  combo:        "🎁 Combo",
  mensaje:      "💬 Mensaje",
};

export default function ListaPromos({ promos, productos }: Props) {
  return (
    <div className="space-y-4">
      {promos.map(promo => (
        <FilaPromo key={promo.id} promo={promo} productos={productos} />
      ))}
      {promos.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">No hay promos</p>
      )}
    </div>
  );
}

// ── FilaPromo ────────────────────────────────────────────────────────────────

function FilaPromo({ promo: inicial, productos }: { promo: PromoConProducto; productos: Props["productos"] }) {
  const [isPending, startTransition] = useTransition();
  const [promo, setPromo]   = useState(inicial);
  const [error, setError]   = useState<string | null>(null);
  const [exito, setExito]   = useState(false);

  async function guardar(cambios: Parameters<typeof actualizarPromo>[1]) {
    startTransition(async () => {
      setError(null);
      setExito(false);
      // Optimistic
      setPromo(p => ({ ...p, ...cambios }));
      const res = await actualizarPromo(promo.id, cambios);
      if ("error" in res) {
        setError(res.error);
        setPromo(inicial); // revertir
      } else {
        setExito(true);
        setTimeout(() => setExito(false), 2000);
      }
    });
  }

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 transition-opacity ${isPending ? "opacity-60" : ""}`}>
      {/* Header: tipo + activa toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          {TIPO_LABEL[promo.tipo] ?? promo.tipo}
        </span>
        <div className="flex items-center gap-3">
          {exito && <span className="text-xs text-emerald-600 font-medium">Guardado ✓</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
          <button
            type="button"
            onClick={() => guardar({ activa: !promo.activa })}
            disabled={isPending}
            className={`
              text-xs font-semibold px-3 py-1 rounded-full transition-all
              ${promo.activa
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
              }
            `}
          >
            {promo.activa ? "Activa" : "Inactiva"}
          </button>
        </div>
      </div>

      {/* Título editable */}
      <CampoTexto
        label="Título"
        valor={promo.titulo}
        onGuardar={titulo => guardar({ titulo })}
        disabled={isPending}
      />

      {/* Contenido editable (textarea) */}
      <CampoTexto
        label="Descripción"
        valor={promo.contenido ?? ""}
        multilinea
        onGuardar={contenido => guardar({ contenido: contenido || null })}
        disabled={isPending}
      />

      {/* Selector de producto (solo para sabor_semana y combo) */}
      {(promo.tipo === "sabor_semana" || promo.tipo === "combo") && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Producto vinculado</label>
          <select
            value={promo.producto_id ?? ""}
            onChange={e => guardar({ producto_id: e.target.value || null })}
            disabled={isPending}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Sin producto —</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── CampoTexto — edición inline ───────────────────────────────────────────────

interface CampoTextoProps {
  label:      string;
  valor:      string;
  multilinea?: boolean;
  onGuardar:  (valor: string) => void;
  disabled?:  boolean;
}

function CampoTexto({ label, valor: inicial, multilinea, onGuardar, disabled }: CampoTextoProps) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft]       = useState(inicial);

  function guardar() {
    if (draft.trim() !== inicial.trim()) onGuardar(draft.trim());
    setEditando(false);
  }

  function cancelar() {
    setDraft(inicial);
    setEditando(false);
  }

  if (!editando) {
    return (
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={() => !disabled && setEditando(true)}
          disabled={disabled}
          className="w-full text-left text-sm rounded px-2 py-1.5 hover:bg-muted transition-colors min-h-[32px]"
        >
          {inicial || <span className="text-muted-foreground italic">Tocar para agregar…</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {multilinea ? (
        <textarea
          autoFocus
          rows={3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") cancelar(); }}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") cancelar(); }}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          className="text-xs bg-primary text-primary-foreground rounded px-3 py-1"
        >Guardar</button>
        <button
          type="button"
          onClick={cancelar}
          className="text-xs border rounded px-3 py-1"
        >Cancelar</button>
      </div>
    </div>
  );
}
