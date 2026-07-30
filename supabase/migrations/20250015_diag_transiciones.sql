-- =============================================================
-- Telemetría TEMPORAL de las transiciones de placa (pantallas verticales).
--
-- Por qué existe: el destello negro entre placas NO se reproduce en Chromium de
-- escritorio, solo en las Smart TV del local. Pedir que alguien abra la pantalla
-- con ?diag=1 y filme no es práctico (el navegador del TV se maneja con control
-- remoto). Entonces la TV misma deja registrado cuánto tardó cada transición.
--
-- Solo se guardan las transiciones ANÓMALAS (hueco largo, error, corte) más una
-- de cada diez normales como referencia: son ~pocas filas por hora, no miles.
--
-- BORRAR CUANDO EL PROBLEMA ESTÉ RESUELTO:
--   drop table if exists public.diag_transiciones;
-- =============================================================

create table if not exists public.diag_transiciones (
  id               bigserial primary key,
  creado_en        timestamptz not null default now(),
  pantalla         integer     not null,
  slug             text        not null,
  -- Espera hasta tener el póster listo para tapar (red + decodificado).
  espera_poster_ms integer,
  -- Lo que el ojo ve quieto: desde que el póster tapa hasta que el video pinta.
  hueco_ms         integer,
  -- Del pedido del mp4 hasta el primer cuadro pintado.
  carga_ms         integer,
  -- Si el mp4 salió de memoria (blob) o hubo que ir a la red.
  desde_blob       boolean,
  -- Eventos del <video> durante la transición: waiting, stalled, error…
  eventos          text,
  -- El video terminó antes que la placa y volvió a arrancar.
  repitio          boolean
);

create index if not exists diag_transiciones_creado_en_idx
  on public.diag_transiciones (creado_en desc);

alter table public.diag_transiciones enable row level security;

-- Las carteleras corren sin sesión (anon): necesitan poder insertar. Es una
-- tabla de diagnóstico, sin datos del negocio; lo peor que puede pasar es que
-- alguien con la anon key (que viaja en el bundle) meta filas de más.
drop policy if exists "diag insert anon" on public.diag_transiciones;
create policy "diag insert anon"
  on public.diag_transiciones for insert
  to anon, authenticated
  with check (true);

-- Lectura también con anon, a propósito: así el diagnóstico se puede consultar
-- con la anon key desde afuera, sin tener que entrar al Dashboard cada vez. La
-- tabla no tiene nada del negocio — nombre de placa y milisegundos.
drop policy if exists "diag select anon" on public.diag_transiciones;
create policy "diag select anon"
  on public.diag_transiciones for select
  to anon, authenticated
  using (true);
