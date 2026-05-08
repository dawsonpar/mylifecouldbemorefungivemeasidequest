import { useEffect, useRef } from "react";
import type { HandsFrame } from "./landmarks";
import { LM, pinchDistance } from "./landmarks";
import { TUNING } from "./detector";

type Props = {
  frameRef: React.MutableRefObject<HandsFrame | null>;
};

/**
 * Minimal debug overlay: only the landmarks the detector actually
 * keys off (wrist, fingertips), plus a thumb-to-index line whose
 * color tracks the pinch threshold. Drawing all 21 landmarks is
 * visually noisy and obscures the gestures we care about.
 */
export function LandmarkDebug({ frameRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      if (c.width !== c.clientWidth * dpr) {
        c.width = c.clientWidth * dpr;
        c.height = c.clientHeight * dpr;
      }
      ctx.clearRect(0, 0, c.width, c.height);

      const frame = frameRef.current;
      if (!frame) return;

      ctx.save();
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1); // mirror to match the mirrored webcam plane

      for (const hand of frame.hands) {
        const p = hand.points;
        const W = c.width;
        const H = c.height;

        // Pinch line (thumb tip → index tip), color reflects state.
        const d = pinchDistance(hand);
        const isPinched = d < TUNING.pinchThreshold;
        ctx.strokeStyle = isPinched ? "#22c55e" : "rgba(239,68,68,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p[LM.THUMB_TIP].x * W, p[LM.THUMB_TIP].y * H);
        ctx.lineTo(p[LM.INDEX_TIP].x * W, p[LM.INDEX_TIP].y * H);
        ctx.stroke();

        // Wrist (blue, larger).
        drawDot(ctx, p[LM.WRIST], W, H, "#60a5fa", 6);

        // Fingertips (5 dots).
        const tips: [number, string][] = [
          [LM.THUMB_TIP, isPinched ? "#22c55e" : "#fbbf24"],
          [LM.INDEX_TIP, isPinched ? "#22c55e" : "#fbbf24"],
          [LM.MIDDLE_TIP, "#a3a3a3"],
          [LM.RING_TIP, "#a3a3a3"],
          [LM.PINKY_TIP, "#a3a3a3"],
        ];
        for (const [idx, color] of tips) {
          drawDot(ctx, p[idx], W, H, color, 5);
        }

        // Middle MCP (the hand-size reference, used by the throw
        // and openness calculations). Smaller, dimmer.
        drawDot(ctx, p[LM.MIDDLE_MCP], W, H, "rgba(96,165,250,0.6)", 3);
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [frameRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number },
  W: number,
  H: number,
  color: string,
  r: number,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x * W, p.y * H, r, 0, Math.PI * 2);
  ctx.fill();
}
