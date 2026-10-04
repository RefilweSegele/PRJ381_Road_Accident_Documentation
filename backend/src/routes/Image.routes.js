const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");
const requireCase = require("../middleware/requireCase");
const uploadImages = require("../middleware/uploadImages");

//Verify that the case first so bad id never writes files,
//then let multer handle the file upload, then run the pipeline.
router.post("/:id/upload/images", requireCase, uploadImages, imageController.uploadImages);
router.get("/:id/images", requireCase, imageController.listImages);

module.exports = router;