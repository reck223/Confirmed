-- Post visibility: public (anyone) or circle (members only)
-- Run in Supabase SQL Editor
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'circle'
  CHECK (visibility IN ('public', 'circle'));
