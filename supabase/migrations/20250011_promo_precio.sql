-- =============================================================
-- MIGRACIÓN 011: precio en promos
-- La "Promo Especial" muestra un precio editable debajo de "VÁLIDO POR:"
-- en la placa de video promo-especial (pantallas verticales).
-- =============================================================

ALTER TABLE promos ADD COLUMN IF NOT EXISTS precio numeric(10,2);
