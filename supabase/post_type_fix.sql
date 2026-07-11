-- Add 'vibe' to the posts type check constraint
-- Run in Supabase SQL Editor

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_type_check;

ALTER TABLE posts ADD CONSTRAINT posts_type_check
  CHECK (type IN ('win', 'progress', 'lesson', 'vibe', 'update', 'question', 'reflection'));
