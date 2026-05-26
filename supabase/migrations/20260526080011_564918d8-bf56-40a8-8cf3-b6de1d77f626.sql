
DROP POLICY IF EXISTS "roles insert own non-admin" ON public.user_roles;
DROP POLICY IF EXISTS "roles delete own non-admin" ON public.user_roles;

CREATE POLICY "roles insert own safe"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('student'::app_role, 'patient'::app_role)
);

CREATE POLICY "roles delete own safe"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND role IN ('student'::app_role, 'patient'::app_role)
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
