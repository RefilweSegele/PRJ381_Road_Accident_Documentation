// Pure measurement maths. Points are [x, y, z] in model units (metres when the
// model is georeferenced - scaleFactor 1).
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const polylineLength = (pts) =>
  pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0);

// Area of a (roughly planar) 3D polygon via Newell's vector-area formula.
export function polygonArea(pts) {
  if (pts.length < 3) return 0;
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1, z1] = pts[i];
    const [x2, y2, z2] = pts[(i + 1) % pts.length];
    nx += (y1 - y2) * (z1 + z2);
    ny += (z1 - z2) * (x1 + x2);
    nz += (x1 - x2) * (y1 + y2);
  }
  return 0.5 * Math.hypot(nx, ny, nz);
}

export const midpoint = (pts) => {
  const n = pts.length;
  return [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / n);
};

// Returns { label, value } for a finished (or in-progress) measurement.
export function describe(item, scale, unit) {
  const k = scale || 1;
  const f = (n) => n.toFixed(2);
  switch (item.kind) {
    case "distance": {
      const v = dist(item.points[0], item.points[1]) * k;
      return { value: v, label: `Distance: ${f(v)} ${unit}` };
    }
    case "polyline": {
      const v = polylineLength(item.points) * k;
      return { value: v, label: `Length: ${f(v)} ${unit}` };
    }
    case "area": {
      const v = polygonArea(item.points) * k * k;
      return { value: v, label: `Area: ${f(v)} ${unit}\u00B2` };
    }
    default: {
      const [x, y, z] = item.points[0].map((n) => n * k);
      return { value: 0, label: `(${f(x)}, ${f(y)}, ${f(z)})` };
    }
  }
}