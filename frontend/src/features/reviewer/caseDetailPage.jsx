import React, {useState} from "react";
import {useParams} from "react-router-dom";
import ThreeCanvas from "./Viewer3D/ThreeCanvas";
import UIOverlays from "./Viewer3D/UIOverlays";

export default function caseDetailPage() {
    const {id} = useParams();
    const [measurementDistance, setMeasurementDistance] = useState(null);

    const modelUrl = null;

    return (
        <div style={{ position: "relative" }}>
            <h1>Case {id} - 3D Viewer</h1>
            <ThreeCanvas modelUrl={modelUrl} /> 
            <UIOverlays measurementDistance={measurementDistance} damageBoxes={[]} />
        </div>
    );
}