const express = require("express");
const router = express.Router();
const caseController = require("../controllers/caseController");
const { authenticateToken, authorizeRoles } = require("./auth.routes");

// NOTE: once auth middleware exists, these routes should be
// wrapped with requireAuth (and requireRole('investigator') where relevant).
// Left open for now so the API is testable before auth lands.

router.get("/stats", authenticateToken, authorizeRoles("admin", "insurer", "law_enforcement", "investigator"), caseController.getStats); // must come before /:id so "stats" isn't parsed as an id
router.get("/", authenticateToken, authorizeRoles("admin", "insurer", "law_enforcement", "investigator"), caseController.getCases);
router.get("/:id", authenticateToken, authorizeRoles("admin", "insurer", "law_enforcement", "investigator"), caseController.getCase);
router.post("/", authenticateToken, authorizeRoles("investigator", "admin"), caseController.createCase);
router.patch("/:id", authenticateToken, authorizeRoles("investigator", "admin"), caseController.updateCase);
router.delete("/:id", authenticateToken, authorizeRoles("admin"), caseController.deleteCase);

module.exports = router;
