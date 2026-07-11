-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.meal_preferences (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_target   int,
  protein_target_g int,
  carbs_target_g   int,
  fat_target_g     int,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_favorites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type  text NOT NULL,
  name       text NOT NULL,
  calories   int,
  protein_g  int,
  carbs_g    int,
  fat_g      int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.water_logs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date    date NOT NULL,
  glasses int  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.meal_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_favorites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_prefs_own" ON public.meal_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "meal_favs_own"  ON public.meal_favorites   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "water_own"      ON public.water_logs       FOR ALL USING (auth.uid() = user_id);
