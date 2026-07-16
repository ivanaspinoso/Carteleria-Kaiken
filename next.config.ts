import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite deployar en Vercel con dos subdominios
  turbopack: {
    root: __dirname,
  },
  // Los paquetes de Supabase se publican con sintaxis ES2020 (`??`, `?.`) sin
  // transpilar, y Next NO compila node_modules por defecto. En el Samsung
  // TU5300 (Tizen 5.5 = Chromium 76, que no parsea `??`) el chunk entero moría
  // con SyntaxError → sin Realtime: los cambios del panel no llegaban a esa TV.
  // Con esto pasan por el browserslist del package.json como el resto.
  // Se listan TODOS los @supabase/* (incluidas las transitivas como phoenix):
  // varios traen `??`/`?.` y arreglarlos de a uno era ir tapando agujeros.
  transpilePackages: [
    "@supabase/supabase-js",
    "@supabase/realtime-js",
    "@supabase/postgrest-js",
    "@supabase/storage-js",
    "@supabase/functions-js",
    "@supabase/auth-js",
    "@supabase/phoenix",
    "@supabase/ssr",
    // Transitivas, también con `?.` sin bajar: iceberg-js viene de storage-js,
    // cookie viene de @supabase/ssr.
    "iceberg-js",
    "cookie",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
