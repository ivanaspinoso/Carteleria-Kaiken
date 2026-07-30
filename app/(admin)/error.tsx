"use client";

import { useEffect, useState } from "react";

/**
 * Red de contención del panel.
 *
 * Sin esto, cualquier excepción del navegador deja al dueño con el cartel gris
 * "Application error: a client-side exception has occurred" y sin forma de
 * seguir salvo recargar a mano — que fue justo lo que le pasó al subir una
 * imagen. Acá se reintenta una vez solo y, si no alcanza, queda un botón.
 *
 * A diferencia de las carteleras, el panel NO se recarga solo en bucle: lo está
 * usando una persona y podría perder lo que estaba cargando.
 */
export default function ErrorAdmin({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reintentado, setReintentado] = useState(false);

  useEffect(() => {
    if (reintentado) return;
    const t = setTimeout(() => {
      setReintentado(true);
      reset();
    }, 1200);
    return () => clearTimeout(t);
  }, [reintentado, reset]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full border rounded-2xl p-6 space-y-4 bg-card text-center">
        <h1 className="text-base font-semibold">Se cortó algo</h1>
        <p className="text-sm text-muted-foreground">
          No se pudo mostrar esta pantalla. Lo que ya habías guardado está a salvo.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Recargar la página
        </button>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground/70">Código: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
