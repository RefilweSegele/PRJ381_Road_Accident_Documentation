-- Keep reviewer visibility correct even if capture records are inserted by a
-- different API process, an import tool, or a future background worker.
CREATE OR REPLACE FUNCTION refresh_case_capture_status(p_case_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE cases AS c
  SET status = CASE
    WHEN EXISTS (SELECT 1 FROM case_images i WHERE i.case_id = p_case_id)
     AND EXISTS (SELECT 1 FROM gcp_points g WHERE g.case_id = p_case_id)
     AND EXISTS (SELECT 1 FROM flight_logs f WHERE f.case_id = p_case_id)
      THEN 'processed'
    ELSE 'processing'
  END,
  updated_at = NOW()
  WHERE c.id = p_case_id
    AND c.status IN ('draft', 'uploaded', 'processing');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_refresh_case_capture_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_case_capture_status(OLD.case_id);
    RETURN OLD;
  END IF;

  PERFORM refresh_case_capture_status(NEW.case_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_images_capture_status ON case_images;
CREATE TRIGGER trg_case_images_capture_status
AFTER INSERT OR DELETE ON case_images
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_case_capture_status();

DROP TRIGGER IF EXISTS trg_gcp_points_capture_status ON gcp_points;
CREATE TRIGGER trg_gcp_points_capture_status
AFTER INSERT OR UPDATE OR DELETE ON gcp_points
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_case_capture_status();

DROP TRIGGER IF EXISTS trg_flight_logs_capture_status ON flight_logs;
CREATE TRIGGER trg_flight_logs_capture_status
AFTER INSERT OR UPDATE OR DELETE ON flight_logs
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_case_capture_status();

-- Apply the rule to cases captured before this trigger existed.
SELECT refresh_case_capture_status(id)
FROM cases
WHERE status IN ('draft', 'uploaded', 'processing');
