import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, Html, Line, OrbitControls, useGLTF } from "@react-three/drei";
import useAuthedBlob from "./useAuthedBlob";
import { describe, midpoint } from "./measure";

const MEASURE_TOOLS = ["point", "distance", "area", "polyline"];

// The reconstructed scene. WebODM meshes are Z-up; if the model is flatter along
// Z than along Y we stand it up so "up" is always Y in the viewer.
function Model({ url, measuring, onPoint, onInfo }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();
  const zUp = useMemo(() => {
    const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    return size.z < size.y && size.z <= size.x;
  }, [scene]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.updateMatrixWorld(true);
    const sphere = new THREE.Box3().setFromObject(groupRef.current).getBoundingSphere(new THREE.Sphere());
    onInfo?.({ radius: sphere.radius });
  }, [scene, zUp, onInfo]);

  const handleClick = (e) => {
    if (!measuring || e.delta > 4) return; // ignore drags (camera orbiting)
    e.stopPropagation();
    onPoint([e.point.x, e.point.y, e.point.z]);
  };

  return (
    <group ref={groupRef} rotation={zUp ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <primitive object={scene} onClick={handleClick} />
    </group>
  );
}

function Measurement({ item, scale, unit, r }) {
  const pts = item.points;
  const color = item.draft ? "#ffffff" : "#ffd54a";
  const linePts = item.kind === "area" && pts.length >= 3 ? [...pts, pts[0]] : pts;
  const needed = item.kind === "area" ? 3 : item.kind === "point" ? 1 : 2;
  return (
    <>
      {pts.map((p, i) => (
        <mesh key={i} position={p} renderOrder={999}>
          <sphereGeometry args={[r, 16, 16]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      ))}
      {linePts.length >= 2 && <Line points={linePts} color={color} lineWidth={2} depthTest={false} renderOrder={998} />}
      {pts.length >= needed && (
        <Html position={item.kind === "point" ? pts[0] : midpoint(pts)} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="dv-meas-label">{describe(item, scale, unit).label}</div>
        </Html>
      )}
    </>
  );
}

function MeasureLayer({ items, draft, tool, scale, unit, r }) {
  const all = draft.length
    ? [...items, { id: "draft", draft: true, points: draft, kind: tool === "area" ? "area" : tool === "polyline" ? "polyline" : "distance" }]
    : items;
  return (
    <group name="measurements">
      {all.map((item) => <Measurement key={item.id} item={item} scale={scale} unit={unit} r={r} />)}
    </group>
  );
}

// Gives the parent a function that returns a JPEG of exactly what the 3D view
// shows (without the measurement lines) - used for live damage detection.
function CaptureBridge({ captureRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    captureRef.current = () => new Promise((resolve, reject) => {
      const group = scene.getObjectByName("measurements");
      const wasVisible = group ? group.visible : true;
      if (group) group.visible = false;
      gl.render(scene, camera);
      gl.domElement.toBlob(
        (blob) => (blob
          ? resolve({ blob, width: gl.domElement.width, height: gl.domElement.height })
          : reject(new Error("Could not capture the 3D view"))),
        "image/jpeg", 0.92,
      );
      if (group) group.visible = wasVisible; // toBlob snapshots synchronously
    });
    return () => { captureRef.current = null; };
  }, [gl, scene, camera, captureRef]);
  return null;
}

export default function ThreeCanvas({
  modelUrl, tool, items, draft, scale, unit, onPoint, captureRef, onCameraChange,
}) {
  const [radius, setRadius] = useState(1);
  const onInfo = useCallback((info) => setRadius(info.radius || 1), []);
  const { objectUrl, loading, error, progress } = useAuthedBlob(modelUrl, "model/gltf-binary");
  const measuring = MEASURE_TOOLS.includes(tool);

  const mouseButtons = {
    LEFT: tool === "pan" ? THREE.MOUSE.PAN : tool === "zoom" ? THREE.MOUSE.DOLLY : THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  return (
    <div className={`dv-canvas${measuring ? " is-measuring" : ""}`}>
      {loading && <div className="dv-overlay-msg">Downloading 3D model... {Math.round(progress * 100)}%</div>}
      {error && <div className="dv-overlay-msg dv-error">{error}</div>}
      <Canvas
        camera={{ position: [3, 3, 3], fov: 50, near: 0.01, far: 5000 }}
        gl={{ preserveDrawingBuffer: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          {objectUrl && (
            <Bounds fit clip observe margin={1.2}>
              <Model url={objectUrl} measuring={measuring} onPoint={onPoint} onInfo={onInfo} />
            </Bounds>
          )}
        </Suspense>
        <MeasureLayer items={items} draft={draft} tool={tool} scale={scale} unit={unit} r={Math.max(radius * 0.006, 0.02)} />
        <CaptureBridge captureRef={captureRef} />
        <OrbitControls makeDefault enableDamping mouseButtons={mouseButtons} onChange={onCameraChange} />
      </Canvas>
    </div>
  );
}