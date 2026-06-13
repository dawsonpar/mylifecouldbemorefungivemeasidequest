import type { SashikoPattern } from "../scene/sashiko-patterns";
import type { KnicksVariant } from "../scene/knicks-card";

/**
 * Inner-card visual theme. Defaults to the sashiko design when
 * omitted. The "knicks-*" themes render the locked Knicks card faces
 * (see `knicks-card.tsx`) and ignore the `pattern` field.
 */
export type CardTheme = "sashiko" | KnicksVariant;

export type Quest = {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  /**
   * Pins the inner-card sashiko pattern for this quest. Omitted =
   * fall back to DEFAULT_PATTERN. Used to vary the card design per
   * episode for filming without surfacing any override indicator on
   * camera. Ignored when `theme` is a non-sashiko value.
   */
  pattern?: SashikoPattern;
  /**
   * Pins the inner-card theme for this quest. Omitted = "sashiko".
   * Set to a "knicks-*" variant to render the locked Knicks faces
   * (used for the ep5 tech-conference film card).
   */
  theme?: CardTheme;
};

export type AcceptedQuest = {
  questId: string;
  acceptedAt: string;
  completedAt: string | null;
};

export type RejectedQuest = {
  questId: string;
  rejectedAt: string;
};

export type Phase =
  | "idle"
  | "wake"
  | "spin"
  | "select"
  | "openPack"
  | "accept"
  | "acceptOutro"
  | "reject"
  | "throw"
  | "collection";

export type SpinDirection = "cw" | "ccw";

export type GestureEvent =
  | { kind: "wake" }
  | {
      kind: "spin";
      /** Signed hand angular velocity in radians/sec. + = cw, - = ccw. */
      handAV: number;
      /** Thumb-index openness, 0 (touching) to 1 (wide). Drives friction. */
      openness: number;
    }
  | { kind: "stopSelect" }
  | { kind: "cut" }
  | { kind: "accept" }
  | { kind: "reject" }
  | { kind: "throw"; velocity: number }
  | { kind: "reset" };
