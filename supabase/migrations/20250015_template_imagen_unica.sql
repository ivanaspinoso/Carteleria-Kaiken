-- =============================================================
-- MIGRACIÓN 015: template 'imagen-unica'
-- =============================================================
-- Pantallas que muestran UNA sola imagen subida desde el admin, sin
-- lógica dinámica. La Pantalla 2 (Sabores) pasa a este modo.
--
-- IMPORTANTE: ALTER TYPE ADD VALUE va SOLO en su propia migración (igual
-- que la 004). Postgres no deja agregar un valor de enum y usarlo en la
-- misma transacción: la 016 recién puede hacer el UPDATE de pantallas
-- porque este archivo ya se committeó.
-- =============================================================

ALTER TYPE template_pantalla ADD VALUE IF NOT EXISTS 'imagen-unica';
