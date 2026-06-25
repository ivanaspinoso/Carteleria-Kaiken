import { COLORS } from "@/lib/cartelera/tokens";
import PlacaVideo, { OverlayTexto, AutoFitTexto } from "./PlacaVideo";

// Placa 7 — Kilo Kaikén. Video + precio ("a solo $X") y gustos seleccionados.
export default function PlacaKiloKaiken({
  activo,
  precio,
  gustos,
}: {
  activo?: boolean;
  precio?: string;
  gustos?: string;
}) {
  return (
    <PlacaVideo src="/placas/kilo-kaiken.mp4" activo={activo}>
      {/* Precio en la MISMA línea que "a solo" (horneado), a su derecha. */}
      {precio ? (
        <OverlayTexto topPct={36.6} fontPx={74} weight={450} color={COLORS.violeta} style={{ left: "63%", width: "auto", whiteSpace: "nowrap" }}>
          {precio}
        </OverlayTexto>
      ) : null}
      {/* Lista de gustos DENTRO del cartel verde, debajo del header horneado
          "GUSTOS SELECCIONADOS". Auto-ajuste: pocos gustos se ven grandes y una
          lista larga se achica/parte en líneas para no salirse del cartel. */}
      {gustos ? (
        <AutoFitTexto
          topPct={82}
          boxWidthPct={46}
          boxHeightPct={11}
          maxFontPx={32}
          minFontPx={13}
          weight={400}
          color={COLORS.blancoSobreFondo}
          wrap
          lineHeight={1.3}
        >
          {gustos}
        </AutoFitTexto>
      ) : null}
    </PlacaVideo>
  );
}
