import { redirect } from "next/navigation";

// La raíz redirige al dashboard del admin.
// El middleware separa admin.* de cartelera.* antes de llegar acá.
export default function RootPage() {
  redirect("/sabores");
}
