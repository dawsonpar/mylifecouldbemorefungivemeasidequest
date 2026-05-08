import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "../state/store";
import { usePhaseTime } from "./usePhaseTime";

/**
 * Trash can sits behind the card pack (negative Z) and slightly
 * below center, so the throw motion arcs forward INTO the screen
 * from the user's hand position toward the can.
 */
export const TRASH_POSITION: [number, number, number] = [0.3, -0.4, -2.2];

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
      {/* Outer wall, scaled larger since it's deeper in the scene */}
      <mesh>
        <cylinderGeometry args={[0.55, 0.42, 1.0, 36, 1, true]} />
        <meshStandardMaterial
          ref={wallMatRef}
          color="#1a1a1a"
          roughness={0.7}
          metalness={0.4}
          side={THREE.DoubleSide}
          transparent
          opacity={0}
        />
      </mesh>
      {/* Rim highlight */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.58, 36]} />
        <meshStandardMaterial
          color="#3a3a3a"
          roughness={0.5}
          metalness={0.6}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Inner shadow disk (the opening) */}
      <mesh position={[0, 0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 36]} />
        <meshBasicMaterial color="#050505" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
