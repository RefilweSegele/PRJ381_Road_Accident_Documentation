-- Damage detections table for polygon segmentation model outputs.
-- Links directly to case_images and optionally to specific vehicles in a multi-vehicle case.
CREATE TABLE IF NOT EXISTS damage_detections (
  id SERIAL PRIMARY KEY,
  
  -- Foreign keys linking to the uploaded image and the specific vehicle inspected
  image_id UUID NOT NULL REFERENCES case_images(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Model classification and confidence metrics
  damage_class TEXT NOT NULL, -- e.g., 'scratch', 'dent', 'glass_crack', 'bumper_buckle'
  severity_level TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity_level IN ('minor', 'moderate', 'severe', 'total_loss')),
  confidence_score DOUBLE PRECISION NOT NULL,

  -- Polygon segmentation coordinates stored as a JSONB array of vertex points: [[x1, y1], [x2, y2], ...]
  polygon_coords JSONB NOT NULL,

  -- Timestamps mirroring your existing tables style
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Speeds up queries fetching all detections for a specific image or vehicle
CREATE INDEX IF NOT EXISTS idx_damage_detections_image_id ON damage_detections (image_id);
CREATE INDEX IF NOT EXISTS idx_damage_detections_vehicle_id ON damage_detections (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_damage_detections_class ON damage_detections (damage_class);