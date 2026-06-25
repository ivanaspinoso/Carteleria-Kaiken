-- =============================================================
-- RESET (idempotente) — permite re-correr este script desde cero
-- Borra los objetos previos del proyecto. No hay datos reales que perder
-- (los precios los carga el dueño después). Si NO querés resetear, borrá
-- este bloque.
-- =============================================================
DROP TABLE IF EXISTS placas_personalizadas, placas_fijas, logs, promos, productos, categorias, pantallas CASCADE;
DROP TYPE IF EXISTS tipo_categoria, tipo_promo, template_pantalla CASCADE;
DROP POLICY IF EXISTS "placas_pers_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "placas_pers_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "placas_pers_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "placas_pers_storage_delete" ON storage.objects;

-- =============================================================
-- MIGRACIÓN 001: Esquema inicial
-- Sistema de cartelería digital — heladería/cafetería
-- =============================================================

-- Enums
-- 'helado' y 'combo' quedan por compatibilidad; los reales son los nuevos
CREATE TYPE tipo_categoria AS ENUM (
  'helado', 'cafeteria', 'postre', 'combo',
  'helado-clasico', 'helado-especial', 'tamano', 'pasteleria'
);
-- 'sabor_semana' y 'combo' quedan por compatibilidad; los reales de Kaikén
-- son sabor_dia / novedad_mes / promo_especial (las 3 placas editables).
CREATE TYPE tipo_promo     AS ENUM (
  'sabor_semana', 'combo', 'mensaje',
  'sabor_dia', 'novedad_mes', 'promo_especial'
);
CREATE TYPE template_pantalla AS ENUM (
  -- Templates viejos (ficticios) — quedan por compatibilidad, ya no se usan
  'cafeteria',
  'sabores_grande',
  'sabores_fijo',
  'postres',
  -- Templates reales de Kaikén
  'rotativa',                     -- verticales 1 y 5
  'sabores-clasicos-especiales',  -- horizontal 2
  'tamanos-postres',              -- horizontal 3
  'cafeteria-pasteleria'          -- horizontal 4
);

-- ----------------------------------------------------------
-- categorias
-- ----------------------------------------------------------
CREATE TABLE categorias (
  id      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  text        NOT NULL,
  tipo    tipo_categoria NOT NULL,
  orden   integer     NOT NULL DEFAULT 0,
  activa  boolean     NOT NULL DEFAULT true
);

-- ----------------------------------------------------------
-- productos
-- ----------------------------------------------------------
CREATE TABLE productos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid        NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  nombre       text        NOT NULL,
  slug         text,                   -- id estable opcional (ej. 'kilo-kaiken') para vincular placas sin depender del nombre editable
  descripcion  text,
  precio       numeric(10,2),          -- nullable: algunos items sin precio individual
  precio_alt   numeric(10,2),          -- precio alternativo (ej: Chico / Grande)
  unidad       text,                   -- "kg", "u", volumen ("240ml"), etc.
  imagen_url   text,                   -- potecitos de especiales / íconos; null = render por código
  gustos_incluidos jsonb,              -- lista de sabores incluidos (ej. Kilo Kaikén)
  en_stock     boolean     NOT NULL DEFAULT true,
  destacado    boolean     NOT NULL DEFAULT false,
  orden        integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at automático en productos
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------
-- promos
-- ----------------------------------------------------------
CREATE TABLE promos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        tipo_promo  NOT NULL,
  titulo      text        NOT NULL,
  contenido   text,
  producto_id uuid        REFERENCES productos(id) ON DELETE SET NULL,
  precio      numeric(10,2),          -- precio editable de la Promo Especial
  activa      boolean     NOT NULL DEFAULT true,
  orden       integer     NOT NULL DEFAULT 0,
  inicio      timestamptz,
  fin         timestamptz
);

-- ----------------------------------------------------------
-- pantallas
-- 5 pantallas fijas: IDs 1..5
-- ----------------------------------------------------------
CREATE TABLE pantallas (
  id          integer     PRIMARY KEY CHECK (id BETWEEN 1 AND 5),
  nombre      text        NOT NULL,
  template    template_pantalla NOT NULL,
  pulgadas    integer     NOT NULL,
  orientacion text        NOT NULL DEFAULT 'horizontal'
                CHECK (orientacion IN ('horizontal', 'vertical')),
  config      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ultima_conex timestamptz,
  activa      boolean     NOT NULL DEFAULT true
);

