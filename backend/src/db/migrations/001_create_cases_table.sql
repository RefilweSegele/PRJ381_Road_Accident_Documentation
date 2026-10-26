-- Core case metadata table.
-- Vehicle details live in a separate table, linked by case_id.
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  case_reference TEXT UNIQUE NOT NULL,
  incident_address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  incident_date TIMESTAMPTZ NOT NULL,
  -- Constrained to the exact statuses the frontend's StatusTag component knows about.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'uploaded', 'processing', 'processed', 'reviewed', 'failed')),
  -- Plain text for now — becomes a proper FK to users(id) once
  -- auth/users table exists. Kept nullable and unconstrained so this
  -- migration doesn't depend on work landing first.
  assigned_investigator TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence used to generate human-readable case references like 2026-0001.
CREATE SEQUENCE IF NOT EXISTS case_reference_seq START 1;

-- Speeds up the common filter/sort operations the dashboard uses.
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_incident_date ON cases (incident_date);
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases (updated_at);