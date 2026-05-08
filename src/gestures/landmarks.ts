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

/**
 * True when the named finger is extended. Uses tip-Y vs PIP-Y in the
 * normalized image space. Note: MediaPipe Y is top-to-bottom (so a
 * finger pointing up has lower y at the tip than at the PIP).
 */
export function isFingerExtended(
  h: Hand,
  finger: "index" | "middle" | "ring" | "pinky",
): boolean {
  const p = h.points;
  const tipPip: Record<typeof finger, [number, number]> = {
    index: [LM.INDEX_TIP, LM.INDEX_PIP],
    middle: [LM.MIDDLE_TIP, LM.MIDDLE_PIP],
    ring: [LM.RING_TIP, LM.RING_PIP],
    pinky: [LM.PINKY_TIP, LM.PINKY_PIP],
  };
  const [tip, pip] = tipPip[finger];
  return p[tip].y < p[pip].y;
}

/** Thumb extension: tip far from index_mcp on the radial side. */
export function isThumbExtended(h: Hand): boolean {
  const p = h.points;
  return distance(p[LM.THUMB_TIP], p[LM.INDEX_MCP]) > handScale(h) * 0.45;
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

/** Thumbs up: thumb pointing up, others curled, thumb_tip well above wrist. */
export function isThumbsUp(h: Hand): boolean {
  const p = h.points;
  return (
    isThumbExtended(h) &&
    p[LM.THUMB_TIP].y < p[LM.WRIST].y - handScale(h) * 0.4 &&
    !isFingerExtended(h, "index") &&
    !isFingerExtended(h, "middle") &&
    !isFingerExtended(h, "ring") &&
    !isFingerExtended(h, "pinky")
  );
}

/** Thumbs down: thumb pointing down, others curled. */
export function isThumbsDown(h: Hand): boolean {
  const p = h.points;
  return (
    isThumbExtended(h) &&
    p[LM.THUMB_TIP].y > p[LM.WRIST].y + handScale(h) * 0.4 &&
    !isFingerExtended(h, "index") &&
    !isFingerExtended(h, "middle") &&
    !isFingerExtended(h, "ring") &&
    !isFingerExtended(h, "pinky")
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
