CREATE TABLE IF NOT EXISTS daily_challenge_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  challenge_id text NOT NULL,
  date         date NOT NULL,
  awarded_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE daily_challenge_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own daily challenge completions" ON daily_challenge_completions;
CREATE POLICY "Users manage own daily challenge completions" ON daily_challenge_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
