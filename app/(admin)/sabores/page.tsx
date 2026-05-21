import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { estaOnline } from "@/lib/format";
import ListaProductos from "@/components/admin/ListaProductos";

export const metadata: Metadata = { title: "Sabores" };

export default async function SaboresPage() {
  const supabase = await createClient();

  const [
    { data: categorias },
    { data: todosProductos },
    { data: pantallas },
    { data: promos },
  ] = await Promise.all([
    supabase.from("categorias").select("*").eq("tipo", "helado").eq("activa", true).order("orden"),
    supabase.from("productos").select("*").order("orden"),
    supabase.from("pantallas").select("ultima_conex, activa"),
    supabase.from("promos").select("titulo, tipo").eq("activa", true),
  ]);

  const catIds = new Set((categorias ?? []).map(c => c.id));
  const productos = (todosProductos ?? []).filter(p => catIds.has(p.categoria_id));

  const pantallasOnline = (pantallas ?? []).filter(p => p.activa && estaOnline(p.ultima_conex)).length;
  const promoActiva = (promos ?? []).find(p => p.tipo === "sabor_semana");
  const totalProductos = productos.length;

  return (
    <div className="space-y-6">
      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{pantallasOnline}<span className="text-muted-foreground text-base">/5</span></div>
          <div className="text-xs text-muted-foreground mt-0.5">Pantallas online</div>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{totalProductos}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Sabores</div>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className={`text-2xl font-bold ${promoActiva ? "text-yellow-500" : "text-muted-foreground"}`}>
            {promoActiva ? "★" : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {promoActiva ? "Promo activa" : "Sin promo"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sabores</h1>
        <span className="text-xs text-muted-foreground">{(categorias ?? []).length} categorías</span>
      </div>

      <ListaProductos categorias={categorias ?? []} productos={productos} />
    </div>
  );
}
