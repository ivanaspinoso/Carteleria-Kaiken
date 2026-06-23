import { COLORS } from "@/lib/cartelera/tokens";
import PlacaVideo, { AutoFitTexto } from "./PlacaVideo";

// Placa 9 — Novedad del Mes. Video + novedad editable, centrada dentro del
// recuadro blanco (chato) debajo de "DEL MES".
export default function PlacaNovedadDelMes({ activo, novedad }: { activo?: boolean; novedad?: string }) {
  return (
    <PlacaVideo src="/placas/novedad-del-mes.mp4" activo={activo}>
      {/* Recuadro blanco: una palabra corta crece y llena; una novedad larga
          (ej. "medialuna c/jamón y queso") va en dos líneas y se achica para
          entrar. El box es un poco más chico que el fondo para dejar margen. */}
      {novedad ? (
        <AutoFitTexto
          topPct={40}
          boxWidthPct={52}
          boxHeightPct={7}
          maxFontPx={72}
          minFontPx={14}
          weight={700}
          color={COLORS.violeta}
          wrap
          lineHeight={1.15}
        >
          {novedad}
        </AutoFitTexto>
      ) : null}
    </PlacaVideo>
  );
}
