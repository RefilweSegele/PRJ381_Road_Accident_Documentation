import "./StatusTag.css";

// Central status → label/tone mapping, shared by the dashboard and
// (eventually) the reviewer/status-monitor pages for consistent colors.
export const STATUS_CONFIG = {
  draft: { label: "Draft", tone: "neutral" },
  uploaded: { label: "Imagery Uploaded", tone: "info" },
  processing: { label: "Processing", tone: "warning" },
  processed: { label: "Processed", tone: "success" },
  reviewed: { label: "Reviewed", tone: "violet" },
  failed: { label: "Failed", tone: "danger" },
};

// Hex/var() equivalents for contexts needing a real CSS color (e.g. map pins).
export const STATUS_HEX = {
  draft: "var(--dd-text-muted)",
  uploaded: "var(--dd-info)",
  processing: "var(--dd-warning)",
  processed: "var(--dd-success)",
  reviewed: "var(--dd-violet)",
  failed: "var(--dd-danger)",
};

// Renders a small colored dot + pill badge for a given case status.
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
