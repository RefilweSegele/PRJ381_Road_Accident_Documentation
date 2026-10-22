const express = require("express");
const jwt = require("jsonwebtoken");
const { login } = require("../controllers/authController");
const router = express.Router();
router.post("/login", login);
const authenticateToken = (req, res, next) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: "JWT_SECRET is not configured" });
  }
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ error: "Access token missing" });
  jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] }, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  }
  next();
};
module.exports = { router, authenticateToken, authorizeRoles };
