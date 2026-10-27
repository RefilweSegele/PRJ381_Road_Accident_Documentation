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
 redesigning_demo
    <div className="page" style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Case {caseData.caseReference || id}
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-dim)" }}>
            3D scene viewer
          </p>
        </div>

        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBackToCases}>
            Back to Cases
          </Button>

          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={handleGenerateReport}
          >
            Generate Report
          </Button>
        </Space>
      </div>

      {caseData.scaleFactor == null && (
        <Alert
          type="info"
          showIcon
          message="Measurements are unscaled until calibration data is available."
          style={{ marginBottom: 16 }}
        />
      )}

      {checkingModel ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
          <p>Checking 3D model availability...</p>
        </div>
      ) : modelAvailable ? (
        <>
          <ThreeCanvas
            modelUrl={modelUrl}
            onMeasurementChange={setMeasurementDistance}
          />

          <UIOverlays
            measurementDistance={measurementDistance}
            damageBoxes={caseData.damageBoxes || []}
          />
        </>
      ) : (
        <Alert
          type="warning"
          showIcon
          message="3D Model Unavailable"
          description={
            <>
              <p>No valid 3D model is currently available for this case.</p>
              <p>
                The viewer will become available when the case has a valid model
                file.
              </p>
              <p style={{ marginBottom: 0 }}>
                You can still generate a report using the Generate Report button
                above.
              </p>
            </>
          }
        />
      )}
    </div>
=======
    <ViewerWorkspace
      caseData={caseData}
      backPath={isInvestigator ? `/investigator/cases/${id}/status` : "/review/cases"}
      reportPath={isInvestigator ? null : `/review/cases/${id}/report`}
    />
 main
  );
}
