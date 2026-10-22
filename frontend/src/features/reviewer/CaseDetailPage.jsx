
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Space, Spin } from "antd";
import {
  FilePdfOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

import ThreeCanvas from "./Viewer3D/ThreeCanvas";
import UIOverlays from "./Viewer3D/UIOverlays";

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [measurementDistance, setMeasurementDistance] =
    useState(null);

  const [modelAvailable, setModelAvailable] = useState(false);
  const [checkingModel, setCheckingModel] = useState(true);

  const modelUrl = "/models/DamagedHelmet.glb";

  // Check that the 3D model exists and is a valid GLB file.
  useEffect(() => {
    const controller = new AbortController();

    const checkModel = async () => {
      setCheckingModel(true);
      setModelAvailable(false);

      try {
        const response = await fetch(modelUrl, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("3D model could not be loaded");
        }

        const contentType =
          response.headers.get("content-type") || "";

        // Vite may return index.html for missing model files.
        if (contentType.includes("text/html")) {
          throw new Error("Model file is missing");
        }

        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);

        // GLB files begin with the binary magic value "glTF".
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
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn(
            "3D model unavailable:",
            error.message
          );
          setModelAvailable(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingModel(false);
        }
      }
    };

    checkModel();

    return () => {
      controller.abort();
    };
  }, [modelUrl]);

  // Existing sample detection data.
  // Replace with database records when detection integration is ready.
  const sampleDamageBoxes = [
    {
      damageType: "Frontal Bumper Crumple",
      confidence: 0.9425,
      boundingBox: {
        unit: "meters",
        x_min: -1.24,
        x_max: -0.85,
        y_min: 0.45,
        y_max: 1.10,
        z_min: 0.12,
        z_max: 0.68,
      },
    },
    {
      damageType: "Windshielf Structural Crack",
      confidence: 0.8810,
      boundingBox: {
        unit: "meters",
        x_min: -0.40,
        x_max: 0.35,
        y_min: 1.20,
        y_max: 1.75,
        z_min: 0.85,
        z_max: 1.30,
      },
    },
  ];

  const handleGenerateReport = () => {
    navigate(
      `/reports/generate?caseId=${encodeURIComponent(id)}`
    );
  };

  const handleBackToCases = () => {
    navigate("/review/cases");
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        padding: 16,
        background: "#f5f5f5",
      }}
    >
      {/* Case header and navigation */}
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
        <h1 style={{ margin: 0 }}>
          Case {id} - 3D Viewer
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

      {/* 3D viewer availability */}
      {checkingModel ? (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            background: "#fff",
            borderRadius: 8,
          }}
        >
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>
            Checking 3D model availability...
          </p>
        </div>
      ) : modelAvailable ? (
        <>
          <ThreeCanvas
            modelUrl={modelUrl}
            onMeasurementChange={setMeasurementDistance}
          />

          <UIOverlays
            measurementDistance={measurementDistance}
            damageBoxes={sampleDamageBoxes}
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
                for Case {id}.
              </p>
              <p>
                The 3D viewer will become available
                when the required model file is supplied.
              </p>
              <p style={{ marginBottom: 0 }}>
                You can still generate and download
                forensic reports using the
                Generate Report button above.
              </p>
            </>
          }
          style={{
            marginTop: 16,
            padding: 20,
          }}
        />
      )}
    </div>
  );
}
