-- ── Challenges ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  goal_id       UUID,
  duration_days INTEGER NOT NULL DEFAULT 30,
  start_date    DATE NOT NULL,
  is_public     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS challenges_user_id ON challenges(user_id);
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'challenges_own') THEN
    CREATE POLICY "challenges_own" ON challenges FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS challenge_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date     DATE NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, log_date)
);
CREATE INDEX IF NOT EXISTS challenge_logs_challenge ON challenge_logs(challenge_id, log_date);
ALTER TABLE challenge_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenge_logs' AND policyname = 'challenge_logs_own') THEN
    CREATE POLICY "challenge_logs_own" ON challenge_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Budget ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  txn_date    DATE NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS budget_txn_user_date ON budget_transactions(user_id, txn_date);
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_transactions' AND policyname = 'budget_own') THEN
    CREATE POLICY "budget_own" ON budget_transactions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Body Metrics ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_date  DATE NOT NULL,
  weight_lbs   DECIMAL(5,1),
  sleep_hours  DECIMAL(3,1),
  water_cups   INTEGER,
  steps        INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);
CREATE INDEX IF NOT EXISTS body_metrics_user_date ON body_metrics(user_id, metric_date);
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_metrics' AND policyname = 'body_metrics_own') THEN
    CREATE POLICY "body_metrics_own" ON body_metrics FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Books ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL,
  author        TEXT,
  total_pages   INTEGER,
  current_page  INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'want' CHECK (status IN ('want', 'reading', 'finished')),
  goal_id       UUID,
  started_date  DATE,
  finished_date DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS books_user_status ON books(user_id, status);
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'books' AND policyname = 'books_own') THEN
    CREATE POLICY "books_own" ON books FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS book_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  pages_read   INTEGER NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS book_sessions_book ON book_sessions(book_id, session_date);
ALTER TABLE book_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_sessions' AND policyname = 'book_sessions_own') THEN
    CREATE POLICY "book_sessions_own" ON book_sessions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
