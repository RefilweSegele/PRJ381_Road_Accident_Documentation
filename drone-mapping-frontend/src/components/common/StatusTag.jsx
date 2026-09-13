import { Tag } from "antd";

// Central place for case-status labels/colors so the dashboard, the
// processing monitor, and the reviewer search page
// all render the same status the same way.
export const STATUS_CONFIG = {
  draft: { color: "default", label: "Draft" },
  uploaded: { color: "blue", label: "Imagery Uploaded" },
  processing: { color: "gold", label: "Processing" },
  processed: { color: "green", label: "Processed" },
  reviewed: { color: "purple", label: "Reviewed" },
  failed: { color: "red", label: "Failed" },
};

function StatusTag({ status }) {
  const config = STATUS_CONFIG[status] || {
    color: "default",
    label: status || "Unknown",
  };
  return <Tag color={config.color}>{config.label}</Tag>;
}

export default StatusTag;
