-- =============================================================
-- Asignar rol 'admin' a un usuario ya existente en Supabase Auth
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- PASO PREVIO: el usuario tiene que existir en Supabase Auth.
-- Crearlo en: Authentication → Users → "Add user" → "Create new user"
--
-- Reemplazar 'tu@email.com' con el email real.
-- =============================================================

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"user_role": "admin"}'::jsonb
WHERE email = 'sivana361@gmail.com';

-- Verificar que se aplicó:
SELECT id, email, raw_user_meta_data ->> 'user_role' AS rol
FROM auth.users
WHERE email = 'sivana361@gmail.com';
