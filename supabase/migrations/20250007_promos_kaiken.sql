-- =============================================================
-- MIGRACIÓN 007: Tipos de promo editables de Kaikén
-- =============================================================
-- Las 3 placas verticales con área editable desde el admin:
--   sabor_dia      → Gusto del Día
--   novedad_mes    → Novedad del Mes
--   promo_especial → Promo Especial
-- (sabor_semana, combo, mensaje ya existían y quedan por compatibilidad).
--
-- ALTER TYPE ADD VALUE va en su propia migración (no se puede usar un valor
-- de enum recién agregado en la misma transacción que lo usa el seed).
-- =============================================================

ALTER TYPE tipo_promo ADD VALUE IF NOT EXISTS 'sabor_dia';
ALTER TYPE tipo_promo ADD VALUE IF NOT EXISTS 'novedad_mes';
ALTER TYPE tipo_promo ADD VALUE IF NOT EXISTS 'promo_especial';
