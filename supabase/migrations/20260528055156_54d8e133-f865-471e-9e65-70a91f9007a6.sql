
-- 1. Subscriptions: remove user self-write, auto-seed free row
DROP POLICY IF EXISTS "sub insert own" ON public.subscriptions;
DROP POLICY IF EXISTS "sub update own" ON public.subscriptions;

CREATE OR REPLACE FUNCTION public.seed_free_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_seed_sub ON auth.users;
CREATE TRIGGER on_auth_user_seed_sub
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_free_subscription();

-- 2. Clinical assessments: relational client link
ALTER TABLE public.clinical_assessments
  ADD COLUMN IF NOT EXISTS client_id uuid;

CREATE INDEX IF NOT EXISTS idx_ca_client_id ON public.clinical_assessments(client_id);

ALTER TABLE public.clinical_assessments
  DROP CONSTRAINT IF EXISTS clinical_assessments_client_or_label;
ALTER TABLE public.clinical_assessments
  ADD CONSTRAINT clinical_assessments_client_or_label
  CHECK (client_id IS NOT NULL OR (patient_label IS NOT NULL AND length(patient_label) > 0));

DROP POLICY IF EXISTS "ca client read own" ON public.clinical_assessments;
CREATE POLICY "ca client read own" ON public.clinical_assessments
FOR SELECT TO authenticated
USING (client_id = auth.uid());

-- 3. Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit admin all" ON public.audit_logs;
CREATE POLICY "audit admin all" ON public.audit_logs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "audit read own actor" ON public.audit_logs;
CREATE POLICY "audit read own actor" ON public.audit_logs
FOR SELECT TO authenticated
USING (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity, entity_id);
