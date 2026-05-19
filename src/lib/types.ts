import type { SashikoPattern } from "../scene/sashiko-patterns";

export type Quest = {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  /**
   * Pins the inner-card sashiko pattern for this quest. Omitted =
   * fall back to DEFAULT_PATTERN. Used to vary the card design per
   * episode for filming without surfacing any override indicator on
   * camera.
   */
  pattern?: SashikoPattern;
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
