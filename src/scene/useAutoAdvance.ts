import { useEffect } from "react";
import { useAppStore } from "../state/store";

/**
 * Auto-advance phases that have a time-bound animation:
 * - accept:       2.4s flourish + message, then hand off to acceptOutro
 * - acceptOutro:  0.7s fade-out of accept HUD + quest card, then idle
 * - throw:        1.6s ball arc + trash result, then reset to idle
 *
 * reject does NOT auto-advance: it waits for the throw gesture.
 */
export const ACCEPT_HOLD_MS = 2400;
export const ACCEPT_OUTRO_MS = 700;
export const THROW_HOLD_MS = 1600;

export function useAutoAdvance() {
  const phase = useAppStore((s) => s.phase);
  const finishReset = useAppStore((s) => s.finishReset);
  const beginAcceptOutro = useAppStore((s) => s.beginAcceptOutro);

  useEffect(() => {
    if (phase === "accept") {
      const id = window.setTimeout(() => beginAcceptOutro(), ACCEPT_HOLD_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === "acceptOutro") {
      const id = window.setTimeout(() => finishReset(), ACCEPT_OUTRO_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === "throw") {
      const id = window.setTimeout(() => finishReset(), THROW_HOLD_MS);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [phase, finishReset, beginAcceptOutro]);
}
