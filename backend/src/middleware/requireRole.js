// Usage: requireRole("admin") or requireRole("admin", "investigator")
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: insufficient permissions" });
  }
  next();
};
