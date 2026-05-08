import type { HandsFrame, Hand, Landmark } from "./landmarks";
import {
  LM,
  isOpenHand,
  isScissors,
  isShaka,
  isThumbsUp,
  isThumbsDown,
  pinchDistance,
  wristAngle,
  handScale,
  extendedFingerCount,
} from "./landmarks";
import type { GestureEvent, Phase } from "../lib/types";

/**
 * Tunables for gesture detection. Surface these in one place so a
 * tuning pass against real footage is a single-file change.
 */
export const TUNING = {
  /** How long a pose must hold before firing a static-pose event (ms). */
  posedHoldMs: 90,
  /** Minimum gap between same-event fires (ms). */
  refractoryMs: 700,
  /** Pinch is "touching" below this normalized distance (entering). */
  pinchThreshold: 0.18,
  /** Pinch is "released" above this distance (hysteresis to avoid flicker). */
  pinchReleaseThreshold: 0.28,
  /** History window for velocity / angular velocity calculations (ms). */
  historyMs: 220,
  /** Pinch-distance value at which spin "openness" reads as 1 (wide open). */
  opennessFullDistance: 0.5,
  /** Minimum horizontal speed (image-units/sec) for a cut to register. */
  cutHorizontalSpeed: 0.45,
  /** Max ratio of vertical to horizontal motion for a cut. */
  cutVerticalRatio: 0.9,
  /** Time window for fist→open transition to count as a throw (ms). */
  throwFistWindowMs: 800,
  /** Max extended-finger count to register as "fisted" for throw. */
  throwFistMaxExtended: 1,
  /** Min extended-finger count to register as "released" for throw. */
  throwOpenMinExtended: 4,
  /** Min sustained-fist time before fist counts as "confirmed" (ms). */
  throwFistConfirmMs: 120,
  /** Min sustained-open time after fist before throw fires (ms). */
  throwOpenConfirmMs: 60,
  /** Optional bonus: hand size growth ratio surfaces in debug. */
  throwSizeGrowth: 1.06,
  /** Hold time for two-hand shaka reset (ms). Long, since reset is destructive. */
  resetHoldMs: 450,
} as const;

type WristSample = {
  x: number;
  y: number;
  angle: number;
  size: number;
  t: number;
};

type ThrowState = {
  /** First frame time that the hand was seen as fisted (ext <= max). */
  fistFirstSeenAt: number | null;
  /** Time the fist was confirmed (held long enough). */
  fistConfirmedAt: number | null;
  /** Largest hand size observed during the confirmed fist window. */
  fistSize: number | null;
  /** First frame time the hand was seen as open after fist confirmation. */
  openFirstSeenAt: number | null;
};

export type DetectorState = {
  /** Per-event last-fire timestamps for refractory enforcement. */
  lastFire: Map<string, number>;
  /** Per-pose first-seen timestamps for hold-debounce. */
  posedSince: Map<string, number>;
  /** Sliding window of wrist samples. */
  wristHistory: WristSample[];
  /** True if the pinch hysteresis state is currently "pinched". */
  pinched: boolean;
  /** Throw-gesture sub-state machine. */
  throwState: ThrowState;
  /** Live snapshot of the latest detection signals (for debug UI). */
  debug: {
    extendedFingers: number;
    handSize: number;
    fistConfirmed: boolean;
    fistAgeMs: number | null;
    sizeRatio: number;
    pinchDistance: number;
  };
};

function emptyThrowState(): ThrowState {
  return {
    fistFirstSeenAt: null,
    fistConfirmedAt: null,
    fistSize: null,
    openFirstSeenAt: null,
  };
}

