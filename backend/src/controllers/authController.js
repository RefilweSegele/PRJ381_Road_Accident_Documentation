const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'daias_super_secret_key';

// Demo accounts are deliberately defined on the server: the selected role is
// never accepted as an authority claim from the browser. Replace this map with
// a users-table lookup/SSO provider when deploying beyond the demonstration.
const DEMO_USERS = {
  "investigator@daias.demo": { id: 1, role: "investigator" },
  "insurer@daias.demo": { id: 2, role: "insurer" },
  "law@daias.demo": { id: 3, role: "law_enforcement" },
  "admin@daias.demo": { id: 4, role: "admin" },
};

const ROLES = new Set(["investigator", "insurer", "law_enforcement", "admin"]);

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' },
  );
}

async function register(req, res) {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "");
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email address is required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!ROLES.has(role)) {
      return res.status(400).json({ error: "Choose a valid demo role" });
    }
    if (DEMO_USERS[normalizedEmail] || await authService.findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    const user = await authService.createUser({
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role,
    });
    res.status(201).json({ message: "Demo account created", token: issueToken(user), role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Unable to create account" });
  }
}

const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const registeredUser = await authService.findUserByEmail(normalizedEmail);
    const demoUser = DEMO_USERS[normalizedEmail];
    const user = registeredUser || (demoUser && { ...demoUser, email: normalizedEmail });
    if (!user || (role && role !== user.role)) {
      return res.status(401).json({ error: "Invalid email, password, or role" });
    }

    const isPasswordValid = registeredUser
      ? await bcrypt.compare(password || "", registeredUser.password_hash)
      : password === "SecurePassword123!";
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = issueToken(user);

    res.status(200).json({
      message: 'Authentication successful',
      token,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

module.exports = { login, register };
