import type { FC } from "react";
import PlacaAntojoDeTarde from "./PlacaAntojoDeTarde";
import PlacaPromoEspecial from "./PlacaPromoEspecial";
import PlacaDespuesColeTostado from "./PlacaDespuesColeTostado";
import PlacaDespuesColeBudin from "./PlacaDespuesColeBudin";
import PlacaCuartos from "./PlacaCuartos";
import PlacaDiezOff from "./PlacaDiezOff";
import PlacaKiloKaiken from "./PlacaKiloKaiken";
import PlacaGustoDelDia from "./PlacaGustoDelDia";
import PlacaNovedadDelMes from "./PlacaNovedadDelMes";
import PlacaQRDelivery from "./PlacaQRDelivery";
import PlacaSeguinos from "./PlacaSeguinos";
import PlacaAffogato from "./PlacaAffogato";
import PlacaFrappuccino from "./PlacaFrappuccino";

export {
  PlacaAntojoDeTarde,
  PlacaPromoEspecial,
  PlacaDespuesColeTostado,
  PlacaDespuesColeBudin,
  PlacaCuartos,
  PlacaDiezOff,
  PlacaKiloKaiken,
  PlacaGustoDelDia,
  PlacaNovedadDelMes,
  PlacaQRDelivery,
  PlacaSeguinos,
  PlacaAffogato,
  PlacaFrappuccino,
};

/** Props que pueden recibir las placas con contenido variable (Cambio 7). */
export interface PlacaProps {
  precio?: string;
  /** Segundo precio (placas con dos valores, ej. cuartos). */
  precioAlt?: string;
  /** Lista editable de gustos seleccionados (ej. kilo-kaiken). */
  gustos?: string;
  texto?: string;
  validez?: string;
  sabor?: string;
  novedad?: string;
  /** true cuando la placa está visible en la rotación (reinicia el video). */
  activo?: boolean;
}

/**
 * Registro por NOMBRE de componente — coincide con placas_fijas.componente.
 * La rotación (Cambio 8) resuelve el componente a renderizar desde acá.
 */
export const COMPONENTES_PLACA: Record<string, FC<PlacaProps>> = {
  PlacaAntojoDeTarde,
  PlacaPromoEspecial,
  PlacaDespuesColeTostado,
  PlacaDespuesColeBudin,
  PlacaCuartos,
  PlacaDiezOff,
  PlacaKiloKaiken,
  PlacaGustoDelDia,
  PlacaNovedadDelMes,
  PlacaQRDelivery,
  PlacaSeguinos,
  PlacaAffogato,
  PlacaFrappuccino,
};

/** Registro por SLUG (el de placas_fijas.slug). */
export const COMPONENTES_PLACA_POR_SLUG: Record<string, FC<PlacaProps>> = {
  "antojo-de-tarde": PlacaAntojoDeTarde,
  "promo-especial": PlacaPromoEspecial,
  "despues-cole-tostado": PlacaDespuesColeTostado,
  "despues-cole-budin": PlacaDespuesColeBudin,
  cuartos: PlacaCuartos,
  "diez-off": PlacaDiezOff,
  "kilo-kaiken": PlacaKiloKaiken,
  "gusto-del-dia": PlacaGustoDelDia,
  "novedad-del-mes": PlacaNovedadDelMes,
  "qr-delivery": PlacaQRDelivery,
  seguinos: PlacaSeguinos,
  affogato: PlacaAffogato,
  frappuccino: PlacaFrappuccino,
};
