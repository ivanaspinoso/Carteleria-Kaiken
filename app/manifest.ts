import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Heladería Admin", // TODO: nombre real del negocio
    short_name: "Admin",     // TODO: nombre corto real
    description: "Panel de administración de cartelería digital",
    start_url: "/sabores",
    display: "standalone",
    orientation: "portrait-primary",
    // TODO: reemplazar con colores de marca reales
    background_color: "#1a1a2e",
    theme_color: "#1a1a2e",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity"],
  };
}
