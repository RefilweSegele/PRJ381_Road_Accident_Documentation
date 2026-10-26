const pool = require("../config/db");
const { getStorageService } = require("../storage/storageService");

/*
  Case detail for the 3D viewer / reviewers / the PDF generator.
  Returns the case, its 3D model URL + scale, flight telemetry, GCPs and every
  stored damage detection (with the source drone image URL for evidence views).
*/
const REVIEWABLE_STATUSES = ["processed", "reviewed"];

async function getReviewableCaseById(id) {
  const [caseRes, modelRes, detectionsRes, flightRes, gcpRes, imageRes] = await Promise.all([
    pool.query(
      `SELECT id, case_reference, incident_address, latitude, longitude, incident_date, status,
              assigned_investigator, accident_type, description, claim_number, insurer_name, charge_reference
         FROM cases WHERE id = $1`,
      [id],
    ),
    pool.query(
      `SELECT model_key, format, scale_factor, georeferenced, file_size_bytes, updated_at
         FROM scene_models WHERE case_id = $1`,
      [id],
    ),
    pool.query(
      `SELECT d.id, d.image_id, d.vehicle_id, d.damage_class, d.severity_level, d.confidence_score,
              d.polygon_coords, d.bbox, d.img_width, d.img_height, d.area_pct, i.storage_key
         FROM damage_detections d
         JOIN case_images i ON i.id = d.image_id
        WHERE d.case_id = $1
        ORDER BY d.confidence_score DESC
        LIMIT 1000`,
      [id],
    ),
    pool.query(
      `SELECT mission_id, drone_model, flight_date, pilot_name, site_location, gps_lat, gps_lon,
              altitude_agl_m, overlap_front_pct, overlap_side_pct, battery_count, wind_speed_kmh
         FROM flight_logs WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id],
    ),
    pool.query(
      `SELECT point_id, latitude, longitude, elevation, source_filename
         FROM gcp_points WHERE case_id = $1 ORDER BY point_id`,
      [id],
    ),
    pool.query("SELECT COUNT(*)::int AS n FROM case_images WHERE case_id = $1", [id]),
  ]);

  if (caseRes.rows.length === 0) return null;
  const c = caseRes.rows[0];
  const m = modelRes.rows[0] || null;
  const f = flightRes.rows[0] || null;
  const storage = getStorageService();

  const damageBoxes = detectionsRes.rows.map((d) => ({
    id: d.id,
    imageId: d.image_id,
    imageUrl: storage.getUrl(d.storage_key),
    imageWidth: d.img_width,
    imageHeight: d.img_height,
    vehicleId: d.vehicle_id,
    damageClass: d.damage_class,
    severityLevel: d.severity_level,
    confidenceScore: d.confidence_score,
    areaPct: d.area_pct,
    polygonCoords: d.polygon_coords,
    bbox: d.bbox,
    // aliases kept for older UI / report code that used these names
    damageType: d.damage_class,
    confidence: d.confidence_score,
  }));

  const byClass = {};
  for (const d of damageBoxes) byClass[d.damageClass] = (byClass[d.damageClass] || 0) + 1;

  return {
    id: c.id,
    caseReference: c.case_reference,
    incidentAddress: c.incident_address,
    latitude: c.latitude,
    longitude: c.longitude,
    incidentDate: c.incident_date,
    status: c.status,
    assignedInvestigator: c.assigned_investigator,
    accidentType: c.accident_type,
    description: c.description,
    claimNumber: c.claim_number,
    insurerName: c.insurer_name,
    chargeReference: c.charge_reference,

    // 3D scene (the URL needs the Authorization header - the viewer handles that)
    modelUrl: m ? `${storage.getUrl(m.model_key)}?v=${new Date(m.updated_at).getTime()}` : null,
    modelFormat: m ? m.format : null,
    modelGeoreferenced: m ? m.georeferenced : false,
    modelSizeBytes: m ? m.file_size_bytes : null,
    scaleFactor: m ? m.scale_factor : null, // 1 = metres, null = unknown scale

    imageCount: imageRes.rows[0].n,
    flightLog: f && {
      missionId: f.mission_id,
      droneModel: f.drone_model,
      flightDate: f.flight_date,
      pilotName: f.pilot_name,
      siteLocation: f.site_location,
      gpsLat: f.gps_lat,
      gpsLon: f.gps_lon,
      altitudeAglM: f.altitude_agl_m,
      overlapFrontPct: f.overlap_front_pct,
      overlapSidePct: f.overlap_side_pct,
      batteryCount: f.battery_count,
      windSpeedKmh: f.wind_speed_kmh,
    },
    gcps: gcpRes.rows.map((g) => ({
      id: g.point_id,
      latitude: g.latitude,
      longitude: g.longitude,
      elevation: g.elevation,
      estimated: g.source_filename === "AUTO_GENERATED_ESTIMATE_NOT_SURVEY_CONTROL",
    })),
    damageSummary: { total: damageBoxes.length, byClass },
    damageBoxes,
  };
}

async function searchCases({ search, dateFrom, dateTo }) {
  // The portal lists completed cases; date bounds include both selected calendar days.
  const conditions = ["status = ANY($1)"];
  const params = [REVIEWABLE_STATUSES];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(case_reference ILIKE $${params.length} OR incident_address ILIKE $${params.length})`,
    );
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`incident_date::date >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`incident_date::date <= $${params.length}::date`);
  }

  // Pending count is global and does not change with the completed-case filters.
  const [casesResult, pendingResult] = await Promise.all([
    pool.query(
      `SELECT id, case_reference, incident_address, incident_date, status, claim_number, insurer_name, charge_reference
         FROM cases
        WHERE ${conditions.join(" AND ")}
        ORDER BY incident_date DESC NULLS LAST, created_at DESC`,
      params,
    ),
    pool.query("SELECT COUNT(*) FROM cases WHERE status = 'processed'"),
  ]);

  return {
    cases: casesResult.rows.map((r) => ({
      // Keep the display case number separate from the detail-route database ID.
      id: r.id,
      caseId: r.case_reference,
      location: r.incident_address,
      incidentDate: r.incident_date,
      status: r.status,
      claimNumber: r.claim_number,
      insurerName: r.insurer_name,
      chargeReference: r.charge_reference,
    })),
    pendingReviewCount: Number(pendingResult.rows[0].count),
    avgTurnaroundDays: null,
  };
}

module.exports = {
  getReviewableCaseById,
  searchCases,
};