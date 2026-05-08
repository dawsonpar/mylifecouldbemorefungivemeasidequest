import { useEffect, useState } from "react";
import type { DetectorState } from "./detector";
import { TUNING } from "./detector";
import { useAppStore } from "../state/store";

type Props = {
  detectorRef: React.MutableRefObject<DetectorState>;
};

/**
 * Live read-out of the gesture detector signals while ?debug=1.
 * Lets the user see exactly when their fist is detected, when the
 * size growth is registering, and how close pinch is to firing.
 */
export function GestureDebugHud({ detectorRef }: Props) {
  const phase = useAppStore((s) => s.phase);
  const [snapshot, setSnapshot] = useState(detectorRef.current.debug);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      setSnapshot({ ...detectorRef.current.debug });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [detectorRef]);

  const {
    extendedFingers,
    fistConfirmed,
    fistAgeMs,
    sizeRatio,
    pinchDistance: pd,
  } = snapshot;

  // Throw-readiness mirrors the detector state machine: fist must be
  // confirmed (held for fistConfirmMs) AND fingers must be opening.
  const handOpenEnough = extendedFingers >= TUNING.throwOpenMinExtended;
  const willThrow = phase === "reject" && fistConfirmed && handOpenEnough;

  return (
    <div className="pointer-events-none absolute right-3 top-16 w-60 rounded bg-black/70 p-2 font-mono text-[10px] leading-relaxed text-neutral-200">
      <div className="mb-1 uppercase tracking-widest text-neutral-500">
        gestures
      </div>
      <Row label="fingers ext" value={`${extendedFingers}/4`} />
      <Row
        label="pinch dist"
        value={pd.toFixed(2)}
        accent={pd < TUNING.pinchThreshold ? "good" : undefined}
      />
      {phase === "reject" && (
        <>
          <Row
            label="fist confirmed"
            value={fistConfirmed ? "yes" : "no"}
            accent={fistConfirmed ? "good" : "warn"}
          />
          <Row
            label="fist age"
            value={fistAgeMs === null ? "—" : `${fistAgeMs.toFixed(0)}ms`}
          />
          <Row
            label="size ratio"
            value={`x${sizeRatio.toFixed(2)}`}
            accent={
              sizeRatio >= TUNING.throwSizeGrowth ? "good" : undefined
            }
          />
          <Row
            label="ready"
            value={willThrow ? "yes" : "no"}
            accent={willThrow ? "good" : "warn"}
          />
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "good" | "warn";
}) {
  const color =
    accent === "good"
      ? "text-emerald-400"
      : accent === "warn"
        ? "text-amber-400"
        : "text-neutral-200";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
