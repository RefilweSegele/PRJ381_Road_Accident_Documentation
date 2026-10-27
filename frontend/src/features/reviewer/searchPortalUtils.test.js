import { describe, expect, it } from "vitest";
import {
  buildExportRows,
  formatIncidentDate,
  isExportDisabled,
  shouldShowEmptyState,
} from "./searchPortalUtils";

describe("reviewer SearchPortal helpers", () => {
  it("only shows the empty state after a successful, completed empty request", () => {
    expect(shouldShowEmptyState({ isSuccess: false, isFetching: false, cases: [] })).toBe(false);
    expect(shouldShowEmptyState({ isSuccess: true, isFetching: true, cases: [] })).toBe(false);
    expect(shouldShowEmptyState({ isSuccess: true, isFetching: false, cases: [] })).toBe(true);
    expect(shouldShowEmptyState({ isSuccess: true, isFetching: false, cases: [{}] })).toBe(false);
  });

  it("disables export when there are no results, while fetching, or after an error", () => {
    expect(isExportDisabled({ cases: [{}], isFetching: false, isError: false })).toBe(false);
    expect(isExportDisabled({ cases: [{}], isFetching: true, isError: false })).toBe(true);
    expect(isExportDisabled({ cases: [], isFetching: false, isError: false })).toBe(true);
    expect(isExportDisabled({ cases: [{}], isFetching: false, isError: true })).toBe(true);
  });

  it("formats valid incident dates and safely handles missing or invalid dates", () => {
    expect(formatIncidentDate("2026-10-26T14:06:00.000Z")).toContain("26 Oct 2026");
    expect(formatIncidentDate(null)).toBe("—");
    expect(formatIncidentDate("not-a-date")).toBe("—");
  });

  it("builds role-appropriate CSV rows from the cases passed for export", () => {
    const insurerCase = {
      caseId: "CASE-1",
      location: "Pretoria",
      incidentDate: "2026-10-26T14:06:00.000Z",
      status: "processed",
      claimNumber: "CL-1",
      insurerName: "Example Insurer",
    };
    const investigatorCase = { ...insurerCase, chargeReference: "CR-1" };

    expect(buildExportRows([insurerCase], "insurer")[0]).toEqual({
      "Case ID": "CASE-1",
      Location: "Pretoria",
      "Incident Date": "2026-10-26T14:06:00.000Z",
      Status: "processed",
      "Claim Number": "CL-1",
      Insurer: "Example Insurer",
    });
    expect(buildExportRows([investigatorCase], "investigator")[0]["Charge / Citation Ref"]).toBe("CR-1");
    expect(buildExportRows([], "insurer")).toEqual([]);
  });
});
