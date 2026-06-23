"use client";

import type { GrupoGustos } from "@/lib/cartelera/gustos";

interface Props {
  /** Gustos actualmente seleccionados (nombres completos). */
  seleccionados: string[];
  /** Sabores clásicos disponibles, agrupados por categoría. */
  grupos: GrupoGustos[];
  disabled?: boolean;
  onGuardar: (gustos: string[]) => void;
}

const norm = (s: string) => s.trim().toLowerCase();

// Multi-select de "gustos incluidos" del Kilo Kaikén, AGRUPADO por categoría
// (Cremas, Chocolate, Frutales, Dulce de Leche, Sin Azúcar). Cada chip guarda
// el nombre completo (ej. "Dulce de Leche Con Bombón"); el chip muestra solo el
// sabor corto bajo el encabezado de su categoría. Toggle por chip; guarda en
// cada cambio (optimista en el padre). Los gustos guardados que ya no coinciden
// con ningún sabor (ej. de un seed viejo) se muestran aparte para poder quitarlos.
export default function GustosEditor({ seleccionados, grupos, disabled, onGuardar }: Props) {
  const estaSel = (valor: string) => seleccionados.some((g) => norm(g) === norm(valor));

  function toggle(valor: string) {
    if (estaSel(valor)) {
      onGuardar(seleccionados.filter((g) => norm(g) !== norm(valor)));
    } else {
      onGuardar([...seleccionados, valor]);
    }
  }

  const todos = grupos.flatMap((g) => g.sabores.map((s) => s.valor));
  const extras = seleccionados.filter((g) => !todos.some((v) => norm(v) === norm(g)));

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Gustos seleccionados del Kilo Kaikén
        <span className="ml-1.5 text-muted-foreground/60">({seleccionados.length})</span>
      </p>

      {grupos.map((grupo) => (
        <div key={grupo.categoria} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
            {grupo.categoria}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {grupo.sabores.map((sabor) => {
              const activo = estaSel(sabor.valor);
              return (
                <button
                  key={sabor.valor}
                  type="button"
                  onClick={() => toggle(sabor.valor)}
                  disabled={disabled}
                  title={sabor.valor}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                    activo
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {sabor.etiqueta}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {grupos.length === 0 && (
        <span className="text-xs text-muted-foreground">No hay sabores clásicos cargados.</span>
      )}

      {extras.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
            Guardados que no coinciden (tocá para quitar)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {extras.map((extra) => (
              <button
                key={extra}
                type="button"
                onClick={() => toggle(extra)}
                disabled={disabled}
                title="Gusto guardado que no coincide con un sabor actual — tocá para quitarlo"
                className="text-xs px-2.5 py-1 rounded-full border bg-amber-500 text-white border-amber-500 transition-colors disabled:opacity-50"
              >
                {extra}
              </button>
            ))}
          </div>
        </div>
      )}

      {seleccionados.length > 0 && (
        <p className="text-xs text-muted-foreground/70">
          En la placa: {seleccionados.join(" - ")}
        </p>
      )}
    </div>
  );
}
