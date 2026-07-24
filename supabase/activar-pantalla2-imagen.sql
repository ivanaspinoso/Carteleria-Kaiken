-- =============================================================
-- INTERRUPTOR: pasar la Pantalla 2 a modo "imagen única"
-- =============================================================
-- Esto NO es una migración: no está en supabase/migrations/ a propósito, para
-- que `npm run db:migrate` no lo aplique solo. Se corre A MANO, una vez.
--
-- CUÁNDO: recién DESPUÉS de que esté desplegado el código que conoce el
-- template 'imagen-unica'. Si se corre antes, el TV de la Pantalla 2 muestra
-- "Template desconocido: imagen-unica" hasta que salga el deploy.
--
-- REQUISITO: haber corrido antes las migraciones 015 y 016 (`npm run db:migrate`).
--
-- Dónde correrlo: Supabase Dashboard → SQL Editor → pegar y ejecutar.
-- =============================================================

UPDATE pantallas SET template = 'imagen-unica' WHERE id = 2;

-- Verificación (tiene que devolver 'imagen-unica'):
SELECT id, nombre, template FROM pantallas WHERE id = 2;

-- =============================================================
-- VOLVER ATRÁS (rollback), si hace falta:
--
--   UPDATE pantallas SET template = 'sabores-clasicos-especiales' WHERE id = 2;
--
-- Vuelve la pantalla dinámica de sabores clásicos + especiales al instante.
-- Los productos nunca se borraron y el componente sigue en el repo.
-- La imagen subida queda guardada: si volvés a 'imagen-unica', reaparece.
-- =============================================================
