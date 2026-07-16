-- ═══════════════════════════════════════════════════════════════════════════
-- MANIFEST — Initial Schema
-- Run this FIRST in Supabase SQL Editor, then run the other migration files.
-- Drops and recreates all base tables — safe for fresh setup, clears bad state.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Wipe any partial/broken state first ──────────────────────────────────────
-- CASCADE drops any orphaned tables that referenced these (goal_reactions, etc.)
DROP TABLE IF EXISTS journal_entries       CASCADE;
DROP TABLE IF EXISTS post_reactions        CASCADE;
DROP TABLE IF EXISTS post_comments         CASCADE;
DROP TABLE IF EXISTS posts                 CASCADE;
DROP TABLE IF EXISTS messages              CASCADE;
DROP TABLE IF EXISTS follows               CASCADE;
DROP TABLE IF EXISTS assessment_comments   CASCADE;
DROP TABLE IF EXISTS assessments           CASCADE;
DROP TABLE IF EXISTS circle_sessions       CASCADE;
DROP TABLE IF EXISTS session_rsvps         CASCADE;
DROP TABLE IF EXISTS circle_members        CASCADE;
DROP TABLE IF EXISTS circles               CASCADE;
DROP TABLE IF EXISTS goal_entries          CASCADE;
DROP TABLE IF EXISTS goal_reactions        CASCADE;
DROP TABLE IF EXISTS goal_comments         CASCADE;
DROP TABLE IF EXISTS goal_books            CASCADE;
DROP TABLE IF EXISTS goal_milestones       CASCADE;
DROP TABLE IF EXISTS goals                 CASCADE;
DROP TABLE IF EXISTS profiles              CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user()  CASCADE;

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                  TEXT UNIQUE,
  full_name                 TEXT,
  avatar_url                TEXT,
  cover_url                 TEXT,
  bio                       TEXT,
  tagline                   TEXT,
  streak                    INTEGER NOT NULL DEFAULT 0,
  assessments_submitted     INTEGER NOT NULL DEFAULT 0,
  goals_complete            INTEGER NOT NULL DEFAULT 0,
  xp                        INTEGER NOT NULL DEFAULT 0,
  level                     INTEGER NOT NULL DEFAULT 1,
  cover_theme               TEXT NOT NULL DEFAULT 'dark',
  assessment_day            TEXT NOT NULL DEFAULT 'Sun',
  assessment_time           TEXT NOT NULL DEFAULT '20:00',
  focus_areas               TEXT[] NOT NULL DEFAULT '{}',
  pinned_goal_id            UUID,
  date_of_birth             DATE,
  circle_module_complete    BOOLEAN NOT NULL DEFAULT FALSE,
  circle_creator_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  circle_creator_requested  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select') THEN
    CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update') THEN
    CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert') THEN
    CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Goals ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  category        TEXT,
  visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','circle','public')),
  progress        INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','complete','paused','archived')),
  deadline        DATE,
  next_action     TEXT,
  why_it_matters  TEXT,
  goal_type       TEXT NOT NULL DEFAULT 'standard' CHECK (goal_type IN ('standard','reading','letter','habit','savings','travel')),
  completed_date  DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='goals' AND policyname='goals_own') THEN
    CREATE POLICY "goals_own" ON goals FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='goals' AND policyname='goals_public_select') THEN
    CREATE POLICY "goals_public_select" ON goals FOR SELECT USING (visibility = 'public');
  END IF;
END $$;

-- ── Goal Milestones ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_milestones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  due_date   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS goal_milestones_goal_idx ON goal_milestones(goal_id);
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='goal_milestones' AND policyname='milestones_own') THEN
    CREATE POLICY "milestones_own" ON goal_milestones FOR ALL
      USING (EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_id AND goals.user_id = auth.uid()));
  END IF;
END $$;

