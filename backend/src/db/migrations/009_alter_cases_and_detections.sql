-- Adds columns CaseIntakeForm.jsx already collects and discards
-- (accidentType, description), plus the reviewer-side fields
-- SearchPortal.jsx expects (claimNumber, insurerName, chargeReference)
-- that currently come back null because no columns back them.

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS accident_type TEXT
    CHECK (accident_type IN ('collision', 'single_vehicle', 'pedestrian', 'other')),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS claim_number TEXT,
  ADD COLUMN IF NOT EXISTS insurer_name TEXT,
  ADD COLUMN IF NOT EXISTS charge_reference TEXT;

-- damage_detections.confidence_score was never range-checked, so a bad
-- value from the ML service (e.g. > 1 or negative) would insert silently.
ALTER TABLE damage_detections
  ADD CONSTRAINT chk_confidence_score CHECK (confidence_score BETWEEN 0 AND 1);

-- Nothing currently stops a detection from pairing an image_id from one
-- case with a vehicle_id from a different case. Enforcing this at the DB
-- level needs case_id denormalised onto damage_detections (a straight FK
-- composite isn't possible since vehicle_id is nullable/SET NULL).
ALTER TABLE damage_detections
  ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE;

-- Backfill case_id from the linked image for any existing rows.
UPDATE damage_detections dd
SET case_id = ci.case_id
FROM case_images ci
WHERE dd.image_id = ci.id AND dd.case_id IS NULL;

ALTER TABLE damage_detections
  ALTER COLUMN case_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_damage_detections_case_id ON damage_detections (case_id);
