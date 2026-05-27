DROP FUNCTION IF EXISTS public.approve_role_request(uuid, jsonb, text);
DROP FUNCTION IF EXISTS public.reject_role_request(uuid, jsonb, text);

GRANT SELECT ON public.disorder_categories TO anon;
GRANT SELECT ON public.disorders TO anon;
GRANT SELECT ON public.disorder_criteria TO anon;

DROP POLICY IF EXISTS "cats read auth" ON public.disorder_categories;
DROP POLICY IF EXISTS "dis read auth" ON public.disorders;
DROP POLICY IF EXISTS "crit read auth" ON public.disorder_criteria;

CREATE POLICY "cats read public"
ON public.disorder_categories
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "dis read public"
ON public.disorders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "crit read public"
ON public.disorder_criteria
FOR SELECT
TO anon, authenticated
USING (true);