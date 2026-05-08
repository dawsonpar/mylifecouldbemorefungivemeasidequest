import { useEffect, useRef } from "react";
import { useAppStore } from "../state/store";
import type { GestureEvent } from "../lib/types";
import type { HandsFrame } from "./landmarks";
import { createDetectorState, detect, type DetectorState } from "./detector";

type Props = {
  frameRef: React.MutableRefObject<HandsFrame | null>;
  enabled: boolean;
};

/**
 * Reads the latest hands frame each rAF tick, runs the detector,
 * and dispatches GestureEvents to the store. Stays in sync with
 * the current phase via Zustand subscription.
 */
export function useGestureDetector({ frameRef, enabled }: Props) {
  const stateRef = useRef(createDetectorState());

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const phase = useAppStore.getState().phase;
      const events = detect(stateRef.current, frameRef.current, phase);
      if (events.length === 0) return;
      const store = useAppStore.getState();
      for (const e of events) {
        dispatch(store, e);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frameRef, enabled]);

  return stateRef as React.MutableRefObject<DetectorState>;
}

function dispatch(store: ReturnType<typeof useAppStore.getState>, e: GestureEvent) {
  switch (e.kind) {
    case "wake":
      store.wake();
      return;
    case "spin":
      if (store.phase === "wake") {
        // Only enter spin phase if the hand is actually moving;
        // otherwise stay in wake and just update openness.
        if (Math.abs(e.handAV) > 0.4) {
          store.startSpin(e.handAV, e.openness);
        } else {
          store.updateSpin(e.handAV, e.openness);
        }
      } else {
        store.updateSpin(e.handAV, e.openness);
      }
      return;
    case "stopSelect":
      store.stopAndSelect();
      return;
    case "cut":
      store.cut();
      return;
    case "accept":
      void store.acceptCurrent();
      return;
    case "reject":
      store.rejectCurrent();
      return;
    case "throw":
      store.fireThrow();
      return;
    case "reset":
      store.finishReset();
      return;
  }
}
