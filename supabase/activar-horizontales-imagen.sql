-- =============================================================
-- INTERRUPTOR: pasar las Pantallas 3 y 4 a modo "imagen única"
-- =============================================================
-- OJO: normalmente NO hace falta correr esto. Desde el panel, cada pantalla
-- horizontal (2, 3 y 4) tiene el interruptor "Pasar a mostrar la imagen" /
-- "Volver al contenido automático" al pie de la tarjeta de imagen. Hace
-- exactamente el mismo UPDATE que este archivo, con confirmación y sin dejar
-- activar el modo imagen si todavía no hay imagen subida.
--
-- Este archivo queda como respaldo: sirve si el panel no está disponible o si
-- hay que arreglar el estado de una pantalla desde afuera.
--
-- NO es una migración: no está en supabase/migrations/ a propósito, para que
-- `npm run db:migrate` no lo aplique solo. Se corre A MANO.
--
-- ORDEN, para que el local nunca quede con una pantalla en blanco:
--   1. SUBIR primero la imagen de la pantalla desde el admin. Hasta acá el TV
--      sigue mostrando la pantalla dinámica de siempre.
--   2. Recién ahora el UPDATE de abajo, solo de la pantalla que quieras pasar.
--      El TV cambia solo, sin tocar el televisor.
-- Al revés, el TV queda mostrando el cartel de "No hay imagen cargada".
--
-- REQUISITO: migraciones 015 y 016 ya corridas (`npm run db:migrate`).
--
-- Dónde correrlo: Supabase Dashboard → SQL Editor → pegar y ejecutar.
-- =============================================================

-- Pantalla 3 (Tamaños + Postres Helados)
UPDATE pantallas SET template = 'imagen-unica' WHERE id = 3;

-- Pantalla 4 (Cafetería + Pastelería)
UPDATE pantallas SET template = 'imagen-unica' WHERE id = 4;

-- Verificación (las 3 horizontales tienen que quedar en 'imagen-unica'):
SELECT id, nombre, template FROM pantallas WHERE id IN (2, 3, 4) ORDER BY id;

-- =============================================================
-- VOLVER ATRÁS (rollback), por pantalla:
--
--   UPDATE pantallas SET template = 'tamanos-postres'      WHERE id = 3;
--   UPDATE pantallas SET template = 'cafeteria-pasteleria' WHERE id = 4;
--
-- Vuelve la pantalla dinámica al instante. Los productos nunca se borraron y
-- los componentes siguen en el repo. La imagen subida queda guardada: si
-- volvés a 'imagen-unica', reaparece.
--
-- OJO con la migración 005: su ON CONFLICT tiene una guarda que NO pisa el
-- template cuando la pantalla ya está en 'imagen-unica', así que una corrida de
-- `npm run db:migrate` no deshace este cambio.
-- =============================================================
