-- =============================================================
-- MIGRACIÓN 016: Imagen única por pantalla (uploader del admin)
-- =============================================================
-- Una fila por pantalla, con la imagen que sube el cliente desde el admin.
-- Hoy la usa solo la Pantalla 2, pero la tabla es genérica: para que la 3
-- o la 4 pasen a modo imagen alcanza con cambiarles el template.
--
-- Corre DESPUÉS de la 015 para que el valor 'imagen-unica' del enum
-- template_pantalla ya esté committeado.
--
-- NO toca productos, categorías ni stock: los sabores clásicos y especiales
-- quedan intactos en la base (siguen alimentando las promos de P1/P5 y los
-- gustos del Kilo Kaikén) — solo dejan de dibujar la Pantalla 2.
-- =============================================================

CREATE TABLE IF NOT EXISTS pantallas_imagen (
  pantalla_id     int PRIMARY KEY REFERENCES pantallas(id) ON DELETE CASCADE,
  imagen_url      text NOT NULL,          -- public URL de Storage
  imagen_path     text NOT NULL,          -- path interno (para borrar la vieja)
  actualizada_en  timestamptz NOT NULL DEFAULT now(),
  actualizada_por uuid REFERENCES auth.users(id)
);

ALTER TABLE pantallas_imagen ENABLE ROW LEVEL SECURITY;

-- La cartelera lee sin sesión (los TV son anónimos); solo el admin escribe.
DROP POLICY IF EXISTS "lectura publica pantallas imagen" ON pantallas_imagen;
CREATE POLICY "lectura publica pantallas imagen" ON pantallas_imagen
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "escritura auth pantallas imagen" ON pantallas_imagen;
CREATE POLICY "escritura auth pantallas imagen" ON pantallas_imagen
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime: es lo que hace que el TV cambie la imagen sin recargar.
-- El ADD TABLE tira error si la tabla ya está en la publication, y eso
-- abortaría el resto del archivo al re-correr las migraciones.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pantallas_imagen'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pantallas_imagen;
  END IF;
END $$;

-- =============================================================
-- Storage: bucket 'pantallas-imagen' (lectura pública, escritura auth)
-- =============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pantallas-imagen', 'pantallas-imagen', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "pantallas_imagen_storage_select" ON storage.objects;
CREATE POLICY "pantallas_imagen_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'pantallas-imagen');

DROP POLICY IF EXISTS "pantallas_imagen_storage_insert" ON storage.objects;
CREATE POLICY "pantallas_imagen_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pantallas-imagen');

DROP POLICY IF EXISTS "pantallas_imagen_storage_update" ON storage.objects;
CREATE POLICY "pantallas_imagen_storage_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'pantallas-imagen');

DROP POLICY IF EXISTS "pantallas_imagen_storage_delete" ON storage.objects;
CREATE POLICY "pantallas_imagen_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pantallas-imagen');

-- =============================================================
-- OJO: esta migración NO cambia el template de ninguna pantalla.
--
-- Solo crea la infraestructura (tabla, bucket, permisos, realtime), así que
-- se puede correr contra la base de producción sin que cambie nada de lo que
-- se ve en los TVs del local. El interruptor que pasa la Pantalla 2 a modo
-- imagen está aparte, en:
--
--   supabase/activar-pantalla2-imagen.sql
--
-- Se corre A MANO y RECIÉN DESPUÉS de desplegar el código nuevo: si se corre
-- antes, la P2 queda pidiendo un template que el código viejo no conoce y el
-- TV muestra "Template desconocido".
-- =============================================================
