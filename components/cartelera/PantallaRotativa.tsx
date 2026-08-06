"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DatosPantalla, PlacaFija, PlacaPersonalizada as TPlacaPersonalizada } from "@/lib/types";
import { parsePlacaConfig, parseGustos, esKiloKaiken } from "@/lib/types";
import { formatPrecio, formatFecha } from "@/lib/format";
import { calcularIndiceRotacion, dentroDeFechas } from "@/lib/cartelera/rotacion";
import { esVideoUrl } from "@/lib/cartelera/validarImagen";
import { registrarTransicion } from "@/lib/cartelera/diag";
import { registrarSoporteMse } from "@/lib/cartelera/diagMse";
import { COMPONENTES_PLACA, type PlacaProps } from "./placas";
import { ModoOverlay } from "./placas/PlacaVideo";
import VideoEngine, { type MediaTipo } from "./VideoEngine";
import VideoSecuencia, { type Tramo } from "./VideoSecuencia";
import VideoMse, { type ManifiestoMse, type PlacaMse } from "./VideoMse";

interface Props {
  datos: DatosPantalla;
  // Contenedor full-screen (fuera del rotador) donde se portalea el <video>.
  videoLayer?: HTMLElement | null;
  // Rotación de la pantalla (0/90/-90) y tamaño real del viewport: se usan para
  // rotar las placas PERSONALIZADAS verticales (las fijas vienen horneadas).
  rotacion?: 0 | 90 | -90;
  vp?: { w: number; h: number };
}

type Item =
  | { key: string; orden: number; duracion: number; desempate: string; kind: "fija"; data: PlacaFija }
  | { key: string; orden: number; duracion: number; desempate: string; kind: "pers"; data: TPlacaPersonalizada };

/*
 * Rotación de las placas verticales (pantallas 1 y 5) — arquitectura de signage:
 *
 *  - UN SOLO <video> persistente (VideoEngine): nunca se desmonta ni cambia de
 *    key; solo cambia su src. Antes se montaban las ~11 placas a la vez y los
 *    decoders por hardware de las Smart TV (1-2 streams) se saturaban → negro.
 *  - Los OVERLAYS (texto editable) van en una capa HTML separada, encima del
 *    video, manejada por estado → desacoplados del ciclo del <video>.
 *  - El índice se calcula por reloj + desfase (P1=0s, P5=30s) para que las dos
 *    pantallas nunca coincidan.
 */
