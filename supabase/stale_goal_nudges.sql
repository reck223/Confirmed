-- Stalled-goal coach: lets the daily cron know which goals it's already
-- nudged about and when, so the same quiet goal doesn't get pinged every
-- single day. goals.updated_at is now maintained as a real "last activity"
-- timestamp (see toggleMilestone/recalcEntryProgress/markBookDone in
-- goals/actions.ts) so it's a trustworthy staleness signal on its own.
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS stale_nudge_sent_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_goal_recommendations boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_stale_goal_nudge     boolean NOT NULL DEFAULT true;
