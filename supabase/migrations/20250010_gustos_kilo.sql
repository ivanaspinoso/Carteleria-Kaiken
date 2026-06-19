-- =============================================================
-- MIGRACIÓN 010: gustos_incluidos en productos
-- Lista de gustos (sabores) que entran en un producto, ej. el "Kilo Kaikén"
-- ("Americana", "Chocolate", ...). Se superpone como texto sobre la placa
-- de video kilo-kaiken (pantallas verticales).
-- =============================================================

ALTER TABLE productos ADD COLUMN IF NOT EXISTS gustos_incluidos jsonb;

-- Los gustos del Kilo Kaikén se cargan desde el admin (multi-select), no se
-- siembran acá para no meter nombres que no coincidan con los productos reales.
