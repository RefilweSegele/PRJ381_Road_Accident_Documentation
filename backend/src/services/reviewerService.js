const caseService = require("./caseService");
const pool = require("../config/db");

/*
Reviewer-facing case detail - resuses caseService's base case shape and adds the review-only data (model path, scale factor, ML classification).
*/
const REVIEWABLE_STATUSES = ["processed", "reviewed"];

async function getReviewableCaseById(id) {
    const { rows } = await pool.query(
        `SELECT id, case_reference, incident_address, latitude, longitude, incident_date, status, assigned_investigator FROM cases WHERE id = $1`,
        [id]
    )

    if (rows.length === 0) return null;

    const c = rows[0];

    return {
        id: c.id,
        caseReference: c.case_reference,
        incidentAddress: c.incident_address,
        latitude: c.latitude,
        longitude: c.longitude,
        incidentDate:c.incident_date,
        status: c.status,
        assignedInvestigator: c.assigned_investigator,
        modelUrl: null, //wire once model table exists
        scaleFactor: null, //wire once calibration output exists
        damageBoxes: [], //wire once detection table exists
    };
}

async function searchCases({ search, dateFrom, dateTo }) {
    // The portal lists completed cases; date bounds include both selected calendar days.
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

    // Pending count is global and does not change with the completed-case filters.
    const [casesResult, pendingResult] = await Promise.all([
        pool.query(
            `SELECT id, case_reference, incident_address, incident_date, status
             FROM cases
             WHERE ${conditions.join(" AND ")}
             ORDER BY incident_date DESC NULLS LAST, created_at DESC`,
            params,
        ),
        pool.query(`SELECT COUNT(*) FROM cases WHERE status = 'processed'`),
    ]);

    return {
        cases: casesResult.rows.map((r) => ({
            // Keep the display case number separate from the detail-route database ID.
            id: r.id,
            caseId: r.case_reference,
            // Coordinates, claims, citations, and completion time are absent from this schema.
            location: r.incident_address,
            incidentDate: r.incident_date,
            status: r.status,
            claimNumber: null,
            insurerName: null,
            chargeReference: null,
        })),
        pendingReviewCount: Number(pendingResult.rows[0].count),
        avgTurnaroundDays: null,
    };
}

module.exports = {
    getReviewableCaseById, searchCases,
};