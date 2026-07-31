import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import SwRegistration from "@/components/SwRegistration";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  // TODO: reemplazar con nombre y descripción real del negocio
  title: "Heladería — Sistema de Cartelería",
  description: "Sistema de cartelería digital",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Admin", // TODO: nombre corto real
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Emite <meta name="color-scheme" content="light">. Va JUNTO con el
  // `color-scheme: only light` de globals.css: algunos navegadores de Smart TV
  // deciden si aplican su auto dark mode leyendo el meta del <head>, antes de
  // bajar el CSS, así que con la regla sola llegaban a invertir igual.
  colorScheme: "light",
  // TODO: reemplazar con color de marca real
  themeColor: "#5F3641",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* suppressHydrationWarning: ignora atributos inyectados por extensiones del browser */}
      <body className={`${montserrat.variable} antialiased`} suppressHydrationWarning>
        <SwRegistration />
        {children}
      </body>
    </html>
  );
}
