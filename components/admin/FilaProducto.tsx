"use client";

import type { Producto } from "@/lib/types";
import type { CampoTexto } from "@/lib/actions/productos";
import PrecioInline from "./PrecioInline";
import StockToggle from "./StockToggle";
import TextoInline from "./TextoInline";

interface Props {
  producto: Producto;
  onPrecio: (id: string, precio: number | null) => void;
  onPrecioAlt?: (id: string, precio: number | null) => void;
  onStock:  (id: string, enStock: boolean)       => void;
  /** Editar nombre / descripción / unidad. */
  onTexto: (id: string, campo: CampoTexto, valor: string) => void;
  /** Postres: muestra dos precios (Chico / Grande = precio / precio_alt). */
  mostrarPrecioAlt?: boolean;
  /** Descripción editable — solo donde se muestra en placa (especiales). */
  mostrarDescripcion?: boolean;
  /** Unidad/volumen editable — solo donde se muestra en placa (cafetería). */
  mostrarUnidad?: boolean;
  disabled: boolean;
}

export default function FilaProducto({ producto, onPrecio, onPrecioAlt, onStock, onTexto, mostrarPrecioAlt, mostrarDescripcion, mostrarUnidad, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5 hover:bg-muted/30 transition-colors">

      {/* Grupo nombre: dot + nombre/descripción. En mobile ocupa su propia fila. */}
      <div className="flex items-center gap-3 flex-1 min-w-0">

      {/* Dot de estado — escaneo visual rápido */}
      <div className={`
        w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors
        ${producto.en_stock ? "bg-emerald-500" : "bg-border"}
      `} />

      {/* Nombre (editable) + descripción + unidad (editables) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <TextoInline
            valor={producto.nombre}
            onChange={(v) => onTexto(producto.id, "nombre", v)}
            disabled={disabled}
            variant="titulo"
            maxLength={80}
            ariaLabel="Nombre del producto"
            tachado={!producto.en_stock}
            requerido
          />
          {producto.destacado && <span className="text-xs text-primary flex-shrink-0">★</span>}
        </div>
        {/* Descripción (solo especiales) y unidad/volumen (solo cafetería):
            se muestran únicamente donde el texto aparece en la placa. Vacías
            muestran un hint tenue para agregarlas. */}
        {(mostrarDescripcion || mostrarUnidad) && (
          <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
            {mostrarDescripcion && (
              <TextoInline
                valor={producto.descripcion}
                onChange={(v) => onTexto(producto.id, "descripcion", v)}
                disabled={disabled}
                variant="sub"
                placeholder="＋ descripción"
                maxLength={300}
                ariaLabel="Descripción del producto"
              />
            )}
            {mostrarUnidad && (
              <TextoInline
                valor={producto.unidad}
                onChange={(v) => onTexto(producto.id, "unidad", v)}
                disabled={disabled}
                variant="sub"
                placeholder="＋ volumen"
                maxLength={30}
                ariaLabel="Volumen del producto"
              />
            )}
          </div>
        )}
      </div>
      </div>

      {/* Grupo controles: stock + precio(s). En mobile baja a su fila y se reparte
          a lo ancho; en desktop queda a la derecha. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 justify-between sm:flex-nowrap sm:justify-end sm:gap-4">

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
    </div>
  );
}
