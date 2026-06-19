import PlacaVideo from "./PlacaVideo";

// Placa 13 — Frappuccino. Estática (video).
export default function PlacaFrappuccino({ activo }: { activo?: boolean }) {
  return <PlacaVideo src="/placas/frappuccino.mp4" activo={activo} />;
}
