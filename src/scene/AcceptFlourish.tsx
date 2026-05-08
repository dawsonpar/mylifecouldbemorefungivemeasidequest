import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "../state/store";
import { usePhaseTime } from "./usePhaseTime";

/**
 * Green emissive halo that pulses behind the revealed card during
 * the accept phase. Lives at the same world position as the inner
 * quest card.
 */
export function AcceptFlourish() {
  const phase = useAppStore((s) => s.phase);
  const phaseTime = usePhaseTime(phase, "accept");
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !matRef.current) return;
    if (phase !== "accept") {
      matRef.current.opacity = 0;
      return;
    }
    const t = phaseTime.current;
    const fadeIn = Math.min(1, t / 0.25);
    const fadeOut = Math.max(0, 1 - Math.max(0, t - 1.6) / 0.6);
    const pulse = 0.7 + 0.3 * Math.sin(t * 6);
    matRef.current.opacity = 0.85 * fadeIn * fadeOut * pulse;
    meshRef.current.scale.setScalar(1 + 0.2 * Math.sin(t * 4));
  });

  return (
    <mesh ref={meshRef} position={[0, 0.2, 1.45]}>
      <circleGeometry args={[0.95, 48]} />
      <meshBasicMaterial
        ref={matRef}
        color="#22c55e"
        transparent
        opacity={0}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}
