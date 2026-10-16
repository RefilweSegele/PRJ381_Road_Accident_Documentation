"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const stubs = require("./helpers/stubs");
const caseController = require("../src/controllers/caseController");

test("reviewer search returns mapped Complete cases and parameterizes keyword search", async () => {
  stubs.resetCalls();
  stubs.setHandler(() => ({
    rows: [
      {
        id: 7,
        case_reference: "CASE-2026-0007",
        incident_address: "12 Main Street",
        incident_date: "2026-09-10T10:00:00.000Z",
        status: "Complete",
      },
    ],
    rowCount: 1,
  }));

  const response = await stubs.run(caseController.searchCases, {
    query: { search: "Main" },
  });

  assert.deepEqual(response.body.cases[0], {
    id: 7,
    caseId: "CASE-2026-0007",
    location: "12 Main Street",
    incidentDate: "2026-09-10T10:00:00.000Z",
    status: "Complete",
  });

  const query = stubs.calls[0];
  assert.match(query.sql, /status = \$1/);
  assert.match(query.sql, /case_reference ILIKE \$2 OR incident_address ILIKE \$2/);
  assert.deepEqual(query.params, ["Complete", "%Main%"]);
});
