"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  valor: string | null;
  onChange: (valor: string) => void;
  disabled?: boolean;
  /** Texto tenue que se muestra cuando está vacío (modo display). */
  placeholder?: string;
  maxLength?: number;
  ariaLabel?: string;
  /** "titulo" = nombre del producto (resaltado); "sub" = descripción/unidad. */
  variant?: "titulo" | "sub";
  /** Tachar el texto (ej. producto sin stock). */
  tachado?: boolean;
  /** No permitir guardar vacío (ej. el nombre del producto). */
  requerido?: boolean;
}

// Editor de texto inline (mismo patrón que PrecioInline): se toca para editar,
// guarda con Enter o ✓, cancela con Escape/✕ o al perder foco.
export default function TextoInline({
  valor,
  onChange,
  disabled,
  placeholder = "—",
  maxLength = 120,
  ariaLabel,
  variant = "titulo",
  tachado,
  requerido,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) {
      setTexto(valor ?? "");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        })
      );
    }
  }, [editando]); // eslint-disable-line react-hooks/exhaustive-deps

  function guardar() {
    const limpio = texto.trim();
    // Requerido: no permitir vaciar (ej. nombre). Se cancela sin cambios.
    if (requerido && limpio === "") { setEditando(false); return; }
    // Solo dispara la acción si cambió, para no escribir de gusto.
    if (limpio !== (valor ?? "").trim()) onChange(limpio);
    setEditando(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); guardar(); }
    if (e.key === "Escape") setEditando(false);
  }

  const esTitulo = variant === "titulo";

  // ── Modo display ───────────────────────────────────────────────────
  if (!editando) {
    const vacio = !valor || valor.trim() === "";
    return (
      <button
        type="button"
        onClick={() => !disabled && setEditando(true)}
        disabled={disabled}
        title="Tocar para editar"
        className={`
          text-left rounded-md px-1.5 py-1.5 sm:py-0.5 -mx-1.5 max-w-full truncate transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted active:bg-muted cursor-pointer"}
          ${esTitulo ? "text-sm font-medium leading-snug" : "text-xs"}
          ${vacio ? "text-muted-foreground/50 italic" : tachado ? "line-through text-muted-foreground/60" : esTitulo ? "text-foreground" : "text-muted-foreground"}
        `}
      >
        {vacio ? placeholder : valor}
      </button>
    );
  }

  // ── Modo edición ───────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-1.5 w-full">
      <input
        ref={inputRef}
        type="text"
        value={texto}
        maxLength={maxLength}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setEditando(false)}
        aria-label={ariaLabel}
        className={`
          flex-1 min-w-0 border rounded-lg px-2.5 py-2 sm:py-1 bg-background
          focus:outline-none focus:ring-2 focus:ring-ring
          ${esTitulo ? "text-base sm:text-sm font-medium" : "text-base sm:text-xs"}
        `}
      />
      {/* onPointerDown + preventDefault evita que onBlur se dispare antes del click.
          Botones grandes (≥44px) para tocar cómodo con el dedo en celu. */}
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); guardar(); }}
        aria-label="Guardar"
        className="text-sm sm:text-xs bg-primary text-primary-foreground rounded-lg px-3 py-2.5 sm:px-2 sm:py-1 font-semibold flex-shrink-0"
      >✓</button>
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); setEditando(false); }}
        aria-label="Cancelar"
        className="text-sm sm:text-xs border rounded-lg px-3 py-2.5 sm:px-2 sm:py-1 text-muted-foreground hover:text-foreground flex-shrink-0"
      >✕</button>
    </div>
  );
}
