-- Per-set tracking table
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id   uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_number    int  NOT NULL DEFAULT 1,
  reps          int,
  weight_lbs    float,
  duration_mins int,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sets_own" ON public.workout_sets FOR ALL USING (auth.uid() = user_id);

-- Optional goal linkage on sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS goal_id uuid;
