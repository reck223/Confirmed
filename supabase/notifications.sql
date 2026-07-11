-- Notifications table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  type        text        NOT NULL,
  data        jsonb       NOT NULL DEFAULT '{}',
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_to_user_idx  ON notifications(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx   ON notifications(to_user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications"       ON notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifs"   ON notifications;
DROP POLICY IF EXISTS "Users can mark own notifs read"    ON notifications;

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = to_user_id);

CREATE POLICY "Authenticated can insert notifs"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can mark own notifs read"
  ON notifications FOR UPDATE
  USING (auth.uid() = to_user_id);
