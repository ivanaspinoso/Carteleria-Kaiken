import { COLORS } from "@/lib/cartelera/tokens";
import PlacaVideo, { OverlayTexto } from "./PlacaVideo";

// Molde compartido de las placas "Después del Cole" (Tostado / Budín).
export default function DespuesColeBase({
  src,
  precio,
  activo,
}: {
  src: string;
  precio?: string;
  activo?: boolean;
}) {
  return (
    <PlacaVideo src={src} activo={activo}>
      {/* Precio editable debajo de "Valor especial" (mismo estilo que antojo) */}
      {precio ? (
        <OverlayTexto topPct={86} fontPx={46} weight={400} color={COLORS.blancoSobreFondo}>
          {precio}
        </OverlayTexto>
      ) : null}
    </PlacaVideo>
  );
}
