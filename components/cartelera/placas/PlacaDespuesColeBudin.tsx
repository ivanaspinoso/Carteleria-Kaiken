import DespuesColeBase from "./DespuesColeBase";

// Placa 4 — Después del Cole (Budín). Precio editable (Cambio 7).
export default function PlacaDespuesColeBudin({ activo, precio }: { activo?: boolean; precio?: string }) {
  return <DespuesColeBase src="/placas/despues-cole-budin.mp4" activo={activo} precio={precio} />;
}
