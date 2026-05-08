export type Quest = {
  id: string;
  title: string;
  description: string;
  requirements?: string;
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
  | { kind: "spin"; direction: SpinDirection; speed: number }
  | { kind: "stopSelect" }
  | { kind: "cut" }
  | { kind: "accept" }
  | { kind: "reject" }
  | { kind: "throw"; velocity: number };
