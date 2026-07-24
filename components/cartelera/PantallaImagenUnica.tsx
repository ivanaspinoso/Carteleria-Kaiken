import type { DatosPantalla } from "@/lib/types";
import { COLORS } from "@/lib/cartelera/tokens";

/**
 * Pantalla de UNA sola imagen, la que sube el cliente desde el admin
 * (template 'imagen-unica'; hoy la Pantalla 2).
 *
 * La imagen se muestra COMPLETA, sin recortar (`contain`): lo que sobra a los
 * costados o arriba/abajo queda con el fondo crema del sistema. Se prioriza
 * que no se pierda nada del diseño que arma el cliente por sobre llenar el
 * cuadro. Sin animaciones ni transiciones: es contenido estático.
 */
export default function PantallaImagenUnica({ datos }: { datos: DatosPantalla }) {
  const imagen = datos.imagen_pantalla;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: COLORS.cremaHorizontal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagen.imagen_url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <p
          style={{
            color: COLORS.violeta,
            fontSize: "2.2vw",
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.5,
            padding: "0 6vw",
          }}
        >
          No hay imagen cargada para la Pantalla {datos.pantalla.id}.
          <br />
          Subila desde el admin.
        </p>
      )}
    </div>
  );
}
