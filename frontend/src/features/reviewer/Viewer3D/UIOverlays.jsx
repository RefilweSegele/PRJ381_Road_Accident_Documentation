import React, {useState} from "react";

//damageBoxes: array of { damageType, confidence, boundingBox } from the detection table. boundingBox is in 3D model-space meters - the overlay shows a readable list rather than projecting onto the 2D canvas

export default function UIOverlays({measurementDistance, damageBoxes =[] }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            style={{
                position: "absolute",
                top: 60,
                left: 12,
                background: "rgba(0,0,0,0.6)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 13,
                maxWidth: 280,
                pointerEvents: expanded ? "auto" : "none",
            }}
        >
            <div>
                Measurement:{" "}
                {measurementDistance != null ? `${measurementDistance.toFixed(2)} m` : "click 2 points"}
            </div>

            <div style={{ cursor: damageBoxes.length ? "pointer" : "default", pointerEvents: "auto" }}
            onClick={() => damageBoxes.length && setExpanded((e) => !e)}>
                Damage regions detected: {damageBoxes.length}
                {damageBoxes.length > 0 && (expanded ? " ▲" : " ▼")}
            </div>

            {expanded && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                    {damageBoxes.map((d, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                            {d.damageType} - {(d.confidence * 100).toFixed(1)}% confidence
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
} 