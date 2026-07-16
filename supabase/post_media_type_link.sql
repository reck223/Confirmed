-- Allow 'link' as a valid media_type on posts
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_media_type_check
  CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'link'));
