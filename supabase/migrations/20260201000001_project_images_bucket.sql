-- Create a public storage bucket for project images (if it doesn't already exist).
-- Images are publicly readable so they can be rendered in <img> tags without auth.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated user to upload project images.
CREATE POLICY "Authenticated users can upload project images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-images');

-- Allow public read access (bucket is public).
CREATE POLICY "Public read access for project images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project-images');

-- Allow authenticated users to update their own uploads.
CREATE POLICY "Users can update own project images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own uploads.
CREATE POLICY "Users can delete own project images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-images' AND (storage.foldername(name))[1] = auth.uid()::text);
