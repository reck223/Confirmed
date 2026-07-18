-- Circle Covenant + Season System
-- Run this in the Supabase SQL editor.
--
-- Adds covenant (what the circle stands for), season duration/dates,
-- and a status field. Circles that go inactive expire at season end.

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS covenant         text,
  ADD COLUMN IF NOT EXISTS season_duration  int  NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS season_start     date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS season_end       date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'active';

ALTER TABLE public.circles
  DROP CONSTRAINT IF EXISTS circles_status_check;

ALTER TABLE public.circles
  ADD CONSTRAINT circles_status_check CHECK (status IN ('active', 'warning', 'expired'));

-- Back-fill any existing circles with a 30-day season starting from created_at
UPDATE public.circles
SET
  season_duration = 30,
  season_start    = COALESCE(created_at::date, CURRENT_DATE),
  season_end      = COALESCE(created_at::date, CURRENT_DATE) + INTERVAL '30 days',
  status          = 'active'
WHERE season_start IS NULL OR season_end IS NULL;
