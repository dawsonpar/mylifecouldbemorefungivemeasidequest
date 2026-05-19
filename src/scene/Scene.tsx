import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { ReactNode } from "react";
import { WebcamBackground } from "./WebcamBackground";
import { useWebcam } from "./useWebcam";
import { useHandTracker } from "../gestures/useHandTracker";
import { useGestureDetector } from "../gestures/useGestureDetector";
import { LandmarkDebug } from "../gestures/LandmarkDebug";
import { GestureDebugHud } from "../gestures/GestureDebugHud";

type Props = {
  children?: ReactNode;
  /** When true, renders the landmark overlay and labels on the HUD. */
  debug?: boolean;
};

export function Scene({ children, debug = false }: Props) {
  const { status: camStatus, video, error } = useWebcam();
  const { status: trackerStatus, frameRef } = useHandTracker(video);

  const detectorRef = useGestureDetector({
    frameRef,
    enabled: trackerStatus === "ready",
  });

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true }}
        className="absolute inset-0"
      >
        {/* No scene lights. Front/back use MeshBasicMaterial so
            textures render at their literal PNG colors. The 3D form
            reads from silhouette + cushion-bulge geometry alone.
            Subtle lit shading on the bulge is a future iteration; the
            multiply-blend overlay attempt was reverted because it hid
            the textures. */}
        {video && <WebcamBackground video={video} />}
        {children}
        {/* Ground-plane soft shadow below the cluster — anchors packs
            to the sense of "above a surface". ContactShadows is a
            self-contained alpha-mapped soft shadow renderer; works
            without any scene lights. */}
        <ContactShadows
          position={[0, -1.95, 0]}
          opacity={0.45}
          scale={6}
          blur={2.6}
          far={3}
        />
      </Canvas>
      {debug && <LandmarkDebug frameRef={frameRef} />}
      {debug && <GestureDebugHud detectorRef={detectorRef} />}
      {camStatus !== "ready" && (
        <CameraStatus status={camStatus} error={error} />
      )}
      {camStatus === "ready" && trackerStatus !== "ready" && (
        <TrackerStatus status={trackerStatus} />
      )}
    </div>
  );
}

function CameraStatus({
  status,
  error,
}: {
  status: "idle" | "requesting" | "ready" | "error";
  error: string | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 text-center">
      <div>
        {status === "requesting" && (
          <p className="text-sm tracking-wide text-neutral-300">
            requesting camera access
          </p>
        )}
        {status === "idle" && (
          <p className="text-sm tracking-wide text-neutral-300">
            preparing camera
          </p>
        )}
        {status === "error" && (
          <div className="max-w-md px-6">
            <p className="text-base text-red-400">camera unavailable</p>
            <p className="mt-2 text-xs text-neutral-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackerStatus({ status }: { status: "idle" | "loading" | "error" }) {
  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-300">
      {status === "loading" && "loading hand tracker"}
      {status === "error" && "hand tracker failed"}
    </div>
  );
}
