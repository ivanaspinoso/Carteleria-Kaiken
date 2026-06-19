import PlacaVideo from "./PlacaVideo";

// Placa 12 — Affogato. Estática (video).
export default function PlacaAffogato({ activo }: { activo?: boolean }) {
  return <PlacaVideo src="/placas/affogato.mp4" activo={activo} />;
}
