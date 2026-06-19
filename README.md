# Cartelería Kaikén

Sistema de cartelería digital para la heladería/cafetería Kaikén: panel admin PWA + 5 pantallas fullscreen en TV, sincronizadas en tiempo real vía Supabase Realtime.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind v4 + shadcn/ui (solo admin) |
| Base de datos | Supabase (Postgres + Auth + Realtime + Storage) |
| Validación | Zod v4 |
| Tests | Vitest |
| Deploy | Vercel |

---

## Las 5 pantallas

| ID | Orientación | Pulgadas | Template | Qué muestra |
|---|---|---|---|---|
| 1 | Vertical (9:16) | 50" | `rotativa` | Promos, gusto del día, novedad y productos (11 placas) |
| 2 | Horizontal (16:9) | 43" | `sabores-clasicos-especiales` | Sabores Clásicos (5 col) + Especiales (3×3) |
| 3 | Horizontal (16:9) | 43" | `tamanos-postres` | Tamaños (vasos/kilos) + Postres Helados |
| 4 | Horizontal (16:9) | 43" | `cafeteria-pasteleria` | Cafetería + Pastelería |
| 5 | Vertical (9:16) | 50" | `rotativa` | Entretenimiento: Seguinos + QR + videos (los sube el dueño) |

Cada placa vertical se calcula por reloj + desfase (`pantallas.config.desfase_segundos`). El reparto de placas por pantalla se define en la tabla `placas_fijas`.

Para ver una pantalla: `http://localhost:3000/pantalla/[1-5]` en pantalla completa.

### Las 13 placas verticales (slugs)

```
antojo-de-tarde       PlacaAntojoDeTarde      (video + precio editable)
promo-especial        PlacaPromoEspecial      (video + texto editable)
despues-cole-tostado  PlacaDespuesColeTostado (video + precio editable)
despues-cole-budin    PlacaDespuesColeBudin   (video + precio editable)
cuartos               PlacaCuartos            (video estático)
diez-off              PlacaDiezOff            (video estático)
kilo-kaiken           PlacaKiloKaiken         (video estático)
gusto-del-dia         PlacaGustoDelDia        (video + sabor editable)
novedad-del-mes       PlacaNovedadDelMes      (video + novedad editable)
qr-delivery           PlacaQRDelivery         (video estático)
seguinos              PlacaSeguinos           (video estático)
affogato              PlacaAffogato           (video estático)
frappuccino           PlacaFrappuccino        (video estático)
```

Cada placa es un video MP4 (1080×1920, ~10s, con animación de entrada/salida) en `public/placas/<slug>.mp4`. El texto editable (precio, gusto del día, etc.) se superpone por código y se carga desde el admin. Entre placa y placa hay un crossfade ("fusión") de 900ms.

Además, el dueño puede subir **placas personalizadas** desde `/placas` en el admin — **imágenes (JPG/PNG ≤5MB) o videos (MP4/WEBM ≤50MB)**, verticales 9:16 — que se suman a la rotación. Así, cuando estén los videos de entretenimiento de P5, los sube él mismo.

### Debug en pantalla

Presionar `D` cinco veces seguidas para abrir/cerrar el panel de debug (ID, template, orientación/desfase, conteos de productos y placas).

---

## Arquitectura de subdominios

```
admin.kaiken.com               →  panel de administración (PWA, autenticado)
cartelera.kaiken.com/pantalla/[id]  →  pantallas de TV (públicas, fullscreen)
```

El middleware separa los subdominios por host. En desarrollo, ambas rutas conviven en `localhost:3000` (las `/pantalla/*` son públicas; el resto pide login).

---

## Variables de entorno

Crear `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=       # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Anon key (pública, segura en cliente)
SUPABASE_SERVICE_ROLE_KEY=      # Solo para scripts/operaciones privilegiadas
DATABASE_URL=                   # postgres://... (transaction pooler) para los scripts
NEXT_PUBLIC_ADMIN_HOST=admin.kaiken.com
NEXT_PUBLIC_CARTELERA_HOST=cartelera.kaiken.com
```

Para correr la **cartelera** en local alcanza con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SERVICE_ROLE_KEY` y `DATABASE_URL` solo hacen falta para los scripts.

---

## Setup inicial

### 1. Dependencias

```bash
npm install
```

### 2. Base de datos

En el **SQL Editor** de Supabase, pegar y correr todo `supabase/all-in-one.sql`. Crea:
- Esquema (tablas, enums, trigger, índices)
- RLS (lectura pública / escritura autenticada)
- Realtime (publicación en las tablas)
- Bucket de Storage `placas-personalizadas`
- Seed real de Kaikén (12 categorías, 77 productos con precio en `null`, 5 pantallas, 3 promos, 26 placas fijas)

El script empieza con un bloque **RESET** idempotente, así se puede re-correr sin conflictos (no hay datos reales que perder hasta que el dueño cargue precios).

> Alternativa por scripts (requiere `DATABASE_URL`): `npm run db:migrate:seed`.

### 3. Storage

El bucket `placas-personalizadas` (público) se crea desde `all-in-one.sql`. Si tu SQL Editor no tiene permisos sobre `storage.objects`, crealo a mano en **Dashboard → Storage → New bucket** (nombre `placas-personalizadas`, **Public**).

### 4. Usuario admin

1. Dashboard → **Authentication → Users → Add user** (email + contraseña).
2. SQL Editor → correr `supabase/create-admin-user.sql` con el email editado (le asigna el rol `admin`).

### 5. Correr en local

```bash
npm run dev
```

- Cartelera: `http://localhost:3000/pantalla/1` … `/pantalla/5`
- Admin: `http://localhost:3000/sabores` (redirige a login)

