const processing = require("../services/processingService");
const webodm = require("../services/webodmClient");

// POST /api/cases/:id/process   body: { quality?: "draft" | "standard" | "high" }
async function start(req, res, next) {
  try {
    const job = await processing.startProcessing(req.caseId, {
      quality: req.body?.quality || "standard",
      requestedBy: req.user?.email || null,
    });
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
}

// GET /api/cases/:id/process/status
async function status(req, res, next) {
  try {
    res.json(await processing.getStatus(req.caseId));
  } catch (error) {
    next(error);
  }
}

// POST /api/cases/:id/process/cancel
async function cancel(req, res, next) {
  try {
    res.json({ job: await processing.cancelProcessing(req.caseId) });
  } catch (error) {
    next(error);
  }
}

// GET /api/webodm/health  - answers "can the backend reach WebODM and log in?"
async function health(req, res) {
  try {
    res.json(await webodm.health());
  } catch (error) {
    res.status(error.status === 503 ? 503 : 502).json({ ok: false, error: error.message });
  }
}

module.exports = { start, status, cancel, health };