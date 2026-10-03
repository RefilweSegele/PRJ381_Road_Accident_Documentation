const express = require("express");
const router = express.Router();
const reviewerController = require("../controllers/reviewerController");

/*
    add requireAuth and requireRole when member 1 middleware exists and requireRole.js in the agreed file structure
*/ 

//GET /api/reviewer/cases/:id. Filtered, reviewer-facing case detail: metadata and model path and scale factor and damage classification output
router.get("/cases/:id", reviewerController.getCaseForReview);

module.exports = router;