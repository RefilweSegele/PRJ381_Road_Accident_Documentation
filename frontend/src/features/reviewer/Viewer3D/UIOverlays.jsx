import React from "react";

//plain HTML overlay positioned on top of the canvas (not inside the 3D scene)
//damageBoxes will eventually come from the ML classification service
export default function UIOverlays({measurementDistance, damageBoxes =[] }) {
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
                pointerEvents: "none",
            }}
        >
            <div>
                Measurement:{" "}
                {measurementDistance != null ? `${measurementDistance.toFixed(2)} m` : "click 2 points"}
            </div>
            <div>Damage regions detected: {damageBoxes.length}</div>
        </div>
    );
} 