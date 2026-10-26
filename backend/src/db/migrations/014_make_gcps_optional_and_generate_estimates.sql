-- DJI Neo cases can proceed with imagery and a flight log. GCPs are optional;
-- application code generates clearly labelled estimates from the case position
-- when real points were not supplied.
CREATE OR REPLACE FUNCTION refresh_case_capture_status(p_case_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE cases AS c
  SET status = CASE
    WHEN EXISTS (SELECT 1 FROM case_images i WHERE i.case_id = p_case_id)
     AND EXISTS (SELECT 1 FROM flight_logs f WHERE f.case_id = p_case_id)
      THEN 'processed'
    ELSE 'processing'
  END,
  updated_at = NOW()
  WHERE c.id = p_case_id
    AND c.status IN ('draft', 'uploaded', 'processing');
END;
$$ LANGUAGE plpgsql;

SELECT refresh_case_capture_status(id)
FROM cases
WHERE status IN ('draft', 'uploaded', 'processing');
