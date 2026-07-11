-- Run this in your Supabase dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS daily_checkins (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  energy      INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 10),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own checkins" ON daily_checkins
  FOR ALL USING (auth.uid() = user_id);
