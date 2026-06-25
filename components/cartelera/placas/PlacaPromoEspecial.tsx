import { COLORS } from "@/lib/cartelera/tokens";
import PlacaVideo, { AutoFitTexto, OverlayTexto } from "./PlacaVideo";

// Placa 2 — Promo Especial. Video + combo (recuadro verde) + fecha de validez
// editable debajo de "VÁLIDO POR:".
export default function PlacaPromoEspecial({
  activo,
  texto,
  validez,
}: {
  activo?: boolean;
  texto?: string;
  validez?: string;
}) {
  return (
    <PlacaVideo src="/placas/promo-especial.mp4" activo={activo}>
      {/* Combo SOLO en la zona izquierda del recuadro verde: el cono de helado
          entra por la derecha (~62%), así que el texto se ancla a la izquierda
          y con ancho acotado para no taparlo nunca. */}
      {texto ? (
        <AutoFitTexto
          topPct={47.5}
          leftPct={42}
          boxWidthPct={36}
          boxHeightPct={24}
          maxFontPx={64}
          minFontPx={18}
          weight={700}
          color={COLORS.blancoSobreFondo}
          wrap
          textAlign="left"
          lineHeight={1.2}
        >
          {texto}
        </AutoFitTexto>
      ) : null}
      {/* Fecha de validez debajo de "VÁLIDO POR:" (horneado ~64%), a la
          izquierda para no tocar el cono. */}
      {validez ? (
        <OverlayTexto topPct={69} fontPx={40} weight={400} color={COLORS.verde} style={{ left: "33%", width: "40%" }}>
          {validez}
        </OverlayTexto>
      ) : null}
    </PlacaVideo>
  );
}
