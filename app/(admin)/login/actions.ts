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
