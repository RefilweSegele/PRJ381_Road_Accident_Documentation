const express = require("express");
const router = express.Router();
const caseController = require("../controllers/caseController");

// NOTE: once auth middleware exists, these routes should be
// wrapped with requireAuth (and requireRole('investigator') where relevant).
// Left open for now so the API is testable before auth lands.

router.get("/stats", caseController.getStats); // must come before /:id so "stats" isn't parsed as an id
router.get("/", caseController.getCases);
router.get("/:id", caseController.getCase);
router.post("/", caseController.createCase);
router.patch("/:id", caseController.updateCase);
router.delete("/:id", caseController.deleteCase);

module.exports = router;
