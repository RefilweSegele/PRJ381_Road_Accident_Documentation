const reviewerService = require("../services/caseService");
const reviewerSearchService = require("../services/reviewerService");

exports.searchCases = async (req, res) => {
    try {
        const { search, dateFrom, dateTo } = req.query;
        const result = await reviewerSearchService.searchCases({ search, dateFrom, dateTo });
        return res.status(200).json(result);
    } catch (err) {
        console.error("searchCases error:", err);
        return res.status(500).json({ error: "Failed to search reviewer cases" });
    }
};

exports.getCaseForReview = async (req, res) => {
    try {
        const { id } = req.params;
        const caseData = await reviewerService.getReviewableCaseById(id);

        if (!caseData) {
            return res.status(404).json({ error: "Case not found" });
        }

        //cases that have finished processing should be reviewable
        if (!["processed", "reviewed"].includes(caseData.status)) {
            return res.status(409).json({ error: `Case is not ready for review (status: ${caseData.status})`});
        }

        return res.status(200).json(caseData);
    } catch (err) {
        console.error("getCaseForReview error:", err);
        return res.status(500).json({ error: "Failed to fetch case for review" });
    }
};