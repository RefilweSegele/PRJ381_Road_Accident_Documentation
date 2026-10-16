import React, {useState} from "react";
import {useParams} from "react-router-dom";
import ThreeCanvas from "./Viewer3D/ThreeCanvas";
import UIOverlays from "./Viewer3D/UIOverlays";
import { useReviewCase } from "../../api/reviewer";

function Message ({ children }) {
    return <div style={{ padding : "40px", textAlign: "center" }}>{children}</div>;
}

export default function CaseDetailPage() {
    const {id} = useParams();
    const [measurementDistance, setMeasurementDistance] = useState(null);
    const { data: caseData, isLoading, error } = useReviewCase(id);

    if (isLoading) return <Message>Loading case...</Message>;

    if (error) {
        if (error.status === 404) return <Message>Case {id} was not found</Message>;
        if (error.status === 409) return <Message>{error.message}</Message>;
        return <Message>Could not load the case. Please try again.</Message>
    }

    return (
        <div style={{ position: "relative" }}>
            <h1 style={{ margin: "12px"}}>Case {caseData.caseReference} - 3D Viewer</h1>

            {caseData.scaleFactor == null && (
                <p style={{ margin: "0 12px", color: "var(--dd-text-muted)"}}>
                    Measurements are unscaled until calibration data is available
                </p>
            )}

            {caseData.modelUrl ? (
                <ThreeCanvas
                    modelUrl={caseData.modelUrl}
                    onMeasurementChange={setMeasurementDistance}
                />
            ) : (
                <Message>No 3D model is available for this case yet.</Message>
            )}

            <UIOverlays
                measurementDistance={measurementDistance}
                damageBoxes={caseData.damageBoxes}
            />
        </div>
    );
}