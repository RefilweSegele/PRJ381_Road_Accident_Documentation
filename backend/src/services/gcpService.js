const pool = require("../config/db");

const COLUMNS = `id, case_id AS "caseId", point_id AS "pointId", latitude, longitude, elevation,
                 source_filename AS "sourceFilename", created_at AS "createdAt"`;

// mode "replace": the case's GCP set becomes exactly `points` (one transaction).
// mode "append":  upsert by (case, point_id); existing points are updated.
async function savePoints(caseId, points, { mode = "replace", sourceFilename = null } = {}) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        if (mode === "replace") {
            await client.query("DELETE FROM gcp_points WHERE case_id = $1", [caseId]);
        }
        await client.query(
            `INSERT INTO gcp_points (case_id, point_id, latitude, longitude, elevation, source_filename)
             SELECT $1::int, u.point_id, u.lat, u.lon, u.elev, $6::text
             FROM unnest($2::text[], $3::float8[], $4::float8[], $5::float8[])
                  AS u(point_id, lat, lon, elev)
             ON CONFLICT (case_id, point_id) DO UPDATE
               SET latitude = EXCLUDED.latitude,
                   longitude = EXCLUDED.longitude,
                   elevation = EXCLUDED.elevation,
                   source_filename = EXCLUDED.source_filename`,
            [
                caseId,
                points.map((p) => p.pointId),
                points.map((p) => p.latitude),
                points.map((p) => p.longitude),
                points.map((p) => p.elevation),
                sourceFilename,
            ],
        );
        const { rows } = await client.query(
            `SELECT ${COLUMNS} FROM gcp_points WHERE case_id = $1 ORDER BY id`, [caseId]);
        await client.query("COMMIT");
        return rows;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function listPoints(caseId) {
    const { rows } = await pool.query(
        `SELECT ${COLUMNS} FROM gcp_points WHERE case_id = $1 ORDER BY id`, [caseId]);
    return rows;
}

async function deletePoints(caseId) {
    const { rowCount } = await pool.query("DELETE FROM gcp_points WHERE case_id = $1", [caseId]);
    return rowCount;
}

// cases.latitude / longitude are nullable (the intake form may not have a pin).
async function getCaseLocation(caseId) {
    const { rows } = await pool.query("SELECT latitude, longitude FROM cases WHERE id = $1", [caseId]);
    const r = rows[0];
    return r && r.latitude !== null && r.longitude !== null
        ? { latitude: Number(r.latitude), longitude: Number(r.longitude) } : null;
}

module.exports = { savePoints, listPoints, deletePoints, getCaseLocation };
