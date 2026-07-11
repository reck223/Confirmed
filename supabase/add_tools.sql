-- ── Habit Tracker ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  icon       text NOT NULL DEFAULT '✨',
  color      text NOT NULL DEFAULT '#4ade80',
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_completions (
  habit_id       uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date date NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, completed_date)
);

ALTER TABLE habits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_own"      ON habits            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "completions_own" ON habit_completions FOR ALL USING (auth.uid() = user_id);

-- ── Study Tools ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_decks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#fbbf24',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id       uuid NOT NULL REFERENCES study_decks(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front         text NOT NULL,
  back          text NOT NULL,
  ease_factor   float NOT NULL DEFAULT 2.5,
  interval_days int   NOT NULL DEFAULT 1,
  next_review   date  NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decks_own" ON study_decks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "cards_own" ON study_cards FOR ALL USING (auth.uid() = user_id);
