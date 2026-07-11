-- Goal entries: powers Habit logs, Savings contributions, Travel destinations
-- Run this in the Supabase SQL editor

-- 1. New entries table
CREATE TABLE IF NOT EXISTS goal_entries (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id   uuid        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type      text        NOT NULL CHECK (type IN ('habit_log', 'contribution', 'destination')),
  content   jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_entries_goal_id_idx ON goal_entries(goal_id);
CREATE INDEX IF NOT EXISTS goal_entries_user_id_idx ON goal_entries(user_id);

ALTER TABLE goal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goal entries"
  ON goal_entries FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Expand goal_type to include new types
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;
ALTER TABLE goals
  ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN ('standard', 'reading', 'letter', 'habit', 'savings', 'travel'));
