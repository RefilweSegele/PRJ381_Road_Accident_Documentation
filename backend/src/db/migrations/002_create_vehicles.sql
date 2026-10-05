-- Vehicle details linked to an accident case.
-- One case can have multiple vehicles.

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,

  case_id INTEGER NOT NULL
    REFERENCES cases(id)
    ON DELETE CASCADE,

  registration_number TEXT,
  make TEXT,
  model TEXT,
  colour TEXT,
  vehicle_type TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Speeds up searches for all vehicles belonging to a case.
CREATE INDEX IF NOT EXISTS idx_vehicles_case_id
  ON vehicles (case_id);
