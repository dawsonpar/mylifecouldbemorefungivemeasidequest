import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
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
import { ACTIVE_PACK_SET, packDesignAt } from "./pack-sets";

const ANGLE_STEP = (Math.PI * 2) / CARD_COUNT;

/** World-space target where the chosen card sits, centered. */
const CHOSEN_WORLD: [number, number, number] = [0, 0.2, 1.5];
const CHOSEN_SCALE = 1.25;

/**
 * Idle-entry animation. When phase transitions INTO idle (e.g. from
 * acceptOutro), every card snaps to invisible at `IDLE_Y -
 * IDLE_ENTRY_DROP`, waits `IDLE_ENTRY_DELAY_MS` (the empty beat the
 * user sees after the accept HUD has faded), then lerps up to the
 * regular idle row target. The per-card opacity lerp gives the
 * fade-in for free.
 *
 * The drop must be large enough to read as "rising"; the delay must
 * leave a perceptible gap of nothing on screen. Tune together.
 */
const IDLE_ENTRY_DROP = 0.7;
const IDLE_ENTRY_DELAY_MS = 350;

/**
 * Returns whether the given phase should display the "chosen card
 * in front, others dropped" arrangement.
 */
function isSelectedPhase(phase: Phase): boolean {
  return (
    phase === "select" ||
    phase === "openPack" ||
    phase === "accept" ||
    phase === "acceptOutro" ||
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
  const packIndex = useAppStore((s) => s.packIndex);

  // Preload every front, back and side texture for the ACTIVE pack
  // set in a single useTexture call (drei caches each URL) so swaps
  // between designs are flicker-free. Inactive pack sets don't load
  // any textures — the active set is fixed for the session.
  const packs = ACTIVE_PACK_SET.packs;
  const allUrls = packs.flatMap((d) => [
    d.textureUrl,
    d.backTextureUrl,
    d.sideTextureUrl,
  ]);
  const textures = useTexture(allUrls);
  const textureList = Array.isArray(textures) ? textures : [textures];
  textureList.forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  });
  // Each design occupies three consecutive slots in textureList:
  // 3*i = front, 3*i + 1 = back, 3*i + 2 = side.
  function texturesForDesign(designIdx: number) {
    return {
      front: textureList[designIdx * 3] ?? null,
      back: textureList[designIdx * 3 + 1] ?? null,
      side: textureList[designIdx * 3 + 2] ?? null,
    };
  }

  /** Returns the design + textures for a given card slot in this round. */
  function designForSlot(i: number) {
    const idx = (i + packIndex) % packs.length;
    const tex = texturesForDesign(idx);
    return {
      design: packDesignAt(i + packIndex),
      front: tex.front,
      back: tex.back,
      side: tex.side,
    };
  }


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

  // Apply phase-based targets when phase changes.
  //
  // For the chosen card during a selected phase that keeps it visible
  // (everything except reject / throw), we skip writing a target here
  // and let `useFrame` below own the chosen-card target entirely. The
  // reason is subtle: `targetForCard` returns rotation `[0, 0, 0]` for
  // the chosen card as a placeholder, expecting `useFrame` to override
  // it on the next tick with a `[0, -theta, 0]` rotation that
  // compensates for the cluster's rotation so the card faces camera.
  // Writing the placeholder here on a `select → openPack` transition
  // briefly makes `target.rotation` `[0, 0, 0]`, and Card's per-frame
  // rotation lerp can then drift up to ~7% of theta toward 0 in a
  // single frame before `useFrame` rewrites the target. That single
  // frame is visible as a small Y-axis "stutter" at the moment the
  // cut is triggered. Skipping the chosen card here removes the race.
  //
  // Entering idle from another phase runs the rise+fade-in: every
  // card is snapped to opacity 0 and dropped below the row, then
  // after IDLE_ENTRY_DELAY_MS the real idle target is written so the
  // per-card lerp surfaces them. The snap is what makes resetCut()
  // (called by the cut-state effect on idle entry) invisible — the
  // pack body would otherwise pop back to assembled at full opacity
  // for the chosen slot.
  const prevPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    const enteringIdle =
      phase === "idle" && prev !== null && prev !== "idle";

    if (enteringIdle) {
      // Snap every card to the low row position, invisible. Snap (not
      // setTarget) is required because the chosen card was at
      // front-center during accept; a plain target write would let it
      // lerp down from y=0.2 over many frames and fade in mid-flight,
      // reading as "the chosen card falls into place" instead of the
      // whole row rising together.
      cardRefs.current.forEach((ref, i) => {
        if (!ref) return;
        const rowX =
          (i - (CARD_COUNT - 1) / 2) * (IDLE_X_RANGE / CARD_COUNT);
        ref.snap({
          position: [rowX, IDLE_Y - IDLE_ENTRY_DROP, 0],
          rotation: [-Math.PI / 2.2, 0, 0],
          scale: 0.55,
          opacity: 0,
        });
      });
      const id = window.setTimeout(() => {
        cardRefs.current.forEach((ref, i) => {
          if (!ref) return;
          ref.setTarget(targetForCard(i, "idle", null));
        });
      }, IDLE_ENTRY_DELAY_MS);
      return () => window.clearTimeout(id);
    }

    const sel = isSelectedPhase(phase);
    cardRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const isChosenVisible =
        i === chosenIndex && sel && phase !== "reject" && phase !== "throw";
      if (isChosenVisible) return;
      ref.setTarget(targetForCard(i, phase, chosenIndex));
    });
    return undefined;
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

  // Drive the per-card cut animation. Trigger beginCut on the chosen
  // card the moment the phase enters openPack. Cut state must persist
  // through accept/reject/throw so the pack stays visibly cut while
  // the quest card holds focus; only reset when we land back in idle
  // for the next round.
  const wasOpeningRef = useRef(false);
  useEffect(() => {
    const opening = phase === "openPack";
    if (opening && !wasOpeningRef.current && chosenIndex !== null) {
      cardRefs.current[chosenIndex]?.beginCut();
    }
    if (phase === "idle") {
      cardRefs.current.forEach((ref) => ref?.resetCut());
    }
    wasOpeningRef.current = opening;
  }, [phase, chosenIndex]);

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
        const slot = designForSlot(i);
        return (
          <Card
            key={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            initial={initial}
            frontTexture={slot.front}
            backTexture={slot.back}
            sideTexture={slot.side}
            edgeColor={slot.design.edgeColor}
          />
        );
      })}
    </group>
  );
}

function nearestZeroRotation(current: number): number {
  return Math.round(current / (Math.PI * 2)) * Math.PI * 2;
}
