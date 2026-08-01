-- Run this in your Supabase dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS coach_briefings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  briefing    TEXT NOT NULL,
  history     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE coach_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own coach briefings" ON coach_briefings
  FOR ALL USING (auth.uid() = user_id);
