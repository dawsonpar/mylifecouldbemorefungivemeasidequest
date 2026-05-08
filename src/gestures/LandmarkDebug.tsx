import { useEffect, useRef } from "react";
import type { HandsFrame } from "./landmarks";

type Props = {
  frameRef: React.MutableRefObject<HandsFrame | null>;
};

/**
 * Draws the 21 hand landmarks as small circles over the webcam.
 * Mirrored on X to match the visible (mirrored) webcam layer.
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
      // Mirror to match the mirrored webcam plane
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);

      for (const hand of frame.hands) {
        ctx.fillStyle = "#22c55e";
        ctx.strokeStyle = "rgba(34,197,94,0.4)";
        ctx.lineWidth = 1.5;
        for (const p of hand.points) {
          const x = p.x * c.width;
          const y = p.y * c.height;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
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
