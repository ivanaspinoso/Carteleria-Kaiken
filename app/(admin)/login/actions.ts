"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function makeSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export type LoginState = { error: string } | null;

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email      = (formData.get("email")      ?? "").toString().trim();
  const password   = (formData.get("password")   ?? "").toString();
  const redirectTo = (formData.get("redirectTo") ?? "").toString();

  if (!email || !password) {
    return { error: "Completá el email y la contraseña" };
  }

  const supabase = await makeSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: traducirError(error.message) };
  }

  // Redirigir al destino original o al dashboard
  const dest =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("/login")
      ? redirectTo
      : "/sabores";

  redirect(dest);
}

export type CambioState = { error: string } | { ok: string } | null;

export async function cambiarPassword(
  _prev: CambioState,
  formData: FormData
): Promise<CambioState> {
  const email  = (formData.get("email")  ?? "").toString().trim();
  const actual = (formData.get("actual") ?? "").toString();
  const nueva  = (formData.get("nueva")  ?? "").toString();

  if (!email || !actual || !nueva) {
    return { error: "Completá todos los campos" };
  }
  if (nueva.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
  }
  if (nueva === actual) {
    return { error: "La nueva contraseña debe ser distinta a la actual" };
  }

  const supabase = await makeSupabase();

  // 1) Validar la contraseña actual iniciando sesión
  const { error: errLogin } = await supabase.auth.signInWithPassword({
    email,
    password: actual,
  });
  if (errLogin) {
    return { error: "Email o contraseña actual incorrectos" };
  }

  // 2) Cambiar la contraseña del usuario ya autenticado
  const { error: errUpdate } = await supabase.auth.updateUser({ password: nueva });
  if (errUpdate) {
    if (errUpdate.message.includes("should be different")) {
      return { error: "La nueva contraseña debe ser distinta a la actual" };
    }
    return { error: "No se pudo cambiar la contraseña, intentá de nuevo" };
  }

  return { ok: "Contraseña actualizada. Ya podés ingresar con la nueva." };
}

export async function logout(): Promise<void> {
  const supabase = await makeSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

function traducirError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Email o contraseña incorrectos";
  if (msg.includes("Email not confirmed"))
    return "Confirmá tu email antes de ingresar";
  if (msg.includes("Too many requests"))
    return "Demasiados intentos, esperá unos minutos";
  return "Error al ingresar, intentá de nuevo";
}
