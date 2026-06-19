"use client";

import type { Producto } from "@/lib/types";
import PrecioInline from "./PrecioInline";
import StockToggle from "./StockToggle";

interface Props {
  producto: Producto;
  onPrecio: (id: string, precio: number | null) => void;
  onPrecioAlt?: (id: string, precio: number | null) => void;
  onStock:  (id: string, enStock: boolean)       => void;
  /** Postres: muestra dos precios (Chico / Grande = precio / precio_alt). */
  mostrarPrecioAlt?: boolean;
  disabled: boolean;
}

export default function FilaProducto({ producto, onPrecio, onPrecioAlt, onStock, mostrarPrecioAlt, disabled }: Props) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">

      {/* Dot de estado — escaneo visual rápido */}
      <div className={`
        w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors
        ${producto.en_stock ? "bg-emerald-500" : "bg-border"}
      `} />

      {/* Nombre + unidad */}
      <div className="flex-1 min-w-0">
        <p className={`
          text-sm font-medium leading-snug truncate
          ${!producto.en_stock ? "text-muted-foreground/60" : "text-foreground"}
        `}>
          {producto.nombre}
          {producto.destacado && (
            <span className="ml-1.5 text-xs text-primary">★</span>
          )}
        </p>
        {producto.unidad && (
          <p className="text-xs text-muted-foreground mt-0.5">por {producto.unidad}</p>
        )}
      </div>

      {/* Toggle stock */}
      <StockToggle
        enStock={producto.en_stock}
        onChange={enStock => onStock(producto.id, enStock)}
        disabled={disabled}
      />

      {/* Precio(s) inline. Postres: dos columnas Chico / Grande. */}
      {mostrarPrecioAlt ? (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Chico</span>
            <PrecioInline
              precio={producto.precio}
              onChange={precio => onPrecio(producto.id, precio)}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Grande</span>
            <PrecioInline
              precio={producto.precio_alt}
              onChange={precio => onPrecioAlt?.(producto.id, precio)}
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <PrecioInline
          precio={producto.precio}
          onChange={precio => onPrecio(producto.id, precio)}
          disabled={disabled}
        />
      )}
    </div>
  );
}
