import DespuesColeBase from "./DespuesColeBase";

// Placa 3 — Después del Cole (Tostado). Precio editable (Cambio 7).
export default function PlacaDespuesColeTostado({ activo, precio }: { activo?: boolean; precio?: string }) {
  return <DespuesColeBase src="/placas/despues-cole-tostado.mp4" activo={activo} precio={precio} />;
}
