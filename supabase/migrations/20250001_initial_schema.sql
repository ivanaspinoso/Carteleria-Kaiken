-- =============================================================
-- MIGRACIÓN 001: Esquema inicial
-- Sistema de cartelería digital — heladería/cafetería
-- =============================================================

-- Enums
CREATE TYPE tipo_categoria AS ENUM ('helado', 'cafeteria', 'postre', 'combo');
CREATE TYPE tipo_promo     AS ENUM ('sabor_semana', 'combo', 'mensaje');
CREATE TYPE template_pantalla AS ENUM (
  'cafeteria',
  'sabores_grande',
  'sabores_fijo',
  'postres',
  'rotativa'
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
  descripcion  text,
  precio       numeric(10,2),          -- nullable: algunos items sin precio individual
  precio_alt   numeric(10,2),          -- precio alternativo (ej: precio x kilo)
  unidad       text,                   -- "kg", "u", "porción", etc.
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
