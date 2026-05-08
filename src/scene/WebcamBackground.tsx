import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

type Props = {
  video: HTMLVideoElement;
  /** Z position of the background plane. Far enough back to sit behind cards. */
  zDepth?: number;
};

/**
 * Background plane sized to fill the camera frustum at zDepth.
 * Mirrored on X so the user sees themselves naturally.
 */
export function WebcamBackground({ video, zDepth = -5 }: Props) {
  const { camera, viewport } = useThree();

  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }, [video]);

  const { width, height } = useMemo(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const distance = Math.abs(zDepth - camera.position.z);
      const vFov = (camera.fov * Math.PI) / 180;
      const h = 2 * Math.tan(vFov / 2) * distance;
      const w = h * camera.aspect;
      return { width: w, height: h };
    }
    return { width: viewport.width, height: viewport.height };
  }, [camera, zDepth, viewport]);

  return (
    <mesh position={[0, 0, zDepth]} scale={[-1, 1, 1]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
