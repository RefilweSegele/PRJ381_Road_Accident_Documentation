import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useReviewCase } from "../../api/reviewer";
import ViewerWorkspace from "./Viewer3D/ViewerWorkspace";

function Message({ children }) {
  return <div style={{ padding: 40, textAlign: "center" }}>{children}</div>;
}

// Used by reviewers (/review/cases/:id) AND investigators (/investigator/cases/:id/viewer).
export default function CaseDetailPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { data: caseData, isLoading, error } = useReviewCase(id);
  const isInvestigator = pathname.startsWith("/investigator");

  if (isLoading) return <Message>Loading case...</Message>;
  if (error) {
    if (error.status === 404) return <Message>Case {id} was not found</Message>;
    if (error.status === 409) return <Message>{error.message}</Message>;
    return <Message>Could not load the case. Please try again.</Message>;
  }

  return (
    <ViewerWorkspace
      caseData={caseData}
      backPath={isInvestigator ? `/investigator/cases/${id}/status` : "/review/cases"}
      reportPath={isInvestigator ? null : `/review/cases/${id}/report`}
    />
  );
}
