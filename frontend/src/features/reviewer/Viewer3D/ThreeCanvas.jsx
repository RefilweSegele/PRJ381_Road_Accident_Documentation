import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Bounds } from "@react-three/drei";
import Raycaster from "./Raycaster";

//loads & renders the actual restructed model
//modelURL comes from the case's ODM output
function SceneModel ({ modelUrl, onSurfaceClick}) {
    const { scene } = useGLTF(modelUrl);
    return (
        <primitive
            object={scene}
            onClick={onSurfaceClick}
        />    
    );
}

//Fallback shown while  glTF model is loading
function LoadingBox() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" wireframe />
        </mesh>
    );
}

export default function ThreeCanvas ({ modelUrl, onMeasurementChange }) {
    return (
      <div
        style={{
          width: "100%",
          height: "600px",
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 35%, #2a3342 0%, #12161d 80%)",
          boxShadow:
            "0 1px 2px rgba(18,22,29,.1), 0 18px 40px -16px rgba(18,22,29,.4)",
        }}
      >
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          {/*Basic lighting so the model isn't pitch black*/}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          <Suspense fallback={<LoadingBox />}>
            {modelUrl ? (
              <Bounds fit clip observe margin={1.2}>
                <Raycaster onMeasurementChange={onMeasurementChange}>
                  {(handleClick) => (
                    <SceneModel
                      modelUrl={modelUrl}
                      onSurfaceClick={handleClick}
                    />
                  )}
                </Raycaster>
              </Bounds>
            ) : (
              <LoadingBox />
            )}
          </Suspense>

          {/* Lets the reviewer rotate, zoom, and pan the model */}
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    );
}