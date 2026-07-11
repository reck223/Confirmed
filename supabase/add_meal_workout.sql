-- ── Meal Prep ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date  date NOT NULL,
  meal_type  text NOT NULL, -- breakfast | lunch | dinner | snack
  name       text NOT NULL,
  calories   int,
  protein_g  int,
  carbs_g    int,
  fat_g      int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meals_own" ON public.meal_entries FOR ALL USING (auth.uid() = user_id);

-- ── Workouts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  notes         text,
  duration_mins int,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  sets          int,
  reps          int,
  weight_lbs    float,
  duration_mins int,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own"  ON public.workout_sessions  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "exercises_own" ON public.workout_exercises FOR ALL USING (auth.uid() = user_id);
