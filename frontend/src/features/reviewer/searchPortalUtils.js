export function formatIncidentDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function shouldShowEmptyState({ isSuccess, isFetching, cases }) {
  return isSuccess && !isFetching && cases.length === 0;
}

export function isExportDisabled({ cases, isFetching, isError }) {
  return isFetching || isError || cases.length === 0;
}

export function buildExportRows(cases, role) {
  return cases.map((caseRecord) => {
    const row = {
      "Case ID": caseRecord.caseId,
      Location: caseRecord.location,
      "Incident Date": caseRecord.incidentDate,
      Status: caseRecord.status,
    };

    if (role !== "insurer") {
      row["Charge / Citation Ref"] = caseRecord.chargeReference;
    }

    return row;
  });
}
