import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Quest } from "../lib/types";
import { CARD_SIZE } from "../state/config";
import { useAppStore } from "../state/store";
import { usePhaseTime } from "./usePhaseTime";

const PACK_POSITION: [number, number, number] = [0, 0.2, 1.5];

/**
 * Cut beat: a horizontal slice traverses the top of the pack over
 * ~0.45s. Reveal beat: an inner card slides out and forward to a
 * larger size, with the quest face projected via drei <Html>.
 */
export function QuestReveal() {
  const phase = useAppStore((s) => s.phase);
  const currentQuest = useAppStore((s) => s.currentQuest);
  const phaseTime = usePhaseTime(phase, "openPack");

  // Show the quest face during openPack and accept only. During
  // reject/throw the card has collapsed into the crumple ball;
  // keeping the quest face up would block the ball's path to the
  // trash can in the background.
  const showQuestFace = phase === "openPack" || phase === "accept";

  if (!currentQuest || !showQuestFace) return null;

  return (
    <group position={PACK_POSITION}>
      <Slice phaseTime={phaseTime} />
      <InnerCard quest={currentQuest} phaseTime={phaseTime} />
    </group>
  );
}

function Slice({ phaseTime }: { phaseTime: { current: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const SLICE_DURATION = 0.45;

  useFrame(() => {
    const t = phaseTime.current;
    if (!meshRef.current || !matRef.current) return;

    if (t <= 0 || t >= SLICE_DURATION) {
      matRef.current.opacity = 0;
      return;
    }

    const progress = t / SLICE_DURATION;
    matRef.current.opacity = 1;
    meshRef.current.scale.x = progress;
    meshRef.current.position.y = CARD_SIZE.height * 0.5 * 1.25 + 0.02;
  });

  return (
    <mesh ref={meshRef} position={[0, CARD_SIZE.height * 0.5, 0.05]}>
      <planeGeometry args={[CARD_SIZE.width * 1.2, 0.015]} />
      <meshBasicMaterial
        ref={matRef}
        color="#ef4444"
        transparent
        opacity={0}
        toneMapped={false}
      />
    </mesh>
  );
}

function InnerCard({
  quest,
  phaseTime,
}: {
  quest: Quest;
  phaseTime: { current: number };
}) {
  const groupRef = useRef<THREE.Group>(null);

  const SLIDE_DELAY = 0.35;
  const SLIDE_DURATION = 0.7;

  // Render dimensions slightly larger than the pack so it's clear
  // this is a different card emerging.
  const innerSize = useMemo(
    () => ({
      width: CARD_SIZE.width * 1.1,
      height: CARD_SIZE.height * 1.1,
    }),
    [],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const t = phaseTime.current;
    const eased =
      t < SLIDE_DELAY
        ? 0
        : Math.min(1, (t - SLIDE_DELAY) / SLIDE_DURATION);
    const e = easeOutCubic(eased);
    g.position.y = e * 0.2;
    g.position.z = e * 0.6;
    g.scale.setScalar(0.6 + e * 0.55);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0.6}>
      <mesh>
        <boxGeometry args={[innerSize.width, innerSize.height, CARD_SIZE.depth]} />
        <meshStandardMaterial color="#fafaf5" roughness={0.5} metalness={0.05} />
      </mesh>
      <Html
        transform
        occlude
        position={[0, 0, CARD_SIZE.depth / 2 + 0.001]}
        distanceFactor={1}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            width: `${innerSize.width * 200}px`,
            height: `${innerSize.height * 200}px`,
          }}
          className="flex flex-col gap-2 rounded-md bg-[#fafaf5] p-4 font-serif text-[#111]"
        >
          <div className="text-[18px] font-semibold leading-tight tracking-tight">
            {quest.title}
          </div>
          <div className="text-[11px] leading-snug text-[#3b3b3b]">
            {quest.description}
          </div>
          {quest.requirements && (
            <div className="mt-1 border-t border-[#ddd] pt-1 text-[10px] leading-snug text-[#555]">
              <span className="font-bold uppercase tracking-widest">required: </span>
              {quest.requirements}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
