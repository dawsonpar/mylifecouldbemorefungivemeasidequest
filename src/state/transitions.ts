import type { Phase } from "../lib/types";

/**
 * Defines the legal transitions between phases. The state machine
 * rejects any transition not listed here, which is the primary
 * defense against gesture noise advancing state out of order.
 *
 * "collection" can be entered from any non-busy phase and exits back
 * to "idle" only.
 */
const ALLOWED: Record<Phase, ReadonlyArray<Phase>> = {
  idle: ["wake", "collection"],
  wake: ["spin", "idle"],
  spin: ["select", "idle"],
  select: ["openPack", "idle"],
  openPack: ["accept", "reject", "idle"],
  accept: ["acceptOutro", "idle"],
  acceptOutro: ["idle"],
  reject: ["throw", "idle"],
  throw: ["idle"],
  collection: ["idle"],
};

export function canTransition(from: Phase, to: Phase): boolean {
  return ALLOWED[from].includes(to);
}
