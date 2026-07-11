-- Media support for posts
-- Run in Supabase SQL Editor

ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url  text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('image', 'video'));

-- Storage bucket for post media (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "post_media_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "post_media_auth_upload"   ON storage.objects;
DROP POLICY IF EXISTS "post_media_owner_delete"  ON storage.objects;

CREATE POLICY "post_media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "post_media_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "post_media_owner_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
