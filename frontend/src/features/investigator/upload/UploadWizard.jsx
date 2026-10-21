
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Space, Typography, message } from "antd";

import ImageDropzone from "./ImageDropzone";
import GcpTableInput from "./GcpTableInput";
import FlightLogForm from "./FlightLogForm";
import { useUploadStore } from "./useUploadStore";
import { uploadCaseImages } from "../../../api/images";
import "./UploadWizard.css";

// Mirrors MAX_FILES in backend/src/config/upload.js. Checked here so the user
// gets a clear message before a large upload starts.
const MAX_BATCH = 150;

const { Text } = Typography;

// Served at "/" (no case: data stays in the browser) and "/cases/:id/upload"
// (data is validated and saved to that case by the backend).
export default function UploadWizard() {
  const { id: caseId } = useParams();
  const navigate = useNavigate();
  const images = useUploadStore((s) => s.images);
  const ensureCase = useUploadStore((s) => s.ensureCase);
  const clearImages = useUploadStore((s) => s.clearImages);
  const [uploading, setUploading] = useState(false);
  const [savedImageCount, setSavedImageCount] = useState(0);

  // Clears store data left over from a different case.
  useEffect(() => {
    ensureCase(caseId);
  }, [caseId, ensureCase]);

  const handleUpload = async () => {
    if (images.length === 0 && savedImageCount === 0) {
      message.warning("Add at least one JPEG before uploading.");
      return;
    }
    if (images.length > MAX_BATCH) {
      message.error(`Upload at most ${MAX_BATCH} images at a time (you have ${images.length}).`);
      return;
    }

    setUploading(true);
    try {
      if (images.length === 0) {
        navigate(`/investigator/cases/${caseId}/status`);
        return;
      }
      const result = await uploadCaseImages(caseId, images);
      message.success(`Uploaded ${result.uploaded} image(s). ${result.generatedEstimatedGcps ? "Estimated demo GCPs were generated from the case location." : ""}`);
      clearImages();
      navigate(`/investigator/cases/${caseId}/status`);
    } catch (err) {
      // Backend rejects the whole batch if any file fails validation, so nothing is partially saved.
      message.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="wizard-container">
      <h1 className="wizard-title">Case Data Upload</h1>
      <Text type="secondary">Case ID: {caseId}</Text>

      <div style={{ margin: "16px 0" }}>
        <ImageDropzone caseId={caseId} onExistingCountChange={setSavedImageCount} />
      </div>

      <GcpTableInput caseId={caseId} />

      <FlightLogForm key={caseId} caseId={caseId} />

      <Space style={{ marginTop: 16 }}>
        <Button
          type="primary"
          onClick={handleUpload}
          loading={uploading}
          disabled={images.length === 0 && savedImageCount === 0}
        >
          {images.length ? `Upload ${images.length} image${images.length === 1 ? "" : "s"}` : "Continue to Status"}
        </Button>
        <Button onClick={() => navigate("/investigator/cases")} disabled={uploading}>
          Back to cases
        </Button>
      </Space>
    </div>
  );
}
