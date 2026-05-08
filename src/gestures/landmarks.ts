/**
 * MediaPipe HandLandmarker landmark indices, named for readability.
 * 21 landmarks per hand. See:
 * https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
 */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export type Landmark = { x: number; y: number; z: number };

export type Hand = {
  /** "Left" or "Right" as labeled by MediaPipe (mirror caveats apply). */
  handedness: string;
  /** 21 landmarks in normalized 2D + relative depth. */
  points: Landmark[];
};

export type HandsFrame = {
  hands: Hand[];
  /** performance.now() timestamp of detection. */
  timestamp: number;
};

export function distance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Approximate hand size for normalizing distances. */
export function handScale(h: Hand): number {
  return distance(h.points[LM.WRIST], h.points[LM.MIDDLE_MCP]) || 1;
}

type FourFinger = "index" | "middle" | "ring" | "pinky";

const TIP_MCP_PIP: Record<FourFinger, [number, number, number]> = {
  index: [LM.INDEX_TIP, LM.INDEX_MCP, LM.INDEX_PIP],
  middle: [LM.MIDDLE_TIP, LM.MIDDLE_MCP, LM.MIDDLE_PIP],
  ring: [LM.RING_TIP, LM.RING_MCP, LM.RING_PIP],
  pinky: [LM.PINKY_TIP, LM.PINKY_MCP, LM.PINKY_PIP],
};

/**
 * Rotation-invariant, per-finger extension check.
 *
 * Reference: the finger's own proximal phalange (MCP→PIP). A fully
 * extended finger has all three phalanges in a line so the tip is
 * ~3 phalange-lengths from the MCP. A curled finger folds back so
 * the tip is roughly one phalange length or closer.
 *
 * Using the finger's own phalange (instead of palm length) makes
 * this work for short fingers (pinky, ring) the same as long ones
 * (middle, index) and at any hand orientation.
 */
export function isFingerExtended(h: Hand, finger: FourFinger): boolean {
  const [tip, mcp, pip] = TIP_MCP_PIP[finger];
  const p = h.points;
  const tipToMcp = distance(p[tip], p[mcp]);
  const mcpToPip = distance(p[mcp], p[pip]);
  if (mcpToPip < 1e-6) return false;
  return tipToMcp > mcpToPip * 2.0;
}

/** Symmetric: tip is folded close to its MCP. */
export function isFingerCurled(h: Hand, finger: FourFinger): boolean {
  const [tip, mcp, pip] = TIP_MCP_PIP[finger];
  const p = h.points;
  const tipToMcp = distance(p[tip], p[mcp]);
  const mcpToPip = distance(p[mcp], p[pip]);
  if (mcpToPip < 1e-6) return true;
  return tipToMcp < mcpToPip * 1.5;
}

/** Thumb extension: tip far from index_mcp on the radial side. */
export function isThumbExtended(h: Hand): boolean {
  const p = h.points;
  return distance(p[LM.THUMB_TIP], p[LM.INDEX_MCP]) > handScale(h) * 0.45;
}

/** Number of the four non-thumb fingers currently extended (0..4). */
export function extendedFingerCount(h: Hand): number {
  let n = 0;
  if (isFingerExtended(h, "index")) n++;
  if (isFingerExtended(h, "middle")) n++;
  if (isFingerExtended(h, "ring")) n++;
  if (isFingerExtended(h, "pinky")) n++;
  return n;
}

/** True for an open palm (all four fingers extended). */
export function isOpenHand(h: Hand): boolean {
  return (
    isFingerExtended(h, "index") &&
    isFingerExtended(h, "middle") &&
    isFingerExtended(h, "ring") &&
    isFingerExtended(h, "pinky") &&
    isThumbExtended(h)
  );
}

/** True for a closed fist (none extended). */
export function isClosedFist(h: Hand): boolean {
  return (
    !isFingerExtended(h, "index") &&
    !isFingerExtended(h, "middle") &&
    !isFingerExtended(h, "ring") &&
    !isFingerExtended(h, "pinky")
  );
}

/** Scissors / cut pose: index + middle up, ring + pinky curled. */
export function isScissors(h: Hand): boolean {
  return (
    isFingerExtended(h, "index") &&
    isFingerExtended(h, "middle") &&
    !isFingerExtended(h, "ring") &&
    !isFingerExtended(h, "pinky")
  );
}

/**
 * Thumbs up:
 *  1. Thumb is vertical, pointing up (tip well above its own MCP).
 *  2. Thumb tip is the highest point of the hand (above all four
 *     fingertips), so a sideways thumb can't false-positive.
 *  3. None of the four fingers are extended.
 *
 * Uses !isFingerExtended (rather than strict isFingerCurled) for
 * the four fingers so a slightly loose fist still passes; the
 * strict-curled check creates a dead zone where MediaPipe noise
 * makes the gesture flicker.
 */
export function isThumbsUp(h: Hand): boolean {
  const p = h.points;
  const scale = handScale(h);
  const thumbVertical =
    p[LM.THUMB_TIP].y < p[LM.THUMB_MCP].y - scale * 0.4;
  const thumbHighest =
    p[LM.THUMB_TIP].y < p[LM.INDEX_TIP].y &&
    p[LM.THUMB_TIP].y < p[LM.MIDDLE_TIP].y &&
    p[LM.THUMB_TIP].y < p[LM.RING_TIP].y &&
    p[LM.THUMB_TIP].y < p[LM.PINKY_TIP].y;
  const fistClosed =
    !isFingerExtended(h, "index") &&
    !isFingerExtended(h, "middle") &&
    !isFingerExtended(h, "ring") &&
    !isFingerExtended(h, "pinky");
  return thumbVertical && thumbHighest && fistClosed;
}

/** Thumbs down: symmetric to thumbs up. */
export function isThumbsDown(h: Hand): boolean {
  const p = h.points;
  const scale = handScale(h);
  const thumbVertical =
    p[LM.THUMB_TIP].y > p[LM.THUMB_MCP].y + scale * 0.4;
  const thumbLowest =
    p[LM.THUMB_TIP].y > p[LM.INDEX_TIP].y &&
    p[LM.THUMB_TIP].y > p[LM.MIDDLE_TIP].y &&
    p[LM.THUMB_TIP].y > p[LM.RING_TIP].y &&
    p[LM.THUMB_TIP].y > p[LM.PINKY_TIP].y;
  const fistClosed =
    !isFingerExtended(h, "index") &&
    !isFingerExtended(h, "middle") &&
    !isFingerExtended(h, "ring") &&
    !isFingerExtended(h, "pinky");
  return thumbVertical && thumbLowest && fistClosed;
}

/**
 * Shaka / "hang loose": thumb extended, pinky extended,
 * index/middle/ring not extended (i.e. tucked).
 */
export function isShaka(h: Hand): boolean {
  return (
    isThumbExtended(h) &&
    !isFingerExtended(h, "index") &&
    !isFingerExtended(h, "middle") &&
    !isFingerExtended(h, "ring") &&
    isFingerExtended(h, "pinky")
  );
}

/** Pinch distance, normalized by hand size. 0 = touching. */
export function pinchDistance(h: Hand): number {
  return distance(h.points[LM.THUMB_TIP], h.points[LM.INDEX_TIP]) / handScale(h);
}

/**
 * Wrist-to-middle-MCP angle (radians), measured in image space.
 * Used to derive spin direction: rotating wrist changes this angle.
 */
export function wristAngle(h: Hand): number {
  const w = h.points[LM.WRIST];
  const m = h.points[LM.MIDDLE_MCP];
  return Math.atan2(m.y - w.y, m.x - w.x);
}
