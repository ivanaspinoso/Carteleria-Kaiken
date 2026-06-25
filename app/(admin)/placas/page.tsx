import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { construirGruposGustos } from "@/lib/cartelera/gustos";
import { esKiloKaiken } from "@/lib/types";
import PlacasAdmin from "@/components/admin/PlacasAdmin";

export const metadata: Metadata = { title: "Placas" };

export default async function PlacasPage() {
  const supabase = await createClient();

  const [{ data: fijas }, { data: personalizadas }, { data: productosKilo }] = await Promise.all([
    supabase.from("placas_fijas").select("*").in("pantalla_id", [1, 5]).order("orden"),
    supabase.from("placas_personalizadas").select("*").in("pantalla_id", [1, 5]).order("orden"),
    // El producto del Kilo Kaikén se identifica por slug estable (o nombre como
    // fallback) en JS, así renombrarlo desde el admin no rompe el vínculo.
    supabase.from("productos").select("*"),
  ]);
  const kilo = (productosKilo ?? []).find(esKiloKaiken) ?? null;

  // Sabores clásicos para el multi-select de gustos del Kilo Kaikén,
  // agrupados por categoría (Cremas, Chocolate, Frutales, Dulce de Leche, Sin Azúcar).
  const { data: catClasicas } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("tipo", "helado-clasico")
    .order("orden");
  const clasicasIds = (catClasicas ?? []).map((c) => c.id);
  const { data: saboresClasicos } = await supabase
    .from("productos")
    .select("nombre, categoria_id")
    .in("categoria_id", clasicasIds.length ? clasicasIds : ["none"])
    .order("orden");
  const gruposGustos = construirGruposGustos(catClasicas ?? [], saboresClasicos ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Placas verticales</h1>
        <p className="text-sm text-muted-foreground">
          Rotación de las pantallas 1 y 5: las 13 fijas + las que subas.
        </p>
      </div>
      <PlacasAdmin
        fijas={fijas ?? []}
        personalizadas={personalizadas ?? []}
        kilo={kilo ?? null}
        gruposGustos={gruposGustos}
      />
    </div>
  );
}
