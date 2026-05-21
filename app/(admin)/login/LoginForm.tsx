"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
    >
      {pending ? "Ingresando…" : "Ingresar"}
    </button>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";

  const [state, formAction] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={formAction} className="border rounded-lg p-6 space-y-4 bg-card">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {state?.error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-destructive text-sm">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@heladeria.com"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="••••••••"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
