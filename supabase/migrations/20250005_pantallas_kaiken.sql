-- =============================================================
-- MIGRACIÓN 005: Configuración real de las 5 pantallas de Kaikén
-- =============================================================
-- Pantalla 1 (vertical, 50") — rotativa con 13 placas
-- Pantalla 2 (horizontal, 43") — Sabores Clásicos + Especiales
-- Pantalla 3 (horizontal, 43") — Tamaños + Postres Helados
-- Pantalla 4 (horizontal, 43") — Cafetería + Pastelería
-- Pantalla 5 (vertical, 50") — mismas 13 placas que P1 pero DESFASADAS 30s
--
-- Corre DESPUÉS de la 004 para que los nuevos valores del enum
-- template_pantalla ya estén committeados.
-- =============================================================

INSERT INTO pantallas (id, nombre, template, pulgadas, orientacion, config, activa) VALUES
  (1, 'Vertical Izquierda',               'rotativa',                     50, 'vertical',   '{"desfase_segundos": 0}'::jsonb,  true),
  (2, 'Sabores Clásicos + Especiales',    'sabores-clasicos-especiales',  43, 'horizontal', '{}'::jsonb,                       true),
  (3, 'Tamaños + Postres Helados',        'tamanos-postres',              43, 'horizontal', '{}'::jsonb,                       true),
  (4, 'Cafetería + Pastelería',           'cafeteria-pasteleria',         43, 'horizontal', '{}'::jsonb,                       true),
  (5, 'Vertical Derecha',                 'rotativa',                     50, 'vertical',   '{"desfase_segundos": 30}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  nombre      = EXCLUDED.nombre,
  template    = EXCLUDED.template,
  pulgadas    = EXCLUDED.pulgadas,
  orientacion = EXCLUDED.orientacion,
  config      = EXCLUDED.config,
  activa      = EXCLUDED.activa;
