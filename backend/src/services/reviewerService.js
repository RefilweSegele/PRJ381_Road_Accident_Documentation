const caseService = require("./caseService");

/*
Reviewer-facing case detail - resuses caseService's base case shape and adds the review-only data (model path, scale factor, ML classification).
*/

async function getReviewableCaseByID(id) {
    const caseData = await caseService.getCaseById(id);
    if (!caseData) return null;

    return {
        ...caseData,
        modelUrl: null, //wire real model file path
        scaleFactor: null, //wire calibration output (Member 6)
        damageBoxes: [], //wire to ML classification output
    };
}

module.exports = {
    getReviewableCaseByID,
};