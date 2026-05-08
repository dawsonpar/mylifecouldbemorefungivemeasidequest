import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "../state/store";
import { usePhaseTime } from "./usePhaseTime";

export const TRASH_POSITION: [number, number, number] = [1.7, -1.2, 1.4];

/**
 * One-shot trash can. Fades in during reject, holds through throw,
 * fades out during the post-throw reset window.
 */
export function TrashCan() {
  const phase = useAppStore((s) => s.phase);
  const rejectTime = usePhaseTime(phase, "reject");
  const throwTime = usePhaseTime(phase, "throw");
  const groupRef = useRef<THREE.Group>(null);
  const wallMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    let opacity = 0;
    if (phase === "reject") {
      opacity = Math.min(1, rejectTime.current / 0.4);
    } else if (phase === "throw") {
      opacity = Math.max(0, 1 - Math.max(0, throwTime.current - 1.3) / 0.4);
    }
    g.scale.setScalar(opacity > 0 ? 1 : 0.001);
    if (wallMatRef.current) {
      wallMatRef.current.opacity = opacity;
    }
  });

  return (
    <group ref={groupRef} position={TRASH_POSITION}>
      {/* Outer wall */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.32, 0.7, 32, 1, true]} />
        <meshStandardMaterial
          ref={wallMatRef}
          color="#222"
          roughness={0.7}
          metalness={0.4}
          side={THREE.DoubleSide}
          transparent
          opacity={0}
        />
      </mesh>
      {/* Inner shadow disk */}
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.4, 32]} />
        <meshBasicMaterial color="#0a0a0a" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
