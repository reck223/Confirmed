-- ═══════════════════════════════════════════════════════════
-- Social Upgrade: Comments, XP, Achievements, Playbook
-- Safe to re-run — fully idempotent
-- ═══════════════════════════════════════════════════════════

-- ── Post Comments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  content    text NOT NULL CHECK (char_length(content) <= 500),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read comments"  ON post_comments;
DROP POLICY IF EXISTS "Users insert own comments" ON post_comments;
DROP POLICY IF EXISTS "Users delete own comments" ON post_comments;
CREATE POLICY "Anyone can read comments"         ON post_comments FOR SELECT USING (true);
CREATE POLICY "Users insert own comments"        ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments"        ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- ── XP + Level on Profiles ────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp    integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- ── Achievements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL,
  type      text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, type)
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read achievements"  ON achievements;
DROP POLICY IF EXISTS "Users insert own achievements" ON achievements;
CREATE POLICY "Anyone can read achievements"  ON achievements FOR SELECT USING (true);
CREATE POLICY "Users insert own achievements" ON achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Playbook Progress ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS playbook_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  lesson_id    text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE playbook_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own playbook progress" ON playbook_progress;
CREATE POLICY "Users manage own playbook progress" ON playbook_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
