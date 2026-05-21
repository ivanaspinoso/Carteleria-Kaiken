"use client";

import { useOptimistic, useTransition, useState } from "react";
import type { Categoria, Producto } from "@/lib/types";
import { actualizarPrecio, toggleStock } from "@/lib/actions/productos";
import FilaProducto from "./FilaProducto";

interface Props {
  categorias: Categoria[];
  productos:  Producto[];
}

type Actualizacion = { id: string; cambios: Partial<Producto> };

export default function ListaProductos({ categorias, productos }: Props) {
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

  function handleStock(id: string, enStock: boolean) {
    startTransition(async () => {
      setOptimistic({ id, cambios: { en_stock: enStock } });
      setErrorGlobal(null);
      const res = await toggleStock(id, enStock);
      if ("error" in res) setErrorGlobal(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {errorGlobal && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-destructive text-sm">
          {errorGlobal}
        </div>
      )}

      {categorias.map(cat => {
        const prods = optimisticProductos.filter(p => p.categoria_id === cat.id);
        if (prods.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">
              {cat.nombre}
            </h2>
            <div className="rounded-xl border bg-card divide-y">
              {prods.map(prod => (
                <FilaProducto
                  key={prod.id}
                  producto={prod}
                  onPrecio={handlePrecio}
                  onStock={handleStock}
                  disabled={isPending}
                />
              ))}
            </div>
          </section>
        );
      })}

      {categorias.length === 0 && (
        <div className="text-center text-muted-foreground py-12 text-sm">
          No hay categorías activas
        </div>
      )}
    </div>
  );
}
