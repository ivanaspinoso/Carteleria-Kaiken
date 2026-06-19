-- =============================================================
-- MIGRACIÓN 012: historial visible para cualquier usuario autenticado
-- El sistema lo usa un solo dueño; el gate admin-only del SELECT de logs
-- (que dependía del user_role en el JWT) hacía que el historial saliera
-- vacío. Lo abrimos a cualquier usuario logueado del admin.
-- =============================================================

DROP POLICY IF EXISTS "logs_select_admin" ON logs;

CREATE POLICY "logs_select_auth"
  ON logs FOR SELECT
  TO authenticated
  USING (true);
