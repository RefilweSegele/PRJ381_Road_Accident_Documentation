import React from "react";
import StatusTag from "../../../components/common/StatusTag";

const REQUIRED_GCPS = 7;

function Row({ k, v }) {
  return <div className="dv-row"><span>{k}</span><strong>{v ?? "-"}</strong></div>;
}

export function StatusCard({ status }) {
  return (
    <div className="dv-card dv-row" style={{ alignItems: "center" }}>
      <span>Case Status:</span><StatusTag status={status} />
    </div>
  );
}

export function TelemetryCard({ flightLog }) {
  const f = flightLog;
  return (
    <div className="dv-card">
      <h4>Flight Telemetry{f?.missionId ? ` (${f.missionId})` : ""}</h4>
      {!f ? <div className="dv-muted">No flight log saved for this case.</div> : (
        <>
          <Row k="Pilot:" v={f.pilotName} />
          <Row k="Site:" v={f.siteLocation} />
          <Row k="GPS Lat:" v={f.gpsLat} />
          <Row k="GPS Lon:" v={f.gpsLon} />
          <Row k="Altitude AGL:" v={`${f.altitudeAglM} m`} />
          <Row k="Overlap (F/S):" v={`${f.overlapFrontPct}%/${f.overlapSidePct}%`} />
          <Row k="Batteries:" v={f.batteryCount} />
          <Row k="Wind Speed:" v={`${f.windSpeedKmh} km/h`} />
        </>
      )}
    </div>
  );
}

export function GcpCard({ gcps }) {
  return (
    <div className="dv-card">
      <h4>GCP Data</h4>
      {gcps.length === 0 && <div className="dv-muted">No GCPs.</div>}
      <div className="dv-gcp-list">
        {gcps.map((g) => (
          <div key={g.id} className="dv-gcp">
            {g.id}: {Number(g.latitude).toFixed(6)}, {Number(g.longitude).toFixed(6)},{" "}
            {g.elevation != null ? Number(g.elevation).toFixed(1) : "-"}
            {g.estimated && <em> (estimated)</em>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GcpBadge({ gcps }) {
  const real = gcps.filter((g) => !g.estimated).length;
  const valid = real >= REQUIRED_GCPS;
  const text = valid ? "Valid" : gcps.length && real === 0 ? "Estimated - not survey control" : "Below recommended";
  return (
    <div className="dv-gcp-badge">
      GCPs: <span style={{ color: valid ? "#4ade80" : "#fbbf24" }}>{gcps.length} of {REQUIRED_GCPS}</span> required ({text})
    </div>
  );
}