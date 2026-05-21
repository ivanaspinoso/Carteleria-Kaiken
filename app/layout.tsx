import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import SwRegistration from "@/components/SwRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  // TODO: reemplazar con color de marca real
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* suppressHydrationWarning: ignora atributos inyectados por extensiones del browser */}
      <body className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
        <SwRegistration />
        {children}
      </body>
    </html>
  );
}
