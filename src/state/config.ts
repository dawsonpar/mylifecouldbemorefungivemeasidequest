/** Number of cards visible in idle and spin states. */
export const CARD_COUNT = 7;

/** Card dimensions in scene units. */
export const CARD_SIZE = {
  width: 0.7,
  height: 1.0,
  depth: 0.02,
} as const;

/** Circle radius for the spin cluster, centered at origin. */
export const CLUSTER_RADIUS = 1.4;

/** Idle row Y position (bottom of frame). */
export const IDLE_Y = -1.9;

/** Idle row horizontal extent. */
export const IDLE_X_RANGE = 2.6;

/** Animation speeds (units per second-ish, used as lerp factors). */
export const LERP = {
  position: 4.5,
  rotation: 4.5,
  scale: 6.0,
} as const;

/** Spin tuning. */
export const SPIN = {
  /** Max angular velocity at speed=1 (radians/sec). */
  maxAngularVelocity: 4.0,
  /** Default speed when spin is started without a value. */
  defaultSpeed: 0.5,
} as const;
