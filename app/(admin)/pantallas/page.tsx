import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { estaOnline, formatFechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Pantallas" };

const TEMPLATE_LABEL: Record<string, string> = {
  rotativa:      "Rotativa",
  sabores_grande:"Sabores 50\"",
  sabores_fijo:  "Sabores 43\"",
  cafeteria:     "Cafetería",
  postres:       "Postres",
};

export default async function PantallasPage() {
  const supabase = await createClient();
  const { data: pantallas } = await supabase
    .from("pantallas")
    .select("*")
    .order("id");

  const online = (pantallas ?? []).filter(p => estaOnline(p.ultima_conex)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pantallas</h1>
        <span className={`text-sm font-medium ${online > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
          {online}/5 online
        </span>
      </div>

      <div className="space-y-3">
        {(pantallas ?? []).map(pantalla => {
          const isOnline = estaOnline(pantalla.ultima_conex);
          return (
            <div
              key={pantalla.id}
              className="rounded-xl border bg-card p-4 flex items-center gap-4"
            >
              {/* Indicador online/offline */}
              <div className={`
                w-3 h-3 rounded-full flex-shrink-0
                ${isOnline ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-muted-foreground/30"}
              `} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{pantalla.nombre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pantalla.pulgadas}&rdquo; · {TEMPLATE_LABEL[pantalla.template] ?? pantalla.template}
                  {" · "}
                  {isOnline
                    ? <span className="text-emerald-600 font-medium">Online</span>
                    : pantalla.ultima_conex
                      ? `Última conex: ${formatFechaHora(pantalla.ultima_conex)}`
                      : "Nunca conectada"
                  }
                </p>
              </div>

              {/* Botón ver pantalla */}
              <a
                href={`/pantalla/${pantalla.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs border rounded-lg px-3 py-2 hover:bg-muted transition-colors flex-shrink-0 font-medium"
              >
                Ver ↗
              </a>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Las pantallas se marcan online cuando están abiertas en el TV y actualizan su conexión cada 60 segundos.
      </p>
    </div>
  );
}
