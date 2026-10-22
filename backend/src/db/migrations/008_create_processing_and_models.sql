-- Persists ODM pipeline progress (replaces the in-memory `processingJobs`
-- object in role6-process-status, which loses state on server restart)
-- and the resulting 3D scene model output per case.

CREATE TABLE IF NOT EXISTS processing_jobs (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Matches ODM_PIPELINE_STAGES keys in ProcessingStatus.routes.js:
  -- GCP_ALIGNMENT, FEATURE_MATCHING, POINT_CLOUD, MESH_TEXTURING,
  -- GEOSPATIAL_PRODUCTS, MODEL_OPTIMIZATION
  stage TEXT NOT NULL,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),

  log TEXT NOT NULL DEFAULT '',          -- append-only log lines, newline-separated
  error_message TEXT,                    -- set when status = 'failed'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_case_id ON processing_jobs (case_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs (status);

-- One scene model per case (re-processing overwrites, it doesn't duplicate).
-- model_key follows the same convention as case_images.storage_key: a path,
-- not a URL, so the URL is derived at read time and storage can move without
-- a data migration.
CREATE TABLE IF NOT EXISTS scene_models (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,

  model_key TEXT NOT NULL,               -- e.g. cases/12/model/scene.glb
  format TEXT NOT NULL DEFAULT 'gltf' CHECK (format IN ('gltf', 'glb', 'obj')),
  scale_factor DOUBLE PRECISION CHECK (scale_factor > 0),  -- NULL until calibrated

  vertex_count INTEGER,
  file_size_bytes INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scene_models_case_id ON scene_models (case_id);
