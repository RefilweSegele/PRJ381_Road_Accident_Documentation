import React from "react";
import { Html } from "@react-three/drei";

//renders real 3D wireframe box for each damage region, positioned using detection table's boundingBox coordinates.

export default function DamageBoxes({ damageBoxes = [] }) {
    return (
        <>
            {damageBoxes.map((d, i) => {
                const { x_min, x_max, y_min, y_max, z_min, z_max } = d.boundingBox;

                //Box center and size, computed from max/min corners
                const center = [
                    (x_min + x_max) / 2,
                    (y_min + y_max) / 2,
                    (z_min + z_max) / 2,
                ];
                const size = [x_max - x_min, y_max - y_min, z_max - z_min];

                return (
                    <group key={i} position={center}>
                        <mesh>
                            <boxGeometry args={size} />
                            <meshBasicMaterial color="red" wireframe transparent opacity={0.8} />
                        </mesh>

                        {/* Floating label - drei's <Html> auto projects this 3D position onto the 2D screen every frame, including orbit. */}
                        <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
                            <div
                                style={{
                                    background: "rgba(220,0,0,0.85)",
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {d.damageType} ({(d.confidence * 100).toFixed(0)}%)
                            </div>
                        </Html>
                    </group>
                );
            })}
        </>
    );
}