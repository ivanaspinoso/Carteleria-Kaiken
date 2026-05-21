import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo placeholder — TODO: reemplazar con logo real */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center select-none">
            <span className="text-primary-foreground text-2xl">🍦</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Panel Admin</h1>
          {/* TODO: nombre real del negocio */}
          <p className="text-muted-foreground text-sm">
            Ingresá para gestionar la cartelería
          </p>
        </div>

        {/* LoginForm necesita useSearchParams → Suspense obligatorio */}
        <Suspense fallback={<div className="h-48 rounded-lg border animate-pulse bg-muted" />}>
          <LoginForm />
        </Suspense>

      </div>
    </div>
  );
}
