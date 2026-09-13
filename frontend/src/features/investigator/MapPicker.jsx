import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;

      setPosition({
        lat,
        lng,
      });
    },
  });

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function MapPicker({ value, onChange }) {
  const defaultPosition = {
    lat: -25.7479,
    lng: 28.2293,
  };

  const [position, setPosition] = useState(value || defaultPosition);

  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);

    if (onChange) {
      onChange(newPosition);
    }
  };

  return (
    <div>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        style={{
          height: "400px",
          width: "100%",
          borderRadius: "8px",
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationMarker
          position={position}
          setPosition={handlePositionChange}
        />
      </MapContainer>

      <div style={{ marginTop: "10px" }}>
        <strong>Selected Location</strong>

        <p>
          Latitude: {position.lat.toFixed(6)}
          <br />
          Longitude: {position.lng.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
