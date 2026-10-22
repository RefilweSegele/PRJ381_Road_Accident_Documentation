const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(503).json({ error: "JWT_SECRET must be configured (at least 32 characters)" });
    }
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || email.length > 254) {
      return res.status(400).json({ error: "Valid email and password are required" });
    }
    const result = await pool.query(
      "SELECT id, email, password_hash, role, status FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email.trim()]
    );
    const user = result.rows[0];
    if (!user || user.status !== "active" || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h", algorithm: "HS256" }
    );
    return res.status(200).json({ message: "Authentication successful", token, role: user.role });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Internal server error during login" });
  }
};
module.exports = { login };
