"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DatosPantalla, PromoConProducto } from "@/lib/types";
import { parsePantallaConfig } from "@/lib/types";

const DEBOUNCE_MS = 800;
const HEARTBEAT_MS = 60_000;
const STORAGE_KEY = (id: number) => `kaiken-pantalla-${id}`;

export function usePantallaData(pantallaId: number, initial: DatosPantalla) {
  const [datos, setDatos] = useState<DatosPantalla>(initial);
  const [offline, setOffline] = useState(false);
  const [debug, setDebug] = useState(false);

  // Stable Supabase client
  const supabase = useRef(createClient()).current;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dKeyCount = useRef(0);
  const dKeyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDatos = useCallback(async () => {
    const [
      { data: pantalla, error: e1 },
      { data: categorias, error: e2 },
      { data: productos, error: e3 },
      { data: promos, error: e4 },
      { data: placasFijas, error: e5 },
      { data: placasPersonalizadas, error: e6 },
    ] = await Promise.all([
      supabase.from("pantallas").select("*").eq("id", pantallaId).single(),
      supabase.from("categorias").select("*").order("orden"),
      supabase.from("productos").select("*").order("nombre"),
      supabase.from("promos").select("*, producto:productos(id, nombre)").order("orden"),
      supabase.from("placas_fijas").select("*").eq("pantalla_id", pantallaId).order("orden"),
      supabase.from("placas_personalizadas").select("*").eq("pantalla_id", pantallaId).order("orden"),
    ]);

    if (e1 || e2 || e3 || e4 || e5 || e6) return;

    const nuevos: DatosPantalla = {
      pantalla: { ...pantalla!, config: parsePantallaConfig(pantalla!.config) },
      categorias: categorias!,
      productos: productos!,
      promos: promos! as unknown as PromoConProducto[],
      placas_fijas: placasFijas ?? [],
      placas_personalizadas: placasPersonalizadas ?? [],
    };
    setDatos(nuevos);
    setOffline(false);
    try {
      localStorage.setItem(STORAGE_KEY(pantallaId), JSON.stringify(nuevos));
    } catch { /* cuota llena o contexto SSR — ignorar */ }
  }, [pantallaId, supabase]);

  const debouncedFetch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchDatos, DEBOUNCE_MS);
  }, [fetchDatos]);

  useEffect(() => {
    // Fetch inicial al montar: corrige cualquier dato de SSR/estático que
    // haya llegado viejo (ej. la página cacheada en prod desde el build).
    fetchDatos();

    // Realtime: cualquier cambio en estas tablas dispara un refetch
    const channel = supabase
      .channel(`pantalla-${pantallaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "promos" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "pantallas" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "placas_fijas" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "placas_personalizadas" }, debouncedFetch)
      .subscribe();

    // Heartbeat: actualiza ultima_conex para que el panel de Pantallas muestre online
    const sendHeartbeat = () => {
      supabase
        .from("pantallas")
        .update({ ultima_conex: new Date().toISOString() })
        .eq("id", pantallaId)
        .then(() => {});
    };
    sendHeartbeat();
    const heartbeat = setInterval(sendHeartbeat, HEARTBEAT_MS);

    // Auto-refresh a las 4am (limpia memoria del navegador del TV)
    let refreshTimer: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(4, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      refreshTimer = setTimeout(() => {
        window.location.reload();
      }, next.getTime() - now.getTime());
    };
    scheduleRefresh();

    // Debug: presionar D cinco veces seguidas en menos de 2s
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "d") {
        dKeyCount.current = 0;
        return;
      }
      dKeyCount.current++;
      if (dKeyTimer.current) clearTimeout(dKeyTimer.current);
      dKeyTimer.current = setTimeout(() => {
        dKeyCount.current = 0;
      }, 2000);
      if (dKeyCount.current >= 5) {
        setDebug((prev) => !prev);
        dKeyCount.current = 0;
      }
    };
    window.addEventListener("keydown", handleKey);

    // Online/offline
    const onOnline = () => { fetchDatos(); setOffline(false); };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeat);
      clearTimeout(refreshTimer!);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (dKeyTimer.current) clearTimeout(dKeyTimer.current);
    };
  }, [pantallaId, debouncedFetch, fetchDatos, supabase]);

  return { datos, offline, debug };
}
