import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { construirGruposGustos } from "@/lib/cartelera/gustos";
import ListaProductos from "@/components/admin/ListaProductos";
import ImagenPantallaAdmin from "@/components/admin/ImagenPantallaAdmin";

export const metadata: Metadata = { title: "Pantalla 3 - Tamaños y Postres" };

// La Pantalla 3 (horizontal) puede mostrar UNA imagen subida desde acá, igual
// que la 2. Mientras el template siga en 'tamanos-postres' la imagen se guarda
// pero no sale al TV; el interruptor está en
// supabase/activar-horizontales-imagen.sql.
const PANTALLA_ID = 3;

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

  // Sabores clásicos para el multi-select de "gustos incluidos" del Kilo Kaikén,
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

  // Imagen única de esta pantalla + template actual (para avisar si todavía no
  // está en modo imagen).
  const [{ data: imagen }, { data: pantalla }] = await Promise.all([
    supabase.from("pantallas_imagen").select("*").eq("pantalla_id", PANTALLA_ID).maybeSingle(),
    supabase.from("pantallas").select("template").eq("id", PANTALLA_ID).maybeSingle(),
  ]);
  const enModoImagen = pantalla?.template === "imagen-unica";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pantalla 3 — Tamaños y Postres</h1>
        <span className="text-xs text-muted-foreground">{(productos ?? []).length} items</span>
      </div>

      <ImagenPantallaAdmin
        pantallaId={PANTALLA_ID}
        actual={imagen ?? null}
        enModoImagen={enModoImagen}
        queMuestraAutomatico="los tamaños y postres helados cargados"
      />

      {/* Los tamaños y postres se siguen editando siempre: aunque la pantalla
          pase a modo imagen, alimentan las placas de las verticales (Cuartos,
          Kilo Kaikén). Solo cambia el cartelito de arriba. */}
      <div>
        {enModoImagen && (
          <p className="text-xs text-muted-foreground mb-2">
            La Pantalla 3 muestra la imagen de arriba. Estos productos ya no la
            dibujan, pero siguen en uso en las placas de las pantallas verticales.
          </p>
        )}
        <ListaProductos
          categorias={categorias ?? []}
          productos={productos ?? []}
          gruposGustos={gruposGustos}
        />
      </div>
    </div>
  );
}
