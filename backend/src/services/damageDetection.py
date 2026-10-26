"""
Car damage detection (YOLOv8 segmentation: crack / dent / scratch).

CLI:  python damageDetection.py <image_path> [--conf 0.25] [--no-image]

Prints exactly ONE line of JSON on stdout:
{
  "image": {"width": W, "height": H},
  "detections": [{"damage_class", "confidence_score", "polygon_coords", "bbox"}],
  "annotated_image": "<base64 JPEG>"        # omitted with --no-image
}
All model / library logging goes to stderr so stdout stays parseable.
"""
import argparse
import base64
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageOps

# BGR colours per class (OpenCV order)
CLASS_COLOURS = {
    "crack": (38, 38, 220),     # red
    "dent": (11, 119, 217),     # amber
    "scratch": (237, 130, 59),  # blue
}
DEFAULT_COLOUR = (166, 70, 124)


def load_image_bgr(path):
    """Load an image the way a person sees it: apply EXIF rotation (phone
    photos) and drop alpha. Returns a BGR uint8 array, which is what
    ultralytics expects for numpy input."""
    img = Image.open(path)
    img = ImageOps.exif_transpose(img).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def draw_detections(image_bgr, detections):
    """Return a copy of the image with translucent masks, outlines and labels."""
    out = image_bgr.copy()
    h, w = out.shape[:2]
    scale = max(w, h) / 1000.0
    thickness = max(2, int(round(2 * scale)))
    font_scale = max(0.5, 0.6 * scale)

    overlay = out.copy()
    for d in detections:
        pts = np.array(d["polygon_coords"], dtype=np.int32)
        colour = CLASS_COLOURS.get(d["damage_class"], DEFAULT_COLOUR)
        if len(pts) >= 3:
            cv2.fillPoly(overlay, [pts], colour)
        else:  # box-only model fallback
            x1, y1, x2, y2 = [int(v) for v in d["bbox"]]
            cv2.rectangle(overlay, (x1, y1), (x2, y2), colour, -1)
    out = cv2.addWeighted(overlay, 0.4, out, 0.6, 0)

    for d in detections:
        colour = CLASS_COLOURS.get(d["damage_class"], DEFAULT_COLOUR)
        pts = np.array(d["polygon_coords"], dtype=np.int32)
        if len(pts) >= 3:
            cv2.polylines(out, [pts], True, colour, thickness, cv2.LINE_AA)
        x1, y1, x2, y2 = [int(v) for v in d["bbox"]]
        cv2.rectangle(out, (x1, y1), (x2, y2), colour, max(1, thickness - 1), cv2.LINE_AA)

        label = f'{d["damage_class"]} {d["confidence_score"] * 100:.0f}%'
        (tw, th), base = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
        ty = y1 if y1 - th - base - 4 >= 0 else y1 + th + base + 4
        cv2.rectangle(out, (x1, ty - th - base - 4), (x1 + tw + 8, ty), colour, -1)
        cv2.putText(out, label, (x1 + 4, ty - base - 2), cv2.FONT_HERSHEY_SIMPLEX,
                    font_scale, (255, 255, 255), 1, cv2.LINE_AA)
    return out


def encode_jpeg_b64(image_bgr, quality=90):
    ok, buf = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise RuntimeError("Could not encode annotated image")
    return base64.b64encode(buf.tobytes()).decode("ascii")


class CarDamageDetector:
    def __init__(self, model_path=None):
        from ultralytics import YOLO  # imported lazily so draw_detections is testable without it
        if not model_path:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, "../../models/best.pt")
        self.model = YOLO(model_path)

    def analyze_array(self, image_bgr, conf=0.25):
        results = self.model.predict(image_bgr, conf=conf, verbose=False)
        detections = []
        for r in results:
            if r.boxes is None:
                continue
            has_masks = r.masks is not None
            for i in range(len(r.boxes)):
                cls_id = int(r.boxes.cls[i])
                polygon = r.masks.xy[i].tolist() if has_masks else []
                detections.append({
                    "damage_class": self.model.names[cls_id],
                    "confidence_score": float(r.boxes.conf[i]),
                    "polygon_coords": polygon,  # [[x, y], ...] in original-image pixels
                    "bbox": [float(v) for v in r.boxes.xyxy[i].tolist()],
                })
        detections.sort(key=lambda d: d["confidence_score"], reverse=True)
        return detections

    def analyze_image(self, image_path, conf=0.25):
        return self.analyze_array(load_image_bgr(image_path), conf)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path")
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--no-image", action="store_true")
    args = parser.parse_args()

    # Anything printed while loading/running the model must not reach stdout.
    real_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        image = load_image_bgr(args.image_path)
        detections = CarDamageDetector().analyze_array(image, args.conf)
        payload = {
            "image": {"width": int(image.shape[1]), "height": int(image.shape[0])},
            "detections": detections,
        }
        if not args.no_image:
            payload["annotated_image"] = encode_jpeg_b64(draw_detections(image, detections))
    finally:
        sys.stdout = real_stdout
    print(json.dumps(payload))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # surface a readable error to Node
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)