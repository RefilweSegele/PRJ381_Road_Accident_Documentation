-- 015: real WebODM pipeline.
-- * Status flow becomes: draft -> uploaded -> processing -> processed (or failed).
--   The old triggers jumped straight to 'processed' without any 3D model.
-- * processing_jobs now holds ONE row per processing run (WebODM ids, progress, log).
-- * damage_detections gains the fields the viewer / PDF need.

-- 1. processing_jobs: one row per run -----------------------------------------
UPDATE processing_jobs
   SET status = 'failed', error_message = 'Superseded by the WebODM pipeline'
 WHERE status IN ('queued', 'running');

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS webodm_project_id INTEGER,
  ADD COLUMN IF NOT EXISTS webodm_task_id    TEXT,
  ADD COLUMN IF NOT EXISTS quality           TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS image_count       INTEGER,
  ADD COLUMN IF NOT EXISTS warning           TEXT,
  ADD COLUMN IF NOT EXISTS requested_by      TEXT,
  ADD COLUMN IF NOT EXISTS started_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_processing_jobs_case_latest
  ON processing_jobs (case_id, id DESC);

-- Only one active run per case (also protects against double-clicks).
CREATE UNIQUE INDEX IF NOT EXISTS uq_processing_jobs_one_active
  ON processing_jobs (case_id) WHERE status IN ('queued', 'running');

-- 2. scene_models ---------------------------------------------------------------
ALTER TABLE scene_models
  ADD COLUMN IF NOT EXISTS georeferenced BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. damage_detections ----------------------------------------------------------
ALTER TABLE damage_detections
  ADD COLUMN IF NOT EXISTS bbox       JSONB,
  ADD COLUMN IF NOT EXISTS img_width  INTEGER,
  ADD COLUMN IF NOT EXISTS img_height INTEGER,
  ADD COLUMN IF NOT EXISTS area_pct   DOUBLE PRECISION;

-- 4. Capture status: images + flight log => 'uploaded' (ready to process) ------
CREATE OR REPLACE FUNCTION refresh_case_capture_status(p_case_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE cases AS c
  SET status = CASE
        WHEN EXISTS (SELECT 1 FROM case_images i WHERE i.case_id = p_case_id)
         AND EXISTS (SELECT 1 FROM flight_logs f WHERE f.case_id = p_case_id)
          THEN 'uploaded'
        ELSE 'draft'
      END,
      updated_at = NOW()
  WHERE c.id = p_case_id
    AND c.status IN ('draft', 'uploaded');   -- never touch processing/processed/reviewed/failed
END;
$$ LANGUAGE plpgsql;

-- 5. Cases marked 'processing'/'processed' by the old trigger but with no 3D model
UPDATE cases c
SET status = CASE
      WHEN EXISTS (SELECT 1 FROM case_images i WHERE i.case_id = c.id)
       AND EXISTS (SELECT 1 FROM flight_logs f WHERE f.case_id = c.id)
        THEN 'uploaded'
      ELSE 'draft'
    END,
    updated_at = NOW()
WHERE c.status IN ('processing', 'processed')
  AND NOT EXISTS (SELECT 1 FROM scene_models s WHERE s.case_id = c.id);