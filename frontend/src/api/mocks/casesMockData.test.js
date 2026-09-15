import { describe, it, expect } from "vitest";
import { getMockCases, getMockCaseStats } from "./casesMockData";

describe("getMockCases", () => {
  it("returns a paginated response shape", async () => {
    const result = await getMockCases({ page: 1, pageSize: 5 });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(result.data.length).toBeLessThanOrEqual(5);
  });

  it("filters by status", async () => {
    const result = await getMockCases({
      status: "failed",
      page: 1,
      pageSize: 100,
    });
    expect(result.data.every((c) => c.status === "failed")).toBe(true);
  });

  it("filters by search term (case reference or location)", async () => {
    const result = await getMockCases({
      search: "pretoria",
      page: 1,
      pageSize: 100,
    });
    expect(result.data.length).toBeGreaterThan(0);
    result.data.forEach((c) => {
      const haystack = `${c.caseReference} ${c.incidentAddress}`.toLowerCase();
      expect(haystack).toContain("pretoria");
    });
  });

  it("respects page and pageSize (different pages return different cases)", async () => {
    const pageOne = await getMockCases({ page: 1, pageSize: 5 });
    const pageTwo = await getMockCases({ page: 2, pageSize: 5 });
    expect(pageOne.data[0].id).not.toBe(pageTwo.data[0].id);
  });

  it("sorts ascending and descending differently", async () => {
    const asc = await getMockCases({
      sortField: "caseReference",
      sortOrder: "ascend",
      pageSize: 5,
    });
    const desc = await getMockCases({
      sortField: "caseReference",
      sortOrder: "descend",
      pageSize: 5,
    });
    expect(asc.data[0].caseReference).not.toBe(desc.data[0].caseReference);
  });
});

describe("getMockCaseStats", () => {
  it("returns sensible aggregate counts", async () => {
    const stats = await getMockCaseStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(
      stats.inProgress + stats.processed + stats.failed,
    ).toBeLessThanOrEqual(stats.total);
  });
});
