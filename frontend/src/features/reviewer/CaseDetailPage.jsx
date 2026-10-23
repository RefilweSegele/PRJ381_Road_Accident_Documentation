
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Space, Spin } from "antd";
import {
  FilePdfOutlined,
  ArrowLeftOutlined
} from "@ant-design/icons";

import ThreeCanvas from "./Viewer3D/ThreeCanvas";
import UIOverlays from "./Viewer3D/UIOverlays";
import { useReviewCase } from "../../api/reviewer";

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [measurementDistance, setMeasurementDistance] = useState(null);
  const [modelAvailable, setModelAvailable] = useState(false);
  const [checkingModel, setCheckingModel] = useState(false);

  const {
    data: caseData,
    isLoading,
    error
  } = useReviewCase(id);

  const modelUrl = caseData?.modelUrl;

  useEffect(() => {
    const controller = new AbortController();

    if (!modelUrl) {
      setModelAvailable(false);
      setCheckingModel(false);
      return () => controller.abort();
    }

    async function checkModel() {
      setCheckingModel(true);
      setModelAvailable(false);

      try {
        const response = await fetch(modelUrl, {
          method: "GET",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("3D model could not be loaded");
        }

        const contentType =
          response.headers.get("content-type") || "";

        if (contentType.includes("text/html")) {
          throw new Error("Model file is missing");
        }

        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);

        const validGlb =
          buffer.byteLength >= 12 &&
          view.getUint32(0, true) === 0x46546c67 &&
          view.getUint32(4, true) === 2 &&
          view.getUint32(8, true) === buffer.byteLength;

        if (!validGlb) {
          throw new Error("Invalid GLB model file");
        }

        if (!controller.signal.aborted) {
          setModelAvailable(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn("3D model unavailable:", err.message);
          setModelAvailable(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingModel(false);
        }
      }
    }

    checkModel();

    return () => controller.abort();
  }, [modelUrl]);

  const handleGenerateReport = () => {
    navigate(`/reports/generate?caseId=${encodeURIComponent(id)}`);
  };

  const handleBackToCases = () => {
    navigate("/review/cases");
  };

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
        <p>Loading case...</p>
      </div>
    );
  }

  if (error) {
    const status = error.status ?? error.response?.status;

    return (
      <Alert
        type="error"
        showIcon
        message={
          status === 404
            ? `Case ${id} was not found`
            : "Could not load the case"
        }
        description={
          status === 409
            ? error.message
            : status === 404
              ? "The requested case does not exist."
              : "Please try again."
        }
        action={
          <Button onClick={handleBackToCases}>
            Back to Cases
          </Button>
        }
      />
    );
  }

  if (!caseData) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Case information is unavailable"
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        padding: 16,
        background: "#f5f5f5"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20
        }}
      >
        <h1 style={{ margin: 0 }}>
          Case {caseData.caseReference || id} - 3D Viewer
        </h1>

        <Space wrap>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToCases}
          >
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
              <p>
                No valid 3D model is currently available
                for this case.
              </p>
              <p>
                The viewer will become available when
                the case has a valid model file.
              </p>
              <p style={{ marginBottom: 0 }}>
                You can still generate a report using
                the Generate Report button above.
              </p>
            </>
          }
        />
      )}
    </div>
  );
}
