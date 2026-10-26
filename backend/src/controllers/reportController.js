const reportService = require("../services/reportService");

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

exports.createForCase = async (req, res, next) => {
  try {
    const caseId = positiveInteger(req.params.caseId);
    if (!caseId) return res.status(400).json({ error: "caseId must be a positive integer" });
    const report = await reportService.createReport(caseId, req.body || {}, req.user);
    if (!report) return res.status(404).json({ error: "Case not found" });
    return res.status(201).json({ report });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    return next(error);
  }
};

exports.listForCase = async (req, res, next) => {
  try {
    const caseId = positiveInteger(req.params.caseId);
    if (!caseId) return res.status(400).json({ error: "caseId must be a positive integer" });
    const reports = await reportService.listReports(caseId);
    if (!reports) return res.status(404).json({ error: "Case not found" });
    return res.json({ reports });
  } catch (error) { return next(error); }
};

exports.getOne = async (req, res, next) => {
  try {
    const reportId = positiveInteger(req.params.reportId);
    if (!reportId) return res.status(400).json({ error: "reportId must be a positive integer" });
    const report = await reportService.getReport(reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    return res.json({ report });
  } catch (error) { return next(error); }
};

exports.downloadPdf = async (req, res, next) => {
  try {
    const reportId = positiveInteger(req.params.reportId);
    if (!reportId) return res.status(400).json({ error: "reportId must be a positive integer" });
    const result = await reportService.getReportPdf(reportId);
    if (!result) return res.status(404).json({ error: "Report not found" });
    const safeReference = String(result.report.report_data?.case?.caseReference || `report-${reportId}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeReference}-report-${reportId}.pdf"`,
      "Content-Length": result.buffer.length,
      "Cache-Control": "no-store",
    });
    return res.send(result.buffer);
  } catch (error) { return next(error); }
};
