"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, RefreshCw, AlertTriangle } from "lucide-react";
import type { PantallaImagen } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { subirImagenPantalla } from "@/lib/actions/pantallaImagen";
import {
  validarArchivoImagenPantalla,
  ANCHO_RECOMENDADO_PANTALLA,
  ALTO_RECOMENDADO_PANTALLA,
} from "@/lib/cartelera/validarImagen";

interface Props {
  pantallaId: number;
  /** Imagen que está en el aire ahora mismo (null si nunca subieron ninguna). */
  actual: PantallaImagen | null;
}

/**
 * Subir / reemplazar la imagen única de una pantalla.
 *
 * El flujo es a propósito de dos pasos (elegir → confirmar): la imagen sale al
 * TV del local apenas se sube, así que conviene ver la previsualización antes
 * de mandarla.
 */
export default function ImagenPantallaAdmin({ pantallaId, actual }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // La preview es un objectURL: hay que liberarlo al cambiar de archivo.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function elegir(f: File | null) {
    setError(null);
    setAviso(null);
    setOk(false);
    if (!f) {
      setFile(null);
      return;
    }
    const res = await validarArchivoImagenPantalla(f);
    if (!res.ok) {
      setError(res.error ?? "Imagen inválida");
      setFile(null);
      return;
    }
    if (res.warn) setAviso(res.warn);
    setFile(f);
  }

  function subir() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      // El archivo va DIRECTO del navegador a Supabase Storage. No puede viajar
      // dentro del server action: Next acepta 1MB y Vercel corta en 4,5MB, y el
      // error que eso tiraba no estaba atrapado — el dueño terminaba viendo
      // "Application error: a client-side exception has occurred" en vez de un
      // mensaje. Acá abajo, además, todo va dentro de un try: ninguna falla de
      // subida puede tumbar la pantalla.
      try {
        const supabase = createClient();
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${pantallaId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pantallas-imagen")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setError(`No se pudo subir la imagen: ${upErr.message}`);
          return;
        }

        const fd = new FormData();
        fd.set("path", path);
        fd.set("pantalla_id", String(pantallaId));
        const res = await subirImagenPantalla(fd);
        if ("error" in res) {
          setError(res.error);
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
        return;
      }
      // OJO: no se limpia `file` acá. Si se limpiara, la preview desaparecería
      // en el instante entre la subida y la llegada de los datos frescos del
      // servidor, y se vería la imagen aparecer y desaparecer. La preview se
      // mantiene hasta que `actual` trae ya la imagen nueva (ver el efecto de
      // abajo, que la limpia cuando cambia el path).
      setAviso(null);
      setOk(true);
      router.refresh();
    });
  }

  // Cuando el servidor devuelve la fila ya actualizada, recién ahí se suelta la
  // preview local: a partir de ese momento la imagen que se ve es la de la base.
  const pathActual = actual?.imagen_path ?? null;
  useEffect(() => {
    setFile(null);
  }, [pathActual]);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold">Imagen de la Pantalla {pantallaId}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Es lo único que se ve en esa pantalla. Medida recomendada:{" "}
          <strong>{ANCHO_RECOMENDADO_PANTALLA} × {ALTO_RECOMENDADO_PANTALLA}</strong>{" "}
          (horizontal Full HD). JPG o PNG hasta 10MB. Se muestra completa, sin
          recortar: si no es 16:9 queda un borde crema donde sobre.
        </p>
      </div>

      {/* Preview: la imagen elegida si hay una sin subir; si no, la que está en el aire */}
      <div className="rounded-lg border bg-muted/40 overflow-hidden">
        {previewUrl || actual ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl ?? actual!.imagen_url}
              alt=""
              className="w-full aspect-video object-contain bg-[#fffff9]"
            />
            <p className="text-[11px] text-muted-foreground px-3 py-2 border-t">
              {previewUrl
                ? "Previsualización — todavía no se subió."
                : `En el aire desde ${new Date(actual!.actualizada_en).toLocaleString("es-AR")}`}
            </p>
          </>
        ) : (
          <div className="aspect-video flex items-center justify-center text-center px-6">
            <p className="text-xs text-muted-foreground">
              Todavía no hay imagen cargada.
              <br />
              La pantalla muestra un cartel avisando que falta subirla.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-start gap-1.5">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
      {aviso && !error && (
        <p className="text-xs text-amber-600 flex items-start gap-1.5">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          {aviso}
        </p>
      )}
      {ok && !file && (
        <p className="text-xs text-primary font-medium">
          Imagen actualizada. La pantalla se cambia sola en unos segundos, sin tocar el TV.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex items-center gap-1.5 rounded-md bg-secondary text-secondary-foreground
                      px-3 py-2 text-xs font-medium cursor-pointer hover:bg-secondary/80 transition-colors
                      ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          {actual ? <RefreshCw size={13} /> : <Upload size={13} />}
          {actual ? "Reemplazar imagen" : "Subir imagen"}
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            disabled={isPending}
            onChange={(e) => {
              void elegir(e.target.files?.[0] ?? null);
              // Permite volver a elegir el MISMO archivo después de cancelar.
              e.target.value = "";
            }}
          />
        </label>

        {file && (
          <>
            <button
              type="button"
              onClick={subir}
              disabled={isPending}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold
                         hover:bg-primary/90 transition-colors disabled:opacity-50 active:scale-95"
            >
              {isPending ? "Subiendo…" : "Confirmar y publicar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setAviso(null);
              }}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
