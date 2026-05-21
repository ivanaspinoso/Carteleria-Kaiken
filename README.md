# Cartelería Kaiken

Sistema de cartelería digital para heladería: panel admin PWA + pantallas fullscreen en TV vía Supabase Realtime.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind v4 + shadcn/ui |
| Base de datos | Supabase (Postgres + Auth + Realtime + Storage) |
| Validación | Zod v4 |
| Tests | Vitest |
| Deploy | Vercel |

---

## Arquitectura de subdominios

```
admin.heladeria.com               →  panel de administración (PWA, autenticado)
carteleria.heladeria.com/pantalla/[id]  →  pantallas de TV (públicas, fullscreen)
```

El middleware de Next.js separa ambos subdominios: la cartelera sólo puede mostrar `/pantalla/*`, y el panel admin bloquea esa ruta.

En desarrollo, ambas rutas corren en `localhost:3000`.

---

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=       # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Anon key (segura en cliente)
SUPABASE_SERVICE_ROLE_KEY=      # Solo para scripts server-side (no exponer)
DATABASE_URL=                   # postgres://... para las migraciones
```

---

## Setup inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Aplicar base de datos

En el SQL Editor de Supabase, pegar el contenido de `supabase/all-in-one.sql`.

Esto aplica:
- Esquema: tablas, trigger, índices
- RLS: políticas de seguridad
- Realtime: publicación en las tablas necesarias
- Seed: datos de ejemplo (marcados `-- TODO: reemplazar`)

### 3. Crear el primer usuario admin

1. En el Dashboard de Supabase → Authentication → Users → "Invite user" con tu email.
2. En el SQL Editor, ejecutar `supabase/create-admin-user.sql` (con tu email ya editado).

### 4. Correr en local

```bash
npm run dev
```

Abrir `http://localhost:3000` → redirige a `/sabores`.

---

## Scripts disponibles

```bash
npm run dev              # Servidor de desarrollo (Turbopack)
npm run build            # Build de producción
npm run lint             # ESLint
npm test                 # Tests unitarios (Vitest)
npm run test:watch       # Tests en modo watch

npm run db:types         # Regenera lib/supabase/database.types.ts desde Supabase
npm run db:migrate       # Aplica migraciones (requiere DATABASE_URL)
npm run db:migrate:seed  # Aplica migraciones + seed
npm run test:rls         # Verifica que RLS funciona con la anon key
npm run generate:icons   # Regenera los íconos PNG del PWA
```

---

## Estructura del proyecto

```
app/
  (admin)/          # Layout con nav, requiere auth
    sabores/        # Gestión de helados
    cafeteria/      # Gestión de cafetería
    postres/        # Gestión de postres/combos
    promos/         # Gestión de promociones
    pantallas/      # Estado de pantallas (online/offline)
    historial/      # Log de cambios (solo admin)
  (auth)/
    login/          # Login con Supabase Auth
  pantalla/[id]/    # Cartelera fullscreen (pública)
  offline/          # Página offline del PWA

components/
  admin/            # Componentes del panel: ListaProductos, FilaProducto, etc.
  cartelera/        # Templates de pantalla: PantallaSabores, etc.

hooks/
  usePantallaData   # Realtime + heartbeat + debug + auto-refresh 4am

lib/
  actions/          # Server Actions (productos, promos)
  supabase/         # Clientes SSR y tipos generados
  format.ts         # Utilidades de formateo
  types.ts          # Tipos del dominio
  validators.ts     # Esquemas Zod

supabase/
  migrations/       # SQL por bloques
  all-in-one.sql    # Todo junto para el SQL Editor
  seed.sql          # Datos de ejemplo (ficticios)
  create-admin-user.sql

scripts/
  apply-migrations.mjs   # Aplica SQL via pg
  test-rls.mjs           # Test de políticas RLS
  generate-icons.mjs     # Genera iconos PNG del PWA
```

---

## Pantallas

| ID | Pulgadas | Template |
|---|---|---|
| 1 | 50" | sabores_grande |
| 2 | 50" | sabores_grande |
| 3 | 43" | sabores_fijo |
| 4 | 43" | cafeteria |
| 5 | 43" | postres |

Para ver una pantalla en el TV: abrir `http://localhost:3000/pantalla/1` (o el ID correspondiente) y poner en pantalla completa.

El estado online/offline se actualiza automáticamente cada 60 segundos en el panel Pantallas.

### Debug en pantalla

Presionar `D` cinco veces seguidas desde el teclado para abrir el panel de debug (ID, template, cantidad de productos, etc.). Repetir para cerrarlo.

---

## PWA

El panel admin es instalable como PWA en Android/iOS.

- Iconos: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- Regenerar iconos: `npm run generate:icons`
- Para personalizar: editar `scripts/generate-icons.mjs` con el logo real y ejecutar.

---

## Reemplazar con contenido real

Buscar `TODO` en el código para localizar todos los placeholders:

```bash
# Windows PowerShell
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.sql | Select-String "TODO"

# Linux/Mac
grep -r "TODO" --include="*.ts" --include="*.tsx" --include="*.sql" .
```

Los principales:
- `supabase/seed.sql` — reemplazar productos/categorías/promos ficticias
- `app/manifest.ts` — nombre real del negocio y colores de marca
- `app/layout.tsx` — título y descripción reales
- `components/cartelera/Pantalla*.tsx` — reemplazar fondo placeholder con `backgroundImage: "url('/canvas/X.png')"`
- `public/canvas/` — subir los PNG del diseño final (1920×1080)
- `public/icon-*.png` — regenerar con el logo real

### Canvases de diseño

Cada template espera un PNG en `public/canvas/`:

| Template | Archivo |
|---|---|
| sabores_grande / sabores_fijo | `canvas/sabores.png` |
| cafeteria | `canvas/cafeteria.png` |
| postres | `canvas/postres.png` |
| rotativa | `canvas/rotativa.png` |

Los datos se superponen como capa de texto sobre el canvas. Las posiciones se configuran en `pantallas.config.posiciones` en la DB (en `%` del ancho/alto de pantalla). Si se dejan vacíos, se usan posiciones por defecto.

---

## Realtime

Los cambios en el panel admin llegan a las carteleras en ≤ 2 segundos vía Supabase Realtime (WebSocket).

Flujo: cambio en admin → Server Action → `UPDATE` en Postgres → Realtime notifica a los clientes suscritos → hook `usePantallaData` hace refetch completo (con debounce de 800ms) → React re-renderiza.

---

## RLS

```bash
npm run test:rls
```

Verifica (12 checks) que con la anon key:
- `SELECT` en productos/categorías/promos/pantallas: ✓
- `UPDATE`/`DELETE` no modifican datos reales: ✓
- `INSERT` en logs: ✗ (requiere auth)
- `SELECT` en logs: ✗ (requiere rol admin en JWT)

---

## Deploy en Vercel

1. Conectar el repo en Vercel.
2. Agregar las variables de entorno en Settings → Environment Variables.
3. Configurar los dominios:
   - `admin.heladeria.com` → el mismo proyecto
   - `carteleria.heladeria.com` → el mismo proyecto
4. El middleware detecta el host y enruta correctamente.

> En Vercel, la detección de subdominio usa el header `x-forwarded-host`. En local usa `host`.
