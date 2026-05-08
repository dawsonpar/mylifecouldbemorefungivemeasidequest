import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "../state/store";
import { usePhaseTime } from "./usePhaseTime";
import { TRASH_POSITION } from "./TrashCan";

const PACK_POSITION: [number, number, number] = [0, 0.2, 1.5];

/**
 * Crumpled paper ball. Spawns during reject (replacing the inner
 * card visually) and travels in an arc toward the trash can during
 * throw. Hit vs miss is decided by store.throwHit.
 */
export function CrumpleBall() {
  const phase = useAppStore((s) => s.phase);
  const throwHit = useAppStore((s) => s.throwHit);
  const rejectTime = usePhaseTime(phase, "reject");
  const throwTime = usePhaseTime(phase, "throw");

  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const m = meshRef.current;
    if (!m || !matRef.current) return;

    if (phase === "reject") {
      // Spawn at pack position, scale up from 0 to 0.2 over 0.4s
      const t = rejectTime.current;
      const grow = Math.min(1, t / 0.4);
      m.position.set(...PACK_POSITION);
      m.scale.setScalar(0.18 * grow);
      m.rotation.x = t * 2;
      m.rotation.y = t * 1.5;
      matRef.current.opacity = grow;
      return;
    }

    if (phase === "throw") {
      // Ball arcs forward INTO the screen (z decreases) and lifts in
      // a short parabola. Hit = lands at TRASH_POSITION (above the
      // opening so it falls in). Miss = clips the rim and bounces
      // off to the side.
      const t = Math.min(1, throwTime.current / 0.9);
      const eased = easeInQuad(t);
      const start = new THREE.Vector3(...PACK_POSITION);
      const target = new THREE.Vector3(
        ...(throwHit
          ? ([TRASH_POSITION[0], TRASH_POSITION[1] + 0.55, TRASH_POSITION[2]] as [
              number,
              number,
              number,
            ])
          : ([
              TRASH_POSITION[0] + 0.6,
              TRASH_POSITION[1] + 0.6,
              TRASH_POSITION[2] + 0.3,
            ] as [number, number, number])),
      );
      const arcHeight = 0.7;
      const x = start.x + (target.x - start.x) * eased;
      const y =
        start.y + (target.y - start.y) * eased + Math.sin(eased * Math.PI) * arcHeight;
      const z = start.z + (target.z - start.z) * eased;
      m.position.set(x, y, z);
      m.rotation.x += 0.25;
      m.rotation.y += 0.18;

      // Ball shrinks visually as it gets deeper (perspective is
      // already shrinking it, but we exaggerate for clarity), then
      // disappears once it reaches the opening (hit) or after
      // bouncing off (miss).
      const baseScale = 0.18 * (1 - 0.4 * eased);
      const fade = Math.max(
        0,
        1 - Math.max(0, throwTime.current - 0.95) / 0.35,
      );
      m.scale.setScalar(baseScale * fade);
      matRef.current.opacity = fade;
      return;
    }

    // Idle: hide
    m.scale.setScalar(0.001);
    matRef.current.opacity = 0;
  });

  return (
    <mesh ref={meshRef} scale={0.001}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        color="#fafaf5"
        roughness={0.9}
        metalness={0.0}
        flatShading
        transparent
        opacity={0}
      />
    </mesh>
  );
}

function easeInQuad(x: number): number {
  return x * x;
}
