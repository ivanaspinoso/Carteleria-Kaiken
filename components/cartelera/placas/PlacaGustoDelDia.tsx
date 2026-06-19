import { COLORS, fontPorPalabras } from "@/lib/cartelera/tokens";
import PlacaVideo, { OverlayTexto } from "./PlacaVideo";

// Placa 8 — Gusto del Día. Video + nombre del sabor editable, centrado dentro
// del recuadro bordó debajo de "GUSTO DEL DÍA".
export default function PlacaGustoDelDia({ activo, sabor }: { activo?: boolean; sabor?: string }) {
  return (
    <PlacaVideo src="/placas/gusto-del-dia.mp4" activo={activo}>
      {/* Recuadro bordó: centro real (50%, 46.7%), ancho 59%. Texto crema,
          tamaño dinámico para que sabores largos entren igual. */}
      {sabor ? (
        <OverlayTexto
          topPct={43.5}
          fontPx={fontPorPalabras(sabor, 50, 40)}
          weight={700}
          color={COLORS.blancoSobreFondo}
          style={{ left: "50%", width: "54%", whiteSpace: "nowrap" }}
        >
          {sabor}
        </OverlayTexto>
      ) : null}
    </PlacaVideo>
  );
}
