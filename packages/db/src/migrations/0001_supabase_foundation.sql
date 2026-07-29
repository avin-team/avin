INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES
  (
    'public-media',
    'public-media',
    true,
    26214400,
    ARRAY[
      'image/avif',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm'
    ]
  ),
  (
    'order-files',
    'order-files',
    false,
    52428800,
    NULL
  ),
  (
    'dispute-evidence',
    'dispute-evidence',
    false,
    52428800,
    NULL
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
