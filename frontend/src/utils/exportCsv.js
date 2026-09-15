import Papa from "papaparse";

// Converts an array of case objects into a downloaded CSV file.
export function downloadCasesAsCsv(cases, filename = "cases-export.csv") {
  // Rename fields to human-readable CSV column headers.
  const rows = cases.map((c) => ({
    "Case Reference": c.caseReference,
    "Incident Location": c.incidentAddress,
    "Incident Date": c.incidentDate,
    Status: c.status,
    Vehicles: c.vehicleCount,
    "Assigned Investigator": c.assignedInvestigator,
    "Last Updated": c.updatedAt,
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Trigger a browser download via a temporary invisible link.
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // free the blob URL now that the download started
}
