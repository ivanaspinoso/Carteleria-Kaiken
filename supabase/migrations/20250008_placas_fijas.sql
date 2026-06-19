-- =============================================================
-- MIGRACIÓN 008: Placas fijas de las pantallas verticales (rotación)
-- =============================================================
-- Las 13 placas diseñadas por la agencia, una fila por pantalla (1 y 5).
-- El componente React se resuelve por el campo `componente`.
-- El seed de las 26 filas va en seed.sql / all-in-one.sql (después de
-- insertar las pantallas, porque hay FK).
-- =============================================================

CREATE TABLE IF NOT EXISTS placas_fijas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pantalla_id   int NOT NULL REFERENCES pantallas(id) ON DELETE CASCADE,
  slug          text NOT NULL,
  nombre        text NOT NULL,
  componente    text NOT NULL,          -- 'PlacaAntojoDeTarde', etc.
  orden         int NOT NULL DEFAULT 0,
  duracion      int NOT NULL DEFAULT 10, -- segundos en pantalla
  activa        boolean NOT NULL DEFAULT true,
  inicio        timestamptz,
  fin           timestamptz,
  config        jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  UNIQUE (pantalla_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_placas_fijas_rotacion
  ON placas_fijas (pantalla_id, orden)
  WHERE activa = true;

ALTER TABLE placas_fijas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura publica placas fijas" ON placas_fijas
  FOR SELECT USING (true);

CREATE POLICY "escritura auth placas fijas" ON placas_fijas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE placas_fijas;