-- ── Goal Books (reading-goal tracker) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_books (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id       UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  author        TEXT,
  cover_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'queue' CHECK (status IN ('queue','reading','read')),
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  date_finished DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS goal_books_goal_idx ON goal_books(goal_id);
ALTER TABLE goal_books ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='goal_books' AND policyname='goal_books_own') THEN
    CREATE POLICY "goal_books_own" ON goal_books FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Assessments (weekly reflections) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 10),
  wins         TEXT,
  challenges   TEXT,
  lessons      TEXT,
  intentions   TEXT,
  gratitude    TEXT,
  week_title   TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);
CREATE INDEX IF NOT EXISTS assessments_user_idx ON assessments(user_id);
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='assessments' AND policyname='assessments_own') THEN
    CREATE POLICY "assessments_own" ON assessments FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Assessment Comments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE assessment_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='assessment_comments' AND policyname='assessment_comments_select') THEN
    CREATE POLICY "assessment_comments_select" ON assessment_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='assessment_comments' AND policyname='assessment_comments_own') THEN
    CREATE POLICY "assessment_comments_own" ON assessment_comments FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Circles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='circles' AND policyname='circles_select') THEN
    CREATE POLICY "circles_select" ON circles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='circles' AND policyname='circles_insert') THEN
    CREATE POLICY "circles_insert" ON circles FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- ── Circle Members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circle_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);
CREATE INDEX IF NOT EXISTS circle_members_user_idx ON circle_members(user_id);
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='circle_members' AND policyname='circle_members_select') THEN
    CREATE POLICY "circle_members_select" ON circle_members FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='circle_members' AND policyname='circle_members_own') THEN
    CREATE POLICY "circle_members_own" ON circle_members FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id  UUID REFERENCES circles(id) ON DELETE SET NULL,
  type       TEXT NOT NULL DEFAULT 'win' CHECK (type IN ('win','lesson','milestone','progress','question','vibe')),
  content    TEXT NOT NULL,
  media_url  TEXT,
  media_type TEXT CHECK (media_type IN ('image','video')),
  visibility TEXT NOT NULL DEFAULT 'circle' CHECK (visibility IN ('private','circle','public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS posts_user_idx      ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_circle_idx    ON posts(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_idx   ON posts(created_at DESC);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='posts_select') THEN
    CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='posts_own') THEN
    CREATE POLICY "posts_own" ON posts FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Post Reactions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('fire','strong','relate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, type)
);
CREATE INDEX IF NOT EXISTS post_reactions_post_idx ON post_reactions(post_id);
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='post_reactions_select') THEN
    CREATE POLICY "post_reactions_select" ON post_reactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='post_reactions_own') THEN
    CREATE POLICY "post_reactions_own" ON post_reactions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Follows ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS follows_follower_idx  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_select') THEN
    CREATE POLICY "follows_select" ON follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_own') THEN
    CREATE POLICY "follows_own" ON follows FOR ALL USING (auth.uid() = follower_id);
  END IF;
END $$;

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx    ON messages(sender_id, created_at DESC);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_own') THEN
    CREATE POLICY "messages_own" ON messages FOR ALL
      USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
  END IF;
END $$;

-- ── Journal Entries ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('gratitude','write','cbt','checkin')),
  content    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS journal_entries_user_idx ON journal_entries(user_id, created_at DESC);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_entries' AND policyname='journal_own') THEN
    CREATE POLICY "journal_own" ON journal_entries FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Storage buckets ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars',    'avatars',    true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers',     'covers',     true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT DO NOTHING;

-- Avatar storage policies
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('avatars','covers') AND auth.uid() IS NOT NULL);
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE USING (bucket_id IN ('avatars','covers') AND auth.uid()::text = (storage.foldername(name))[1]);

-- Post media storage policies
DROP POLICY IF EXISTS "post_media_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "post_media_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "post_media_owner_delete" ON storage.objects;
CREATE POLICY "post_media_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "post_media_auth_upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "post_media_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
