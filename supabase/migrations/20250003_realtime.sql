-- =============================================================
-- MIGRACIÓN 003: Habilitar Realtime
-- =============================================================
-- Supabase Realtime usa la publication "supabase_realtime".
-- Agregamos las tablas que necesitan sincronización en tiempo real.

ALTER PUBLICATION supabase_realtime ADD TABLE productos;
ALTER PUBLICATION supabase_realtime ADD TABLE promos;
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE pantallas;

-- logs no necesita realtime (solo lectura de historial)
