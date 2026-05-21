import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getCurrentRole } from "@/lib/supabase/server";
import { formatFechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Historial" };

const ACCION_LABEL: Record<string, string> = {
  update_precio:    "Cambio de precio",
  marcar_en_stock:  "Marcado en stock",
  marcar_sin_stock: "Marcado sin stock",
  update_promo:     "Edición de promo",
};

export default async function HistorialPage() {
  // Solo accesible para admin
  const rol = await getCurrentRole();
  if (rol !== "admin") redirect("/sabores");

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historial</h1>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
          Solo admin
        </span>
      </div>

      {(!logs || logs.length === 0) ? (
        <div className="text-center text-muted-foreground py-16 text-sm">
          No hay cambios registrados todavía
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {ACCION_LABEL[log.accion] ?? log.accion}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tabla: {log.tabla} · ID: {log.registro_id.slice(0, 8)}…
                  </p>
                  {/* Diff antes/después */}
                  {log.antes != null && log.despues != null && (
                    <div className="mt-1.5 flex flex-wrap gap-2 font-mono text-xs">
                      {Object.keys(log.despues as object).map(k => {
                        const antes = (log.antes as Record<string, unknown>)[k];
                        const despues = (log.despues as Record<string, unknown>)[k];
                        if (antes === despues) return null;
                        return (
                          <span key={k}>
                            <span className="text-red-500 line-through">{String(antes ?? "—")}</span>
                            {" → "}
                            <span className="text-emerald-600">{String(despues ?? "—")}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatFechaHora(log.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
