import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-7">

        {/* Logo + encabezado */}
        <div className="text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kaikenlogocompletoverde.PNG"
            alt="Kaiken"
            className="w-40 h-40 object-contain mx-auto"
            style={{ mixBlendMode: "multiply" }}
          />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Panel de administración</h1>
            <p className="text-sm text-muted-foreground">
              Ingresá para gestionar la cartelería
            </p>
          </div>
        </div>

        {/* LoginForm necesita useSearchParams → Suspense obligatorio */}
        <Suspense fallback={<div className="h-52 rounded-2xl border animate-pulse bg-muted" />}>
          <LoginForm />
        </Suspense>

      </div>
    </div>
  );
}
