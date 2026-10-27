import React from "react";
import { Modal, Spin } from "antd";
import useAuthedBlob from "./useAuthedBlob";
import { PolygonLayer, labelFor } from "./DetectionOverlay";

// Shows the original drone photo a stored detection came from, with its polygon.
export default function EvidenceModal({ detection, onClose }) {
  const { objectUrl, loading, error } = useAuthedBlob(detection?.imageUrl, "image/jpeg");
  if (!detection) return null;
  const item = {
    cls: detection.damageClass, conf: detection.confidenceScore,
    polygon: detection.polygonCoords, bbox: detection.bbox,
  };
  return (
    <Modal
      open onCancel={onClose} footer={null} width={900}
      title={`${labelFor(item.cls, item.conf)} - severity: ${detection.severityLevel}`}
    >
      {loading && <Spin />}
      {error && <div style={{ color: "#dc2626" }}>{error}</div>}
      {objectUrl && (
        <div style={{ position: "relative" }}>
          <img src={objectUrl} alt="Drone evidence" style={{ width: "100%", display: "block" }} />
          <PolygonLayer width={detection.imageWidth} height={detection.imageHeight} items={[item]} />
        </div>
      )}
    </Modal>
  );
}