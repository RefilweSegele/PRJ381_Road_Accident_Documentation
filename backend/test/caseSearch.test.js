"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const stubs = require("./helpers/stubs");
const reviewerController = require("../src/controllers/reviewerController");

test("reviewer search returns processed/reviewed cases and applies all filters", async () => {
  stubs.resetCalls();
  stubs.setHandler((sql) => sql.includes("COUNT(*)")
    ? { rows: [{ count: "3" }], rowCount: 1 }
    : {
        rows: [{
          id: 7,
          case_reference: "CASE-2026-0007",
          incident_address: "12 Main Street",
          incident_date: "2026-09-10T10:00:00.000Z",
          status: "processed",
        }],
        rowCount: 1,
      });

  const response = await stubs.run(reviewerController.searchCases, {
    query: {
      search: "Main",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.cases[0], {
    id: 7,
    caseId: "CASE-2026-0007",
    location: "12 Main Street",
    incidentDate: "2026-09-10T10:00:00.000Z",
    status: "processed",
    claimNumber: null,
    insurerName: null,
    chargeReference: null,
  });
  assert.equal(response.body.pendingReviewCount, 3);

  const casesQuery = stubs.calls.find(({ sql }) => sql.includes("FROM cases") && sql.includes("incident_date"));
  assert.match(casesQuery.sql, /status = ANY\(\$1\)/);
  assert.match(casesQuery.sql, /case_reference ILIKE \$2 OR incident_address ILIKE \$2/);
  assert.match(casesQuery.sql, /incident_date::date >= \$3::date/);
  assert.match(casesQuery.sql, /incident_date::date <= \$4::date/);
  assert.deepEqual(casesQuery.params, [
    ["processed", "reviewed"],
    "%Main%",
    "2026-09-01",
    "2026-09-30",
  ]);
});
