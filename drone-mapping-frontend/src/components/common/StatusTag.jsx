import "./StatusTag.css";

export const STATUS_CONFIG = {
  draft: { label: "Draft", tone: "neutral" },
  uploaded: { label: "Imagery Uploaded", tone: "info" },
  processing: { label: "Processing", tone: "warning" },
  processed: { label: "Processed", tone: "success" },
  reviewed: { label: "Reviewed", tone: "violet" },
  failed: { label: "Failed", tone: "danger" },
};

// Hex equivalents for contexts that need a real CSS color instead of a
// class name (e.g. Leaflet map pins, chart legends).
export const STATUS_HEX = {
  draft: "var(--dd-text-muted)",
  uploaded: "var(--dd-info)",
  processing: "var(--dd-warning)",
  processed: "var(--dd-success)",
  reviewed: "var(--dd-violet)",
  failed: "var(--dd-danger)",
};

function StatusTag({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    tone: "neutral",
  };

  return (
    <span className={`dd-badge dd-badge--${config.tone}`}>
      <span className="dd-badge__dot" />
      {config.label}
    </span>
  );
}

export default StatusTag;
