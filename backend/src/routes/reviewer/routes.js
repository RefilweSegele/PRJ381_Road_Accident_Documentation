const express = require("express");
const router = express.Router();
const reviewerController = require("../../controllers/reviewerController");

/*
    add requireAuth and requireRole when member 1 middleware exists and requireRole.js in the agreed file structure
*/ 

// GET /api/review/cases — completed cases shown in SearchPortal.
router.get("/cases", reviewerController.searchCases);
// GET /api/review/cases/:id — reviewer-facing case detail.
router.get("/cases/:id", reviewerController.getCaseForReview);

module.exports = router;