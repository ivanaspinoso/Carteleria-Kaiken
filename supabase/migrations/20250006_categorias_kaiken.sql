-- =============================================================
-- MIGRACIÓN 006: Modelo de categorías real de Kaikén + imagen_url
-- =============================================================
-- Nuevos tipos de categoría que refleja la estructura real:
--   helado-clasico, helado-especial, tamano, pasteleria
-- (cafeteria y postre ya existían; helado y combo quedan sin uso
--  pero se mantienen en el enum por compatibilidad).
--
-- ALTER TYPE ADD VALUE va en su propia migración: no se puede usar
-- un valor de enum recién agregado en la misma transacción (el seed
-- los usa, así que deben estar committeados antes).
-- =============================================================

ALTER TYPE tipo_categoria ADD VALUE IF NOT EXISTS 'helado-clasico';
ALTER TYPE tipo_categoria ADD VALUE IF NOT EXISTS 'helado-especial';
ALTER TYPE tipo_categoria ADD VALUE IF NOT EXISTS 'tamano';
ALTER TYPE tipo_categoria ADD VALUE IF NOT EXISTS 'pasteleria';

-- Imagen opcional del producto (potecitos de especiales, íconos de vasos/kilos).
-- Renderiza por código cuando es null.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url text;
