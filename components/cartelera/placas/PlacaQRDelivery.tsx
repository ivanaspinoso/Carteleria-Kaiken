import PlacaVideo from "./PlacaVideo";

// Placa 10 — Pedí por nuestra Web (QR + delivery). Estática (video).
export default function PlacaQRDelivery({ activo }: { activo?: boolean }) {
  return <PlacaVideo src="/placas/qr-delivery.mp4" activo={activo} />;
}
