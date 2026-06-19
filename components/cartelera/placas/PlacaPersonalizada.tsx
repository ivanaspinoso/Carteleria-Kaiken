import { esVideoUrl } from "@/lib/cartelera/validarImagen";
import PlacaVideo from "./PlacaVideo";

// Placa personalizada que subió el cliente. Imagen o video, llena el 9/16.
export default function PlacaPersonalizada({
  imagenUrl,
  nombre,
  activo,
}: {
  imagenUrl: string;
  nombre?: string;
  activo?: boolean;
}) {
  if (esVideoUrl(imagenUrl)) {
    return <PlacaVideo src={imagenUrl} activo={activo} />;
  }
  return (
    <div
      role="img"
      aria-label={nombre}
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "9 / 16",
        backgroundColor: "#000",
        backgroundImage: `url('${imagenUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
