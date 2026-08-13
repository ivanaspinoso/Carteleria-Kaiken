import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { estaOnline } from "@/lib/format";
import ListaProductos from "@/components/admin/ListaProductos";
import ImagenPantallaAdmin from "@/components/admin/ImagenPantallaAdmin";

export const metadata: Metadata = { title: "Pantalla 2 - Sabores (imagen)" };

// La Pantalla 2 muestra UNA imagen que sube el cliente (template 'imagen-unica').
// Los sabores clásicos y especiales ya NO dibujan esa pantalla, pero se siguen
// editando acá abajo porque alimentan las promos de las verticales (Gusto del
// día) y los gustos del Kilo Kaikén.
const PANTALLA_ID = 2;

export default async function Pantalla2Page() {
  const supabase = await createClient();

  const [
    { data: categorias },
    { data: todosProductos },
    { data: pantallas },
    { data: imagen },
  ] = await Promise.all([
    supabase.from("categorias").select("*").in("tipo", ["helado-clasico", "helado-especial"]).eq("activa", true).order("orden"),
    supabase.from("productos").select("*").order("orden"),
    supabase.from("pantallas").select("id, template, ultima_conex, activa"),
    supabase.from("pantallas_imagen").select("*").eq("pantalla_id", PANTALLA_ID).maybeSingle(),
  ]);

  const enModoImagen =
    (pantallas ?? []).find(p => p.id === PANTALLA_ID)?.template === "imagen-unica";

  const catIds = new Set((categorias ?? []).map(c => c.id));
  const productos = (todosProductos ?? []).filter(p => catIds.has(p.categoria_id));

  const pantallasOnline = (pantallas ?? []).filter(p => p.activa && estaOnline(p.ultima_conex)).length;

  return (
    <div className="space-y-6">
      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{pantallasOnline}<span className="text-muted-foreground text-base">/5</span></div>
          <div className="text-xs text-muted-foreground mt-0.5">Pantallas online</div>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className={`text-2xl font-bold ${imagen ? "text-primary" : "text-muted-foreground"}`}>
            {imagen ? "✓" : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {imagen ? "Imagen cargada" : "Sin imagen"}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{productos.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Sabores</div>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Pantalla 2 — Sabores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {enModoImagen
            ? "Esta pantalla muestra una sola imagen, la que subas acá."
            : "Esta pantalla se arma sola con los sabores cargados. Podés pasarla a modo imagen desde acá."}
        </p>
      </div>

      <ImagenPantallaAdmin
        pantallaId={PANTALLA_ID}
        actual={imagen ?? null}
        enModoImagen={enModoImagen}
        queMuestraAutomatico="los sabores clásicos y especiales cargados"
      />

      {/* En modo imagen los sabores no dibujan esta pantalla, pero siguen en uso
          en otras — por eso quedan editables, plegados para no confundir. Si la
          pantalla vuelve a automático, son otra vez lo que se ve en el TV. */}
      <details className="rounded-xl border bg-card" open={!enModoImagen}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
          Editar sabores
          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
            {enModoImagen
              ? "Ahora no se muestran en la Pantalla 2 (está en modo imagen), pero se siguen usando en el Gusto del día (pantallas verticales) y en los gustos del Kilo Kaikén."
              : "Es lo que se ve hoy en la Pantalla 2. También alimentan el Gusto del día (pantallas verticales) y los gustos del Kilo Kaikén."}
          </span>
        </summary>
        <div className="px-4 pb-4 pt-1">
          <ListaProductos categorias={categorias ?? []} productos={productos} />
        </div>
      </details>
    </div>
  );
}
