import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ListaProductos from "@/components/admin/ListaProductos";

export const metadata: Metadata = { title: "Cafetería" };

export default async function CafeteriaPage() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .eq("tipo", "cafeteria")
    .eq("activa", true)
    .order("orden");

  const catIds = (categorias ?? []).map(c => c.id);

  const { data: productos } = await supabase
    .from("productos")
    .select("*")
    .in("categoria_id", catIds.length ? catIds : ["none"])
    .order("orden");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cafetería</h1>
        <span className="text-xs text-muted-foreground">{(productos ?? []).length} items</span>
      </div>
      <ListaProductos categorias={categorias ?? []} productos={productos ?? []} />
    </div>
  );
}
