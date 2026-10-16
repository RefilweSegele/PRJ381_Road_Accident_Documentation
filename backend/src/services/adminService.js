const pool = require("../config/db");
const bcrypt = require("bcrypt");

const ALLOWED_ROLES = new Set(["investigator", "insurer", "law_enforcement", "admin"]);
const ALLOWED_STATUSES = new Set(["active", "disabled"]);

async function listUsers({ search = "", role, status } = {}) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (role) {
    if (!ALLOWED_ROLES.has(role)) throw Object.assign(new Error("Invalid role"), { status: 400 });
    params.push(role); conditions.push(`role = $${params.length}`);
  }
  if (status) {
    if (!ALLOWED_STATUSES.has(status)) throw Object.assign(new Error("Invalid status"), { status: 400 });
    params.push(status); conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT id, name, email, role, status, created_at, updated_at FROM users ${where} ORDER BY created_at DESC LIMIT 200`, params);
  return result.rows;
}

async function createUser({ name, email, password, role }) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 160) throw Object.assign(new Error("name is required (maximum 160 characters)"), { status: 400 });
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw Object.assign(new Error("A valid email is required"), { status: 400 });
  if (typeof password !== "string" || password.length < 12 || password.length > 200) throw Object.assign(new Error("password must be between 12 and 200 characters"), { status: 400 });
  if (!ALLOWED_ROLES.has(role)) throw Object.assign(new Error("Invalid role"), { status: 400 });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, status, created_at, updated_at`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, role]);
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") throw Object.assign(new Error("A user with this email already exists"), { status: 409 });
    throw error;
  }
}

async function updateUser(id, updates) {
  const allowed = {};
  if (updates.name !== undefined) {
    if (typeof updates.name !== "string" || !updates.name.trim() || updates.name.trim().length > 160) throw Object.assign(new Error("name must be non-empty and at most 160 characters"), { status: 400 });
    allowed.name = updates.name.trim();
  }
  if (updates.role !== undefined) {
    if (!ALLOWED_ROLES.has(updates.role)) throw Object.assign(new Error("Invalid role"), { status: 400 });
    allowed.role = updates.role;
  }
  if (updates.status !== undefined) {
    if (!ALLOWED_STATUSES.has(updates.status)) throw Object.assign(new Error("Invalid status"), { status: 400 });
    allowed.status = updates.status;
  }
  const keys = Object.keys(allowed);
  if (!keys.length) throw Object.assign(new Error("Provide name, role, or status to update"), { status: 400 });
  const params = keys.map((key) => allowed[key]);
  const sets = keys.map((key, index) => `${key} = $${index + 1}`);
  sets.push("updated_at = NOW()");
  params.push(id);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}
     RETURNING id, name, email, role, status, created_at, updated_at`, params);
  return result.rows[0] || null;
}

// There is no dedicated jobs table in this snapshot. Return cases whose
// statuses indicate pipeline work, clearly identifying these as case-derived.
async function listPipelineJobs() {
  const result = await pool.query(
    `SELECT id, case_reference, status, created_at, updated_at
     FROM cases WHERE status IN ('uploaded', 'processing', 'processed', 'failed')
     ORDER BY updated_at DESC LIMIT 200`);
  return result.rows.map((row) => ({
    id: `CASE-${row.id}`,
    caseId: row.id,
    caseReference: row.case_reference,
    pipeline: "case-processing",
    status: row.status,
    progress: row.status === "processed" ? 100 : row.status === "failed" ? 0 : row.status === "processing" ? null : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: "cases.status",
  }));
}

module.exports = { listUsers, createUser, updateUser, listPipelineJobs };
