-- =============================================================
-- MIGRACIÓN 014: slug estable en productos
-- El producto "Kilo Kaikén" alimenta la placa vertical homónima (precio +
-- gustos). Como ahora los nombres se editan desde el admin, lo vinculamos por
-- un `slug` estable en vez del nombre, así renombrarlo no rompe la placa.
-- (El código cae al nombre original si el slug está vacío, así que esta
--  migración solo AGREGA robustez; nada se rompe si no se corre.)
-- =============================================================

ALTER TABLE productos ADD COLUMN IF NOT EXISTS slug text;

-- Marcar el Kilo Kaikén actual (por su nombre semilla) con el slug estable.
UPDATE productos SET slug = 'kilo-kaiken'
WHERE nombre = 'Kilo Kaikén' AND slug IS NULL;
