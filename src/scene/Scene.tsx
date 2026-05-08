import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { WebcamBackground } from "./WebcamBackground";
import { useWebcam } from "./useWebcam";

type Props = {
  children?: ReactNode;
};

export function Scene({ children }: Props) {
  const { status, video, error } = useWebcam();

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true }}
        className="absolute inset-0"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1.2} />
        {video && <WebcamBackground video={video} />}
        {children}
      </Canvas>
      {status !== "ready" && <CameraStatus status={status} error={error} />}
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
