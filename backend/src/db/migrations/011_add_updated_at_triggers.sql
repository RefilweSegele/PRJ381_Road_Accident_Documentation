-- Every service currently sets updated_at by hand (caseService does,
-- flightLogService does; vehicleService and imageService don't, which is
-- how case_images and vehicles rows end up with a stale updated_at).
-- One trigger function removes the need to remember this per-query.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cases', 'vehicles', 'damage_detections', 'flight_logs',
    'users', 'processing_jobs', 'scene_models'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
       CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- case_images and gcp_points and reports intentionally have no updated_at:
-- they're immutable upload/import records, not editable rows.
