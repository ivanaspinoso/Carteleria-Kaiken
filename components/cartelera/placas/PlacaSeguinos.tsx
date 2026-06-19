import PlacaVideo from "./PlacaVideo";

// Placa 11 — Seguinos en las redes. Estática (video).
export default function PlacaSeguinos({ activo }: { activo?: boolean }) {
  return <PlacaVideo src="/placas/seguinos.mp4" activo={activo} />;
}
