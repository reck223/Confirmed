-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.workout_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  exercises  jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.body_weight_logs (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL,
  weight_lbs numeric(5,1) NOT NULL,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_weight_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_own" ON public.workout_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bw_logs_own"   ON public.body_weight_logs  FOR ALL USING (auth.uid() = user_id);
