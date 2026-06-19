import { COLORS } from "@/lib/cartelera/tokens";
import PlacaVideo, { OverlayTexto } from "./PlacaVideo";

// Placa 1 — Antojo de Tarde. Video + precio editable (Cambio 7).
export default function PlacaAntojoDeTarde({ activo, precio }: { activo?: boolean; precio?: string }) {
  return (
    <PlacaVideo src="/placas/antojo-de-tarde.mp4" activo={activo}>
      {/* Precio editable desde el admin (placas_fijas.config.precio),
          posicionado justo debajo de "Valor especial". */}
      {precio ? (
        <OverlayTexto topPct={88} fontPx={42} weight={400} color={COLORS.blancoSobreFondo}>
          {precio}
        </OverlayTexto>
      ) : null}
    </PlacaVideo>
  );
}
