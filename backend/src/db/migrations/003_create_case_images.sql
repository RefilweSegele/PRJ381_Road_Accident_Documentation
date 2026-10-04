-- Depends on cases(id) INTEGER from the DB team schema (DAIAS_DB.sql). Run AFTER that dump is loaded.
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