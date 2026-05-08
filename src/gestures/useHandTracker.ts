import { useEffect, useRef, useState } from "react";
import { createHandTracker } from "./handTracker";
import type { HandsFrame } from "./landmarks";

export type HandTrackerStatus = "idle" | "loading" | "ready" | "error";

/**
 * Wires the MediaPipe HandLandmarker to a given <video> element.
 * Returns a ref holding the most recent hands frame for callers
 * that want to read landmarks each render frame.
 */
export function useHandTracker(video: HTMLVideoElement | null) {
  const [status, setStatus] = useState<HandTrackerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<HandsFrame | null>(null);

  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    let stopFn: (() => void) | null = null;

    setStatus("loading");
    createHandTracker()
      .then((tracker) => {
        if (cancelled) {
          tracker.stop();
          return;
        }
        tracker.start(video, (frame) => {
          frameRef.current = frame;
        });
        stopFn = () => tracker.stop();
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (stopFn) stopFn();
    };
  }, [video]);

  return { status, error, frameRef };
}
