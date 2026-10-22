const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");
const requireCase = require("../middleware/requireCase");
const uploadImages = require("../middleware/uploadImages");
const { authenticateToken, authorizeRoles } = require("./auth.routes");

const ALL_ROLES = ["admin", "insurer", "law_enforcement", "investigator"];
const WRITE_ROLES = ["investigator", "admin"];

// Verify that the case first so bad id never writes files,
// then let multer handle the file upload, then run the pipeline.
router.post("/:id/upload/images", authenticateToken, authorizeRoles(...WRITE_ROLES), requireCase, uploadImages, imageController.uploadImages);
router.get("/:id/images", authenticateToken, authorizeRoles(...ALL_ROLES), requireCase, imageController.listImages);

module.exports = router;xports = router;
