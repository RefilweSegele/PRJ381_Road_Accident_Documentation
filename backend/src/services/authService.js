
const pool = require("../config/db");

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, role, status
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

async function createUser({ name, email, passwordHash, role }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id, name, email, role, status, created_at`,
    [name, email, passwordHash, role]
  );

  return rows[0];
}

module.exports = {
  findUserByEmail,
  createUser
};
