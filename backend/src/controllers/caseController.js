const caseService = require("../services/caseService");

// GET /api/cases — list cases with filters/pagination/sorting.
async function getCases(req, res, next) {
  try {
    const { status, search, page, pageSize, sortField, sortOrder } = req.query;

    // If pageSize is very large (e.g. 10000 from the frontend's export/map
    // calls), skip pagination entirely and return everything that matches.
    if (Number(pageSize) >= 1000) {
      const result = await caseService.listAllFilteredCases({
        status,
        search,
        sortField,
        sortOrder,
      });
      return res.json(result);
    }

    const result = await caseService.listCases({
      status,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      sortField,
      sortOrder,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/cases/stats — aggregate counts for the dashboard stat cards.
async function getStats(req, res, next) {
  try {
    const stats = await caseService.getCaseStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// GET /api/cases/:id — fetch a single case.
async function getCase(req, res, next) {
  try {
    const caseRecord = await caseService.getCaseById(req.params.id);
    if (!caseRecord) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseRecord);
  } catch (err) {
    next(err);
  }
}

// POST /api/cases — create a new case.
async function createCase(req, res, next) {
  try {
    const { incidentAddress, incidentDate, location, assignedInvestigator } =
      req.body;

    // Minimal required-field validation — expand as the schema grows.
    if (!incidentAddress || !incidentDate) {
      return res
        .status(400)
        .json({ error: "incidentAddress and incidentDate are required" });
    }

    const newCase = await caseService.createCase({
      incidentAddress,
      incidentDate,
      latitude: location?.lat,
      longitude: location?.lng,
      assignedInvestigator,
    });

    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/cases/:id — update fields on an existing case.
async function updateCase(req, res, next) {
  try {
    const updated = await caseService.updateCase(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cases/:id — remove a case.
async function deleteCase(req, res, next) {
  try {
    const deleted = await caseService.deleteCase(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCases,
  getStats,
  getCase,
  createCase,
  updateCase,
  deleteCase,
};
