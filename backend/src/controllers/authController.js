
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authService = require("../services/authService");

const ROLES = new Set([
  "investigator",
  "insurer",
  "law_enforcement"
]);

function hasValidJwtSecret() {
  return typeof process.env.JWT_SECRET === "string" &&
    process.env.JWT_SECRET.length >= 32;
}

function issueToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h",
      algorithm: "HS256"
    }
  );
}

async function register(req, res) {
  try {
    if (!hasValidJwtSecret()) {
      return res.status(503).json({
        error: "JWT_SECRET must be configured (at least 32 characters)"
      });
    }

    const { name, email, password, role } = req.body || {};

    const normalizedName =
      typeof name === "string" ? name.trim() : "";

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedName) {
      return res.status(400).json({
        error: "Name is required"
      });
    }

    if (
      normalizedEmail.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        error: "A valid email address is required"
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters"
      });
    }

    if (!ROLES.has(role)) {
      return res.status(400).json({
        error: "Invalid registration role"
      });
    }

    const existingUser =
      await authService.findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        error: "An account with that email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await authService.createUser({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role
    });

    return res.status(201).json({
      message: "Account created",
      token: issueToken(user),
      role: user.role
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "An account with that email already exists"
      });
    }

    console.error("Registration failed:", error);
    return res.status(500).json({
      error: "Unable to create account"
    });
  }
}

async function login(req, res) {
  try {
    if (!hasValidJwtSecret()) {
      return res.status(503).json({
        error: "JWT_SECRET must be configured (at least 32 characters)"
      });
    }

    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254
    ) {
      return res.status(400).json({
        error: "Valid email and password are required"
      });
    }

    const user = await authService.findUserByEmail(email.trim());

    if (
      !user ||
      user.status !== "active" ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    return res.status(200).json({
      message: "Authentication successful",
      token: issueToken(user),
      role: user.role
    });

  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      error: "Internal server error during login"
    });
  }
}

module.exports = { login, register };
