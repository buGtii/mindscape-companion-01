CREATE TABLE IF NOT EXISTS public.role_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  display_name text,
  professional_title text,
  license_number text,
  organization text,
  reason text,
  admin_note text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_approval_restricted_role CHECK (requested_role IN ('psychologist', 'researcher')),
  CONSTRAINT role_approval_one_pending UNIQUE (user_id, requested_role, status)
);

GRANT SELECT, INSERT, UPDATE ON public.role_approval_requests TO authenticated;
GRANT ALL ON public.role_approval_requests TO service_role;

ALTER TABLE public.role_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own approval requests"
ON public.role_approval_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can request restricted roles for themselves"
ON public.role_approval_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND requested_role IN ('psychologist', 'researcher')
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);

CREATE POLICY "Admins can update approval requests"
ON public.role_approval_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER role_approval_requests_touch
BEFORE UPDATE ON public.role_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.approve_role_request(_request_id uuid, _criteria jsonb DEFAULT '{}'::jsonb, _admin_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.role_approval_requests%rowtype;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO req
  FROM public.role_approval_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Approval request already reviewed';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (req.user_id, req.requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.role_approval_requests
  SET status = 'approved',
      criteria = COALESCE(_criteria, '{}'::jsonb),
      admin_note = _admin_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_role_request(_request_id uuid, _criteria jsonb DEFAULT '{}'::jsonb, _admin_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.role_approval_requests%rowtype;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO req
  FROM public.role_approval_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Approval request already reviewed';
  END IF;

  UPDATE public.role_approval_requests
  SET status = 'rejected',
      criteria = COALESCE(_criteria, '{}'::jsonb),
      admin_note = _admin_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_role_request(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_role_request(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_role_request(uuid, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_role_request(uuid, jsonb, text) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.role_approval_requests;