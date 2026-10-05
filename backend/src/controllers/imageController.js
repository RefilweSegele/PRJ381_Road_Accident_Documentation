const upload = require("../config/upload");
const imageService = require("../services/imageService");

// POST /api/cases/:id/upload/images — batch JPEG upload.
// requireCase + multer have already run: req.caseId is a verified case and
// req.files are validated-size temp files awaiting the magic-byte check.
async function uploadImages(req, res, next) {
    try {
        const images = await imageService.saveImages(req.caseId, req.files);
        res.status(201).json({
            caseId: req.caseId,
            uploaded: images.length,
            images
        });

    } catch (error) {
        next(error);
    }
}

// GET /api/cases/:id/images — list a case's images.
async function listImages(req, res, next) {
    try {
        const images = await imageService.listImagesByCase(req.caseId);
        res.json( {caseId: req.caseId, total: images.length, images});
    } catch (error) {
        next(error);
    }
}

module.exports = { uploadImages, listImages };