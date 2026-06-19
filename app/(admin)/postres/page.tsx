import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ListaProductos from "@/components/admin/ListaProductos";

export const metadata: Metadata = { title: "Postres" };

export default async function PostresPage() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .in("tipo", ["tamano", "postre"])
    .eq("activa", true)
    .order("orden");

  const catIds = (categorias ?? []).map(c => c.id);

  const { data: productos } = await supabase
    .from("productos")
    .select("*")
    .in("categoria_id", catIds.length ? catIds : ["none"])
    .order("orden");

  // Sabores clásicos disponibles para el multi-select de "gustos incluidos"
  // del Kilo Kaikén (categorías de tipo helado-clasico).
  const { data: catClasicas } = await supabase
    .from("categorias")
    .select("id")
    .eq("tipo", "helado-clasico");
  const clasicasIds = (catClasicas ?? []).map((c) => c.id);
  const { data: saboresClasicos } = await supabase
    .from("productos")
    .select("nombre")
    .in("categoria_id", clasicasIds.length ? clasicasIds : ["none"])
    .order("nombre");
  const opcionesGustos = (saboresClasicos ?? []).map((s) => s.nombre);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tamaños y Postres</h1>
        <span className="text-xs text-muted-foreground">{(productos ?? []).length} items</span>
      </div>
      <ListaProductos
        categorias={categorias ?? []}
        productos={productos ?? []}
        opcionesGustos={opcionesGustos}
      />
    </div>
  );
}
