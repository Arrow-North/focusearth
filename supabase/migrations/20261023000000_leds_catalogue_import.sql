-- Catalogue import: widen the existing `leds` bucket and add admin-scoped write
-- policies for the new `<company-slug>/<type-slug>/...` object layout.
--
-- Everything here is ADDITIVE. The four policies created by
-- 20260322000000_leds_bucket.sql are intentionally left untouched: a separate
-- legacy feature still writes to `<auth.uid()>/...` paths in this same bucket
-- and relies on them. The public-read policy is likewise left as-is.

------------------------------------------------------------
-- 1. Widen the accepted MIME types
------------------------------------------------------------
-- The original list (jpeg/png/webp/gif/pdf) omits formats that real
-- manufacturer catalogues use heavily: bmp and tiff from older product
-- databases, svg for vector line-art, avif from modern CDNs.
-- The 50 MB file_size_limit and the bucket's public flag are unchanged.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/avif',
  'application/pdf'
]
WHERE id = 'leds';

------------------------------------------------------------
-- 2. Admin write policies for catalogue-import object keys
------------------------------------------------------------
-- NOTE: the `resolve-led-asset` edge function uploads with the SERVICE ROLE
-- key, which bypasses RLS entirely. These policies therefore do not gate the
-- import pipeline. They exist so that
--   (a) an admin can inspect / fix / delete catalogue objects from the Supabase
--       Studio storage browser while signed in as themselves, and
--   (b) any future client-side write path (e.g. a manual "replace this image"
--       button in the admin UI) works without a new migration.
--
-- Scope: `public.is_admin()` is the repo's existing SECURITY DEFINER helper
-- (see 20260128001300_rls_policies.sql); it resolves
-- `public.profiles.type IN ('SUPERADMIN', 'Sa', 'Au')` for `auth.uid()`.
--
-- The `array_length(storage.foldername(name), 1) >= 2` guard restricts these
-- policies to the two-or-more-segment catalogue layout
-- (`<company-slug>/<type-slug>/<product-id><suffix>.<ext>`), so they never
-- widen access to the single-segment legacy `<auth.uid()>/<file>` paths.

DROP POLICY IF EXISTS "Admins can insert catalogue LED assets" ON storage.objects;
CREATE POLICY "Admins can insert catalogue LED assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'leds'
    AND array_length(storage.foldername(name), 1) >= 2
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update catalogue LED assets" ON storage.objects;
CREATE POLICY "Admins can update catalogue LED assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'leds'
    AND array_length(storage.foldername(name), 1) >= 2
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'leds'
    AND array_length(storage.foldername(name), 1) >= 2
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete catalogue LED assets" ON storage.objects;
CREATE POLICY "Admins can delete catalogue LED assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'leds'
    AND array_length(storage.foldername(name), 1) >= 2
    AND public.is_admin()
  );
