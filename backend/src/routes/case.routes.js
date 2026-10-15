const express = require("express");
const router = express.Router();
const caseController = require("../controllers/caseController");
const { authenticateToken, authorizeRoles } = require("./auth.routes");

const ALL_ROLES = ["admin", "insurer", "law_enforcement", "investigator"];
const WRITE_ROLES = ["investigator", "admin"];

// Reviewer Endpoints (Integrated here)
router.get("/review/cases", authenticateToken, authorizeRoles(...ALL_ROLES), caseController.searchCases || caseController.getCases);
router.get("/review/cases/:id", authenticateToken, authorizeRoles(...ALL_ROLES), caseController.getCaseForReview || caseController.getCase);

// Core Case Endpoints
router.get("/stats", authenticateToken, authorizeRoles(...ALL_ROLES), caseController.getStats); // must come before /:id so "stats" isn't parsed as an id
router.get("/", authenticateToken, authorizeRoles(...ALL_ROLES), caseController.getCases);
router.get("/:id", authenticateToken, authorizeRoles(...ALL_ROLES), caseController.getCase);
router.post("/", authenticateToken, authorizeRoles(...WRITE_ROLES), caseController.createCase);
router.patch("/:id", authenticateToken, authorizeRoles(...WRITE_ROLES), caseController.updateCase);
router.delete("/:id", authenticateToken, authorizeRoles("admin"), caseController.deleteCase);

module.exports = router;
