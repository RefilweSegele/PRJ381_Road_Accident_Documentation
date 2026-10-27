import React from "react";

export const CLASS_COLORS = { crack: "#dc2626", dent: "#d9770b", scratch: "#3b82f6" };
const FALLBACK = "#7c46a6";
export const colorFor = (cls) => CLASS_COLORS[String(cls).toLowerCase()] || FALLBACK;
export const labelFor = (cls, conf) => {
  const name = String(cls);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} (${(conf * 100).toFixed(1)}%)`;
};

// Draws detections on top of an image or canvas of size width x height.
// Each item: { cls, conf, polygon: [[x,y],...], bbox: [x1,y1,x2,y2] } in pixels of that image.
export function PolygonLayer({ width, height, items }) {
  if (!width || !height) return null;
  return (
    <div className="dv-det-layer">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {items.map((d, i) => {
          const c = colorFor(d.cls);
          const pts = d.polygon && d.polygon.length >= 3
            ? d.polygon
            : d.bbox ? [[d.bbox[0], d.bbox[1]], [d.bbox[2], d.bbox[1]], [d.bbox[2], d.bbox[3]], [d.bbox[0], d.bbox[3]]] : [];
          if (pts.length < 3) return null;
          return (
            <polygon
              key={i}
              points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
              fill={c} fillOpacity="0.35" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {items.map((d, i) => {
        const b = d.bbox || (d.polygon && d.polygon.length ? [
          Math.min(...d.polygon.map((p) => p[0])), Math.min(...d.polygon.map((p) => p[1])), 0, 0] : null);
        if (!b) return null;
        return (
          <div
            key={i}
            className="dv-det-label"
            style={{ left: `${(b[0] / width) * 100}%`, top: `${(b[1] / height) * 100}%`, background: colorFor(d.cls) }}
          >
            {labelFor(d.cls, d.conf)}
          </div>
        );
      })}
    </div>
  );
}

// Overlay for the live 3D-view detection result (API shape: snake_case).
export default function DetectionOverlay({ result, filters }) {
  if (!result) return null;
  const items = result.detections
    .filter((d) => filters.classes[d.damage_class] !== false && d.confidence_score >= filters.minConf)
    .map((d) => ({ cls: d.damage_class, conf: d.confidence_score, polygon: d.polygon_coords, bbox: d.bbox }));
  return <PolygonLayer width={result.width} height={result.height} items={items} />;
}