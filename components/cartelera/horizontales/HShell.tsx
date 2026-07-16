"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  BASE_HORIZONTAL_WIDTH,
  COLORS,
  ESCALA_TEXTO_MAX,
  ESCALA_TEXTO_MIN,
  FONT_FAMILY,
  MARGEN_SEGURIDAD_PX,
  pxH,
} from "@/lib/cartelera/tokens";

// useLayoutEffect avisa en SSR; del lado servidor usamos useEffect.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Contenedor común de las pantallas horizontales (1920×1080, 16/9).
 * Fondo papel crema, texto violeta. El lienzo padre (marco-pantalla) ya
 * fuerza la proporción; acá llenamos el 100% en columna con dos secciones.
 *
 * AJUSTE DE LECTURA: busca el mayor `--escala-texto` (entre ESCALA_TEXTO_MIN y
 * ESCALA_TEXTO_MAX) con el que el contenido todavía entra, y lo aplica. Así cada
 * pantalla aprovecha su propio espacio sobrante (la de cafetería tiene más aire
 * que la de sabores) sin quedar atada a un número fijo.
 *
 * Por qué medir y no hardcodear: los productos los edita el dueño desde el
 * panel. Con una escala fija, agregar un producto empuja el contenido fuera del
 * `overflow: hidden` y la última fila desaparece SIN aviso (no hay scroll ni
 * error). Midiendo, agregar un producto solo achica un poco la letra.
 */
export default function HShell({
  children,
  style,
  justify = "center",
}: {
  children: ReactNode;
  style?: CSSProperties;
  /** Distribución vertical de las dos secciones. Default "center". */
  justify?: CSSProperties["justifyContent"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(ESCALA_TEXTO_MIN);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // `true` si el contenido entra en el alto útil con la escala `e`.
    // Se exige un colchón (MARGEN_SEGURIDAD_PX): la búsqueda converge al borde
    // exacto, y Montserrat no rasteriza igual en el TV (Tizen) que en Chrome.
    // Un par de píxeles de diferencia contra un `overflow: hidden` = fila
    // recortada. El colchón se define sobre el lienzo de diseño y se escala.
    const entra = (e: number) => {
      el.style.setProperty("--escala-texto", String(e));
      const cs = getComputedStyle(el);
      const disponible =
        el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const filas = [...el.children];
      const gap = parseFloat(cs.rowGap || "0") * Math.max(0, filas.length - 1);
      const alto = filas.reduce((s, h) => s + h.getBoundingClientRect().height, 0) + gap;
      const colchon = (MARGEN_SEGURIDAD_PX / BASE_HORIZONTAL_WIDTH) * el.clientWidth;
      return alto <= disponible - colchon;
    };

    const ajustar = () => {
      if (el.clientHeight === 0) return;
      // Si entra al máximo, listo (no hace falta buscar).
      if (entra(ESCALA_TEXTO_MAX)) {
        setEscala(ESCALA_TEXTO_MAX);
        return;
      }
      // Si no, búsqueda binaria del mayor tamaño que entra.
      let lo = ESCALA_TEXTO_MIN;
      let hi = ESCALA_TEXTO_MAX;
      let best = ESCALA_TEXTO_MIN;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        if (entra(mid)) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      setEscala(best);
    };

    ajustar();

    // Re-ajustar cuando termine de cargar Montserrat: si la primera medición
    // corre con la fuente de fallback, las métricas son otras y la escala
    // elegida queda mal (puede recortar al aplicarse la fuente real).
    let vigente = true;
    document.fonts?.ready.then(() => {
      if (vigente) ajustar();
    });

    // Se observan las SECCIONES (el contenido), no el shell: el shell mide
    // siempre lo mismo (16/9 del lienzo), así que observarlo a él no avisa
    // nunca. Lo que cambia de alto es el contenido — al cargar la fuente real
    // o al agregar el dueño un producto — y eso es lo que obliga a re-ajustar.
    // `ajustar` escribe --escala-texto para medir, lo que dispararía el
    // observer de nuevo: se desconecta mientras mide para no entrar en bucle.
    const observar = (ro: ResizeObserver) => {
      for (const hijo of el.children) ro.observe(hijo);
    };
    const ro = new ResizeObserver(() => {
      ro.disconnect();
      ajustar();
      observar(ro);
    });
    observar(ro);
    return () => {
      vigente = false;
      ro.disconnect();
    };
    // `children` en deps: al cambiar los productos desde el panel hay que
    // recalcular (una lista más larga puede necesitar letra más chica).
  }, [children]);

  return (
    <div
      ref={ref}
      className="pantalla-horizontal"
      style={{
        // Escala de lectura del cuerpo de texto. Arranca en el mínimo y el
        // efecto la sube a lo que entre, antes del primer pintado.
        ["--escala-texto" as string]: String(escala),
        aspectRatio: "16 / 9",
        width: "100%",
        height: "100%",
        backgroundColor: COLORS.cremaHorizontal,
        color: COLORS.violeta,
        fontFamily: `var(--font-montserrat), ${FONT_FAMILY}, sans-serif`,
        // grid (no flex) para que el `gap` ande en Smart TV con Chromium <84
        // (ej. Tizen 2020): el grid-gap anda desde Chromium 57, el flex-gap
        // recién desde 84. En columna, la distribución vertical va por alignContent.
        display: "grid",
        alignContent: justify,
        // Padding vertical y separación entre secciones recortados (48→28,
        // 72→44): es alto que se le devuelve al texto para que pueda crecer.
        // El padding lateral (72) no se toca: ahí sobra espacio.
        padding: `${pxH(28)} ${pxH(72)}`,
        gap: pxH(44),
        boxSizing: "border-box",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
