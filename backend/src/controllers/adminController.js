const adminService = require("../services/adminService");
function validId(value) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; }
function sendError(error, res, next) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  return next(error);
}

exports.listUsers = async (req, res, next) => {
  try {
    const users = await adminService.listUsers({ search: String(req.query.search || "").slice(0, 160), role: req.query.role, status: req.query.status });
    return res.json({ users });
  } catch (error) { return sendError(error, res, next); }
};
exports.createUser = async (req, res, next) => {
  try { const user = await adminService.createUser(req.body || {}); return res.status(201).json({ user }); }
  catch (error) { return sendError(error, res, next); }
};
exports.updateUser = async (req, res, next) => {
  try {
    const id = validId(req.params.userId);
    if (!id) return res.status(400).json({ error: "userId must be a positive integer" });
    if (req.user?.userId && Number(req.user.userId) === id && req.body?.status === "disabled") return res.status(400).json({ error: "You cannot disable your own account" });
    const user = await adminService.updateUser(id, req.body || {});
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (error) { return sendError(error, res, next); }
};
exports.listJobs = async (req, res, next) => {
  try { const jobs = await adminService.listPipelineJobs(); return res.json({ jobs, source: "case status snapshot; no dedicated job table is present yet" }); }
  catch (error) { return next(error); }
};
