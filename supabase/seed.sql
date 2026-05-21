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
-- PANTALLAS (5 fijas, IDs 1..5)
-- TODO: reemplazar nombres y templates según el layout real del local
-- =============================================================
INSERT INTO pantallas (id, nombre, template, pulgadas, config, activa) VALUES
(1, 'Pantalla Principal 50"',   'rotativa',       50, '{
  "rotacion": { "intervalMs": 8000, "categorias": [] },
  "posiciones": {}
}'::jsonb, true),

(2, 'Pantalla Secundaria 50"',  'sabores_grande',  50, '{
  "posiciones": {}
}'::jsonb, true),

(3, 'Cafetería 43"',            'cafeteria',       43, '{
  "posiciones": {}
}'::jsonb, true),

(4, 'Sabores Fijo 43"',         'sabores_fijo',    43, '{
  "posiciones": {}
}'::jsonb, true),

(5, 'Postres 43"',              'postres',         43, '{
  "posiciones": {}
}'::jsonb, true);

-- =============================================================
-- CATEGORÍAS DE HELADOS
-- TODO: reemplazar con las categorías reales del local
-- =============================================================
INSERT INTO categorias (id, nombre, tipo, orden, activa) VALUES
('11111111-1111-1111-1111-000000000001', 'Cremas',           'helado', 1, true),
('11111111-1111-1111-1111-000000000002', 'Chocolates',       'helado', 2, true),
('11111111-1111-1111-1111-000000000003', 'Dulces de Leche',  'helado', 3, true),
('11111111-1111-1111-1111-000000000004', 'Frutales',         'helado', 4, true),
('11111111-1111-1111-1111-000000000005', 'Especiales',       'helado', 5, true),
-- Cafetería
('22222222-2222-2222-2222-000000000001', 'Cafés',            'cafeteria', 1, true),
('22222222-2222-2222-2222-000000000002', 'Infusiones',       'cafeteria', 2, true),
('22222222-2222-2222-2222-000000000003', 'Pastelería',       'cafeteria', 3, true),
-- Postres y combos
('33333333-3333-3333-3333-000000000001', 'Postres',          'postre',   1, true),
('33333333-3333-3333-3333-000000000002', 'Combos',           'combo',    1, true);

-- =============================================================
-- SABORES — CATEGORÍA: CREMAS
-- TODO: reemplazar con sabores reales + precios reales
-- =============================================================
INSERT INTO productos (categoria_id, nombre, descripcion, precio, precio_alt, unidad, en_stock, destacado, orden) VALUES
('11111111-1111-1111-1111-000000000001', 'Vainilla Clásica',       'Sabor tradicional con vainilla bourbon',  1800, 3200, 'kg', true,  true,  1),
('11111111-1111-1111-1111-000000000001', 'Crema del Uruguay',      'Suave y cremosa, sin agregados',          1900, 3400, 'kg', true,  false, 2),
('11111111-1111-1111-1111-000000000001', 'Tramontana',             'Crema con chips de chocolate',            2000, 3600, 'kg', true,  false, 3),
('11111111-1111-1111-1111-000000000001', 'Americana',              'Mantecado estilo americano',              1750, 3100, 'kg', true,  false, 4),
('11111111-1111-1111-1111-000000000001', 'Crema Oreo',             'Crema con galletitas trituradas',         2100, 3800, 'kg', false, false, 5),

-- =============================================================
-- SABORES — CATEGORÍA: CHOCOLATES
-- TODO: reemplazar con sabores y precios reales
-- =============================================================
('11111111-1111-1111-1111-000000000002', 'Chocolate Amargo',       'Intenso, 70% cacao',                     1900, 3400, 'kg', true,  true,  1),
('11111111-1111-1111-1111-000000000002', 'Chocolate con Leche',    'Suave y equilibrado',                    1800, 3200, 'kg', true,  false, 2),
('11111111-1111-1111-1111-000000000002', 'Brownie',                'Chocolate con trozos de brownie',         2200, 4000, 'kg', true,  true,  3),
('11111111-1111-1111-1111-000000000002', 'Chocolate Blanco',       'Cremoso con esencia de vainilla',         1950, 3500, 'kg', true,  false, 4),
('11111111-1111-1111-1111-000000000002', 'Marquise',               'Chocolate con almendras',                 2300, 4200, 'kg', false, false, 5),

