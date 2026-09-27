import React, {useState} from "react";
import {useParams} from "react-router-dom";
import ThreeCanvas from "./Viewer3D/ThreeCanvas";
import UIOverlays from "./Viewer3D/UIOverlays";

export default function CaseDetailPage() {
    const {id} = useParams();
    const [measurementDistance, setMeasurementDistance] = useState(null);

    const modelUrl = "/models/DamagedHelmet.glb";

    return (
        <div style={{ position: "relative" }}>
            <h1 style={{ margin: "12px"}}>Case {id} - 3D Viewer</h1>
            <ThreeCanvas modelUrl={modelUrl} onMeasurementChange={setMeasurementDistance} /> 
            <UIOverlays measurementDistance={measurementDistance} damageBoxes={[]} />
        </div>
    );
}