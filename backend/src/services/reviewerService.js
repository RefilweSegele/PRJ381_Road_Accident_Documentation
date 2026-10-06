const caseService = require("./caseService");
const pool = require("../config/db");

/*
Reviewer-facing case detail - resuses caseService's base case shape and adds the review-only data (model path, scale factor, ML classification).
*/

async function getReviewableCaseByID(id) {
    const caseData = await caseService.getCaseById(id);
    if (!caseData) return null;

    return {
        ...caseData,
        modelUrl: null, //wire real model file path
        scaleFactor: null, //wire calibration output (Member 6)
        damageBoxes: [], //wire to ML classification output
    };
}

async function searchCases({ search, dateFrom, dateTo }) {
    // The portal lists completed cases; date bounds include both selected calendar days.
    const conditions = ['status = $1'];
    const params = ["COMPLETED"];

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`("caseNumber"::text ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    if (dateFrom) {
        params.push(dateFrom);
        conditions.push(`("accidentDate")::date >= $${params.length}::date`);
    }
    if (dateTo) {
        params.push(dateTo);
        conditions.push(`("accidentDate")::date <= $${params.length}::date`);
    }

    // Pending count is global and does not change with the completed-case filters.
    const [casesResult, pendingResult] = await Promise.all([
        pool.query(
            `SELECT id, "caseNumber", description, "accidentDate", status
             FROM cases
             WHERE ${conditions.join(" AND ")}
             ORDER BY "accidentDate" DESC NULLS LAST, "createdAt" DESC`,
            params,
        ),
        pool.query("SELECT COUNT(*) FROM cases WHERE status = $1", ["PENDING"]),
    ]);

    return {
        cases: casesResult.rows.map((row) => ({
            // Keep the display case number separate from the detail-route database ID.
            id: row.id,
            caseId: row.caseNumber,
            // Coordinates, claims, citations, and completion time are absent from this schema.
            location: null,
            incidentDate: row.accidentDate,
            status: row.status === "COMPLETED" ? "Complete" : row.status,
            claimNumber: null,
            insurerName: null,
            chargeReference: null,
        })),
        pendingReviewCount: Number(pendingResult.rows[0].count),
        avgTurnaroundDays: null,
    };
}

module.exports = {
    getReviewableCaseByID,
    searchCases,
};