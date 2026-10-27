-- Stores a frozen snapshot of the case data used to generate each report.
-- Measurements/findings remain empty unless a reviewer actually supplies them.
CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  generated_by TEXT,
  title TEXT NOT NULL DEFAULT 'Forensic Road Accident Report',
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_case_id_created_at
  ON reports (case_id, created_at DESC);
