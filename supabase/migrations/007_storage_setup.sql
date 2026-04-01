INSERT INTO storage.buckets (id, name, public)
VALUES ('clock_drawings', 'clock_drawings', false)
ON CONFLICT (id) DO NOTHING;

-- Restrict access properly

CREATE POLICY "Authenticated users can upload clock drawings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'clock_drawings'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their own clock drawings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'clock_drawings'
);
