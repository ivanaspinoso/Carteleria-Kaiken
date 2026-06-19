-- =============================================================
-- MIGRACIÓN 004: Orientaciones y templates reales de Kaikén
-- =============================================================
-- Agrega la columna `orientacion` a pantallas y los nuevos
-- templates horizontales fijos del local.
--
-- IMPORTANTE: ALTER TYPE ADD VALUE va en su propia migración (este
-- archivo) para que se commitee antes de que el seed use los valores.
-- No se puede agregar un valor de enum y usarlo en la misma transacción.
-- =============================================================

-- Orientación física de cada pantalla (los TV verticales están rotados 90°)
ALTER TABLE pantallas ADD COLUMN IF NOT EXISTS orientacion text
  CHECK (orientacion IN ('horizontal', 'vertical'))
  NOT NULL DEFAULT 'horizontal';

-- Nuevos templates de las 3 pantallas horizontales fijas.
-- Los viejos (sabores_grande, sabores_fijo, postres, cafeteria) quedan en el
-- enum por compatibilidad pero ya no se usan en el seed real.
ALTER TYPE template_pantalla ADD VALUE IF NOT EXISTS 'sabores-clasicos-especiales';
ALTER TYPE template_pantalla ADD VALUE IF NOT EXISTS 'tamanos-postres';
ALTER TYPE template_pantalla ADD VALUE IF NOT EXISTS 'cafeteria-pasteleria';
