-- 009 denormalised case_id onto damage_detections but didn't enforce it.
-- A plain FK can't express "vehicle_id must belong to the same case_id as
-- image_id" across three tables, so this needs a trigger.

CREATE OR REPLACE FUNCTION check_detection_case_consistency()
RETURNS TRIGGER AS $$
DECLARE
  image_case_id INTEGER;
  vehicle_case_id INTEGER;
BEGIN
  SELECT case_id INTO image_case_id FROM case_images WHERE id = NEW.image_id;

  IF image_case_id IS NULL THEN
    RAISE EXCEPTION 'damage_detections.image_id % does not exist', NEW.image_id;
  END IF;

  IF NEW.case_id IS DISTINCT FROM image_case_id THEN
    RAISE EXCEPTION
      'damage_detections.case_id (%) does not match case_images.case_id (%) for image_id %',
      NEW.case_id, image_case_id, NEW.image_id;
  END IF;

  IF NEW.vehicle_id IS NOT NULL THEN
    SELECT case_id INTO vehicle_case_id FROM vehicles WHERE id = NEW.vehicle_id;

    IF vehicle_case_id IS NULL THEN
      RAISE EXCEPTION 'damage_detections.vehicle_id % does not exist', NEW.vehicle_id;
    END IF;

    IF vehicle_case_id IS DISTINCT FROM image_case_id THEN
      RAISE EXCEPTION
        'vehicle_id % belongs to case % but image_id % belongs to case %',
        NEW.vehicle_id, vehicle_case_id, NEW.image_id, image_case_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detection_case_consistency ON damage_detections;
CREATE TRIGGER trg_detection_case_consistency
  BEFORE INSERT OR UPDATE ON damage_detections
  FOR EACH ROW
  EXECUTE FUNCTION check_detection_case_consistency();
