import React from 'react';
import { useParams } from 'react-router-dom';
import ImageDropzone from './ImageDropzone';
import GcpTableInput from './GcpTableInput';
import './UploadWizard.css';
import FlightLogForm from './FlightLogForm';
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
    const { id } = useParams();
    const caseId = id && /^[1-9]\d*$/.test(id) ? Number(id) : undefined;

    return (
      <div className="wizard-container">
        <h1 className="wizard-title">Case Data Upload</h1>
        <ImageDropzone />
        <GcpTableInput caseId={caseId} />
        <FlightLogForm caseId={caseId} />
      </div>
    );
}
  const { id: caseId } = useParams();
  const navigate = useNavigate();
  const images = useUploadStore((s) => s.images);
  const ensureCase = useUploadStore((s) => s.ensureCase);
  const clearImages = useUploadStore((s) => s.clearImages);
  const [uploading, setUploading] = useState(false);

  // Clears store data left over from a different case.
  useEffect(() => {
    ensureCase(caseId);
  }, [caseId, ensureCase]);

  const handleUpload = async () => {
    if (images.length === 0) {
      message.warning("Add at least one JPEG before uploading.");
      return;
    }
    if (images.length > MAX_BATCH) {
      message.error(`Upload at most ${MAX_BATCH} images at a time (you have ${images.length}).`);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadCaseImages(caseId, images);
      message.success(`Uploaded ${result.uploaded} image(s).`);
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
        <ImageDropzone caseId={caseId} />
      </div>

      <GcpTableInput caseId={caseId} />

      <FlightLogForm key={caseId} />

      <Space style={{ marginTop: 16 }}>
        <Button
          type="primary"
          onClick={handleUpload}
          loading={uploading}
          disabled={images.length === 0}
        >
          Upload {images.length} image{images.length === 1 ? "" : "s"}
        </Button>
        <Button onClick={() => navigate("/investigator/cases")} disabled={uploading}>
          Back to cases
        </Button>
      </Space>
    </div>
  );
}