export function createDetectorState(): DetectorState {
  return {
    lastFire: new Map(),
    posedSince: new Map(),
    wristHistory: [],
    pinched: false,
    throwState: emptyThrowState(),
    debug: {
      extendedFingers: 0,
      handSize: 0,
      fistConfirmed: false,
      fistAgeMs: null,
      sizeRatio: 1,
      pinchDistance: 1,
    },
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
      size: handScale(active),
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

  // === Reset: two-hand shaka, valid in any phase except idle ===
  // Held longer than other gestures because it discards in-flight
  // state (current quest, spin velocity).
  if (phase !== "idle") {
    const resetPosed =
      frame.hands.length === 2 && frame.hands.every((h) => isShaka(h));
    const since = state.posedSince.get("reset");
    if (resetPosed) {
      if (since === undefined) {
        state.posedSince.set("reset", now);
      } else if (now - since >= TUNING.resetHoldMs && canFire(state, "reset", now)) {
        events.push({ kind: "reset" });
      }
    } else {
      state.posedSince.delete("reset");
    }
  } else {
    state.posedSince.delete("reset");
  }

  // === Spin: continuous, only valid in wake/spin ===
  // Always emit so the cluster can integrate hand impulses every frame
  // (and update friction via openness even when the hand is still).
  if ((phase === "wake" || phase === "spin") && active) {
    const handAV = angularVelocity(state.wristHistory);
    const openness = clamp01(
      pinchDistance(active) / TUNING.opennessFullDistance,
    );
    events.push({ kind: "spin", handAV, openness });
  }

  // === Select: pinch ===
  // Hysteresis: enter "pinched" below pinchThreshold, release above
  // pinchReleaseThreshold. Fires stopSelect on the rising edge of
  // the pinch, no hold required (a pinch is a deliberate motion).
  if ((phase === "spin" || phase === "wake") && active) {
    const d = pinchDistance(active);
    if (!state.pinched && d < TUNING.pinchThreshold) {
      state.pinched = true;
      if (canFire(state, "stopSelect", now)) {
        events.push({ kind: "stopSelect" });
      }
    } else if (state.pinched && d > TUNING.pinchReleaseThreshold) {
      state.pinched = false;
    }
  } else {
    state.pinched = false;
  }

  // === Cut: scissors + horizontal swipe motion ===
  // Use index-tip velocity (more responsive than wrist for a slash)
  // and accept any sweep where horizontal motion dominates.
  if (phase === "select" && active) {
    const scissorsPose = isScissors(active);
    if (scissorsPose) {
      const { vx, vy } = wristVelocity(state.wristHistory);
      const absVx = Math.abs(vx);
      const absVy = Math.abs(vy);
      const horizontalDominant = absVx > absVy * TUNING.cutVerticalRatio;
      if (
        absVx >= TUNING.cutHorizontalSpeed &&
        horizontalDominant &&
        canFire(state, "cut", now)
      ) {
        events.push({ kind: "cut" });
      }
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

  // === Throw: confirmed fist -> sustained open hand ===
  // Two-stage gate to avoid single-frame MediaPipe glitches firing
  // a throw while the fist is still closed:
  //   1. Hand must hold a fist (ext <= max) for fistConfirmMs.
  //   2. Then hand must hold an open pose (ext >= min) for
  //      openConfirmMs before throw fires.
  // Either side breaking resets the relevant marker; size growth
  // is reported for the debug HUD but is not a hard gate.
  if (phase === "reject" && active) {
    const ext = extendedFingerCount(active);
    const currentSize = handScale(active);
    const ts = state.throwState;

    if (ext <= TUNING.throwFistMaxExtended) {
      // Fisted right now.
      if (ts.fistFirstSeenAt === null) ts.fistFirstSeenAt = now;
      ts.fistSize = Math.max(ts.fistSize ?? currentSize, currentSize);
      if (
        ts.fistConfirmedAt === null &&
        now - ts.fistFirstSeenAt >= TUNING.throwFistConfirmMs
      ) {
        ts.fistConfirmedAt = now;
      }
      // Fingers tucked: any prior open-pose timer resets.
      ts.openFirstSeenAt = null;
    } else if (ts.fistConfirmedAt !== null) {
      // Fist was confirmed; now waiting for sustained open hand.
      if (ext >= TUNING.throwOpenMinExtended) {
        if (ts.openFirstSeenAt === null) ts.openFirstSeenAt = now;
        const openHeld = now - ts.openFirstSeenAt;
        const fistAge = now - ts.fistConfirmedAt;
        if (
          openHeld >= TUNING.throwOpenConfirmMs &&
          fistAge < TUNING.throwFistWindowMs &&
          canFire(state, "throw", now)
        ) {
          const startSize = ts.fistSize ?? currentSize;
          const sizeRatio = currentSize / Math.max(startSize, 0.0001);
          events.push({ kind: "throw", velocity: Math.max(sizeRatio, 1) });
          state.throwState = emptyThrowState();
        }
      } else {
        // Hand left the fist but isn't open yet either; restart the
        // open-pose timer if/when it opens later.
        ts.openFirstSeenAt = null;
      }
      // Window expired without a confirmed open: fall back to
      // requiring a fresh fist.
      if (now - ts.fistConfirmedAt > TUNING.throwFistWindowMs) {
        state.throwState = emptyThrowState();
      }
    } else {
      // Hand isn't fisted and never confirmed a fist this session.
      ts.fistFirstSeenAt = null;
      ts.openFirstSeenAt = null;
    }

    const fistAgeForDebug = ts.fistConfirmedAt
      ? now - ts.fistConfirmedAt
      : ts.fistFirstSeenAt
        ? now - ts.fistFirstSeenAt
        : null;
    const startSizeForDebug = ts.fistSize ?? currentSize;
    state.debug = {
      extendedFingers: ext,
      handSize: currentSize,
      fistConfirmed: ts.fistConfirmedAt !== null,
      fistAgeMs: fistAgeForDebug,
      sizeRatio: currentSize / Math.max(startSizeForDebug, 0.0001),
      pinchDistance: pinchDistance(active),
    };
  } else {
    state.throwState = emptyThrowState();
    if (active) {
      state.debug = {
        extendedFingers: extendedFingerCount(active),
        handSize: handScale(active),
        fistConfirmed: false,
        fistAgeMs: null,
        sizeRatio: 1,
        pinchDistance: pinchDistance(active),
      };
    }
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
