import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, Empty, Skeleton } from "antd";
import { Eye } from "lucide-react";
import StatusTag, {
  STATUS_CONFIG,
  STATUS_HEX,
} from "../../../components/common/StatusTag";
import { formatDate } from "../../../utils/formatDate";
import "./CaseMapView.css";

// Builds a colored dot marker icon for a given case status.
function pinIcon(status) {
  const color = STATUS_HEX[status] || "var(--dd-text-muted)";
  return L.divIcon({
    className: "dd-map-pin",
    html: `<span style="background:${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Auto-zooms/pans the map to fit every visible pin whenever the case list changes.
function FitBounds({ cases }) {
  const map = useMap();
  useEffect(() => {
    if (!cases.length) return;
    const bounds = L.latLngBounds(
      cases.map((c) => [c.location.lat, c.location.lng]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [cases, map]);
  return null;
}

// Leaflet measures its container size on mount — if that happens before the
// surrounding layout has actually applied its CSS height, the map silently
// locks in a 0px size and renders blank. Forcing a resize shortly after
// mount fixes this reliably.
function ForceResize() {
  const map = useMap();
  useEffect(() => {
    const timers = [0, 100, 300].map((delay) =>
      setTimeout(() => map.invalidateSize(), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

function CaseMapView({
  cases,
  isLoading,
  hasActiveFilters,
  onClearFilters,
  onQuickView,
}) {
  const legendEntries = useMemo(() => Object.entries(STATUS_CONFIG), []);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (!cases || cases.length === 0) {
    return (
      <Empty
        description={
          hasActiveFilters
            ? "No cases match your current filters."
            : "No cases have been created yet."
        }
      >
        {hasActiveFilters && (
          <Button onClick={onClearFilters}>Clear filters</Button>
        )}
      </Empty>
    );
  }

  return (
    <div className="dd-map-view dd-surface-panel">
      <MapContainer
        className="dd-map-view__container"
        center={[-25.7479, 28.2293]} // roughly Pretoria — arbitrary default, overridden by FitBounds
        zoom={9}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ForceResize />
        <FitBounds cases={cases} />
        {cases.map((c) => (
          <Marker
            key={c.id}
            position={[c.location.lat, c.location.lng]}
            icon={pinIcon(c.status)}
          >
            <Popup>
              <div className="dd-map-view__popup">
                <strong>{c.caseReference}</strong>
                <div style={{ margin: "6px 0" }}>
                  <StatusTag status={c.status} />
                </div>
                <span style={{ display: "block" }}>{c.incidentAddress}</span>
                <span
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#6b7887",
                  }}
                >
                  {formatDate(c.incidentDate)}
                </span>
                <Button
                  size="small"
                  icon={<Eye size={14} />}
                  onClick={() => onQuickView(c)}
                >
                  Quick view
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Status → color key, floated over the top-right corner of the map */}
      <div className="dd-map-view__legend">
        {legendEntries.map(([key, { label }]) => (
          <div key={key} className="dd-map-view__legend-item">
            <span
              className="dd-map-view__legend-dot"
              style={{ background: STATUS_HEX[key] }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CaseMapView;
