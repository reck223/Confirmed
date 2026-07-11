-- ═══════════════════════════════════════════════════════════
-- Circle Sessions: Accountability Sessions + RSVPs
-- Safe to re-run — fully idempotent
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS circle_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id    uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL,
  title        text NOT NULL CHECK (char_length(title) <= 100),
  description  text CHECK (char_length(description) <= 500),
  scheduled_at timestamptz NOT NULL,
  meeting_url  text,
  status       text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS circle_sessions_circle_id_idx ON circle_sessions(circle_id);
CREATE INDEX IF NOT EXISTS circle_sessions_scheduled_at_idx ON circle_sessions(scheduled_at);
ALTER TABLE circle_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Circle members read sessions"   ON circle_sessions;
DROP POLICY IF EXISTS "Circle members create sessions" ON circle_sessions;
DROP POLICY IF EXISTS "Creators delete sessions"       ON circle_sessions;
CREATE POLICY "Circle members read sessions"   ON circle_sessions FOR SELECT USING (
  circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid())
);
CREATE POLICY "Circle members create sessions" ON circle_sessions FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid())
);
CREATE POLICY "Creators delete sessions"       ON circle_sessions FOR DELETE USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS session_rsvps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES circle_sessions(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  status     text NOT NULL CHECK (status IN ('going', 'maybe', 'cant_make_it')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);
CREATE INDEX IF NOT EXISTS session_rsvps_session_id_idx ON session_rsvps(session_id);
ALTER TABLE session_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read rsvps"    ON session_rsvps;
DROP POLICY IF EXISTS "Users manage own rsvp"    ON session_rsvps;
CREATE POLICY "Anyone can read rsvps" ON session_rsvps FOR SELECT USING (true);
CREATE POLICY "Users manage own rsvp" ON session_rsvps FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
