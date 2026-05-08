import { useEffect, useMemo, useRef } from "react";
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

/**
 * Per-card geometry for each phase.
 *
 * idle: row at bottom of frame, lying flat (rotated face-up, viewed
 *       almost from behind), small.
 * wake / spin / select / openPack / collection-other: arranged on a
 *       circle in the XZ plane, all facing outward radially. The
 *       group rotates as a whole around Y when phase = "spin".
 * select: chosen card rises to center; others drop and fade.
 *
 * For openPack onward we treat just the chosen card; the others are
 * already invisible.
 */
function targetForCard(index: number, phase: Phase, chosenIndex: number | null): CardTarget {
  const angleStep = (Math.PI * 2) / CARD_COUNT;
  const baseAngle = index * angleStep;
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

  if (phase === "select" || phase === "openPack" || phase === "accept" || phase === "reject" || phase === "throw") {
    if (isChosen) {
      return {
        position: [0, 0.2, 1.5],
        rotation: [0, 0, 0],
        scale: 1.25,
        opacity: 1,
      };
    }
    // Non-chosen cards drop and fade
    return {
      position: [Math.sin(baseAngle) * CLUSTER_RADIUS, -2.5, Math.cos(baseAngle) * CLUSTER_RADIUS],
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

export function CardPack() {
  const phase = useAppStore((s) => s.phase);
  const spin = useAppStore((s) => s.spin);
  const currentQuest = useAppStore((s) => s.currentQuest);
  const pool = useAppStore((s) => s.pool);

  const cardRefs = useRef<(CardHandle | null)[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const angularVelocityRef = useRef(0);

  /**
   * The chosen card's index in the cluster is stable: we lock it when
   * we transition into "select". Use the position of the currentQuest
   * in the pool, modulo CARD_COUNT, so it's deterministic per quest.
   */
  const chosenIndex = useMemo(() => {
    if (!currentQuest) return null;
    const idx = pool.findIndex((q) => q.id === currentQuest.id);
    if (idx < 0) return Math.floor(CARD_COUNT / 2);
    return idx % CARD_COUNT;
  }, [currentQuest, pool]);

  useEffect(() => {
    cardRefs.current.forEach((ref, i) => {
      if (!ref) return;
      ref.setTarget(targetForCard(i, phase, chosenIndex));
    });
  }, [phase, chosenIndex]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (phase === "spin") {
      const target =
        SPIN.maxAngularVelocity *
        spin.speed *
        (spin.direction === "cw" ? -1 : 1);
      angularVelocityRef.current +=
        (target - angularVelocityRef.current) * Math.min(1, delta * 6);
    } else {
      angularVelocityRef.current +=
        (0 - angularVelocityRef.current) * Math.min(1, delta * 4);
    }

    group.rotation.y += angularVelocityRef.current * delta;
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
