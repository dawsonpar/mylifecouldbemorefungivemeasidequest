import { useEffect } from "react";
import { useAppStore } from "../state/store";

/**
 * Auto-advance phases that have a time-bound animation:
 * - accept: 2.4s flourish + message, then reset to idle
 * - throw:  1.6s ball arc + trash result, then reset to idle
 *
 * reject does NOT auto-advance: it waits for the throw gesture.
 */
export function useAutoAdvance() {
  const phase = useAppStore((s) => s.phase);
  const finishReset = useAppStore((s) => s.finishReset);

  useEffect(() => {
    if (phase === "accept") {
      const id = window.setTimeout(() => finishReset(), 2400);
      return () => window.clearTimeout(id);
    }
    if (phase === "throw") {
      const id = window.setTimeout(() => finishReset(), 1600);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [phase, finishReset]);
}
