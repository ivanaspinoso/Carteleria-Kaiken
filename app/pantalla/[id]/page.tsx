import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DatosPantalla, PromoConProducto } from "@/lib/types";
import { parsePantallaConfig } from "@/lib/types";
import PantallaCliente from "@/components/cartelera/PantallaCliente";

// La cartelera debe servir SIEMPRE datos frescos: nunca pre-renderizar ni
// cachear esta ruta (si no, en prod queda pegada a los datos del build —
// ej. P1 y P5 mostrando lo mismo de antes del split).
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PantallaPage({ params }: Props) {
  const { id } = await params;
  const pantallaId = Number(id);

  if (!Number.isInteger(pantallaId) || pantallaId < 1 || pantallaId > 99) {
    notFound();
  }

  const supabase = await createClient();

  const [
    { data: pantalla },
    { data: categorias },
    { data: productos },
    { data: promos },
    { data: placasFijas },
    { data: placasPersonalizadas },
  ] = await Promise.all([
    supabase.from("pantallas").select("*").eq("id", pantallaId).single(),
    supabase.from("categorias").select("*").order("orden"),
    supabase.from("productos").select("*").order("nombre"),
    supabase.from("promos").select("*, producto:productos(id, nombre)").order("orden"),
    supabase.from("placas_fijas").select("*").eq("pantalla_id", pantallaId).order("orden"),
    supabase.from("placas_personalizadas").select("*").eq("pantalla_id", pantallaId).order("orden"),
  ]);

  if (!pantalla || !categorias || !productos || !promos) notFound();

  const initial: DatosPantalla = {
    pantalla: { ...pantalla, config: parsePantallaConfig(pantalla.config) },
    categorias,
    productos,
    promos: promos as unknown as PromoConProducto[],
    placas_fijas: placasFijas ?? [],
    placas_personalizadas: placasPersonalizadas ?? [],
  };

  return <PantallaCliente pantallaId={pantallaId} initial={initial} />;
}
