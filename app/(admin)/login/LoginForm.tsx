"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { login, cambiarPassword, type LoginState, type CambioState } from "./actions";

const inputClass =
  "w-full border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

// Input de contraseña con botón "ojo" para mostrar/ocultar.
function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={ver ? "text" : "password"} className={`${inputClass} pr-11`} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar contraseña" : "Ver contraseña"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {ver ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

type Modo = "login" | "cambiar" | "olvide" | "recovery";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const [modo, setModo] = useState<Modo>("login");

  // Si el usuario llega desde el link del email de recuperación, Supabase deja
  // un token de recovery en la URL: pasamos al form de nueva contraseña.
  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setModo("recovery");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (modo === "recovery") return <FormRecovery />;
  if (modo === "olvide") return <FormOlvide onVolver={() => setModo("login")} />;
  if (modo === "cambiar")
    return <FormCambiar onVolver={() => setModo("login")} onOlvide={() => setModo("olvide")} />;
  return (
    <FormLogin
      redirectTo={redirectTo}
      onCambiar={() => setModo("cambiar")}
      onOlvide={() => setModo("olvide")}
    />
  );
}

function FormLogin({
  redirectTo,
  onCambiar,
  onOlvide,
}: {
  redirectTo: string;
  onCambiar: () => void;
  onOlvide: () => void;
}) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={formAction} className="border rounded-2xl p-6 space-y-5 bg-card shadow-sm">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {state?.error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required
          placeholder="admin@kaiken.com" className={inputClass} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
        <PasswordInput id="password" name="password" autoComplete="current-password"
          required minLength={6} placeholder="••••••••" />
      </div>

      <SubmitButton label="Ingresar" pendingLabel="Ingresando…" />

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onCambiar} className="text-muted-foreground hover:text-foreground transition-colors">
          Cambiar contraseña
        </button>
        <button type="button" onClick={onOlvide} className="text-muted-foreground hover:text-foreground transition-colors">
          Olvidé mi contraseña
        </button>
      </div>
    </form>
  );
}

function FormCambiar({ onVolver, onOlvide }: { onVolver: () => void; onOlvide: () => void }) {
  const [state, formAction] = useActionState<CambioState, FormData>(cambiarPassword, null);
  const ok = state && "ok" in state ? state.ok : null;
  const error = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="border rounded-2xl p-6 space-y-5 bg-card shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Cambiar contraseña</h2>
        <p className="text-xs text-muted-foreground">Ingresá tu email, la contraseña actual y la nueva.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm">{error}</div>
      )}
      {ok && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700 text-sm">{ok}</div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="c-email" className="text-sm font-medium">Email</label>
        <input id="c-email" name="email" type="email" autoComplete="email" required
          placeholder="admin@kaiken.com" className={inputClass} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="c-actual" className="text-sm font-medium">Contraseña actual</label>
        <PasswordInput id="c-actual" name="actual" autoComplete="current-password"
          required minLength={6} placeholder="••••••••" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="c-nueva" className="text-sm font-medium">Nueva contraseña</label>
        <PasswordInput id="c-nueva" name="nueva" autoComplete="new-password"
          required minLength={6} placeholder="Mínimo 6 caracteres" />
      </div>

      <SubmitButton label="Cambiar contraseña" pendingLabel="Cambiando…" />

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onVolver} className="text-muted-foreground hover:text-foreground transition-colors">
          ← Volver
        </button>
        <button type="button" onClick={onOlvide} className="text-muted-foreground hover:text-foreground transition-colors">
          No recuerdo la actual
        </button>
      </div>
    </form>
  );
}

// "Olvidé mi contraseña": envía el email de recuperación (cliente, para tener
// el origin real en redirectTo).
function FormOlvide({ onVolver }: { onVolver: () => void }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEstado("enviando");
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setEstado("error");
      setMsg("No se pudo enviar el email. Revisá la dirección e intentá de nuevo.");
    } else {
      setEstado("ok");
      setMsg("Te enviamos un email con un enlace para crear una nueva contraseña. Revisá tu casilla (y el spam).");
    }
  }

  return (
    <form onSubmit={enviar} className="border rounded-2xl p-6 space-y-5 bg-card shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Recuperar contraseña</h2>
        <p className="text-xs text-muted-foreground">
          Te enviamos un enlace por email para crear una contraseña nueva, sin necesidad de la anterior.
        </p>
      </div>

      {estado === "error" && msg && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm">{msg}</div>
      )}
      {estado === "ok" && msg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700 text-sm">{msg}</div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="o-email" className="text-sm font-medium">Email</label>
        <input id="o-email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="admin@kaiken.com" className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {estado === "enviando" ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>

      <button type="button" onClick={onVolver} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Volver a ingresar
      </button>
    </form>
  );
}

// Form de nueva contraseña tras hacer clic en el enlace del email (hay una
// sesión de recovery activa; updateUser cambia la contraseña sin pedir la vieja).
function FormRecovery() {
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [nueva, setNueva] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (nueva.length < 6) {
      setEstado("error");
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setEstado("guardando");
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) {
      setEstado("error");
      setMsg("No se pudo cambiar la contraseña. Pedí un nuevo enlace e intentá otra vez.");
    } else {
      setEstado("ok");
      setMsg("¡Contraseña actualizada! Ya podés ingresar con la nueva.");
    }
  }

  return (
    <form onSubmit={guardar} className="border rounded-2xl p-6 space-y-5 bg-card shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Crear nueva contraseña</h2>
        <p className="text-xs text-muted-foreground">Elegí una contraseña nueva para tu cuenta.</p>
      </div>

      {estado === "error" && msg && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm">{msg}</div>
      )}
      {estado === "ok" && msg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700 text-sm">{msg}</div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="r-nueva" className="text-sm font-medium">Nueva contraseña</label>
        <PasswordInput id="r-nueva" autoComplete="new-password" required minLength={6}
          placeholder="Mínimo 6 caracteres" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </div>

      <button
        type="submit"
        disabled={estado === "guardando" || estado === "ok"}
        className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {estado === "guardando" ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
