
CREATE TABLE public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood_score int NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  note text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mood_entries_user_created ON public.mood_entries(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_entries TO authenticated;
GRANT ALL ON public.mood_entries TO service_role;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood own all" ON public.mood_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.sleep_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sleep_hours numeric(4,2) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  quality int NOT NULL CHECK (quality BETWEEN 1 AND 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sleep_entries_user_created ON public.sleep_entries(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_entries TO authenticated;
GRANT ALL ON public.sleep_entries TO service_role;
ALTER TABLE public.sleep_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sleep own all" ON public.sleep_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  body text NOT NULL,
  ai_tone text,
  crisis_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_entries_user_created ON public.journal_entries(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal own all" ON public.journal_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_journal_updated BEFORE UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