-- ----------------------------------------------------------
-- logs de auditoría
-- ----------------------------------------------------------
CREATE TABLE logs (
  id          bigserial   PRIMARY KEY,
  usuario_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accion      text        NOT NULL, -- 'update', 'insert', 'toggle_stock', etc.
  tabla       text        NOT NULL,
  registro_id text        NOT NULL,
  antes       jsonb,
  despues     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices útiles para queries frecuentes
CREATE INDEX productos_categoria_id_idx ON productos(categoria_id);
CREATE INDEX productos_en_stock_idx     ON productos(en_stock);
CREATE INDEX promos_tipo_activa_idx     ON promos(tipo, activa);
CREATE INDEX logs_usuario_id_idx        ON logs(usuario_id);
CREATE INDEX logs_created_at_idx        ON logs(created_at DESC);


-- =============================================================
-- MIGRACIÓN 002: Row Level Security
-- =============================================================
-- MODELO DE SEGURIDAD:
--   • categorias, productos, promos, pantallas:
--       - SELECT público (anon + authenticated) — la cartelera no tiene login
--       - INSERT/UPDATE/DELETE solo autenticados
--   • logs:
--       - SELECT solo para rol 'admin' (vía JWT user_metadata)
--       - INSERT para autenticados (lo hacen las Server Actions del admin)
--       - UPDATE/DELETE: nadie

-- ----------------------------------------------------------
-- Habilitar RLS en todas las tablas
-- ----------------------------------------------------------
ALTER TABLE categorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantallas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs        ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- CATEGORIAS
-- ----------------------------------------------------------
CREATE POLICY "categorias_select_public"
  ON categorias FOR SELECT
  USING (true);

CREATE POLICY "categorias_insert_auth"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "categorias_update_auth"
  ON categorias FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Soft delete: nunca DELETE real, se setea activa=false
-- Pero por si acaso, solo autenticados
CREATE POLICY "categorias_delete_auth"
  ON categorias FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- PRODUCTOS
-- ----------------------------------------------------------
CREATE POLICY "productos_select_public"
  ON productos FOR SELECT
  USING (true);

CREATE POLICY "productos_insert_auth"
  ON productos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "productos_update_auth"
  ON productos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "productos_delete_auth"
  ON productos FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- PROMOS
-- ----------------------------------------------------------
CREATE POLICY "promos_select_public"
  ON promos FOR SELECT
  USING (true);

CREATE POLICY "promos_insert_auth"
  ON promos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "promos_update_auth"
  ON promos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "promos_delete_auth"
  ON promos FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- PANTALLAS
-- ----------------------------------------------------------
CREATE POLICY "pantallas_select_public"
  ON pantallas FOR SELECT
  USING (true);

CREATE POLICY "pantallas_insert_auth"
  ON pantallas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "pantallas_update_auth"
  ON pantallas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Pantallas no se borran nunca (activa=false para "desactivar")
CREATE POLICY "pantallas_delete_auth"
  ON pantallas FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- LOGS — solo admin puede leer; autenticados pueden insertar
-- ----------------------------------------------------------
-- Historial visible para cualquier usuario autenticado del admin (el sistema
-- lo usa un solo dueño; un gate admin-only por JWT lo dejaba siempre vacío).
CREATE POLICY "logs_select_auth"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "logs_insert_auth"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id
  );

-- Nadie puede UPDATE ni DELETE logs (inmutables)


-- =============================================================
-- MIGRACIÓN 003: Habilitar Realtime
-- =============================================================
-- Supabase Realtime usa la publication "supabase_realtime".
-- Agregamos las tablas que necesitan sincronización en tiempo real.

ALTER PUBLICATION supabase_realtime ADD TABLE productos;
ALTER PUBLICATION supabase_realtime ADD TABLE promos;
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE pantallas;

-- logs no necesita realtime (solo lectura de historial)


