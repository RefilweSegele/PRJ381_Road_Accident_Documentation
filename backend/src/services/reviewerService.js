const pool = require("../config/db");
const { ensureSceneModelForCase } = require("./captureStatusService");

const REVIEWABLE_STATUSES = ["processed", "reviewed"];

async function getReviewableCaseById(id) {
    const [caseRes, modelRes, detectionsRes] = await Promise.all([
        pool.query(
            `SELECT id, case_reference, incident_address, latitude, longitude, incident_date, status, assigned_investigator, accident_type, description, claim_number, insurer_name, charge_reference 
             FROM cases 
             WHERE id = $1`,
            [id]
        ),
        pool.query(
            `SELECT model_key, scale_factor 
             FROM scene_models 
             WHERE case_id = $1`,
            [id]
        ),
        pool.query(
            `SELECT id, image_id, vehicle_id, damage_class, severity_level, confidence_score, polygon_coords 
             FROM damage_detections 
             WHERE case_id = $1`,
            [id]
        )
    ]);

    if (caseRes.rows.length === 0) return null;

    const c = caseRes.rows[0];
    let m = modelRes.rows[0] || {};

    // Auto-provision the 3D model for already-processed cases if missing
    if (!m.model_key && REVIEWABLE_STATUSES.includes(c.status)) {
        const generatedUrl = await ensureSceneModelForCase(c.id);
        if (generatedUrl) {
            m = { model_key: generatedUrl, scale_factor: null };
        }
    }

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
        modelUrl: m.model_key || null,
        scaleFactor: m.scale_factor || null,
        damageBoxes: detectionsRes.rows.map((d) => ({
            id: d.id,
            imageId: d.image_id,
            vehicleId: d.vehicle_id,
            damageClass: d.damage_class,
            severityLevel: d.severity_level,
            confidenceScore: d.confidence_score,
            polygonCoords: d.polygon_coords,
        })),
    };
}

async function searchCases({ search, dateFrom, dateTo }) {
    const conditions = ["status = ANY($1)"];
    const params = [REVIEWABLE_STATUSES];

    if (search) {
        params.push(`%${search}%`);
        conditions.push(
            `(case_reference ILIKE $${params.length} OR incident_address ILIKE $${params.length})`
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

    const [casesResult, pendingResult] = await Promise.all([
        pool.query(
            `SELECT id, case_reference, incident_address, incident_date, status, claim_number, insurer_name, charge_reference
             FROM cases
             WHERE ${conditions.join(" AND ")}
             ORDER BY incident_date DESC NULLS LAST, created_at DESC`,
            params
        ),
        pool.query(`SELECT COUNT(*) FROM cases WHERE status = 'processed'`),
    ]);

    return {
        cases: casesResult.rows.map((r) => ({
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