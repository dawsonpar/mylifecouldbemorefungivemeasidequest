import { useAppStore } from "../state/store";

/*
 * Centered title-card treatment for the accept beat. Three layers,
 * top-to-bottom: the eyebrow + title, a soft dark radial pool that
 * sits behind them to give the cream text a darker ground to read
 * on, and the camera + green backdrop further below.
 *
 * The pool is essential. Without it the cream characters lose contrast
 * against the saturated green and the title becomes hard to read.
 * Radial (not rectangular) so it doesn't re-introduce the hard chrome
 * panel that used to live here; the edges fade to nothing.
 *
 * The eyebrow leads at 300ms, the title follows at 650ms. The pool
 * appears slightly before the eyebrow so the dark ground is in place
 * by the time the text starts surfacing. All three share the same
 * `acceptOutroFade` via the outer wrapper.
 */
const EYEBROW_COLOR = "#d8ceaf";
const TITLE_COLOR = "#f5efde";
const SANS_STACK = '"Helvetica Neue", Inter, Arial, sans-serif';
const SERIF_STACK = '"Playfair Display", "Cormorant Garamond", Georgia, serif';

export function AcceptOverlay() {
  const phase = useAppStore((s) => s.phase);

  if (phase !== "accept" && phase !== "acceptOutro") return null;

  // Outro fade lives on the outer container so the dark pool, eyebrow,
  // and title all fade together as one unit when phase becomes
  // acceptOutro. Children's `forwards` persistence keeps them at their
  // landed opacity through the outro; the wrapper's fade composes
  // through to invisible.
  const wrapperAnimation =
    phase === "acceptOutro"
      ? "acceptOutroFade 0.7s ease-in forwards"
      : undefined;

  // Pool, eyebrow, title each animate in with their own delay.
  // Animation prop is identical across accept and acceptOutro so the
  // `forwards` persistence holds the landed state through the outro;
  // without that, removing the animation when phase flips would snap
  // the inline `opacity: 0` back and the wrapper fade would have
  // nothing to compose against.
  const poolAnimation = "acceptTextIn 0.4s ease-out 200ms forwards";
  const eyebrowAnimation = "acceptTextIn 0.5s ease-out 300ms forwards";
  const titleAnimation = "acceptTextIn 0.5s ease-out 650ms forwards";

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ animation: wrapperAnimation }}
    >
      {/* Dark radial pool. Strongest at centre, fades to transparent
          well before reaching the viewport edges so the green
          backdrop is unaffected outside the title-card region. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 40% 32% at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0) 100%)",
          opacity: 0,
          animation: poolAnimation,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontFamily: SANS_STACK,
            fontSize: "clamp(13px, 1.2vw, 18px)",
            fontWeight: 500,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: EYEBROW_COLOR,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.55)",
            opacity: 0,
            transform: "scale(0.9)",
            animation: eyebrowAnimation,
          }}
        >
          Side Quest
        </span>
        <span
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "clamp(48px, 6vw, 88px)",
            lineHeight: 0.95,
            letterSpacing: "-0.015em",
            color: TITLE_COLOR,
            textAlign: "center",
            textShadow:
              "0 2px 12px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.55)",
            opacity: 0,
            transform: "scale(0.9)",
            animation: titleAnimation,
          }}
        >
          Accepted
        </span>
      </div>
    </div>
  );
}
