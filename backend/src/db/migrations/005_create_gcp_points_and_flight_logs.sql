-- Ground control points (imported from CSV/TXT or posted as JSON) and manual
-- flight notes, both linked to a case. Depends on cases(id) INTEGER.

CREATE TABLE IF NOT EXISTS gcp_points (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  point_id TEXT NOT NULL,                       -- marker label from the file, e.g. "GCP3"
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  elevation DOUBLE PRECISION,                   -- metres; nullable (file may omit it)
  source_filename TEXT,                         -- NULL when posted as JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, point_id)
);

CREATE TABLE IF NOT EXISTS flight_logs (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  drone_model TEXT NOT NULL DEFAULT 'DJI Neo',
  flight_date DATE NOT NULL,
  flight_time TIME,
  pilot_name TEXT NOT NULL,
  site_location TEXT NOT NULL,
  gps_lat DOUBLE PRECISION NOT NULL CHECK (gps_lat BETWEEN -90 AND 90),
  gps_lon DOUBLE PRECISION NOT NULL CHECK (gps_lon BETWEEN -180 AND 180),
  altitude_agl_m DOUBLE PRECISION NOT NULL CHECK (altitude_agl_m > 0),
  flight_speed_ms DOUBLE PRECISION NOT NULL CHECK (flight_speed_ms > 0),
  overlap_front_pct SMALLINT NOT NULL DEFAULT 80 CHECK (overlap_front_pct BETWEEN 0 AND 100),
  overlap_side_pct SMALLINT NOT NULL DEFAULT 70 CHECK (overlap_side_pct BETWEEN 0 AND 100),
  battery_count SMALLINT NOT NULL CHECK (battery_count >= 1),
  est_duration_min DOUBLE PRECISION NOT NULL CHECK (est_duration_min > 0),
  prop_guards BOOLEAN NOT NULL DEFAULT FALSE,
  weather_condition TEXT NOT NULL,
  wind_speed_kmh DOUBLE PRECISION NOT NULL CHECK (wind_speed_kmh >= 0),
  visibility_km DOUBLE PRECISION NOT NULL CHECK (visibility_km > 0),
  temperature_c DOUBLE PRECISION,
  mission_type TEXT NOT NULL DEFAULT 'accident-scene',
  operator_notes TEXT NOT NULL DEFAULT '',
  checklist JSONB NOT NULL DEFAULT '[]',        -- [{ id, checked }]
  warnings JSONB NOT NULL DEFAULT '[]',         -- validator warnings at save time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, mission_id)
);
