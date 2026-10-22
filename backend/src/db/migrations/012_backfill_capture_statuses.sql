-- Bring existing, fully captured cases into the same reviewer-visible state
-- as new uploads. Preserve final reviewer and failure outcomes.
UPDATE cases AS c
SET status = CASE
  WHEN EXISTS (SELECT 1 FROM case_images i WHERE i.case_id = c.id)
   AND EXISTS (SELECT 1 FROM gcp_points g WHERE g.case_id = c.id)
   AND EXISTS (SELECT 1 FROM flight_logs f WHERE f.case_id = c.id)
    THEN 'processed'
  ELSE 'processing'
END,
updated_at = NOW()
WHERE c.status IN ('draft', 'uploaded', 'processing');
