import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ListaProductos from "@/components/admin/ListaProductos";
import ImagenPantallaAdmin from "@/components/admin/ImagenPantallaAdmin";

export const metadata: Metadata = { title: "Pantalla 4 - Cafetería" };

// La Pantalla 4 (horizontal) puede mostrar UNA imagen subida desde acá, igual
// que la 2. Mientras el template siga en 'cafeteria-pasteleria' la imagen se
// guarda pero no sale al TV; el interruptor está en
// supabase/activar-horizontales-imagen.sql.
const PANTALLA_ID = 4;

export default async function CafeteriaPage() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .in("tipo", ["cafeteria", "pasteleria"])
    .eq("activa", true)
    .order("orden");

  const catIds = (categorias ?? []).map(c => c.id);

  const { data: productos } = await supabase
    .from("productos")
    .select("*")
    .in("categoria_id", catIds.length ? catIds : ["none"])
    .order("orden");

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
        <h1 className="text-2xl font-bold">Pantalla 4 — Cafetería</h1>
        <span className="text-xs text-muted-foreground">{(productos ?? []).length} items</span>
      </div>

      <ImagenPantallaAdmin
        pantallaId={PANTALLA_ID}
        actual={imagen ?? null}
        enModoImagen={enModoImagen}
        queMuestraAutomatico="la cafetería y pastelería cargadas"
      />

      {/* Los productos de cafetería/pastelería se siguen editando siempre: si
          algún día se vuelve al modo dinámico, están intactos. */}
      <div>
        {enModoImagen && (
          <p className="text-xs text-muted-foreground mb-2">
            La Pantalla 4 muestra la imagen de arriba. Estos productos ya no la
            dibujan, pero quedan guardados por si se vuelve al modo automático.
          </p>
        )}
        <ListaProductos categorias={categorias ?? []} productos={productos ?? []} />
      </div>
    </div>
  );
}
