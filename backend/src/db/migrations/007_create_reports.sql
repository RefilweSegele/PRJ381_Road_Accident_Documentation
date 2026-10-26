-- Stores a frozen snapshot of the case data used to generate each report.
-- Measurements/findings remain empty unless a reviewer actually supplies them.
--
-- generated_by was originally free TEXT in the member-9 branch; 006 (this
-- consolidated set) now creates `users` first, so it's a real FK here.
CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  generated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Forensic Road Accident Report',
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_case_id_created_at
  ON reports (case_id, created_at DESC);
