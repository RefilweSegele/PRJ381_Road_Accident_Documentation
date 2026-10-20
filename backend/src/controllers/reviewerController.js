const reviewerService = require("../services/reviewerService.searchCases");

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

        // Same integer check as requireCase: a non-numeric id would otherwise
        // reach Postgres and come back as a 500.
        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({ error: "Case id must be a positive integer" });
        }

        // The function is getReviewableCaseByID (capital ID) and lives in reviewerService.
        const caseData = await reviewerSearchService.getReviewableCaseByID(id);

        if (!caseData) {
            return res.status(404).json({ error: "Case not found" });
        }

        // Only finished cases are reviewable. 409 tells the frontend "not yet", not "broken".
        if (!["processed", "reviewed"].includes(caseData.status)) {
            return res.status(409).json({
                error: `Case is not ready for review (status: ${caseData.status})`,
            });
        }

        return res.status(200).json(caseData);
    } catch (err) {
        console.error("getCaseForReview error:", err);
        return res.status(500).json({ error: "Failed to fetch case for review" });
    }
};