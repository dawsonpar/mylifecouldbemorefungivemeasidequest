import type { HandsFrame, Hand, Landmark } from "./landmarks";
import {
  LM,
  isOpenHand,
  isScissors,
  isThumbsUp,
  isThumbsDown,
  isClosedFist,
  pinchDistance,
  wristAngle,
} from "./landmarks";
import type { GestureEvent, Phase, SpinDirection } from "../lib/types";

/**
 * Tunables for gesture detection. Surface these in one place so a
 * tuning pass against real footage is a single-file change.
 */
export const TUNING = {
  /** How long a pose must hold before firing a static-pose event (ms). */
  posedHoldMs: 180,
  /** Minimum gap between same-event fires (ms). */
  refractoryMs: 700,
  /** Pinch is "touching" below this normalized distance. */
  pinchThreshold: 0.08,
  /** History window for velocity / angular velocity calculations (ms). */
  historyMs: 220,
  /** Minimum angular velocity to declare a spin (rad/s). */
  minAngularVelocity: 0.6,
  /** Minimum horizontal speed (image-units/sec) for a cut to register. */
  cutHorizontalSpeed: 1.2,
  /** Minimum upward velocity (image-units/sec) for a throw release. */
  throwUpwardSpeed: 1.2,
  /** Frames over which fist must precede open-hand for a throw. */
  throwFistWindowMs: 300,
} as const;

type WristSample = { x: number; y: number; angle: number; t: number };

export type DetectorState = {
  /** Per-event last-fire timestamps for refractory enforcement. */
  lastFire: Map<string, number>;
  /** Per-pose first-seen timestamps for hold-debounce. */
  posedSince: Map<string, number>;
  /** Sliding window of wrist samples. */
  wristHistory: WristSample[];
  /** Time when a closed fist was first seen (for throw detection). */
  fistSince: number | null;
};

export function createDetectorState(): DetectorState {
  return {
    lastFire: new Map(),
    posedSince: new Map(),
    wristHistory: [],
    fistSince: null,
  };
}

/**
 * Pure detection step. Reads the current frame, the active phase,
 * and the running detector state. Returns zero or more events.
 * Mutates `state` (rolling history, debounce timers).
 */
