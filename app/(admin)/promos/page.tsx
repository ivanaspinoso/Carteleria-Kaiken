import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PromosEditorKaiken from "@/components/admin/PromosEditorKaiken";

export const metadata: Metadata = { title: "Promociones" };

export default async function PromosPage() {
  const supabase = await createClient();

  const [{ data: promos }, { data: categorias }, { data: productos }] = await Promise.all([
    supabase
      .from("promos")
      .select("*, producto:productos(id, nombre)")
      .in("tipo", ["sabor_dia", "novedad_mes", "promo_especial"]),
    supabase.from("categorias").select("id, tipo"),
    supabase.from("productos").select("id, nombre, categoria_id").order("nombre"),
  ]);

  const heladoCatIds = new Set(
    (categorias ?? [])
      .filter((c) => c.tipo === "helado-clasico" || c.tipo === "helado-especial")
      .map((c) => c.id)
  );
  const heladoProductos = (productos ?? []).filter((p) => heladoCatIds.has(p.categoria_id));
  const todosProductos = (productos ?? []).map((p) => ({ id: p.id, nombre: p.nombre }));

  type PromoRow = Parameters<typeof PromosEditorKaiken>[0]["gusto"];
  const porTipo = (t: string): PromoRow =>
    ((promos ?? []).find((p) => p.tipo === t) as PromoRow) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promociones</h1>
        <p className="text-sm text-muted-foreground">
          Las 3 placas editables de las pantallas verticales.
        </p>
      </div>
      <PromosEditorKaiken
        gusto={porTipo("sabor_dia")}
        novedad={porTipo("novedad_mes")}
        especial={porTipo("promo_especial")}
        heladoProductos={heladoProductos}
        todosProductos={todosProductos}
      />
    </div>
  );
}
