const express = require("express");
const router = express.Router();
const damageController = require("../controllers/damageController");
const uploadDamageImage = require("../middleware/uploadDamageImage");
const { authenticateToken, authorizeRoles } = require("./auth.routes");

const ALL_ROLES = ["admin", "insurer", "law_enforcement", "investigator"];

// POST /api/damage/analyze — unofficial test endpoint, not tied to a case.
router.post("/analyze", authenticateToken, authorizeRoles(...ALL_ROLES), uploadDamageImage, damageController.analyzeDamage);

module.exports = router;