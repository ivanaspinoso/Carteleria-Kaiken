-- =============================================================
-- MIGRACIÓN 009: Placas personalizadas que sube el cliente
-- =============================================================
-- Imágenes estáticas extra (sin animación) que se suman a la rotación de
-- las pantallas verticales 1 y 5. Se guardan en Supabase Storage; la tabla
-- referencia el public URL + el path interno (para poder borrar el archivo).
-- =============================================================

CREATE TABLE IF NOT EXISTS placas_personalizadas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pantalla_id   int NOT NULL REFERENCES pantallas(id) ON DELETE CASCADE,
  imagen_url    text NOT NULL,          -- public URL de Storage
  imagen_path   text NOT NULL,          -- path interno (para borrar)
  nombre        text NOT NULL,
  orden         int NOT NULL DEFAULT 0,
  duracion      int NOT NULL DEFAULT 10,
  activa        boolean NOT NULL DEFAULT true,
  inicio        timestamptz,
  fin           timestamptz,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_placas_personalizadas
  ON placas_personalizadas (pantalla_id, orden)
  WHERE activa = true;

ALTER TABLE placas_personalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura publica placas personalizadas" ON placas_personalizadas
  FOR SELECT USING (true);
CREATE POLICY "escritura auth placas personalizadas" ON placas_personalizadas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE placas_personalizadas;

-- =============================================================
-- Storage: bucket 'placas-personalizadas' (lectura pública, escritura auth)
-- =============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('placas-personalizadas', 'placas-personalizadas', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "placas_pers_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'placas-personalizadas');
CREATE POLICY "placas_pers_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'placas-personalizadas');
CREATE POLICY "placas_pers_storage_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'placas-personalizadas');
CREATE POLICY "placas_pers_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'placas-personalizadas');
