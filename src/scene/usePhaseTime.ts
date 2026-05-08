import { useEffect, useRef } from "react";
import type { Phase } from "../lib/types";

/**
 * Returns a ref whose `.current` holds seconds elapsed since the
 * given phase was entered. Returns 0 when the active phase is not
 * the watched phase. Useful for time-based reveal animations.
 */
export function usePhaseTime(currentPhase: Phase, watchedPhase: Phase) {
  const timeRef = useRef(0);
  const enteredAt = useRef<number | null>(null);

  useEffect(() => {
    if (currentPhase === watchedPhase) {
      enteredAt.current = performance.now();
      timeRef.current = 0;
    } else {
      enteredAt.current = null;
      timeRef.current = 0;
    }
  }, [currentPhase, watchedPhase]);

  // Continuously update timeRef from a rAF loop while active.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (enteredAt.current !== null) {
        timeRef.current = (performance.now() - enteredAt.current) / 1000;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return timeRef;
}
