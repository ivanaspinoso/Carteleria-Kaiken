"use client";

import type { Producto } from "@/lib/types";
import PrecioInline from "./PrecioInline";
import StockToggle from "./StockToggle";

interface Props {
  producto: Producto;
  onPrecio: (id: string, precio: number | null) => void;
  onStock:  (id: string, enStock: boolean)       => void;
  disabled: boolean;
}

export default function FilaProducto({ producto, onPrecio, onStock, disabled }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Nombre */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${!producto.en_stock ? "text-muted-foreground line-through" : ""}`}>
          {producto.nombre}
          {producto.destacado && <span className="ml-1.5 text-yellow-500">★</span>}
        </p>
        {producto.unidad && (
          <p className="text-xs text-muted-foreground">por {producto.unidad}</p>
        )}
      </div>

      {/* Toggle stock */}
      <StockToggle
        enStock={producto.en_stock}
        onChange={enStock => onStock(producto.id, enStock)}
        disabled={disabled}
      />

      {/* Precio inline */}
      <PrecioInline
        precio={producto.precio}
        onChange={precio => onPrecio(producto.id, precio)}
        disabled={disabled}
      />
    </div>
  );
}
