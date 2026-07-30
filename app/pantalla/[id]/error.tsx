"use client";

import { useEffect } from "react";

/**
 * Red de contención de las carteleras.
 *
 * Sin esto, cualquier excepción del navegador deja la pantalla del local con el
 * cartel gris "Application error: a client-side exception has occurred" hasta
 * que alguien vaya físicamente a recargar el TV. Una pantalla de local tiene que
 * intentar recuperarse sola: se reintenta el render y, si no alcanza, se recarga
 * la página entera a los pocos segundos.
 *
 * El aviso se ve casi negro a propósito: si llega a quedar visible un instante,
 * molesta menos que un cartel de error en medio del salón.
 */
export default function ErrorCartelera({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Primero, reintentar el render (suele alcanzar: datos a medio llegar).
    const reintento = setTimeout(() => reset(), 1500);
    // Si sigue roto, recargar del todo.
    const recarga = setTimeout(() => window.location.reload(), 6000);
    return () => {
      clearTimeout(reintento);
      clearTimeout(recarga);
    };
  }, [reset, error]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000",
        color: "#222",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      Reconectando…
    </div>
  );
}
