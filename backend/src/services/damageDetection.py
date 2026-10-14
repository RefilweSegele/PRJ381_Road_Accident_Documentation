import sys
import json
from ultralytics import YOLO
import os

class CarDamageDetector:
    def __init__(self, model_path=None):
        if not model_path:
            # Resolves path relative to this script: backend/models/best.pt
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, '../../models/best.pt')
        self.model = YOLO(model_path)

    def analyze_image(self, image_path):
        results = self.model(image_path)
        detections = []
        for r in results:
            if r.masks is not None:
                for i, seg in enumerate(r.masks.xy):
                    cls_id = int(r.boxes.cls[i])
                    conf = float(r.boxes.conf[i])
                    detections.append({
                        "damage_class": self.model.names[cls_id],
                        "confidence_score": conf,
                        "polygon_coords": seg.tolist() # High-precision JSONB polygon points
                    })
        return detections

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        detector = CarDamageDetector()
        results = detector.analyze_image(image_path)
        print(json.dumps(results))
    else:
        print(json.dumps([]))