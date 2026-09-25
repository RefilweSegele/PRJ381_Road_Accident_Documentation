import React, {useState} from "react";
import * as THREE from "three";

/*
    Render-prop component: it doesn't render its own mesh, it hands the parent a click handler and tracks up to 2 click points in world space to measure the distance between them. 
*/ 
export default function Raycaster({ children, onMeasurementChange }) {
    const [points, setPoints] = useState([]);

    function handleClick(event) {
        event.stopPropagation(); //don't let click fall through to OrbitControls
        const point = event.point;

        setPoints((prev) => {
            const next =prev.length >= 2 ? [point] : [...prev, point];

            if (next.length === 2) {
                const distance = next[0].distanceTo(next[1]);
                onMeasurementChange?.(distance, next);
            }
            return next;
        });
    }

    return children(handleClick);
}