import { COLORS, escalaV } from "@/lib/cartelera/tokens";
import PlacaVideo, { OverlayTexto } from "./PlacaVideo";

// Placa 5 — Cuartos. Video + dos precios editables:
//  - "A $X"   debajo de "CUARTOS"            (precio por unidad)
//  - "$Y"     en pastilla, debajo de "Llevá 4 cuartos por" (precio x4)
export default function PlacaCuartos({
  activo,
  precio,
  precioAlt,
}: {
  activo?: boolean;
  precio?: string;
  precioAlt?: string;
}) {
  return (
    <PlacaVideo src="/placas/cuartos.mp4" activo={activo}>
      {/* "A $X" debajo de CUARTOS (fondo rosa → violeta) — precio por unidad */}
      {precio ? (
        <OverlayTexto topPct={30} fontPx={62} weight={400} color={COLORS.violeta}>
          A {precio}
        </OverlayTexto>
      ) : null}
      {/* "$Y" en pastilla debajo de "Llevá 4 cuartos por" — precio x4 */}
      {precioAlt ? (
        <OverlayTexto topPct={78} fontPx={44} weight={700} color={COLORS.blancoSobreFondo}>
          <span
            style={{
              display: "inline-block",
              backgroundColor: COLORS.violeta,
              padding: `${escalaV(8)} ${escalaV(10)}`,
              borderRadius: escalaV(40),
            }}
          >
            {precioAlt}
          </span>
        </OverlayTexto>
      ) : null}
    </PlacaVideo>
  );
}