-- =============================================================
-- MIGRACIÓN 008: Placas fijas de las verticales (rotación)
-- =============================================================
CREATE TABLE placas_fijas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pantalla_id   int NOT NULL REFERENCES pantallas(id) ON DELETE CASCADE,
  slug          text NOT NULL,
  nombre        text NOT NULL,
  componente    text NOT NULL,
  orden         int NOT NULL DEFAULT 0,
  duracion      int NOT NULL DEFAULT 10,
  activa        boolean NOT NULL DEFAULT true,
  inicio        timestamptz,
  fin           timestamptz,
  config        jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  UNIQUE (pantalla_id, slug)
);

CREATE INDEX idx_placas_fijas_rotacion
  ON placas_fijas (pantalla_id, orden) WHERE activa = true;

ALTER TABLE placas_fijas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura publica placas fijas" ON placas_fijas
  FOR SELECT USING (true);
CREATE POLICY "escritura auth placas fijas" ON placas_fijas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE placas_fijas;


-- =============================================================
-- MIGRACIÓN 009: Placas personalizadas (suben los clientes) + Storage
-- =============================================================
CREATE TABLE placas_personalizadas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pantalla_id   int NOT NULL REFERENCES pantallas(id) ON DELETE CASCADE,
  imagen_url    text NOT NULL,
  imagen_path   text NOT NULL,
  poster_url    text,            -- primer frame (video): tapa el hueco de carga sin negro
  poster_path   text,
  nombre        text NOT NULL,
  orden         int NOT NULL DEFAULT 0,
  duracion      int NOT NULL DEFAULT 10,
  activa        boolean NOT NULL DEFAULT true,
  inicio        timestamptz,
  fin           timestamptz,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_placas_personalizadas
  ON placas_personalizadas (pantalla_id, orden) WHERE activa = true;

ALTER TABLE placas_personalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura publica placas personalizadas" ON placas_personalizadas
  FOR SELECT USING (true);
CREATE POLICY "escritura auth placas personalizadas" ON placas_personalizadas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE placas_personalizadas;

