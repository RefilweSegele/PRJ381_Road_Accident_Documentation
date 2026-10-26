const express = require("express");
const controller = require("../controllers/processingController");
const requireCase = require("../middleware/requireCase");
const { authenticateToken, authorizeRoles } = require("./auth.routes");

const ALL_ROLES = ["admin", "insurer", "law_enforcement", "investigator"];
const WRITE_ROLES = ["investigator", "admin"];

// Mounted at /api/cases
const caseRouter = express.Router();
caseRouter.post("/:id/process", authenticateToken, authorizeRoles(...WRITE_ROLES), requireCase, controller.start);
caseRouter.get("/:id/process/status", authenticateToken, authorizeRoles(...ALL_ROLES), requireCase, controller.status);
caseRouter.post("/:id/process/cancel", authenticateToken, authorizeRoles(...WRITE_ROLES), requireCase, controller.cancel);

// Mounted at /api/webodm
const webodmRouter = express.Router();
webodmRouter.get("/health", authenticateToken, authorizeRoles(...WRITE_ROLES), controller.health);

module.exports = { caseRouter, webodmRouter };