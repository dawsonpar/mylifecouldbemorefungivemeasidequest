import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Card, type CardHandle, type CardTarget } from "./Card";
import {
  CARD_COUNT,
  CLUSTER_RADIUS,
  IDLE_X_RANGE,
  IDLE_Y,
  SPIN,
} from "../state/config";
import { useAppStore } from "../state/store";
import type { Phase } from "../lib/types";

const ANGLE_STEP = (Math.PI * 2) / CARD_COUNT;

/** World-space target where the chosen card sits, centered. */
const CHOSEN_WORLD: [number, number, number] = [0, 0.2, 1.5];
const CHOSEN_SCALE = 1.25;

/**
 * Returns whether the given phase should display the "chosen card
 * in front, others dropped" arrangement.
 */
function isSelectedPhase(phase: Phase): boolean {
  return (
    phase === "select" ||
    phase === "openPack" ||
    phase === "accept" ||
    phase === "reject" ||
    phase === "throw"
  );
}

function targetForCard(
  index: number,
  phase: Phase,
  chosenIndex: number | null,
): CardTarget {
  const baseAngle = index * ANGLE_STEP;
  const isChosen = chosenIndex === index;

  if (phase === "idle") {
    const row = (index - (CARD_COUNT - 1) / 2) * (IDLE_X_RANGE / CARD_COUNT);
    return {
      position: [row, IDLE_Y, 0],
      rotation: [-Math.PI / 2.2, 0, 0],
      scale: 0.55,
      opacity: 1,
    };
  }

  if (phase === "wake" || phase === "spin") {
    const x = Math.sin(baseAngle) * CLUSTER_RADIUS;
    const z = Math.cos(baseAngle) * CLUSTER_RADIUS;
    return {
      position: [x, 0, z],
      rotation: [0, baseAngle, 0],
      scale: 1.0,
      opacity: 1,
    };
  }

  if (isSelectedPhase(phase)) {
    if (isChosen) {
      // During reject/throw the chosen card collapses (it becomes
      // the crumpled ball, visually). Hide it so the ball can fly
      // unobstructed toward the trash can in the background.
      if (phase === "reject" || phase === "throw") {
        return {
          position: CHOSEN_WORLD,
          rotation: [0, 0, 0],
          scale: 0,
          opacity: 0,
        };
      }
      // Placeholder; the real per-frame target is computed in
      // useFrame to compensate for cluster rotation.
      return {
        position: CHOSEN_WORLD,
        rotation: [0, 0, 0],
        scale: CHOSEN_SCALE,
        opacity: 1,
      };
    }
    return {
      position: [
        Math.sin(baseAngle) * CLUSTER_RADIUS,
        -2.5,
        Math.cos(baseAngle) * CLUSTER_RADIUS,
      ],
      rotation: [0, baseAngle, 0],
      scale: 0.6,
      opacity: 0,
    };
  }

  if (phase === "collection") {
    return {
      position: [0, 0, -10],
      rotation: [0, 0, 0],
      scale: 0,
      opacity: 0,
    };
  }

  return {
    position: [0, IDLE_Y, 0],
    rotation: [0, 0, 0],
    scale: 0,
    opacity: 0,
  };
}

/**
 * Compute which slot is currently closest to the camera given the
 * cluster's rotation. Slot i sits at world angle (i*step + theta);
 * the closest-to-front is the slot with maximum cos of that angle.
 */
function frontSlot(theta: number): number {
  let best = 0;
  let bestCos = -Infinity;
  for (let i = 0; i < CARD_COUNT; i++) {
    const c = Math.cos(i * ANGLE_STEP + theta);
    if (c > bestCos) {
      bestCos = c;
      best = i;
    }
  }
  return best;
}

