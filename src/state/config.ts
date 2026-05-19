/** Number of cards visible in idle and spin states. */
export const CARD_COUNT = 8;

/**
 * Card dimensions in scene units. Depth is half of the previous
 * "booster-pack" thickness — packs read as slim card-sleeves rather
 * than chunky bricks when viewed from the side.
 */
export const CARD_SIZE = {
  width: 0.7,
  height: 1.0,
  depth: 0.03,
} as const;

/** Circle radius for the spin cluster, centered at origin. */
export const CLUSTER_RADIUS = 1.4;

/** Idle row Y position (bottom of frame). */
export const IDLE_Y = -1.9;

/** Idle row horizontal extent. */
export const IDLE_X_RANGE = 3.2;

/** Animation speeds (units per second-ish, used as lerp factors). */
export const LERP = {
  position: 4.5,
  rotation: 4.5,
  scale: 6.0,
} as const;

/** Spin tuning. */
export const SPIN = {
  /** Default speed when spin is started without a value (used by debug keys). */
  defaultSpeed: 0.5,
  /** Multiplier applied to hand angular velocity when adding impulse. */
  handCoupling: 1.4,
  /** Friction floor (rad/sec/sec) at openness=1 (hand wide open). */
  minFriction: 0.4,
  /** Friction ceiling at openness=0 (thumb+index touching). */
  maxFriction: 7.0,
  /** Friction during select/idle (forces decay). */
  resetFriction: 6.0,
  /** Friction while aligning to selected card target. */
  alignFriction: 8.0,
  /** Max card angular velocity, clamped to keep things readable. */
  maxAngularVelocity: 9.0,
} as const;