-- =============================================================
-- SABORES — CATEGORÍA: DULCES DE LECHE
-- TODO: reemplazar con sabores y precios reales
-- =============================================================
('11111111-1111-1111-1111-000000000003', 'Dulce de Leche Granizado','Con chips de chocolate',                 2000, 3600, 'kg', true,  true,  1),
('11111111-1111-1111-1111-000000000003', 'Dulce de Leche Clásico',  'El favorito de siempre',                1900, 3400, 'kg', true,  false, 2),
('11111111-1111-1111-1111-000000000003', 'Dulce de Leche Brownie',  'Con trozos de brownie de DL',           2200, 4000, 'kg', true,  false, 3),
('11111111-1111-1111-1111-000000000003', 'Sambayón',                'Dulce de leche con yemas y vino',        2400, 4400, 'kg', true,  false, 4),

-- =============================================================
-- SABORES — CATEGORÍA: FRUTALES
-- TODO: reemplazar con sabores y precios reales
-- =============================================================
('11111111-1111-1111-1111-000000000004', 'Frutilla',               'Con trozos de frutilla fresca',           1800, 3200, 'kg', true,  true,  1),
('11111111-1111-1111-1111-000000000004', 'Limón',                  'Fresco y ácido, sin leche',               1700, 3000, 'kg', true,  false, 2),
('11111111-1111-1111-1111-000000000004', 'Naranja y Jengibre',     'Frutal con toque picante',                1900, 3400, 'kg', true,  false, 3),
('11111111-1111-1111-1111-000000000004', 'Mango',                  'Tropical, sin lactosa',                   1950, 3500, 'kg', true,  false, 4),
('11111111-1111-1111-1111-000000000004', 'Maracuyá',               'Frutal y ácido',                          1950, 3500, 'kg', false, false, 5),
('11111111-1111-1111-1111-000000000004', 'Pomelo Rosado',          'Fresco con toque amargo',                 1800, 3200, 'kg', true,  false, 6),

-- =============================================================
-- SABORES — CATEGORÍA: ESPECIALES
-- TODO: reemplazar con sabores y precios reales
-- =============================================================
('11111111-1111-1111-1111-000000000005', 'Pistacho',               'Con pistacho italiano',                   2800, 5200, 'kg', true,  true,  1),
('11111111-1111-1111-1111-000000000005', 'Tiramisú',               'Café, mascarpone y bizcochuelo',          2600, 4800, 'kg', true,  true,  2),
('11111111-1111-1111-1111-000000000005', 'Cheesecake de Frutos Rojos','Queso crema y coulis de frutos rojos', 2500, 4600, 'kg', true,  false, 3),
('11111111-1111-1111-1111-000000000005', 'Matcha',                 'Con té matcha japonés',                   2700, 5000, 'kg', false, false, 4),
('11111111-1111-1111-1111-000000000005', 'Stracciatella',          'Crema con hilos de chocolate',            2200, 4000, 'kg', true,  false, 5),

-- =============================================================
-- CAFETERÍA — CAFÉS
-- TODO: reemplazar con productos y precios reales
-- =============================================================
('22222222-2222-2222-2222-000000000001', 'Espresso',               'Doble shot, intenso',                     1200, null, null, true,  false, 1),
('22222222-2222-2222-2222-000000000001', 'Cortado',                'Espresso con splash de leche',            1300, null, null, true,  false, 2),
('22222222-2222-2222-2222-000000000001', 'Café con Leche',         'Espresso + leche caliente',               1500, null, null, true,  true,  3),
('22222222-2222-2222-2222-000000000001', 'Cappuccino',             'Espresso + leche vaporizada + espuma',    1700, null, null, true,  false, 4),
('22222222-2222-2222-2222-000000000001', 'Latte Macchiato',        'Leche + espresso encima',                 1800, null, null, true,  false, 5),
('22222222-2222-2222-2222-000000000001', 'Frappé de Café',         'Café frío batido con crema',              2200, null, null, true,  false, 6),

