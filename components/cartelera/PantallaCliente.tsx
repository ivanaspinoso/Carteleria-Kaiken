"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
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

  // Rotar el contenido por software (para usar una pantalla vertical en un
  // TV horizontal girado físicamente en la pared, cuando el TV Box no rota
  // la salida HDMI). 0 = sin rotar, 90 = horario, -90 = antihorario.
  // En pantallas verticales (P1/P5) se activa SOLA al cargar; el sentido se
  // puede forzar/ajustar por URL con ?rotar=90 / ?rotar=-90 / ?rotar=0.
  const [rotacion, setRotacion] = useState<0 | 90 | -90>(0);
  const [enFullscreen, setEnFullscreen] = useState(false);
  // Qué pasó en el último intento de pantalla completa. El TV puede RECHAZAR el
  // pedido sin decir nada (se ve igual que si el botón no hiciera nada), así que
  // guardamos el resultado y lo mostramos en el panel de debug (D×5).
  const [fsInfo, setFsInfo] = useState("sin intentos");
  // Qué APIs de pantalla completa existen en ESTE navegador, y cuál es. Se lee
  // al montar (no en el server) y se muestra en el panel de debug.
  const [fsApi, setFsApi] = useState({ estandar: false, webkit: false, ua: "" });
  useEffect(() => {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    setFsApi({
      estandar: typeof el.requestFullscreen === "function",
      webkit: typeof el.webkitRequestFullscreen === "function",
      ua: navigator.userAgent,
    });
  }, []);

  // Tamaño REAL del viewport en px. Para rotar el contenido a pantalla completa
  // usamos px explícitos (no 100vh/100vw): los navegadores de Smart TV (Tizen/
  // WebOS) calculan mal las unidades de viewport y el rotador quedaba sin efecto.
  // Capa de video full-screen (fuera del rotador): el video horneado es 16:9 y
  // tiene que llenar la PANTALLA completa sin recortarse contra el marco 9:16.
  // PantallaRotativa renderiza el <video> acá vía portal; el texto/overlay queda
  // dentro del rotador (rotado). Ambos en el mismo espacio de framebuffer.
  const [videoLayer, setVideoLayer] = useState<HTMLDivElement | null>(null);

  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const set = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    set();
    window.addEventListener("resize", set);
    window.addEventListener("orientationchange", set);
    return () => {
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("rotar");
    if (r === "90") setRotacion(90);
    else if (r === "-90") setRotacion(-90);
    else if (r === "0" || r === "no") setRotacion(0);
    else if (initial.pantalla.orientacion === "vertical") setRotacion(90);
    // El navegador de los Smart TV Samsung (Tizen) usa la API con prefijo
    // `webkit`, no la estándar → hay que mirar ambos para saber si estamos en
    // pantalla completa y escuchar los dos nombres de evento.
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    const onFs = () =>
      setEnFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    onFs();
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
    // Solo al montar: la URL y la orientación inicial definen el estado base.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El control (pantalla completa) se auto-oculta tras unos segundos sin
  // actividad y reaparece con cualquier movimiento (mouse/touch/teclado), para
  // no dejar el botón quemado sobre la cartelera.
  const [controlesVisibles, setControlesVisibles] = useState(true);
  const timerControles = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const OCULTAR_MS = 4000;
    const mostrar = () => {
      setControlesVisibles(true);
      if (timerControles.current) clearTimeout(timerControles.current);
      timerControles.current = setTimeout(() => setControlesVisibles(false), OCULTAR_MS);
    };
    mostrar(); // arranca visible y programa el ocultado
    const eventos = ["mousemove", "mousedown", "touchstart", "keydown"];
    eventos.forEach((e) => window.addEventListener(e, mostrar, { passive: true }));
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, mostrar));
      if (timerControles.current) clearTimeout(timerControles.current);
    };
  }, []);

  // Mantener la pantalla del TV ENCENDIDA mientras la cartelera está abierta
  // (Screen Wake Lock API). El lock se libera si la pestaña se oculta, así que
  // se vuelve a pedir al recuperar visibilidad (también tras el auto-reload 4am).
  // Si el dispositivo no la soporta, cae al try/catch y manda la config de
  // energía del propio TV (conviene igual desactivar el suspendido/protector).
  useEffect(() => {
    type WakeLock = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLock> };
    };
    let lock: WakeLock | null = null;

    const pedir = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") {
          lock = await nav.wakeLock.request("screen");
        }
      } catch {
        /* no soportado o bloqueado: queda a cargo de la config del TV */
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") pedir();
    };

    pedir();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  function toggleFullscreen() {
    // Tizen (Samsung) y otros navegadores de TV exponen la API con prefijo
    // `webkit`. Probamos la estándar y caemos a la webkit para que el botón
    // funcione en los Smart TV, no solo en Chrome de escritorio.
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => void;
    };
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    const enFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    try {
      if (enFs) {
        if (doc.exitFullscreen) doc.exitFullscreen().catch((e: Error) => setFsInfo(`salir rechazado: ${e?.name}`));
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
        else setFsInfo("sin API para salir");
      } else if (el.requestFullscreen) {
        setFsInfo("pedido estandar...");
        el.requestFullscreen().then(
          () => setFsInfo("estandar OK"),
          (e: Error) => setFsInfo(`estandar RECHAZADO: ${e?.name}: ${e?.message}`),
        );
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        setFsInfo("uso webkit (sin promesa)");
      } else {
        setFsInfo("SIN API de fullscreen en este TV");
      }
    } catch (e) {
      // Algunos navegadores de TV tiran la excepción en vez de rechazar.
      setFsInfo(`excepcion: ${(e as Error)?.name}: ${(e as Error)?.message}`);
    }
  }

  function renderTemplate() {
    switch (pantalla.template) {
      // ===== Templates reales de Kaikén =====
      case "rotativa":
        return <PantallaRotativa datos={datos} videoLayer={videoLayer} rotacion={rotacion} vp={vp} />;
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

  // Rotación a pantalla completa con px explícitos y origen en la esquina (más
  // compatible con TVs que el `100vh/100vw` + centrado). El contenedor se
  // dimensiona ACOSTADO (ancho = alto del viewport) y se gira 90° desde 0,0,
  // trasladándolo para volver a entrar en cuadro.
  const rotando = rotacion !== 0 && vp.w > 0 && vp.h > 0;
  const giro =
    rotacion === 90
      ? `translateX(${vp.w}px) rotate(90deg)`
      : `translateY(${vp.h}px) rotate(-90deg)`;
  const rotadorStyle: React.CSSProperties = rotando
    ? {
        // `fixed` con px reales: rota bien el HTML/texto en el TV (confirmado).
        // El <video> NO sigue este transform (plano de hardware) → lo gira el
        // VideoEngine con su propio transform.
        position: "fixed",
        top: 0,
        left: 0,
        width: vp.h,
        height: vp.w,
        overflow: "hidden",
        transformOrigin: "0 0",
        transform: giro,
        WebkitTransform: giro,
        WebkitTransformOrigin: "0 0",
      }
    : { display: "contents" };

  return (
    <>
    {/* Control SIEMPRE sobre el viewport real (fuera del rotador, no gira).
        Pantalla completa. Se auto-oculta sin actividad y vuelve con movimiento. */}
    <div style={{
      position: "fixed", bottom: 12, right: 12, zIndex: 200, display: "flex", gap: 8,
      opacity: controlesVisibles ? 1 : 0,
      pointerEvents: controlesVisibles ? "auto" : "none",
      transition: "opacity 400ms ease",
    }}>
      <button type="button" onClick={toggleFullscreen}
        aria-label={enFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        style={btnStyle}>
        {enFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>
    </div>

    {/* Capa de video full-screen, DETRÁS del rotador (z-index 0). El <video>
        horneado (16:9) llena la pantalla sin recortarse contra el marco 9:16. */}
    <div ref={setVideoLayer} style={{ position: "fixed", inset: 0, zIndex: 0, background: "#000" }} />

    <div
      className={rotando ? "rotador-90" : undefined}
      style={rotadorStyle}
    >
    {/* Cuando rota (rotativa P1/P5) el fondo va transparente para ver el video
        de la capa de atrás; el overlay (texto) se pinta encima. */}
    <div className="marco-pantalla" style={rotando ? { background: "transparent" } : undefined}>
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

          {/* Diagnóstico de PANTALLA COMPLETA: para saber por qué el botón no
              responde en un TV puntual (¿falta la API? ¿el TV la rechaza?). */}
          <p style={{ color: "#facc15", fontWeight: 700, marginTop: "0.5vw" }}>◉ FULLSCREEN</p>
          <p>API estándar: {fsApi.estandar ? "sí" : "NO"} — webkit: {fsApi.webkit ? "sí" : "NO"}</p>
          <p>En fullscreen: {enFullscreen ? "sí" : "no"}</p>
          <p style={{ whiteSpace: "normal" }}>Último intento: {fsInfo}</p>
          <p style={{ whiteSpace: "normal", fontSize: "0.7vw", color: "rgba(255,255,255,0.55)" }}>
            UA: {fsApi.ua}
          </p>

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