export default function PantallaRotativa({ datos, videoLayer, rotacion = 0, vp }: Props) {
  const desfase = datos.pantalla.config.desfase_segundos ?? 0;

  const items = useMemo<Item[]>(() => {
    const nowMs = Date.now();
    const fijas: Item[] = (datos.placas_fijas ?? [])
      .filter((pf) => pf.activa && dentroDeFechas(pf.inicio, pf.fin, nowMs))
      .map((pf) => ({
        key: `f-${pf.id}`, orden: pf.orden, duracion: pf.duracion,
        desempate: pf.slug, kind: "fija", data: pf,
      }));
    const pers: Item[] = (datos.placas_personalizadas ?? [])
      .filter((pp) => pp.activa && dentroDeFechas(pp.inicio, pp.fin, nowMs))
      .map((pp) => ({
        key: `p-${pp.id}`, orden: pp.orden, duracion: pp.duracion,
        desempate: pp.id, kind: "pers", data: pp,
      }));
    // Desempate por SLUG, no por id: si dos placas comparten el mismo `orden`
    // (hoy pasa en la P1 con diez-off y kilo-kaiken, ambas en 9), ordenar por el
    // id UUID daba un orden arbitrario e imposible de reproducir fuera de la
    // app. El script que pega los videos ordena por slug, y los dos tienen que
    // coincidir o la secuencia no se usa nunca.
    return [...fijas, ...pers].sort(
      (a, b) => a.orden - b.orden || a.desempate.localeCompare(b.desempate)
    );
  }, [datos.placas_fijas, datos.placas_personalizadas]);

  const [indice, setIndice] = useState(() =>
    calcularIndiceRotacion(items.map((i) => i.duracion), Date.now() / 1000, desfase)
  );

  // El índice MOSTRADO (overlay de texto + placa visible) va un paso atrás del
  // índice por reloj: solo avanza cuando el VideoEngine avisa (onReady) que el
  // contenido de la placa nueva ya está en pantalla — o sea cuando su PÓSTER
  // está pintado, no cuando el <video> arranca. Así el texto editable nunca
  // aparece sobre negro y tampoco llega tarde: atarlo al <video> dejaba la placa
  // 1.7s sin precio ni título (medido en el TV, 2026-07-29).
  const [indiceMostrado, setIndiceMostrado] = useState(indice);

  useEffect(() => {
    const duraciones = items.map((i) => i.duracion);
    const tick = () => {
      const i = calcularIndiceRotacion(duraciones, Date.now() / 1000, desfase);
      setIndice((prev) => (prev === i ? prev : i));
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [items, desfase]);

  // Escala real del lienzo (--escala = anchoLienzo / 1080) para que los overlays
  // sigan al video también cuando el contenido está rotado 90° (vw no sirve ahí).
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const set = () => el.style.setProperty("--escala", String(el.clientWidth / 1080));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Contenido editable de las 3 placas (promo activa de cada tipo).
  const promoActiva = (tipo: string) => datos.promos.find((p) => p.tipo === tipo && p.activa) ?? null;
  const gusto = promoActiva("sabor_dia");
  const novedad = promoActiva("novedad_mes");
  const especial = promoActiva("promo_especial");

  const propsPorSlug: Record<string, PlacaProps> = {
    "gusto-del-dia": { sabor: gusto?.producto?.nombre ?? gusto?.contenido ?? undefined },
    "novedad-del-mes": { novedad: novedad?.producto?.nombre ?? novedad?.contenido ?? undefined },
    "promo-especial": {
      texto: especial?.contenido ?? undefined,
      validez: especial?.fin ? formatFecha(especial.fin) : undefined,
    },
  };

  // Construye el overlay (texto editable) de un item; solo las placas fijas lo
  // tienen. Se usa con el item MOSTRADO, no con el objetivo, para que el texto
  // siga al video revelado.
  const buildOverlay = (item: Item): ReactNode => {
    if (item.kind !== "fija") return null;
    const Placa = COMPONENTES_PLACA[item.data.componente];
    if (!Placa) return null;
    const cfg = parsePlacaConfig(item.data.config);
    const precioProp = cfg.precio != null ? { precio: formatPrecio(cfg.precio) } : {};
    const precioAltProp = cfg.precio_alt != null ? { precioAlt: formatPrecio(cfg.precio_alt) } : {};
    // Kilo Kaikén: precio y gustos salen del PRODUCTO (editable en /postres).
    const kilo =
      item.data.slug === "kilo-kaiken"
        ? (() => {
            const prod = datos.productos.find(esKiloKaiken);
            return {
              precio: formatPrecio(prod?.precio ?? null) || "$0000",
              gustos: parseGustos(prod?.gustos_incluidos).join(" - "),
            };
          })()
        : {};
    return (
      <Placa {...(propsPorSlug[item.data.slug] ?? {})} {...precioProp} {...precioAltProp} {...kilo} activo />
    );
  };

  // Helpers: URL del medio y del PÓSTER (primer frame) de un item. Las placas
  // fijas tienen póster generado; las personalizadas no (caen al modo directo).
  const srcDe = (item: Item) =>
    item.kind === "fija" ? `/placas/${item.data.slug}.mp4` : item.data.imagen_url;
  const posterDe = (item: Item) =>
    item.kind === "fija"
      ? `/placas/posters/${item.data.slug}.jpg`
      : item.data.poster_url ?? undefined;

  // Índices acotados (por si el set de placas cambió en un refetch). El OBJETIVO
  // (reloj) define qué medio carga el VideoEngine; el MOSTRADO define el texto.
  const len = items.length;
  const idxObjetivo = len ? ((indice % len) + len) % len : 0;
  const idxMostrado = len ? ((indiceMostrado % len) + len) % len : 0;

  // PREFETCH del PRÓXIMO medio + su póster: como hay un solo <video> en el TV,
  // al cambiar de src su plano de hardware se pone negro mientras carga. El
  // póster (img, sí renderiza en el TV) tapa ese hueco con el frame de la placa,
  // pero tiene que estar ya en cache para aparecer sin parpadeo. Calentamos el
  // cache HTTP del próximo video y de su póster. No usa un 2º <video> (saturaría
  // el decoder). (Va antes del return temprano para no romper el orden de hooks.)
  const prox = len ? items[(idxObjetivo + 1) % len] : null;
  const proxSrc = prox ? srcDe(prox) : "";
  const proxPoster = prox ? posterDe(prox) : undefined;

  // PRECARGA DE TODOS LOS PÓSTERES apenas monta la pantalla (son JPG chicos, ~13).
  // El prefetch de "el próximo" no alcanzaba en la PRIMERA transición: si la
  // página carga a mitad de una placa, el póster de la siguiente tiene apenas
  // 1-2s para bajar mientras el TV también baja el HTML y el primer mp4 → llegaba
  // tarde y se colaba el negro (medido 2026-07-29). Bajándolos y DECODIFICÁNDOLOS
  // todos de una, cualquier transición encuentra su cover ya listo.
  const postersRef = useRef<HTMLImageElement[]>([]);
  const clavePosters = items.map((i) => posterDe(i) ?? "").join("|");
  useEffect(() => {
    postersRef.current = clavePosters
      .split("|")
      .filter(Boolean)
      .map((url) => {
        const img = new Image();
        img.src = url;
        if (typeof img.decode === "function") img.decode().catch(() => {});
        return img; // guardado en la ref: evita que el GC lo tire antes de decodificar
      });
  }, [clavePosters]);

  // El próximo mp4 ENTERO en memoria (blob:) para que el <video> no toque la red
  // al cambiar de placa. Calentar el cache HTTP no alcanzaba: la TV igual tardaba
  // hasta 1.5s en abrir el archivo y en ese rato se veía el póster CONGELADO —
  // que en varias placas es el frame 0, casi vacío (los gráficos entran animados
  // después). Resultado en el TV: placa en blanco con el precio flotando, justo
  // lo que el cliente describe como "trabado" (grabación 2026-07-29). Con el blob
  // el <video> abre de memoria y la animación de entrada arranca casi al toque.
  const blobsRef = useRef<Map<string, string>>(new Map());
  const [, refrescar] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    if (proxSrc && !blobsRef.current.has(proxSrc)) {
      fetch(proxSrc, { signal: c.signal })
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => {
          if (!b || c.signal.aborted || blobsRef.current.has(proxSrc)) return;
          blobsRef.current.set(proxSrc, URL.createObjectURL(b));
          refrescar((n) => n + 1); // que el VideoEngine reciba el blob ya listo
        })
        .catch(() => {});
    }
    // Póster: además de bajarlo, DECODIFICARLO en background con un Image(). Así
    // en la próxima transición el cover ya está pintado y tapa el hueco de carga
    // del <video> al instante — sin parpadeo negro.
    if (proxPoster) {
      const img = new Image();
      img.src = proxPoster;
      if (typeof img.decode === "function") img.decode().catch(() => {});
    }
    return () => c.abort();
  }, [proxSrc, proxPoster]);

  // Liberar los blobs que ya no son ni la placa actual ni la próxima: en el TV la
  // memoria es escasa y son 13 videos por vuelta.
  const srcActual = len ? srcDe(items[idxObjetivo]) : "";
  useEffect(() => {
    blobsRef.current.forEach((objectUrl, url) => {
      if (url === srcActual || url === proxSrc) return;
      URL.revokeObjectURL(objectUrl);
      blobsRef.current.delete(url);
    });
  }, [srcActual, proxSrc]);

  // ── MODO SECUENCIA: un solo video continuo, sin recargas ──────────────────
  // Si existe el archivo pegado de esta pantalla (scripts/pegar-placas.mjs) y
  // coincide EXACTO con las placas activas de la base, se reproduce ese archivo
  // en loop y el <video> no cambia de src nunca más. Si no coincide (el dueño
  // activó, desactivó o reordenó algo, o subió una placa propia), o si el video
  // falla, se cae sola al modo de a una placa: nunca queda rota, en el peor caso
  // queda como antes.
  // Los textos editables se dibujan SOLO en el navegador. En el servidor la placa
  // se elige con el reloj, así que el HTML que manda el servidor y el que arma el
  // navegador un instante después caen en placas distintas → React tiraba error
  // de hidratación (#418, visto en producción en /pantalla/1). No se pierde nada:
  // el texto entra igual, un cuadro después.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Sonda de MSE: pregunta capacidades y deja UNA fila por día en
  // diag_transiciones para poder leer desde afuera si el Samsung banca el modo
  // que haría innecesario regenerar el video pegado. No decodifica nada ni toca
  // el reproductor. TEMPORAL: borrar junto con lib/cartelera/diagMse.ts.
  useEffect(() => {
    void registrarSoporteMse(datos.pantalla.id);
  }, [datos.pantalla.id]);

  // ── MODO MSE: el <video> se abre una vez y se le van appendeando las placas.
  // Es el único modo en el que el ORDEN no está horneado: activar, desactivar o
  // reordenar desde el panel entra en el próximo límite de placa, sin recargar
  // nada. Si no está disponible, se cae al mp4 pegado (fluido pero horneado) y
  // de ahí al modo de a una placa.
  const [manifiestoMse, setManifiestoMse] = useState<ManifiestoMse | null>(null);
  const [mseFallo, setMseFallo] = useState(false);
  const [slugMse, setSlugMse] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/placas/mse/_mse.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (vivo && m?.tramos?.length && m?.codec) setManifiestoMse(m);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Las personalizadas traen sus assets MSE al lado del archivo original, con
  // el mismo nombre y otra extensión (los sube el panel al recodificarlas en el
  // navegador). No hay columna en la base: se deduce de la URL y se comprueba
  // pidiendo el archivo. Si no está, esa placa no puede ir por MSE.
  const baseMseDe = (url: string) => url.replace(/\.[^./]+$/, "");
  const [persConMse, setPersConMse] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const pendientes = items.filter(
      (i) => i.kind === "pers" && persConMse[i.data.id] === undefined
    );
    if (pendientes.length === 0) return;
    let vivo = true;
    Promise.all(
      pendientes.map(async (it) => {
        if (it.kind !== "pers") return null;
        try {
          const r = await fetch(`${baseMseDe(it.data.imagen_url)}.m4s`, { method: "HEAD" });
          return [it.data.id, r.ok] as const;
        } catch {
          return [it.data.id, false] as const;
        }
      })
    ).then((res) => {
      if (!vivo) return;
      const nuevos: Record<string, boolean> = {};
      for (const r of res) if (r) nuevos[r[0]] = r[1];
      if (Object.keys(nuevos).length) setPersConMse((p) => ({ ...p, ...nuevos }));
    });
    return () => {
      vivo = false;
    };
  }, [items, persConMse]);

  const usarMse = useMemo(() => {
    if (!manifiestoMse || mseFallo) return false;
    const conSegmento = new Set(manifiestoMse.tramos.map((t) => t.slug));
    return items.every((it) =>
      it.kind === "fija" ? conSegmento.has(it.data.slug) : persConMse[it.data.id] === true
    );
  }, [manifiestoMse, mseFallo, items, persConMse]);

  // El orden que consume el player. Sale de la base, así que cambiarlo en el
  // panel lo cambia acá sin remontar el <video>.
  const ordenMse = useMemo<PlacaMse[]>(
    () =>
      items.map((i) =>
        i.kind === "fija"
          ? {
              clave: i.key,
              segmento: `/placas/mse/${i.data.slug}.m4s`,
              init: "/placas/mse/init.mp4",
            }
          : {
              clave: i.key,
              segmento: `${baseMseDe(i.data.imagen_url)}.m4s`,
              init: `${baseMseDe(i.data.imagen_url)}.init.mp4`,
            }
      ),
    [items]
  );

  const [manifiesto, setManifiesto] = useState<{ tramos: Tramo[] } | null>(null);
  const [secuenciaFallo, setSecuenciaFallo] = useState(false);
  const [indiceSecuencia, setIndiceSecuencia] = useState(0);

  useEffect(() => {
    let vivo = true;
    fetch(`/placas/secuencias/p${datos.pantalla.id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (vivo && m?.tramos?.length) setManifiesto(m);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [datos.pantalla.id]);

  const usarSecuencia = useMemo(() => {
    if (!manifiesto || secuenciaFallo) return false;
    // Cualquier placa personalizada activa desarma la secuencia: esos videos los
    // sube el dueño y no están dentro del archivo pegado.
    if (items.some((i) => i.kind !== "fija")) return false;
    if (items.length !== manifiesto.tramos.length) return false;
    // Se comparan nombre Y duración. Sin la duración, si el dueño cambiaba
    // cuánto dura una placa el video seguía con la duración vieja y el cambio se
    // ignoraba en silencio. La tolerancia es porque el manifiesto guarda la
    // duración REAL del mp4 (10.000s) y la base guarda la configurada (10).
    return items.every((it, i) => {
      const tramo = manifiesto.tramos[i];
      if (it.kind !== "fija" || it.data.slug !== tramo.slug) return false;
      return Math.abs(it.duracion - tramo.duracion) <= 0.5;
    });
  }, [manifiesto, secuenciaFallo, items]);

  if (len === 0) {
    return <div style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />;
  }

  if (usarMse && manifiestoMse) {
    // El overlay sigue a la placa que el player dice estar mostrando (no al
    // reloj): así el texto no se puede adelantar al video.
    const itemMse = items.find((i) => i.key === slugMse) ?? items[0];
    const overlayMse = buildOverlay(itemMse);
    const reproductor = (
      <VideoMse
        manifiesto={manifiestoMse}
        orden={ordenMse}
        poster={posterDe(items[0])}
        onIndice={setSlugMse}
        onFalla={() => setMseFallo(true)}
      />
    );
    return (
      <div ref={rootRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
        {videoLayer ? createPortal(reproductor, videoLayer) : reproductor}
        {montado && overlayMse && (
          <ModoOverlay.Provider value={true}>
            {/* Sin fundidos: el video no se corta nunca, el texto cambia de
                golpe justo en el límite, como en el diseño. */}
            <div key={itemMse.key} style={{ position: "absolute", inset: 0 }}>
              {overlayMse}
            </div>
          </ModoOverlay.Provider>
        )}
      </div>
    );
  }

  if (usarSecuencia && manifiesto) {
    const idx = Math.min(indiceSecuencia, items.length - 1);
    const overlaySec = buildOverlay(items[idx]);
    const reproductor = (
      <VideoSecuencia
        src={`/placas/secuencias/p${datos.pantalla.id}.mp4`}
        poster={posterDe(items[0])}
        tramos={manifiesto.tramos}
        onIndice={setIndiceSecuencia}
        onFalla={() => setSecuenciaFallo(true)}
      />
    );
    return (
      <div ref={rootRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
        {videoLayer ? createPortal(reproductor, videoLayer) : reproductor}
        {montado && overlaySec && (
          <ModoOverlay.Provider value={true}>
            {/* Sin fundidos: el video no se corta nunca, así que el texto puede
                cambiar de golpe justo en el límite del tramo, como en el diseño. */}
            <div key={items[idx].key} style={{ position: "absolute", inset: 0 }}>
              {overlaySec}
            </div>
          </ModoOverlay.Provider>
        )}
      </div>
    );
  }

  const objetivo = items[idxObjetivo];
  const mostrado = items[idxMostrado];

  // Medio (src + tipo + póster) que recibe el VideoEngine persistente. Los videos
  // fijos se guardan ACOSTADOS 1920×1080 con la rotación HORNEADA (transpose=1),
  // así el plano de video del TV los muestra ya girados, sin transform CSS.
  const src = srcDe(objetivo);
  const tipo: MediaTipo = objetivo.kind === "fija" || esVideoUrl(src) ? "video" : "imagen";
  const poster = posterDe(objetivo);
  // Las placas fijas vienen con la rotación HORNEADA (rotar=0). Las
  // personalizadas son verticales sin hornear → se rotan con la pantalla.
  const rotarMedia: 0 | 90 | -90 = objetivo.kind === "pers" ? rotacion : 0;

  // Overlay del item MOSTRADO (no del objetivo): aparece recién cuando la placa
  // nueva ya está en pantalla (ver onReady), nunca sobre negro. Mientras tanto
  // (objetivo ≠ mostrado), el texto viejo se va rápido en vez de quedar colgado
  // sobre la placa que entra.
  const overlay = buildOverlay(mostrado);
  const transicionando = idxObjetivo !== idxMostrado;

  // El <video> persistente se renderiza en la capa full-screen de atrás (portal),
  // así llena la pantalla 16:9 sin recortarse contra el marco 9:16. Si no hay
  // capa (SSR / horizontal), se renderiza inline como fallback. Cuando la placa
  // objetivo aparece, avanzamos el índice mostrado → el texto entra en sync.
  const motor = (
    <VideoEngine
      src={src}
      // Si ya lo bajamos entero, el <video> abre el blob de memoria (sin red).
      mediaSrc={blobsRef.current.get(src) ?? src}
      tipo={tipo}
      poster={poster}
      rotar={rotarMedia}
      vp={vp}
      // Personalizadas: contain (se ven completas, sin recortar aunque no sean
      // 9:16 exacto). Fijas: cover (ya son 9:16 y llenan la pantalla).
      ajuste={objetivo.kind === "pers" ? "contain" : "cover"}
      duracion={objetivo.duracion}
      // Telemetría: la TV deja anotadas las transiciones que salen mal. Es la
      // única forma de ver qué pasa en el local — el destello no se reproduce en
      // Chromium de escritorio y el navegador del TV se maneja con control remoto,
      // así que no se le puede pedir a nadie que abra la pantalla con ?diag=1.
      onDiag={(d) =>
        registrarTransicion({
          ...d,
          pantalla: datos.pantalla.id,
          slug: objetivo.kind === "fija" ? objetivo.data.slug : "personalizada",
        })
      }
      onReady={() => setIndiceMostrado(indice)}
    />
  );

  return (
    <div ref={rootRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {videoLayer ? createPortal(motor, videoLayer) : motor}
      {/* Capa de overlay (texto editable). Entra con el crossfade del video
          (juntos) y se va rápido apenas arranca la transición. */}
      {montado && overlay && (
        <ModoOverlay.Provider value={true}>
          <OverlayFade key={mostrado.key} visible={!transicionando}>
            {overlay}
          </OverlayFade>
        </ModoOverlay.Provider>
      )}
    </div>
  );
}

/**
 * Envuelve el overlay de texto. Entra con un fade-in ágil al montar (en
 * sincronía con el crossfade del video) y, cuando `visible` pasa a false
 * (arrancó la transición a la próxima placa), se va rápido para no quedar
 * colgado sobre el negro de carga.
 */
function OverlayFade({ visible, children }: { visible: boolean; children: ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMontado(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);
  const op = montado && visible ? 1 : 0;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: op,
        transition: `opacity ${visible ? 200 : 140}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
