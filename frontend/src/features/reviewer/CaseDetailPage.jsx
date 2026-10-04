import React, {useState} from "react";
import {useParams} from "react-router-dom";
import ThreeCanvas from "./Viewer3D/ThreeCanvas";
import UIOverlays from "./Viewer3D/UIOverlays";

export default function CaseDetailPage() {
    const {id} = useParams();
    const [measurementDistance, setMeasurementDistance] = useState(null);

    const modelUrl = "/models/DamagedHelmet.glb";

    //Sample data shaped exactly like real rows from the 'detection' table until schema resolves and this comes from a real fetch.
    const sampleDamageBoxes = [
        {
            damageType: "Frontal Bumper Crumple",
            confidence: 0.9425,
            boundingBox: {
                unit: "meters",
                x_min: -1.24, x_max: -0.85,
                y_min: 0.45, y_max: 1.10,
                z_min: 0.12, z_max: 0.68,
            },
        },
        {
            damageType: "Windshield Structural Crack",
            confidence: 0.8810,
            boundingBox: {
                unit: "meters",
                x_min: -0.40, x_max: 0.35,
                y_min: 1.20, y_max: 1.75,
                z_min: 0.85, z_max: 1.30,
            },
        },
    ];

    return (
        <div style={{ position: "relative" }}>
            <h1 style={{ margin: "12px"}}>Case {id} - 3D Viewer</h1>
            <ThreeCanvas modelUrl={modelUrl} onMeasurementChange={setMeasurementDistance} 
            damageBoxes={sampleDamageBoxes} /> 
            <UIOverlays measurementDistance={measurementDistance} damageBoxes={sampleDamageBoxes} />
        </div>
    );
}