-- =============================================================
-- CAFETERÍA — INFUSIONES
-- TODO: reemplazar con productos y precios reales
-- =============================================================
('22222222-2222-2222-2222-000000000002', 'Té en saquito',          'Variedad a elección',                     900,  null, null, true,  false, 1),
('22222222-2222-2222-2222-000000000002', 'Té Chai Latte',          'Té especiado con leche vaporizada',       1800, null, null, true,  false, 2),

-- =============================================================
-- CAFETERÍA — PASTELERÍA
-- TODO: reemplazar con productos y precios reales
-- =============================================================
('22222222-2222-2222-2222-000000000003', 'Medialuna',              'De manteca, recién horneada',              800, null, null, true,  false, 1),
('22222222-2222-2222-2222-000000000003', 'Tostado mixto',          'Jamón y queso en pan de miga',            1400, null, null, true,  true,  2),
('22222222-2222-2222-2222-000000000003', 'Cheesecake del día',     'Porción del postre del día',              2200, null, null, true,  false, 3),

-- =============================================================
-- POSTRES
-- TODO: reemplazar con productos y precios reales
-- =============================================================
('33333333-3333-3333-3333-000000000001', 'Sundae Clásico',         '2 bochas + salsa chocolate + crema',      2800, null, null, true,  true,  1),
('33333333-3333-3333-3333-000000000001', 'Copa Brownie',           '1 bocha + brownie + dulce de leche',      3200, null, null, true,  false, 2),
('33333333-3333-3333-3333-000000000001', 'Banana Split',           'Banana + 3 bochas + 3 salsas',            3800, null, null, true,  false, 3),
('33333333-3333-3333-3333-000000000001', 'Helado con Brownie',     '2 bochas sobre brownie tibio',            3500, null, null, false, false, 4),
('33333333-3333-3333-3333-000000000001', 'Copa Tropical',          'Mango + frutilla + sorbete cítrico',      3000, null, null, true,  false, 5),

-- =============================================================
-- COMBOS
-- TODO: reemplazar con combos y precios reales del local
-- =============================================================
('33333333-3333-3333-3333-000000000002', 'Combo Café + Helado',    '1 café + 1 bocha a elección',             2500, null, null, true,  true,  1),
('33333333-3333-3333-3333-000000000002', 'Combo Almuerzo Dulce',   'Tostado + café + 1 bocha',                3200, null, null, true,  false, 2),
('33333333-3333-3333-3333-000000000002', 'Combo Pareja',           '2 cafés + 1 postre a elección',           4500, null, null, true,  false, 3);

-- =============================================================
-- PROMOS
-- TODO: reemplazar con promociones reales del negocio
-- =============================================================

-- Para la promo sabor_semana necesitamos el id de un producto
-- Usamos Tiramisú (un especial)
INSERT INTO promos (tipo, titulo, contenido, producto_id, activa, orden) VALUES
(
  'sabor_semana',
  'Sabor de la Semana',
  -- TODO: reemplazar con descripción real de la promo
  'Esta semana te recomendamos este sabor especial. ¡Preguntá por las combinaciones!',
  (SELECT id FROM productos WHERE nombre = 'Tiramisú' LIMIT 1),
  true,
  1
),
(
  'combo',
  -- TODO: reemplazar con combo y precio real
  'Combo Tarde Feliz — 15 a 18hs',
  'Café + 1 bocha a elección por precio especial. Solo en horario indicado.',
  (SELECT id FROM productos WHERE nombre = 'Combo Café + Helado' LIMIT 1),
  true,
  2
),
(
  'mensaje',
  -- TODO: reemplazar con mensaje real del local
  'Pagá con débito sin recargo',
  'Aceptamos todas las tarjetas de débito y crédito sin costo adicional.',
  null,
  false,  -- inactiva por defecto
  3
);

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
