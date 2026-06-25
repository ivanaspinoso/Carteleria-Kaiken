-- =============================================================
-- MIGRACIÓN 013: póster de placas personalizadas (video)
-- Al subir un VIDEO desde el admin se genera su primer frame (póster) en el
-- navegador y se sube junto al video. La cartelera lo usa para tapar el hueco
-- de carga del <video> sin que aparezca negro en el Smart TV (igual que las
-- placas fijas, que tienen póster en public/placas/posters/). Nullable: las
-- placas tipo imagen no lo necesitan.
-- =============================================================

ALTER TABLE placas_personalizadas ADD COLUMN IF NOT EXISTS poster_url  text;
ALTER TABLE placas_personalizadas ADD COLUMN IF NOT EXISTS poster_path text;