export function detect(
  state: DetectorState,
  frame: HandsFrame | null,
  phase: Phase,
): GestureEvent[] {
  if (!frame) return [];
  const now = frame.timestamp;
  const events: GestureEvent[] = [];

  pruneHistory(state.wristHistory, now);

  // Track wrist sample for whichever hand is "active" (the first hand).
  const active = frame.hands[0];
  if (active) {
    const w = active.points[LM.WRIST];
    state.wristHistory.push({
      x: w.x,
      y: w.y,
      angle: wristAngle(active),
      t: now,
    });
  }

  // === Wake (idle): two hands, both open palms ===
  if (phase === "idle") {
    const wakePosed =
      frame.hands.length === 2 &&
      frame.hands.every((h) => isOpenHand(h));
    if (poseHeld(state, "wake", wakePosed, now)) {
      if (canFire(state, "wake", now)) {
        events.push({ kind: "wake" });
      }
    }
  }

  // === Spin: continuous, only valid in wake/spin ===
  if ((phase === "wake" || phase === "spin") && active) {
    const angVel = angularVelocity(state.wristHistory);
    const speed = clamp01(1 - pinchDistance(active) / 0.5);
    if (Math.abs(angVel) >= TUNING.minAngularVelocity) {
      const direction: SpinDirection = angVel < 0 ? "ccw" : "cw";
      events.push({ kind: "spin", direction, speed });
    } else if (phase === "spin") {
      // Keep speed updated even when angular velocity dips.
      events.push({
        kind: "spin",
        direction: angVel < 0 ? "ccw" : "cw",
        speed,
      });
    }
  }

  // === Select: pinch ===
  if (phase === "spin" && active) {
    const pinching = pinchDistance(active) < TUNING.pinchThreshold;
    if (poseHeld(state, "stopSelect", pinching, now)) {
      if (canFire(state, "stopSelect", now)) {
        events.push({ kind: "stopSelect" });
      }
    }
  }

  // === Cut: scissors + horizontal motion ===
  if (phase === "select" && active) {
    const scissorsPose = isScissors(active);
    const { vx, vy } = wristVelocity(state.wristHistory);
    const horizontalSweep =
      scissorsPose &&
      Math.abs(vx) >= TUNING.cutHorizontalSpeed &&
      Math.abs(vy) < TUNING.cutHorizontalSpeed * 0.8;
    if (horizontalSweep && canFire(state, "cut", now)) {
      events.push({ kind: "cut" });
    }
  }

  // === Accept / Reject: thumbs up / down ===
  if (phase === "openPack" && active) {
    if (poseHeld(state, "accept", isThumbsUp(active), now)) {
      if (canFire(state, "accept", now)) events.push({ kind: "accept" });
    }
    if (poseHeld(state, "reject", isThumbsDown(active), now)) {
      if (canFire(state, "reject", now)) events.push({ kind: "reject" });
    }
  }

  // === Throw: fist -> snap open with upward velocity ===
  if (phase === "reject" && active) {
    if (isClosedFist(active)) {
      if (state.fistSince === null) state.fistSince = now;
    } else {
      const fistAge = state.fistSince ? now - state.fistSince : 0;
      const isOpen = isOpenHand(active);
      const { vy } = wristVelocity(state.wristHistory);
      const upward = -vy; // image y grows downward
      if (
        isOpen &&
        fistAge > 0 &&
        fistAge < TUNING.throwFistWindowMs &&
        upward >= TUNING.throwUpwardSpeed &&
        canFire(state, "throw", now)
      ) {
        events.push({ kind: "throw", velocity: upward });
        state.fistSince = null;
      }
      // Stale fist trace
      if (fistAge > TUNING.throwFistWindowMs * 2) {
        state.fistSince = null;
      }
    }
  } else {
    state.fistSince = null;
  }

  // Reset any non-active pose timers when phase doesn't apply.
  if (phase !== "idle") state.posedSince.delete("wake");
  if (phase !== "spin") state.posedSince.delete("stopSelect");
  if (phase !== "openPack") {
    state.posedSince.delete("accept");
    state.posedSince.delete("reject");
  }

  return events;
}

function poseHeld(
  state: DetectorState,
  key: string,
  posed: boolean,
  now: number,
): boolean {
  if (!posed) {
    state.posedSince.delete(key);
    return false;
  }
  const since = state.posedSince.get(key);
  if (since === undefined) {
    state.posedSince.set(key, now);
    return false;
  }
  return now - since >= TUNING.posedHoldMs;
}

function canFire(state: DetectorState, key: string, now: number): boolean {
  const last = state.lastFire.get(key) ?? 0;
  if (now - last < TUNING.refractoryMs) return false;
  state.lastFire.set(key, now);
  return true;
}

function pruneHistory(history: WristSample[], now: number): void {
  while (history.length > 0 && now - history[0].t > TUNING.historyMs) {
    history.shift();
  }
}

function wristVelocity(history: WristSample[]): { vx: number; vy: number } {
  if (history.length < 2) return { vx: 0, vy: 0 };
  const a = history[0];
  const b = history[history.length - 1];
  const dt = (b.t - a.t) / 1000;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
}

function angularVelocity(history: WristSample[]): number {
  if (history.length < 2) return 0;
  const a = history[0];
  const b = history[history.length - 1];
  const dt = (b.t - a.t) / 1000;
  if (dt <= 0) return 0;
  // Unwrap the angle delta to [-PI, PI]
  let d = b.angle - a.angle;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d / dt;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// Re-export so consumers don't need a second import path.
export type { Hand, Landmark };
