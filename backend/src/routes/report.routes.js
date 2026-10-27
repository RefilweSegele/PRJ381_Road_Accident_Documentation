const express = require("express");
const controller = require("../controllers/reportController");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
// Reports are available to authenticated case-workflow roles only.
router.use(requireAuth, requireRole("investigator", "insurer", "law_enforcement", "admin"));
router.post("/cases/:caseId/reports", controller.createForCase);
router.get("/cases/:caseId/reports", controller.listForCase);
router.get("/reports/:reportId", controller.getOne);
router.get("/reports/:reportId/pdf", controller.downloadPdf);
module.exports = router;
