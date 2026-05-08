import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CARD_SIZE, LERP } from "../state/config";

export type CardTarget = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
};

export type CardHandle = {
  setTarget(t: Partial<CardTarget>): void;
  group: THREE.Group | null;
};

type Props = {
  initial: CardTarget;
  /** Hue [0..1] for placeholder back coloring. Real art comes later. */
  hue: number;
};

const tmp = new THREE.Vector3();
const tmpEuler = new THREE.Euler();

/**
 * Single card mesh. Animates toward an internally-stored target
 * each frame. Targets are pushed via the imperative handle so the
 * parent can compute geometry once and not re-render per-frame.
 */
export const Card = forwardRef<CardHandle, Props>(function Card(
  { initial, hue },
  ref,
) {
  const group = useRef<THREE.Group>(null);
  const target = useRef<CardTarget>({ ...initial });
  const opacityRef = useRef(initial.opacity);

  const backColor = useMemo(() => {
    const c = new THREE.Color();
    c.setHSL(hue, 0.35, 0.18);
    return c;
  }, [hue]);

  const accentColor = useMemo(() => {
    const c = new THREE.Color();
    c.setHSL(hue, 0.55, 0.55);
    return c;
  }, [hue]);

  useImperativeHandle(
    ref,
    () => ({
      setTarget(t) {
        Object.assign(target.current, t);
      },
      get group() {
        return group.current;
      },
    }),
    [],
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const t = target.current;
    const k = Math.min(1, delta * LERP.position);
    const r = Math.min(1, delta * LERP.rotation);
    const s = Math.min(1, delta * LERP.scale);

    g.position.lerp(tmp.set(...t.position), k);

    tmpEuler.set(t.rotation[0], t.rotation[1], t.rotation[2]);
    g.rotation.x += (tmpEuler.x - g.rotation.x) * r;
    g.rotation.y += (tmpEuler.y - g.rotation.y) * r;
    g.rotation.z += (tmpEuler.z - g.rotation.z) * r;

    const ns = g.scale.x + (t.scale - g.scale.x) * s;
    g.scale.setScalar(ns);

    opacityRef.current += (t.opacity - opacityRef.current) * s;
    g.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof THREE.MeshStandardMaterial
      ) {
        obj.material.opacity = opacityRef.current;
        obj.material.transparent = true;
      }
    });
  });

  return (
    <group ref={group} position={initial.position} rotation={initial.rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CARD_SIZE.width, CARD_SIZE.height, CARD_SIZE.depth]} />
        <meshStandardMaterial color={backColor} roughness={0.35} metalness={0.2} />
      </mesh>
      {/* Accent border on the front face */}
      <mesh position={[0, 0, CARD_SIZE.depth / 2 + 0.001]}>
        <planeGeometry
          args={[CARD_SIZE.width * 0.85, CARD_SIZE.height * 0.85]}
        />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.4}
          metalness={0.6}
          emissive={accentColor}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
});
