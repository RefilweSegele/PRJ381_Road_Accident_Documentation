const express = require("express");
const router = express.Router();
const gcpController = require("../controllers/gcpController");
const requireCase = require("../middleware/requireCase");
const uploadGcpFile = require("../middleware/uploadGcpFile");

// Mounted at /api/cases. As with images, verify the case BEFORE multer reads the body.
router.post("/:id/gcps/import", requireCase, uploadGcpFile, gcpController.importGcps);
router.post("/:id/gcps", requireCase, gcpController.saveGcps);
router.get("/:id/gcps", requireCase, gcpController.listGcps);
router.delete("/:id/gcps", requireCase, gcpController.clearGcps);

module.exports = router;
