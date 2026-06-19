"use client";

import { useState, useRef, useEffect } from "react";
import { formatPrecio, esCambioGrande } from "@/lib/format";

interface Props {
  precio: number | null;
  onChange: (precio: number | null) => void;
  disabled?: boolean;
}

export default function PrecioInline({ precio, onChange, disabled }: Props) {
  const [editando, setEditando]       = useState(false);
  const [valor, setValor]             = useState("");
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [advertencia, setAdvertencia] = useState<{ msg: string; num: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) {
      setValor(precio != null ? String(precio) : "");
      setErrorMsg(null);
      setAdvertencia(null);
      // doble rAF para esperar el paint del input
      requestAnimationFrame(() => requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }));
    }
  }, [editando]); // eslint-disable-line react-hooks/exhaustive-deps

  function cancelar() {
    setEditando(false);
    setErrorMsg(null);
    setAdvertencia(null);
  }

  function intentarGuardar() {
    const raw = valor.trim().replace(",", ".");
    if (raw === "" || raw === "-") { onChange(null); setEditando(false); return; }
    const num = parseFloat(raw);
    if (isNaN(num))      { setErrorMsg("Número inválido"); return; }
    if (num < 0.5)       { setErrorMsg("Mínimo $0,50"); return; }
    if (num > 100_000)   { setErrorMsg("Máximo $100.000"); return; }
    if (precio != null && esCambioGrande(precio, num)) {
      const pct = Math.round(Math.abs((num - precio) / precio) * 100);
      setAdvertencia({ msg: `El precio cambió ${pct}% (${formatPrecio(precio)} → ${formatPrecio(num)})`, num });
      return;
    }
    onChange(num);
    setEditando(false);
  }

  function confirmarConAdvertencia() {
    if (advertencia) { onChange(advertencia.num); setEditando(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter")  { e.preventDefault(); intentarGuardar(); }
    if (e.key === "Escape") cancelar();
  }

  // ── Modo display ───────────────────────────────────────────────────
  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => !disabled && setEditando(true)}
        disabled={disabled}
        title="Tocar para editar precio"
        className={`
          font-mono text-sm font-semibold tabular-nums text-right
          rounded-lg px-2.5 py-1.5 min-w-[96px] transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted cursor-pointer"}
          ${precio == null ? "text-muted-foreground" : "text-foreground"}
        `}
      >
        {precio != null ? formatPrecio(precio) : "—"}
      </button>
    );
  }

  // ── Modo edición ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          value={valor}
          onChange={e => { setValor(e.target.value); setErrorMsg(null); setAdvertencia(null); }}
          onKeyDown={handleKeyDown}
          onBlur={cancelar}
          placeholder="0"
          min="0.5"
          max="100000"
          step="any"
          className="w-24 text-right border rounded-lg px-3 py-1.5 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {/* onPointerDown + preventDefault evita que onBlur se dispare antes del click */}
        <button
          type="button"
          onPointerDown={e => { e.preventDefault(); intentarGuardar(); }}
          className="text-xs bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 font-semibold"
        >✓</button>
        <button
          type="button"
          onPointerDown={e => { e.preventDefault(); cancelar(); }}
          className="text-xs border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
        >✕</button>
      </div>

      {errorMsg && (
        <p className="text-xs text-destructive pr-1">{errorMsg}</p>
      )}

      {advertencia && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 max-w-[220px] text-right">
          <p className="mb-2">⚠️ {advertencia.msg}</p>
          <div className="flex gap-1.5 justify-end">
            <button
              type="button"
              onPointerDown={e => { e.preventDefault(); confirmarConAdvertencia(); }}
              className="bg-amber-500 text-white rounded-lg px-2.5 py-1 font-semibold"
            >Guardar igual</button>
            <button
              type="button"
              onPointerDown={e => { e.preventDefault(); setAdvertencia(null); }}
              className="border rounded-lg px-2.5 py-1"
            >Corregir</button>
          </div>
        </div>
      )}
    </div>
  );
}
