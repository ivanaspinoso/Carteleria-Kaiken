import { COLORS } from "@/lib/cartelera/tokens";
import PlacaVideo, { AutoFitTexto } from "./PlacaVideo";

// Placa 8 — Gusto del Día. Video + nombre del sabor editable, centrado dentro
// del recuadro bordó debajo de "GUSTO DEL DÍA".
export default function PlacaGustoDelDia({ activo, sabor }: { activo?: boolean; sabor?: string }) {
  return (
    <PlacaVideo src="/placas/gusto-del-dia.mp4" activo={activo}>
      {/* Recuadro bordó: el texto se achica solo para entrar siempre, así un
          sabor largo (ej. "Frambuesa Patagónica") no se sale del fondo. */}
      {sabor ? (
        <AutoFitTexto
          topPct={43.5}
          boxWidthPct={54}
          maxFontPx={72}
          minFontPx={18}
          weight={700}
          color={COLORS.blancoSobreFondo}
        >
          {sabor}
        </AutoFitTexto>
      ) : null}
    </PlacaVideo>
  );
}
