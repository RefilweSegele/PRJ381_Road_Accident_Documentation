import React from "react";
import {
  AimOutlined, BorderOutlined, ColumnWidthOutlined, DragOutlined, FilterOutlined,
  NodeIndexOutlined, RotateRightOutlined, ScanOutlined, ZoomInOutlined,
} from "@ant-design/icons";

const GROUPS = [
  [
    { id: "orbit", label: "Orbit", icon: <RotateRightOutlined /> },
    { id: "pan", label: "Pan", icon: <DragOutlined /> },
    { id: "zoom", label: "Zoom", icon: <ZoomInOutlined /> },
  ],
  [
    { id: "point", label: "Point", icon: <AimOutlined /> },
    { id: "distance", label: "Distance", icon: <ColumnWidthOutlined /> },
    { id: "area", label: "Area", icon: <BorderOutlined /> },
    { id: "polyline", label: "Polyline", icon: <NodeIndexOutlined /> },
  ],
];

export default function ViewerToolbar({ tool, onTool, panel, onPanel }) {
  const btn = (b, active, onClick) => (
    <button key={b.id} className={`dv-tool${active ? " active" : ""}`} onClick={onClick} title={b.label}>
      {b.icon}<span>{b.label}</span>
    </button>
  );
  return (
    <div className="dv-toolbar">
      {GROUPS.map((g, i) => (
        <div className="dv-tool-group" key={i}>{g.map((b) => btn(b, tool === b.id, () => onTool(b.id)))}</div>
      ))}
      <div className="dv-tool-group">
        {btn({ id: "detection", label: "Detection", icon: <ScanOutlined /> }, panel === "detection", () => onPanel("detection"))}
        {btn({ id: "filters", label: "Filters", icon: <FilterOutlined /> }, panel === "filters", () => onPanel("filters"))}
      </div>
    </div>
  );
}