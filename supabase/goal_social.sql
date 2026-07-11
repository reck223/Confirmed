-- Goal social layer: reactions + comments
-- Run this in Supabase SQL Editor

-- ── Reactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    uuid        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('fire', 'believe', 'cheer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(goal_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS goal_reactions_goal_idx ON goal_reactions(goal_id);
CREATE INDEX IF NOT EXISTS goal_reactions_user_idx ON goal_reactions(user_id);

ALTER TABLE goal_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_reactions_select" ON goal_reactions;
DROP POLICY IF EXISTS "goal_reactions_insert" ON goal_reactions;
DROP POLICY IF EXISTS "goal_reactions_delete" ON goal_reactions;

CREATE POLICY "goal_reactions_select" ON goal_reactions FOR SELECT USING (true);
CREATE POLICY "goal_reactions_insert" ON goal_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goal_reactions_delete" ON goal_reactions FOR DELETE USING (auth.uid() = user_id);

-- ── Comments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    uuid        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_comments_goal_idx ON goal_comments(goal_id);

ALTER TABLE goal_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_comments_select" ON goal_comments;
DROP POLICY IF EXISTS "goal_comments_insert" ON goal_comments;
DROP POLICY IF EXISTS "goal_comments_delete" ON goal_comments;

CREATE POLICY "goal_comments_select" ON goal_comments FOR SELECT USING (true);
CREATE POLICY "goal_comments_insert" ON goal_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goal_comments_delete" ON goal_comments FOR DELETE USING (auth.uid() = user_id);
