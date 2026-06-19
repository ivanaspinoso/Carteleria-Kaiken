/**
 * MIDDLEWARE — tres comportamientos combinados:
 *
 * 1. ROUTING POR SUBDOMINIO
 *    • Cartelera host → solo /pantalla/* permitido, todo lo demás → 404
 *    • Admin host     → /pantalla/* bloqueado → 404
 *
 * 2. AUTH (solo admin)
 *    • Sin sesión y ruta ≠ /login → redirect /login?redirectTo=<ruta>
 *    • Con sesión y ruta = /login → redirect /sabores
 *
 * 3. HEADER x-pathname
 *    • Inyectado en cada request para que los layouts lean
 *      la ruta actual desde headers() (Server Components).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_HOSTS = new Set([
  process.env.NEXT_PUBLIC_ADMIN_HOST ?? "admin.heladeria.com",
  "admin.local.test",
  "localhost",
  "127.0.0.1",
]);

const CARTELERA_HOSTS = new Set([
  process.env.NEXT_PUBLIC_CARTELERA_HOST ?? "cartelera.heladeria.com",
  "cartelera.local.test",
]);

function getHostname(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost"
  ).split(":")[0];
}

export async function middleware(request: NextRequest) {
  const host = getHostname(request);
  const { pathname } = request.nextUrl;

  const esCartelera = CARTELERA_HOSTS.has(host);
  // Todo host que no sea cartelera se trata como admin (incluye el dominio de
  // Vercel y cualquier dominio único sin subdominios configurados).
  const esAdmin = !esCartelera;
  // Subdominios admin DEDICADOS: solo muestran el panel (carteleras → 404).
  const esAdminDedicado =
    host === (process.env.NEXT_PUBLIC_ADMIN_HOST ?? "admin.heladeria.com") ||
    host === "admin.local.test";
  // En el resto (localhost, *.vercel.app, dominio único) conviven admin y
  // carteleras en el mismo dominio → /pantalla/* permitido.
  const esDual = !esAdminDedicado;
  // "/pantalla/" y no "/pantallas" (ruta del admin)
  const esPantalla  = pathname === "/pantalla" || pathname.startsWith("/pantalla/");

  // Inyectar pathname para que los Server Components lo lean con headers()
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-pathname", pathname);

  // ── COMPORTAMIENTO 1 ─────────────────────────────────────────
  // Cartelera: solo /pantalla/*
  if (esCartelera) {
    if (!esPantalla) return new NextResponse(null, { status: 404 });
    // Las carteleras no necesitan auth — pasar directo
    return NextResponse.next({ request: { headers: reqHeaders } });
  }

  // ── COMPORTAMIENTO 2 ─────────────────────────────────────────
  // Admin (default para todo host que no sea cartelera).
  if (esAdmin) {
    if (esPantalla) {
      // En subdominio admin dedicado: 404. En dual (localhost/Vercel/dominio
      // único): las carteleras son públicas, pasar sin auth.
      if (!esDual) return new NextResponse(null, { status: 404 });
      return NextResponse.next({ request: { headers: reqHeaders } });
    }
    // ── COMPORTAMIENTO 3: auth ────────────────────────────────
    return handleAdminAuth(request, pathname, reqHeaders);
  }

  // (inalcanzable: esAdmin = !esCartelera cubre todos los hosts)
  return new NextResponse(null, { status: 404 });
}

async function handleAdminAuth(
  request: NextRequest,
  pathname: string,
  reqHeaders: Headers
): Promise<NextResponse> {
  // Respuesta base — propaga el header x-pathname a Server Components
  const response = NextResponse.next({ request: { headers: reqHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Actualizar cookies en la request y en la response (refresca la sesión)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() también refresca el token si está por vencer
  const { data: { user } } = await supabase.auth.getUser();

  const esLogin = pathname.startsWith("/login");

  // Sin sesión y no es la página de login → redirigir
  if (!user && !esLogin) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión y está en /login → redirigir al dashboard
  if (user && esLogin) {
    return NextResponse.redirect(new URL("/sabores", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Excluir assets estáticos y rutas de Next.js internas.
    // OJO: las carpetas públicas que usa la cartelera (placas/sabores/iconos)
    // deben quedar excluidas, si no el middleware las 404ea (cartelera) o las
    // manda a /login (admin/localhost).
    "/((?!_next/static|_next/image|favicon.ico|icon-|apple-touch-icon|sw\\.js|canvas/|placas/|sabores/|iconos/|manifest\\.webmanifest|.*\\.(?:png|PNG|jpg|jpeg|svg|webp)$).*)",
  ],
};
