-- Create a public storage bucket for LED catalogue images.
-- Images are publicly readable so they can be rendered in <img> tags without auth.
-- Supports larger file sizes (50MB) for PDF specification sheets.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leds',
  'leds',
  true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated user to upload LED images to their own folder.
CREATE POLICY "Authenticated users can upload LED images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'leds'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access (bucket is public).
CREATE POLICY "Public read access for LED images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'leds');

-- Allow authenticated users to update their own uploads.
CREATE POLICY "Users can update own LED images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'leds'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own uploads.
CREATE POLICY "Users can delete own LED images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'leds'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
