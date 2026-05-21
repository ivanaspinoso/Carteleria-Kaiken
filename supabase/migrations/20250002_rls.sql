-- =============================================================
-- MIGRACIÓN 002: Row Level Security
-- =============================================================
-- MODELO DE SEGURIDAD:
--   • categorias, productos, promos, pantallas:
--       - SELECT público (anon + authenticated) — la cartelera no tiene login
--       - INSERT/UPDATE/DELETE solo autenticados
--   • logs:
--       - SELECT solo para rol 'admin' (vía JWT user_metadata)
--       - INSERT para autenticados (lo hacen las Server Actions del admin)
--       - UPDATE/DELETE: nadie

-- ----------------------------------------------------------
-- Habilitar RLS en todas las tablas
-- ----------------------------------------------------------
ALTER TABLE categorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantallas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs        ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- CATEGORIAS
-- ----------------------------------------------------------
CREATE POLICY "categorias_select_public"
  ON categorias FOR SELECT
  USING (true);

CREATE POLICY "categorias_insert_auth"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "categorias_update_auth"
  ON categorias FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Soft delete: nunca DELETE real, se setea activa=false
-- Pero por si acaso, solo autenticados
CREATE POLICY "categorias_delete_auth"
  ON categorias FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- PRODUCTOS
-- ----------------------------------------------------------
CREATE POLICY "productos_select_public"
  ON productos FOR SELECT
  USING (true);

CREATE POLICY "productos_insert_auth"
  ON productos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "productos_update_auth"
  ON productos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "productos_delete_auth"
  ON productos FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- PROMOS
-- ----------------------------------------------------------
CREATE POLICY "promos_select_public"
  ON promos FOR SELECT
  USING (true);

CREATE POLICY "promos_insert_auth"
  ON promos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "promos_update_auth"
  ON promos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "promos_delete_auth"
  ON promos FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- PANTALLAS
-- ----------------------------------------------------------
CREATE POLICY "pantallas_select_public"
  ON pantallas FOR SELECT
  USING (true);

CREATE POLICY "pantallas_insert_auth"
  ON pantallas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "pantallas_update_auth"
  ON pantallas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Pantallas no se borran nunca (activa=false para "desactivar")
CREATE POLICY "pantallas_delete_auth"
  ON pantallas FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------
-- LOGS — solo admin puede leer; autenticados pueden insertar
-- ----------------------------------------------------------
CREATE POLICY "logs_select_admin"
  ON logs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'user_role' = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin'
  );

CREATE POLICY "logs_insert_auth"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id
  );

-- Nadie puede UPDATE ni DELETE logs (inmutables)
