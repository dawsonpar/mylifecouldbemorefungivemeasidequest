import { useAppStore } from "../state/store";

/**
 * Alternative accept flourish: a full-screen green flash overlay that
 * pulses on accept and fades. Selected via the `acceptFlashMode` store
 * field ("screen"). The 3D halo (`AcceptFlourish`) is the other mode.
 *
 * The animation runs as a CSS keyframe (`acceptFlash` in index.css)
 * so opacity is interpolated on the compositor thread. A JS-driven
 * setOpacity loop here would re-render React 60 times per second and
 * starve the MediaPipe camera-feed pipeline, causing visible stutter.
 *
 * Tunables live in the keyframe (timing + peak opacity) and in the
 * inline style below (color + blend mode). Duration is set by the
 * `animation` shorthand.
 */
export function AcceptFlash() {
  const phase = useAppStore((s) => s.phase);
  const mode = useAppStore((s) => s.acceptFlashMode);

  if (phase !== "accept" || mode !== "screen") return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: "#1bbb58",
        opacity: 0,
        mixBlendMode: "screen",
        animation: "acceptFlash 2.4s linear forwards",
        willChange: "opacity",
      }}
    />
  );
}
