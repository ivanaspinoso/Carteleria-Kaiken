-- Fix Realtime — ejecutar en Supabase SQL Editor si el toggle del Dashboard no funciona
-- Verificar primero qué tablas ya están en la publication:
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Agregar las tablas que falten (ignorar el error si ya están):
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE productos;
ALTER PUBLICATION supabase_realtime ADD TABLE promos;
ALTER PUBLICATION supabase_realtime ADD TABLE pantallas;

-- Verificar resultado final:
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
