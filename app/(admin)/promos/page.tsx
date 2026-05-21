import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ListaPromos from "@/components/admin/ListaPromos";

export const metadata: Metadata = { title: "Promociones" };

export default async function PromosPage() {
  const supabase = await createClient();

  const [{ data: promos }, { data: productos }] = await Promise.all([
    supabase
      .from("promos")
      .select("*, producto:productos(id, nombre)")
      .order("orden"),
    supabase
      .from("productos")
      .select("id, nombre, categoria_id")
      .eq("en_stock", true)
      .order("nombre"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Promociones</h1>
      <ListaPromos
        promos={(promos ?? []) as Parameters<typeof ListaPromos>[0]["promos"]}
        productos={productos ?? []}
      />
    </div>
  );
}
