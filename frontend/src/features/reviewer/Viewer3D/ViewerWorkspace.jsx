import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, message } from "antd";
import ThreeCanvas from "./ThreeCanvas";
import ViewerToolbar from "./ViewerToolbar";
import DetectionOverlay, { CLASS_COLORS, labelFor } from "./DetectionOverlay";
import EvidenceModal from "./EvidenceModal";
import { GcpBadge, GcpCard, StatusCard, TelemetryCard } from "./SidePanels";
import { describe } from "./measure";
import { analyzeViewCapture } from "../../../api/viewer";
import "./viewer.css";

const MEASURE_TOOLS = ["point", "distance", "area", "polyline"];

export default function ViewerWorkspace({ caseData, backPath, reportPath }) {
  const navigate = useNavigate();
  const [tool, setTool] = useState("orbit");
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState([]);
  const [panel, setPanel] = useState(null); // "detection" | "filters" | null
  const [conf, setConf] = useState(0.25);
  const [filters, setFilters] = useState({ classes: {}, minConf: 0 });
  const [live, setLive] = useState(null);   // detection result for the current 3D view
  const [detecting, setDetecting] = useState(false);
  const [evidence, setEvidence] = useState(null);
  const captureRef = useRef(null);
  const nextId = useRef(1);

  const scale = caseData.scaleFactor ?? 1;
  const unit = caseData.scaleFactor == null ? "units" : "m";

  const addItem = useCallback((kind, points) => {
    setItems((prev) => [...prev, { id: nextId.current++, kind, points }]);
  }, []);

  const finish = useCallback(() => {
    if (tool === "polyline" && draft.length >= 2) addItem("polyline", draft);
    if (tool === "area" && draft.length >= 3) addItem("area", draft);
    setDraft([]);
  }, [tool, draft, addItem]);

  const onPoint = (p) => {
    if (tool === "point") addItem("point", [p]);
    else if (tool === "distance") {
      if (draft.length === 1) { addItem("distance", [draft[0], p]); setDraft([]); }
      else setDraft([p]);
    } else if (tool === "polyline" || tool === "area") setDraft((d) => [...d, p]);
  };

  const chooseTool = (t) => { setTool(t); setDraft([]); };

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "Enter") finish();
      else if (e.key === "Escape") setDraft([]);
      else if (e.key === "Backspace") setDraft((d) => d.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const analyzeView = async () => {
    if (!captureRef.current) { message.warning("The 3D view is not ready yet."); return; }
    setDetecting(true);
    try {
      const { blob } = await captureRef.current();
      const res = await analyzeViewCapture(blob, conf);
      setLive({ width: res.image.width, height: res.image.height, detections: res.detections });
      message.success(`${res.detections.length} damage region(s) found in this view`);
    } catch (e) {
      message.error(e.message);
    } finally {
      setDetecting(false);
    }
  };

  const stored = caseData.damageBoxes;
  const classNames = useMemo(() => {
    const set = new Set([...Object.keys(CLASS_COLORS), ...stored.map((d) => d.damageClass)]);
    (live?.detections || []).forEach((d) => set.add(d.damage_class));
    return [...set];
  }, [stored, live]);
  const visibleStored = stored.filter(
    (d) => filters.classes[d.damageClass] !== false && d.confidenceScore >= filters.minConf,
  );

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));
  const hasMeasurements = items.length > 0 || draft.length > 0;
  const date = caseData.incidentDate
    ? new Date(caseData.incidentDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="dv-root">
      <div className="dv-main">
        <div className="dv-header">
          <Button size="small" onClick={() => navigate(backPath)}>Back</Button>
          <h2>Case: {caseData.caseReference}{date && ` (${date})`}</h2>
          {reportPath ? <Button size="small" type="primary" onClick={() => navigate(reportPath)}>Generate report</Button> : <span />}
        </div>

        {caseData.scaleFactor == null && caseData.modelUrl && (
          <div className="dv-banner">
            This model has no GPS scale (the photos were not geotagged), so measurements are in model units, not metres.
          </div>
        )}

        <div className="dv-stage">
          <ViewerToolbar tool={tool} onTool={chooseTool} panel={panel} onPanel={togglePanel} />

          {panel === "detection" && (
            <div className="dv-popover">
              <h4>Damage detection</h4>
              <label className="dv-field">
                Minimum confidence: {Math.round(conf * 100)}%
                <input type="range" min="0.05" max="0.9" step="0.05" value={conf} onChange={(e) => setConf(Number(e.target.value))} />
              </label>
              <Button type="primary" block loading={detecting} disabled={!caseData.modelUrl} onClick={analyzeView}>
                Analyze current 3D view
              </Button>
              {live && (
                <div className="dv-muted" style={{ marginTop: 6 }}>
                  {live.detections.length} region(s) in view. Moving the camera clears the overlay.{" "}
                  <a onClick={() => setLive(null)}>Clear</a>
                </div>
              )}
              <h5>Stored detections (from the {caseData.imageCount} drone photos)</h5>
              <div className="dv-muted">
                {stored.length === 0 ? "None found." : Object.entries(caseData.damageSummary.byClass).map(([k, v]) => `${v} ${k}`).join(" - ")}
              </div>
              <div className="dv-det-list">
                {visibleStored.slice(0, 40).map((d) => (
                  <button key={d.id} onClick={() => setEvidence(d)}>
                    <i style={{ background: CLASS_COLORS[d.damageClass] || "#7c46a6" }} />
                    {labelFor(d.damageClass, d.confidenceScore)} - {d.severityLevel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {panel === "filters" && (
            <div className="dv-popover">
              <h4>Filters</h4>
              {classNames.map((c) => (
                <label key={c} className="dv-check">
                  <input
                    type="checkbox" checked={filters.classes[c] !== false}
                    onChange={(e) => setFilters((f) => ({ ...f, classes: { ...f.classes, [c]: e.target.checked } }))}
                  />
                  <i style={{ background: CLASS_COLORS[c] || "#7c46a6" }} /> {c}
                </label>
              ))}
              <label className="dv-field">
                Show confidence above: {Math.round(filters.minConf * 100)}%
                <input type="range" min="0" max="0.95" step="0.05" value={filters.minConf}
                  onChange={(e) => setFilters((f) => ({ ...f, minConf: Number(e.target.value) }))} />
              </label>
            </div>
          )}

          {caseData.modelUrl ? (
            <ThreeCanvas
              modelUrl={caseData.modelUrl}
              tool={tool}
              items={items}
              draft={draft}
              scale={scale}
              unit={unit}
              onPoint={onPoint}
              captureRef={captureRef}
              onCameraChange={() => setLive((l) => (l ? null : l))}
            />
          ) : (
            <div className="dv-overlay-msg">No 3D model is available for this case yet.</div>
          )}

          <DetectionOverlay result={live} filters={filters} />

          {MEASURE_TOOLS.includes(tool) && (
            <div className="dv-hint">
              {tool === "point" && "Click the model to read a coordinate."}
              {tool === "distance" && "Click two points to measure the distance."}
              {(tool === "polyline" || tool === "area") && "Click to add points. Enter = finish, Backspace = undo point, Esc = cancel."}
            </div>
          )}
          {hasMeasurements && (
            <div className="dv-measbar">
              {(tool === "polyline" || tool === "area") && draft.length > 0 && <Button size="small" type="primary" onClick={finish}>Finish</Button>}
              <Button size="small" disabled={!items.length} onClick={() => setItems((p) => p.slice(0, -1))}>Undo last</Button>
              <Button size="small" danger onClick={() => { setItems([]); setDraft([]); }}>Clear all</Button>
              <span className="dv-muted">{items.map((it) => describe(it, scale, unit).label).slice(-2).join(" | ")}</span>
            </div>
          )}
          <GcpBadge gcps={caseData.gcps} />
        </div>
      </div>

      <div className="dv-side">
        <StatusCard status={caseData.status} />
        <TelemetryCard flightLog={caseData.flightLog} />
        <GcpCard gcps={caseData.gcps} />
      </div>

      <EvidenceModal detection={evidence} onClose={() => setEvidence(null)} />
    </div>
  );
}