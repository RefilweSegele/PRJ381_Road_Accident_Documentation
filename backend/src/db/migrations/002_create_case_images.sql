-- Image metadata for uploaded aerial photos.
-- Stores the storage KEY (a path like cases/12/images/<uuid>.jpg) only —
-- never the image bytes, and not a full URL either (the URL is derived
-- from the key at read time, so moving host or storage driver needs no
-- data migration).
CREATE TABLE IF NOT EXISTS case_images (
  id UUID PRIMARY KEY,  -- same UUID that appears in the storage key
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  storage_key TEXT UNIQUE NOT NULL,
  original_filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_case_images_case_id ON case_images (case_id);
 
-- NOTE: ON DELETE CASCADE removes these ROWS when a case is deleted, but
-- Postgres can't delete the files on disk / in S3. caseService.deleteCase
-- needs to remove the stored objects too, or they'll be orphaned.