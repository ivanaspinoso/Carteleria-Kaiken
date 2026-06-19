import type { Metadata } from "next";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: {
    template: "%s | Admin", // TODO: nombre real del negocio
    default: "Panel Admin",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Leer pathname inyectado por el middleware en el header x-pathname
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  const esLogin = pathname.startsWith("/login");

  // En /login: layout mínimo sin nav (el middleware ya maneja el auth)
  if (esLogin) {
    return <>{children}</>;
  }

  // En el resto del admin: obtener usuario para mostrarlo en la nav
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav userEmail={user?.email} />
      <main className="flex-1 container mx-auto px-6 py-8 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