export function CardPack() {
  const phase = useAppStore((s) => s.phase);
  const spin = useAppStore((s) => s.spin);

  const cardRefs = useRef<(CardHandle | null)[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const angularVelocityRef = useRef(0);
  const opennessRef = useRef(0.5);

  /**
   * The visual slot the user picked is whichever slot was closest
   * to the camera at the moment select fired. Decoupled from which
   * quest is loaded (the quest is sampled randomly by the store).
   */
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  // Apply phase-based targets when phase changes. The chosen card's
  // target is a placeholder here; useFrame overrides it each tick
  // when in a selected phase to compensate for cluster rotation.
  useEffect(() => {
    cardRefs.current.forEach((ref, i) => {
      if (!ref) return;
      ref.setTarget(targetForCard(i, phase, chosenIndex));
    });
  }, [phase, chosenIndex]);

  // Freeze cluster rotation the instant we enter a selected phase
  // so non-chosen cards don't keep moving through their drop animation.
  // Also lock in the front-facing slot as the chosen visual card.
  const wasSelectedRef = useRef(false);
  useEffect(() => {
    const sel = isSelectedPhase(phase);
    if (sel && !wasSelectedRef.current) {
      const theta = groupRef.current?.rotation.y ?? 0;
      setChosenIndex(frontSlot(theta));
      angularVelocityRef.current = 0;
    } else if (phase === "idle") {
      setChosenIndex(null);
    }
    wasSelectedRef.current = sel;
  }, [phase]);

  useFrame((_, deltaRaw) => {
    const group = groupRef.current;
    if (!group) return;
    const delta = Math.min(0.05, deltaRaw);

    if (phase === "spin" || phase === "wake") {
      opennessRef.current = THREE.MathUtils.clamp(spin.openness, 0, 1);

      angularVelocityRef.current += spin.handAV * SPIN.handCoupling * delta;
      angularVelocityRef.current = THREE.MathUtils.clamp(
        angularVelocityRef.current,
        -SPIN.maxAngularVelocity,
        SPIN.maxAngularVelocity,
      );

      const friction = THREE.MathUtils.lerp(
        SPIN.maxFriction,
        SPIN.minFriction,
        opennessRef.current,
      );
      angularVelocityRef.current *= Math.max(0, 1 - friction * delta);
      group.rotation.y += angularVelocityRef.current * delta;
    } else if (isSelectedPhase(phase)) {
      // Cluster is frozen. Chosen card's local position is computed
      // each frame so its WORLD position stays at CHOSEN_WORLD
      // regardless of where the cluster happens to be rotated.
      // Skip the per-frame override during reject/throw because the
      // card is hidden (scale 0) during those phases.
      const showChosenCard = phase !== "reject" && phase !== "throw";
      if (chosenIndex !== null && showChosenCard) {
        const ref = cardRefs.current[chosenIndex];
        if (ref) {
          const theta = group.rotation.y;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);
          const localX = CHOSEN_WORLD[0] * cos - CHOSEN_WORLD[2] * sin;
          const localZ = CHOSEN_WORLD[0] * sin + CHOSEN_WORLD[2] * cos;
          ref.setTarget({
            position: [localX, CHOSEN_WORLD[1], localZ],
            rotation: [0, -theta, 0],
            scale: CHOSEN_SCALE,
            opacity: 1,
          });
        }
      }
      // No rotation update; cluster sits still.
    } else if (phase === "idle" || phase === "collection") {
      // Lerp rotation back to nearest 2*PI so idle row sits straight.
      angularVelocityRef.current *= Math.max(0, 1 - SPIN.resetFriction * delta);
      const target = nearestZeroRotation(group.rotation.y);
      const diff = target - group.rotation.y;
      group.rotation.y += diff * Math.min(1, delta * 6);
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: CARD_COUNT }).map((_, i) => {
        const initial = targetForCard(i, "idle", null);
        return (
          <Card
            key={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            initial={initial}
            hue={(i / CARD_COUNT + 0.05) % 1}
          />
        );
      })}
    </group>
  );
}

function nearestZeroRotation(current: number): number {
  return Math.round(current / (Math.PI * 2)) * Math.PI * 2;
}
