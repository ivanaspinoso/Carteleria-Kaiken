"use client";

import { useEffect, useState } from "react";
import { Maximize, Minimize, RotateCw } from "lucide-react";
import type { DatosPantalla } from "@/lib/types";
import { usePantallaData } from "@/hooks/usePantallaData";
import PantallaSabores from "./PantallaSabores";
import PantallaCafeteria from "./PantallaCafeteria";
import PantallaPostres from "./PantallaPostres";
import PantallaRotativa from "./PantallaRotativa";
import PantallaSaboresClasicosEspeciales from "./horizontales/PantallaSaboresClasicosEspeciales";
import PantallaTamanosPostres from "./horizontales/PantallaTamanosPostres";
import PantallaCafeteriaPasteleria from "./horizontales/PantallaCafeteriaPasteleria";

interface Props {
  pantallaId: number;
  initial: DatosPantalla;
}

export default function PantallaCliente({ pantallaId, initial }: Props) {
  const { datos, offline, debug } = usePantallaData(pantallaId, initial);
  const { pantalla } = datos;

  // Rotar el contenido por software 90° (para usar una pantalla vertical en un
  // monitor/TV horizontal). Se puede activar con ?rotar=90 o con el botón.
  const [rotar, setRotar] = useState(false);
  const [enFullscreen, setEnFullscreen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("rotar") === "90") setRotar(true);
    const onFs = () => setEnFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    onFs();
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  function renderTemplate() {
    switch (pantalla.template) {
      // ===== Templates reales de Kaikén =====
      case "rotativa":
        return <PantallaRotativa datos={datos} />;
      case "sabores-clasicos-especiales":
        return <PantallaSaboresClasicosEspeciales datos={datos} />;
      case "tamanos-postres":
        return <PantallaTamanosPostres datos={datos} />;
      case "cafeteria-pasteleria":
        return <PantallaCafeteriaPasteleria datos={datos} />;
      // ===== Templates viejos (compatibilidad) =====
      case "sabores_grande":
        return <PantallaSabores datos={datos} modo="grande" />;
      case "sabores_fijo":
        return <PantallaSabores datos={datos} modo="fijo" />;
      case "cafeteria":
        return <PantallaCafeteria datos={datos} />;
      case "postres":
        return <PantallaPostres datos={datos} />;
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-black text-white">
            Template desconocido: {pantalla.template}
          </div>
        );
    }
  }

  const btnStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.55)", color: "#fff", border: "none",
    borderRadius: 8, padding: 9, cursor: "pointer", display: "flex", lineHeight: 0,
  };

  return (
    <>
    {/* Controles SIEMPRE sobre el viewport real (fuera del rotador, no giran).
        Rotar el contenido + entrar/salir de pantalla completa. */}
    <div style={{ position: "fixed", bottom: 12, right: 12, zIndex: 200, display: "flex", gap: 8 }}>
      <button type="button" onClick={() => setRotar((r) => !r)} aria-label="Rotar pantalla"
        style={{ ...btnStyle, background: rotar ? "rgba(16,185,129,0.85)" : btnStyle.background }}>
        <RotateCw size={20} />
      </button>
      <button type="button" onClick={toggleFullscreen}
        aria-label={enFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        style={btnStyle}>
        {enFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>
    </div>

    <div className={rotar ? "rotador-90" : undefined} style={rotar ? undefined : { display: "contents" }}>
    <div className="marco-pantalla">
      <div className="marco-pantalla__lienzo" data-orientacion={pantalla.orientacion}>
      {renderTemplate()}

      {/* Indicador offline */}
      {offline && (
        <div style={{
          position: "fixed", top: "1vw", left: "1vw",
          backgroundColor: "rgba(239,68,68,0.9)", color: "white",
          padding: "0.4vw 0.8vw", borderRadius: "0.4vw",
          fontSize: "0.9vw", fontWeight: 600, zIndex: 50,
        }}>
          Sin conexión
        </div>
      )}

      {/* Panel de debug — activar con D×5 desde el teclado del TV */}
      {debug && (
        <div style={{
          position: "fixed", top: "1vw", right: "1vw",
          backgroundColor: "rgba(0,0,0,0.88)", color: "#4ade80",
          fontFamily: "monospace", fontSize: "0.85vw",
          padding: "1vw 1.5vw", borderRadius: "0.5vw",
          zIndex: 100, minWidth: "22vw", lineHeight: 1.7,
        }}>
          <p style={{ color: "#facc15", fontWeight: 700, marginBottom: "0.4vw" }}>
            ◉ DEBUG
          </p>
          <p>Pantalla: #{pantalla.id} — {pantalla.nombre}</p>
          <p>Template: {pantalla.template}</p>
          <p>Pulgadas: {pantalla.pulgadas}&rdquo;</p>
          <p>Categorías: {datos.categorias.length}</p>
          <p>Productos: {datos.productos.length}</p>
          <p>Promos activas: {datos.promos.filter((p) => p.activa).length}</p>
          <p>Placas fijas activas: {datos.placas_fijas.filter((p) => p.activa).length}/{datos.placas_fijas.length}</p>
          <p>Placas propias activas: {datos.placas_personalizadas.filter((p) => p.activa).length}/{datos.placas_personalizadas.length}</p>
          <p>Orientación: {pantalla.orientacion}{pantalla.orientacion === "vertical" ? ` (desfase ${pantalla.config.desfase_segundos ?? 0}s)` : ""}</p>
          <p style={{ marginTop: "0.5vw", color: "rgba(255,255,255,0.4)", fontSize: "0.75vw" }}>
            D×5 para cerrar
          </p>
        </div>
      )}
      </div>
    </div>
    </div>
    </>
  );
}
