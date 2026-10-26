const express = require("express");
const router = express.Router();
const reviewerController = require("../../controllers/reviewerController");
const { authenticateToken, authorizeRoles } = require("../auth.routes");

const REVIEW_ROLES = authorizeRoles("admin", "insurer", "law_enforcement", "investigator");

// GET /api/review/cases — processed and reviewed cases shown in SearchPortal.
router.get("/cases", authenticateToken, REVIEW_ROLES, reviewerController.searchCases);
// GET /api/review/cases/:id — reviewer-facing case detail.
router.get("/cases/:id", authenticateToken, REVIEW_ROLES, reviewerController.getCaseForReview);

module.exports = router;