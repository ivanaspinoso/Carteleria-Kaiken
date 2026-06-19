import { COLORS, fontPorLargo } from "@/lib/cartelera/tokens";
import PlacaVideo, { OverlayTexto } from "./PlacaVideo";

// Placa 9 — Novedad del Mes. Video + novedad editable, centrada dentro del
// recuadro blanco (chato) debajo de "DEL MES".
export default function PlacaNovedadDelMes({ activo, novedad }: { activo?: boolean; novedad?: string }) {
  return (
    <PlacaVideo src="/placas/novedad-del-mes.mp4" activo={activo}>
      {/* Recuadro blanco: centro real (50%, 40%), recuadro chato. Texto violeta,
          tamaño dinámico: si es más de una palabra se achica para entrar. */}
      {novedad ? (
        <OverlayTexto
          topPct={40}
          fontPx={fontPorLargo(novedad, 20, 18)}
          weight={700}
          color={COLORS.violeta}
          style={{ left: "50%", width: "58%", whiteSpace: "nowrap" }}
        >
          {novedad}
        </OverlayTexto>
      ) : null}
    </PlacaVideo>
  );
}
