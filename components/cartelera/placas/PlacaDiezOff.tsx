import PlacaVideo from "./PlacaVideo";

// Placa 6 — Todos los días 10% OFF. Estática (video).
export default function PlacaDiezOff({ activo }: { activo?: boolean }) {
  return <PlacaVideo src="/placas/diez-off.mp4" activo={activo} />;
}
