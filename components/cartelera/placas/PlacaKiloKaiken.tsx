import { COLORS } from "@/lib/cartelera/tokens";
import PlacaVideo, { OverlayTexto } from "./PlacaVideo";

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
        <OverlayTexto topPct={36.5} fontPx={82} weight={400} color={COLORS.violeta} style={{ left: "63%", width: "auto", whiteSpace: "nowrap" }}>
          {precio}
        </OverlayTexto>
      ) : null}
      {/* Lista de gustos DENTRO del cartel verde, debajo del header horneado
          "GUSTOS SELECCIONADOS". El cartel está centrado en ~58% horizontal. */}
      {gustos ? (
        <OverlayTexto topPct={81.5} fontPx={30} weight={400} color={COLORS.blancoSobreFondo} style={{ left: "50%", width: "46%", lineHeight: 1.4 }}>
          {gustos}
        </OverlayTexto>
      ) : null}
    </PlacaVideo>
  );
}
