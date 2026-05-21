import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DatosPantalla, PromoConProducto } from "@/lib/types";
import { parsePantallaConfig } from "@/lib/types";
import PantallaCliente from "@/components/cartelera/PantallaCliente";

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
  ] = await Promise.all([
    supabase.from("pantallas").select("*").eq("id", pantallaId).single(),
    supabase.from("categorias").select("*").order("orden"),
    supabase.from("productos").select("*").order("nombre"),
    supabase.from("promos").select("*, producto:productos(id, nombre)").order("orden"),
  ]);

  if (!pantalla || !categorias || !productos || !promos) notFound();

  const initial: DatosPantalla = {
    pantalla: { ...pantalla, config: parsePantallaConfig(pantalla.config) },
    categorias,
    productos,
    promos: promos as unknown as PromoConProducto[],
  };

  return <PantallaCliente pantallaId={pantallaId} initial={initial} />;
}
