"use client";

import { useOptimistic, useTransition, useState } from "react";
import type { Categoria, Producto } from "@/lib/types";
import { parseGustos } from "@/lib/types";
import type { GrupoGustos } from "@/lib/cartelera/gustos";
import { actualizarPrecio, actualizarGustosIncluidos, toggleStock } from "@/lib/actions/productos";
import FilaProducto from "./FilaProducto";
import GustosEditor from "./GustosEditor";

interface Props {
  categorias: Categoria[];
  productos:  Producto[];
  /** Sabores clásicos (agrupados por categoría) para el multi-select del Kilo Kaikén. */
  gruposGustos?: GrupoGustos[];
}

type Actualizacion = { id: string; cambios: Partial<Producto> };

export default function ListaProductos({ categorias, productos, gruposGustos = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [optimisticProductos, setOptimistic] = useOptimistic<Producto[], Actualizacion>(
    productos,
    (estado, { id, cambios }) =>
      estado.map(p => (p.id === id ? { ...p, ...cambios } : p))
  );

  function handlePrecio(id: string, nuevoPrecio: number | null) {
    startTransition(async () => {
      setOptimistic({ id, cambios: { precio: nuevoPrecio } });
      setErrorGlobal(null);
      const res = await actualizarPrecio(id, nuevoPrecio);
      if ("error" in res) setErrorGlobal(res.error);
    });
  }

  function handlePrecioAlt(id: string, nuevoPrecio: number | null) {
    startTransition(async () => {
      setOptimistic({ id, cambios: { precio_alt: nuevoPrecio } });
      setErrorGlobal(null);
      const res = await actualizarPrecio(id, nuevoPrecio, "precio_alt");
      if ("error" in res) setErrorGlobal(res.error);
    });
  }

  function handleGustos(id: string, gustos: string[]) {
    startTransition(async () => {
      setOptimistic({ id, cambios: { gustos_incluidos: gustos } });
      setErrorGlobal(null);
      const res = await actualizarGustosIncluidos(id, gustos);
      if ("error" in res) setErrorGlobal(res.error);
    });
  }

  function handleStock(id: string, enStock: boolean) {
    startTransition(async () => {
      setOptimistic({ id, cambios: { en_stock: enStock } });
      setErrorGlobal(null);
      const res = await toggleStock(id, enStock);
      if ("error" in res) setErrorGlobal(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {errorGlobal && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm">
          {errorGlobal}
        </div>
      )}

      {categorias.map(cat => {
        const prods = optimisticProductos.filter(p => p.categoria_id === cat.id);
        if (prods.length === 0) return null;
        return (
          <section key={cat.id}>
            {/* Header de categoría con línea divisora */}
            <div className="flex items-center gap-3 mb-2.5 px-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {cat.nombre}
              </h2>
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-xs text-muted-foreground/70 tabular-nums">{prods.length}</span>
            </div>

            {/* Card de productos */}
            <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
              {prods.map(prod => (
                <div key={prod.id}>
                  <FilaProducto
                    producto={prod}
                    onPrecio={handlePrecio}
                    onPrecioAlt={handlePrecioAlt}
                    onStock={handleStock}
                    // Los postres tienen dos precios (Chico / Grande)
                    mostrarPrecioAlt={cat.tipo === "postre"}
                    disabled={isPending}
                  />
                  {/* Kilo Kaikén: editor de gustos incluidos (multi-select) */}
                  {prod.nombre === "Kilo Kaikén" && (
                    <div className="px-5 py-3 bg-muted/20 border-t">
                      <GustosEditor
                        seleccionados={parseGustos(prod.gustos_incluidos)}
                        grupos={gruposGustos}
                        disabled={isPending}
                        onGuardar={(g) => handleGustos(prod.id, g)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {categorias.length === 0 && (
        <div className="text-center text-muted-foreground py-16 text-sm">
          No hay categorías activas
        </div>
      )}
    </div>
  );
}
