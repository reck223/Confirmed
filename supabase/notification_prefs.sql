-- Notification preferences — push notifications were fully wired up
-- (push_subscriptions, cron/streak-reminder, circle activity pushes,
-- cron/digest emails) with zero user-facing control: PushRegistrar fires
-- the OS permission prompt on every app-shell mount with no explanation,
-- and there was no way to mute one notification type without revoking
-- push permission entirely. Columns on profiles, matching how the other
-- simple per-user settings (assessment_day/assessment_time) already work,
-- not a separate table.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_circle_activity boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_streak_reminder boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_digest   boolean NOT NULL DEFAULT true;
