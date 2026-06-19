"use client";

interface Props {
  /** Gustos actualmente seleccionados (nombres). */
  seleccionados: string[];
  /** Todos los sabores clásicos disponibles para elegir. */
  opciones: string[];
  disabled?: boolean;
  onGuardar: (gustos: string[]) => void;
}

const norm = (s: string) => s.trim().toLowerCase();

// Multi-select de "gustos incluidos" del Kilo Kaikén. Toggle por chip; guarda
// en cada cambio (optimista en el padre). Compara sin distinguir mayúsculas, y
// muestra también los gustos guardados que no están en la lista de opciones
// (para poder QUITARLOS aunque no coincidan exactamente con un sabor actual).
export default function GustosEditor({ seleccionados, opciones, disabled, onGuardar }: Props) {
  const estaSel = (nombre: string) => seleccionados.some((g) => norm(g) === norm(nombre));

  function toggle(nombre: string) {
    if (estaSel(nombre)) {
      // quitar (sin distinguir mayúsculas)
      onGuardar(seleccionados.filter((g) => norm(g) !== norm(nombre)));
    } else {
      onGuardar([...seleccionados, nombre]);
    }
  }

  // Gustos guardados que no están en las opciones (ej. de un seed viejo con
  // otra capitalización): se muestran igual para poder desmarcarlos.
  const extras = seleccionados.filter((g) => !opciones.some((o) => norm(o) === norm(g)));
  // Deduplicar por nombre (hay sabores con el mismo nombre en distintas
  // categorías, ej. "Americana" en Cremas y en Sin Azúcar) — un solo chip.
  const chips = Array.from(
    new Map([...opciones, ...extras].map((n) => [norm(n), n])).values()
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Gustos seleccionados del Kilo Kaikén
        <span className="ml-1.5 text-muted-foreground/60">({seleccionados.length})</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((nombre) => {
          const activo = estaSel(nombre);
          const esExtra = extras.some((e) => norm(e) === norm(nombre));
          return (
            <button
              key={nombre}
              type="button"
              onClick={() => toggle(nombre)}
              disabled={disabled}
              title={esExtra ? "Gusto guardado que no coincide con un sabor actual — tocá para quitarlo" : undefined}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                activo
                  ? esExtra
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {nombre}
            </button>
          );
        })}
        {opciones.length === 0 && (
          <span className="text-xs text-muted-foreground">No hay sabores clásicos cargados.</span>
        )}
      </div>
      {seleccionados.length > 0 && (
        <p className="text-xs text-muted-foreground/70">
          En la placa: {seleccionados.join(" - ")}
        </p>
      )}
    </div>
  );
}