---

## Escalado proporcional (`pxV` / `pxH`)

Los diseños están pensados sobre una resolución base (verticales 1080×1920, horizontales 1920×1080). Para que escalen a cualquier TV, los tamaños en px de diseño se convierten a `vw` con helpers en `lib/cartelera/tokens.ts`:

```ts
pxV(60)  // vertical:   60 / 1080 * 100 = "5.56vw"
pxH(48)  // horizontal: 48 / 1920 * 100 = "2.5vw"
```

Así, una tipografía de "60px en el diseño vertical" ocupa siempre la misma proporción de pantalla, sin importar el tamaño real del TV. Los colores de marca también están centralizados en `tokens.ts` (`COLORS.verde`, `violeta`, `rosa`, etc.).

---

## Reemplazar placeholders por assets reales

Buscar `TODO` para encontrarlos: `grep -rn "TODO" lib components supabase`

| Qué | Dónde | Estado |
|---|---|---|
| Colores / pesos de marca | `lib/cartelera/tokens.ts` | reales |
| Videos de las 13 placas | `public/placas/<slug>.mp4` | reales |
| Potecitos de sabores especiales | `public/sabores/<slug>.png` | reales |
| Íconos de vasos y kilos | `public/iconos/<slug>.png` | reales |
| Posición del texto editable sobre cada placa | `topPct` en `components/cartelera/placas/Placa*.tsx` | **ajustar viendo el video** |
| Recortar fondo negro de los potecitos | `public/sabores/*.png` | pendiente (se ven sobre crema en P2) |
| Precios | se cargan desde el admin | pendiente |

Los placeholders de `public/sabores` y `public/iconos` se generan con `npm run generate:placeholders` (no pisa archivos que ya existen).

---

## Scripts

```bash
npm run dev                  # Servidor de desarrollo (Turbopack)
npm run build                # Build de producción
npm run lint                 # ESLint
npm test                     # Tests unitarios (Vitest)
npm run db:migrate:seed      # Migraciones + seed (requiere DATABASE_URL)
npm run db:types             # Regenera lib/supabase/database.types.ts
npm run generate:icons       # Íconos PNG del PWA
npm run generate:placeholders # Placeholders de sabores/íconos faltantes
```

---

## Estructura

```
app/
  (admin)/            # Panel admin (requiere auth)
    sabores/  cafeteria/  postres/   # CRUD de productos por sección
    promos/                          # 3 placas editables (gusto/novedad/promo)
    placas/                          # Placas fijas + personalizadas (upload)
    pantallas/  historial/
    login/
  pantalla/[id]/      # Cartelera fullscreen (pública)
  offline/            # Página offline del PWA

components/cartelera/
  PantallaCliente.tsx      # Marco por orientación + router de templates
  PantallaRotativa.tsx     # Rotación de placas (verticales) con desfase
  TituloConLineas.tsx      # Título decorativo reutilizable
  horizontales/            # Templates P2/P3/P4
  placas/                  # Las 13 placas (PlacaVideo) + PlacaPersonalizada

hooks/usePantallaData.ts   # Realtime + debounce + heartbeat + auto-reload 4am + debug + localStorage
lib/cartelera/             # tokens (colores/pxV/pxH), rotacion, validarImagen
lib/actions/               # Server Actions (productos, promos, placas)
supabase/                  # all-in-one.sql, migrations/, seed.sql, create-admin-user.sql
```

---

## Realtime

Cambio en admin → Server Action → `UPDATE`/`INSERT` en Postgres → Realtime notifica → `usePantallaData` hace refetch (debounce 800ms) → React re-renderiza. Tablas suscritas: `productos`, `promos`, `categorias`, `pantallas`, `placas_fijas`, `placas_personalizadas`.

El hook además: heartbeat 60s (estado online), auto-reload 4am (limpia memoria del TV), fallback a `localStorage`, y debug con `D×5`.

---

## Tests

```bash
npm test
```

Unitarios (Vitest): formato, validadores, **cálculo de índice de rotación con desfase** (incluye el caso "P1 y P5 nunca coinciden") y **validación de imágenes** de placas personalizadas.

Los E2E (cambiar precio → se ve en pantalla, etc.) requieren la base de datos cargada.

---

## Deploy en Vercel

1. Conectar el repo y agregar las variables de entorno.
2. Apuntar los dominios `admin.kaiken.com` y `cartelera.kaiken.com` al mismo proyecto.
3. El middleware enruta por host (`x-forwarded-host` en Vercel, `host` en local).
