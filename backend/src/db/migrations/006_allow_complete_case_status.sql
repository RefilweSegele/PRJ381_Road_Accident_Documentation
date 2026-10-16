DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'cases'::regclass
      AND conname = 'cases_status_check'
      AND pg_get_constraintdef(oid) NOT LIKE '%Complete%'
  ) THEN
    ALTER TABLE cases DROP CONSTRAINT cases_status_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'cases'::regclass
      AND conname = 'cases_status_check'
  ) THEN
    ALTER TABLE cases
      ADD CONSTRAINT cases_status_check
      CHECK (status IN ('draft', 'uploaded', 'processing', 'processed', 'reviewed', 'failed', 'Complete'));
  END IF;
END $$;