-- Storage: bucket 'placas-personalizadas' (lectura pública, escritura auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('placas-personalizadas', 'placas-personalizadas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "placas_pers_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'placas-personalizadas');
CREATE POLICY "placas_pers_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'placas-personalizadas');
CREATE POLICY "placas_pers_storage_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'placas-personalizadas');
CREATE POLICY "placas_pers_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'placas-personalizadas');


-- =============================================================
-- SEED DE DATOS DE PRUEBA — HELADERÍA FICTICIA
-- =============================================================
-- ⚠️  TODO: REEMPLAZAR CON DATOS REALES DEL NEGOCIO
-- ⚠️  Todos los nombres, precios y descripciones son FICTICIOS.
-- ⚠️  Sirven solo para verificar que el sistema funciona.
-- ⚠️  Buscar "TODO: reemplazar" para encontrar todos los puntos.
-- =============================================================

-- Limpiar datos previos (para re-runs del seed)
TRUNCATE TABLE logs, promos, productos, categorias, pantallas RESTART IDENTITY CASCADE;

-- =============================================================
-- PANTALLAS REALES DE KAIKÉN (5 fijas, IDs 1..5)
--   1 (vertical, 50")  — rotativa con 13 placas, desfase 0s
--   2 (horizontal, 43") — Sabores Clásicos + Especiales
--   3 (horizontal, 43") — Tamaños + Postres Helados
--   4 (horizontal, 43") — Cafetería + Pastelería
--   5 (vertical, 50")  — mismas 13 placas que P1, desfase 30s
-- =============================================================
INSERT INTO pantallas (id, nombre, template, pulgadas, orientacion, config, activa) VALUES
(1, 'Vertical Izquierda',            'rotativa',                    50, 'vertical',   '{"desfase_segundos": 0}'::jsonb,  true),
(2, 'Sabores Clásicos + Especiales', 'sabores-clasicos-especiales', 43, 'horizontal', '{}'::jsonb,                       true),
(3, 'Tamaños + Postres Helados',     'tamanos-postres',             43, 'horizontal', '{}'::jsonb,                       true),
(4, 'Cafetería + Pastelería',        'cafeteria-pasteleria',        43, 'horizontal', '{}'::jsonb,                       true),
(5, 'Vertical Derecha',              'rotativa',                    50, 'vertical',   '{"desfase_segundos": 30}'::jsonb, true);

-- =============================================================
-- CATEGORÍAS REALES DE KAIKÉN
-- =============================================================
INSERT INTO categorias (id, nombre, tipo, orden, activa) VALUES
-- Helados clásicos (Pantalla 2)
('11111111-1111-1111-1111-000000000001', 'Cremas',            'helado-clasico',  1, true),
('11111111-1111-1111-1111-000000000002', 'Chocolate',         'helado-clasico',  2, true),
('11111111-1111-1111-1111-000000000003', 'Frutales',          'helado-clasico',  3, true),
('11111111-1111-1111-1111-000000000004', 'Dulce de Leche',    'helado-clasico',  4, true),
('11111111-1111-1111-1111-000000000005', 'Sin Azúcar',        'helado-clasico',  5, true),
-- Helados especiales (Pantalla 2)
('22222222-2222-2222-2222-000000000001', 'Sabores Especiales','helado-especial', 1, true),
-- Tamaños (Pantalla 3)
('33333333-3333-3333-3333-000000000001', 'Vasos',             'tamano',          1, true),
('33333333-3333-3333-3333-000000000002', 'Kilos',             'tamano',          2, true),
('33333333-3333-3333-3333-000000000003', 'Kilos Especiales',  'tamano',          3, true),
-- Postres helados (Pantalla 3)
('44444444-4444-4444-4444-000000000001', 'Postres Helados',   'postre',          1, true),
-- Cafetería (Pantalla 4)
('55555555-5555-5555-5555-000000000001', 'Cafetería',         'cafeteria',       1, true),
-- Pastelería (Pantalla 4)
('66666666-6666-6666-6666-000000000001', 'Pastelería',        'pasteleria',      1, true);

-- =============================================================
-- PRODUCTOS REALES DE KAIKÉN
-- TODO: precios reales pendientes (precio / precio_alt en null)
-- TODO: imagen real pendiente (imagen_url apunta a placeholders)
-- Columnas: categoria_id, nombre, descripcion, precio, precio_alt, unidad, imagen_url, en_stock, destacado, orden
-- =============================================================
INSERT INTO productos (categoria_id, nombre, descripcion, precio, precio_alt, unidad, imagen_url, en_stock, destacado, orden) VALUES

-- ===== HELADOS CLÁSICOS — Cremas =====
('11111111-1111-1111-1111-000000000001', 'Vainilla',         null, null, null, null, null, true, false, 1),
('11111111-1111-1111-1111-000000000001', 'Oreo',             null, null, null, null, null, true, false, 2),
('11111111-1111-1111-1111-000000000001', 'Crema del Cielo',  null, null, null, null, null, true, false, 3),
('11111111-1111-1111-1111-000000000001', 'Almendrado',       null, null, null, null, null, true, false, 4),
('11111111-1111-1111-1111-000000000001', 'Americana',        null, null, null, null, null, true, false, 5),
('11111111-1111-1111-1111-000000000001', 'Menta Granizada',  null, null, null, null, null, true, false, 6),
('11111111-1111-1111-1111-000000000001', 'Sambayón',         null, null, null, null, null, true, false, 7),
('11111111-1111-1111-1111-000000000001', 'Mascarpone',       null, null, null, null, null, true, false, 8),

-- ===== HELADOS CLÁSICOS — Chocolate =====
('11111111-1111-1111-1111-000000000002', 'Clásico',             null, null, null, null, null, true, false, 1),
('11111111-1111-1111-1111-000000000002', 'Blanco',              null, null, null, null, null, true, false, 2),
('11111111-1111-1111-1111-000000000002', 'Cacao 80%',           null, null, null, null, null, true, false, 3),
('11111111-1111-1111-1111-000000000002', 'Volcán de Chocolate', null, null, null, null, null, true, false, 4),
('11111111-1111-1111-1111-000000000002', 'Kaikén',              null, null, null, null, null, true, false, 5),

-- ===== HELADOS CLÁSICOS — Frutales =====
('11111111-1111-1111-1111-000000000003', 'Limón',              null, null, null, null, null, true, false, 1),
('11111111-1111-1111-1111-000000000003', 'Mandarina',          null, null, null, null, null, true, false, 2),
('11111111-1111-1111-1111-000000000003', 'Pera',               null, null, null, null, null, true, false, 3),
('11111111-1111-1111-1111-000000000003', 'Melón',              null, null, null, null, null, true, false, 4),
('11111111-1111-1111-1111-000000000003', 'Frutilla al agua',   null, null, null, null, null, true, false, 5),
('11111111-1111-1111-1111-000000000003', 'Frutilla a la crema',null, null, null, null, null, true, false, 6),
('11111111-1111-1111-1111-000000000003', 'Sandía',             null, null, null, null, null, true, false, 7),

-- ===== HELADOS CLÁSICOS — Dulce de Leche =====
('11111111-1111-1111-1111-000000000004', 'Clásico',     null, null, null, null, null, true, false, 1),
('11111111-1111-1111-1111-000000000004', 'Granizado',   null, null, null, null, null, true, false, 2),
('11111111-1111-1111-1111-000000000004', 'Colonial',    null, null, null, null, null, true, false, 3),
('11111111-1111-1111-1111-000000000004', 'Con Brownie', null, null, null, null, null, true, false, 4),
('11111111-1111-1111-1111-000000000004', 'Con Bombón',  null, null, null, null, null, true, false, 5),

-- ===== HELADOS CLÁSICOS — Sin Azúcar =====
('11111111-1111-1111-1111-000000000005', 'Frutilla',        null, null, null, null, null, true, false, 1),
('11111111-1111-1111-1111-000000000005', 'Durazno',         null, null, null, null, null, true, false, 2),
('11111111-1111-1111-1111-000000000005', 'Dulce de Leche',  null, null, null, null, null, true, false, 3),
('11111111-1111-1111-1111-000000000005', 'Americana',       null, null, null, null, null, true, false, 4),
('11111111-1111-1111-1111-000000000005', 'Chocolate',       null, null, null, null, null, true, false, 5),

-- ===== SABORES ESPECIALES (con descripción + imagen placeholder) =====
('22222222-2222-2222-2222-000000000001', 'Frambuesa Patagónica', 'Frambuesa a la crema con frambuesas bañadas en choco blanco y negro', null, null, null, '/sabores/frambuesa-patagonica.png', true, false, 1),
('22222222-2222-2222-2222-000000000001', 'Volcán de Chocolate',  'Chocolate con frutos rojos y torta volcán',                          null, null, null, '/sabores/volcan-chocolate.png',     true, false, 2),
('22222222-2222-2222-2222-000000000001', 'Vainilla Kaikén',      'Vainilla con dulce de leche natural y almendras garrapiñadas',       null, null, null, '/sabores/vainilla-kaiken.png',      true, false, 3),
('22222222-2222-2222-2222-000000000001', 'Pistacho',             'Pistacho a la crema con pistachos tostados en trozos',               null, null, null, '/sabores/pistacho.png',             true, false, 4),
('22222222-2222-2222-2222-000000000001', 'Chocorock',            'Chocolate con cucuruchos bañados en chocolate y dulce de leche natural', null, null, null, '/sabores/chocorock.png',        true, false, 5),
('22222222-2222-2222-2222-000000000001', 'Raffaelo',             'Chocolate blanco con coco y crocante de almendras',                  null, null, null, '/sabores/raffaelo.png',             true, false, 6),
('22222222-2222-2222-2222-000000000001', 'Pavlova',              'Crema americana con frutos rojos y merengue',                        null, null, null, '/sabores/pavlova.png',              true, false, 7),
('22222222-2222-2222-2222-000000000001', 'Marquise',             'Chocolate con dulce de leche natural y merengue italiano',           null, null, null, '/sabores/marquise.png',             true, false, 8),
('22222222-2222-2222-2222-000000000001', 'ChocoMenta',           'Chocolate semi amargo con menta fresca',                             null, null, null, '/sabores/chocomenta.png',           true, false, 9),

-- ===== TAMAÑOS — Vasos (íconos placeholder) =====
('33333333-3333-3333-3333-000000000001', 'Grande',     null, null, null, null, '/iconos/vaso-grande.png',   true, false, 1),
('33333333-3333-3333-3333-000000000001', 'Mediano',    null, null, null, null, '/iconos/vaso-mediano.png',  true, false, 2),
('33333333-3333-3333-3333-000000000001', 'Chico',      null, null, null, null, '/iconos/vaso-chico.png',    true, false, 3),
('33333333-3333-3333-3333-000000000001', 'Cucurucho',  null, null, null, null, '/iconos/cucurucho.png',     true, false, 4),
('33333333-3333-3333-3333-000000000001', 'Milkshake',  null, null, null, null, '/iconos/milkshake.png',     true, false, 5),

-- ===== TAMAÑOS — Kilos (íconos placeholder) =====
('33333333-3333-3333-3333-000000000002', '1 Kilo',     null, null, null, null, '/iconos/kilo.png',        true, false, 1),
('33333333-3333-3333-3333-000000000002', '1/2 Kilo',   null, null, null, null, '/iconos/medio-kilo.png',  true, false, 2),
('33333333-3333-3333-3333-000000000002', '1/4 Kilo',   null, null, null, null, '/iconos/cuarto-kilo.png', true, false, 3),

-- ===== TAMAÑOS — Kilos Especiales (sin imagen, solo texto) =====
('33333333-3333-3333-3333-000000000003', 'Kilo Kaikén',   null, null, null, null, null, true, false, 1),
('33333333-3333-3333-3333-000000000003', 'Kilo Pistacho', null, null, null, null, null, true, false, 2),

-- ===== POSTRES HELADOS (algunos con precio_alt para Chico / Grande) =====
('44444444-4444-4444-4444-000000000001', 'Bombón degustación x6',         null, null, null, null, null, true, false, 1),
('44444444-4444-4444-4444-000000000001', 'Bombón x1',                     null, null, null, null, null, true, false, 2),
('44444444-4444-4444-4444-000000000001', 'Torta Pistacchio',             null, null, null, null, null, true, false, 3),
('44444444-4444-4444-4444-000000000001', 'Tronco Choco y Dulce de leche', null, null, null, null, null, true, false, 4),
('44444444-4444-4444-4444-000000000001', 'Tronco Americana y Frutilla',   null, null, null, null, null, true, false, 5),
-- los siguientes soportan precio_alt (Chico / Grande); el dueño carga ambos precios
('44444444-4444-4444-4444-000000000001', 'Almendrado',        null, null, null, null, null, true, false, 6),
('44444444-4444-4444-4444-000000000001', 'Barra Patagónica',  null, null, null, null, null, true, false, 7),
('44444444-4444-4444-4444-000000000001', 'Cheesecake',        null, null, null, null, null, true, false, 8),
('44444444-4444-4444-4444-000000000001', 'Oreo',              null, null, null, null, null, true, false, 9),
('44444444-4444-4444-4444-000000000001', 'Postre Kaikén',     null, null, null, null, null, true, false, 10),

-- ===== CAFETERÍA (volumen en `unidad`) =====
('55555555-5555-5555-5555-000000000001', 'Expresso',       null, null, null, '30ml',  null, true, false, 1),
('55555555-5555-5555-5555-000000000001', 'Expreso doble',  null, null, null, '60ml',  null, true, false, 2),
('55555555-5555-5555-5555-000000000001', 'Americano',      null, null, null, '240ml', null, true, false, 3),
('55555555-5555-5555-5555-000000000001', 'Lungo',          null, null, null, '60ml',  null, true, false, 4),
('55555555-5555-5555-5555-000000000001', 'Cortado',        null, null, null, '30ml',  null, true, false, 5),
('55555555-5555-5555-5555-000000000001', 'Mocca',          null, null, null, '160ml', null, true, false, 6),
('55555555-5555-5555-5555-000000000001', 'Latte',          null, null, null, '240ml', null, true, false, 7),
('55555555-5555-5555-5555-000000000001', 'Flat White',     null, null, null, '180ml', null, true, false, 8),
('55555555-5555-5555-5555-000000000001', 'Frappuccino',    null, null, null, '280ml', null, true, false, 9),
('55555555-5555-5555-5555-000000000001', 'Affogato',       null, null, null, '30ml',  null, true, false, 10),

-- ===== PASTELERÍA =====
('66666666-6666-6666-6666-000000000001', 'Medialuna',                null, null, null, null, null, true, false, 1),
('66666666-6666-6666-6666-000000000001', 'Medialuna c/jamón y queso',null, null, null, null, null, true, false, 2),
('66666666-6666-6666-6666-000000000001', 'Galletita Tentación',      null, null, null, null, null, true, false, 3),
('66666666-6666-6666-6666-000000000001', 'Porción de Budín',         null, null, null, null, null, true, false, 4),
('66666666-6666-6666-6666-000000000001', 'HavaTart',                 null, null, null, null, null, true, false, 5),
('66666666-6666-6666-6666-000000000001', 'Brownies',                 null, null, null, null, null, true, false, 6),
('66666666-6666-6666-6666-000000000001', 'Cookie NY',                null, null, null, null, null, true, false, 7),
('66666666-6666-6666-6666-000000000001', 'Cookie Pistacho',          null, null, null, null, null, true, false, 8);

-- Gustos incluidos del Kilo Kaikén: arrancan vacíos; el dueño los elige desde
-- el admin (multi-select de sabores clásicos). No se hardcodean acá para evitar
-- valores que no coincidan con los nombres reales de los productos.

-- Slug estable del Kilo Kaikén: vincula la placa vertical aunque renombren el
-- producto desde el admin (el código cae al nombre si falta el slug).
UPDATE productos SET slug = 'kilo-kaiken' WHERE nombre = 'Kilo Kaikén';

-- =============================================================
-- PROMOS EDITABLES DE KAIKÉN (las 3 placas con recuadro editable)
-- Arrancan inactivas y vacías; el dueño las completa desde /promos.
-- =============================================================
INSERT INTO promos (tipo, titulo, contenido, producto_id, activa, orden) VALUES
('sabor_dia',      'Gusto del día',   null, null, false, 1),
('novedad_mes',    'Novedad del mes', null, null, false, 2),
('promo_especial', 'Promo especial',  null, null, false, 3);

-- =============================================================
-- PLACAS FIJAS por pantalla (duracion=10s, activa=true por defecto)
--   P1 (primera): promos, menú y productos (todo menos seguinos/QR)
--   P5 (última):  entretenimiento — Seguinos + QR (+ los videos que se
--                 sumarán después, los sube el dueño desde el admin)
-- =============================================================
INSERT INTO placas_fijas (pantalla_id, slug, nombre, componente, orden) VALUES
-- Pantalla 1
(1, 'antojo-de-tarde',      'Antojo de Tarde',            'PlacaAntojoDeTarde',       1),
(1, 'promo-especial',       'Promo Especial',             'PlacaPromoEspecial',       2),
(1, 'despues-cole-tostado', 'Después del Cole (Tostado)', 'PlacaDespuesColeTostado',  3),
(1, 'despues-cole-budin',   'Después del Cole (Budín)',   'PlacaDespuesColeBudin',    4),
(1, 'cuartos',              'Cuartos',                    'PlacaCuartos',             5),
(1, 'diez-off',             '10% OFF',                    'PlacaDiezOff',             6),
(1, 'kilo-kaiken',          'Kilo Kaikén',                'PlacaKiloKaiken',          7),
(1, 'gusto-del-dia',        'Gusto del Día',              'PlacaGustoDelDia',         8),
(1, 'novedad-del-mes',      'Novedad del Mes',            'PlacaNovedadDelMes',       9),
(1, 'affogato',             'Affogato',                   'PlacaAffogato',           10),
(1, 'frappuccino',          'Frappuccino',                'PlacaFrappuccino',        11),
-- Pantalla 5
(5, 'seguinos',             'Seguinos en las Redes',      'PlacaSeguinos',            1),
(5, 'qr-delivery',          'QR Delivery',                'PlacaQRDelivery',          2);

-- =============================================================
-- Verificación final
-- =============================================================
DO $$
DECLARE
  v_cats    int;
  v_prods   int;
  v_promos  int;
  v_pant    int;
BEGIN
  SELECT COUNT(*) INTO v_cats   FROM categorias;
  SELECT COUNT(*) INTO v_prods  FROM productos;
  SELECT COUNT(*) INTO v_promos FROM promos;
  SELECT COUNT(*) INTO v_pant   FROM pantallas;

  RAISE NOTICE '=== SEED completado ===';
  RAISE NOTICE 'Categorías: %',  v_cats;
  RAISE NOTICE 'Productos:  %',  v_prods;
  RAISE NOTICE 'Promos:     %',  v_promos;
  RAISE NOTICE 'Pantallas:  %',  v_pant;
  RAISE NOTICE '=======================';
END;
$$;
