import { useAppStore } from "../state/store";

/*
 * Typography mirrors the inner quest card (`QuestReveal.tsx`): the
 * "ACCEPTED" eyebrow matches the card's "SIDE QUEST" / "REQUIRED"
 * eyebrow style, and the message uses the same serif stack and weight
 * as the card title so the overlay reads as a continuation of the card,
 * not a separate UI surface.
 */
const EYEBROW_COLOR = "#d8ceaf";
const TITLE_COLOR = "#f5efde";
const SANS_STACK = "Inter, system-ui, sans-serif";
const SERIF_STACK = '"Noto Serif JP", "Cormorant Garamond", serif';

export function AcceptOverlay() {
  const phase = useAppStore((s) => s.phase);

  if (phase !== "accept" && phase !== "acceptOutro") return null;

  // `accept` runs the entry pop; `acceptOutro` swaps in the fade-out
  // keyframe so the panel eases off rather than hard-cutting at the
  // moment the phase flips to idle. Duration here must match
  // ACCEPT_OUTRO_MS in useAutoAdvance.ts.
  const animation =
    phase === "accept"
      ? "acceptPop 0.8s ease-out"
      : "acceptOutroFade 0.7s ease-in forwards";

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
      <div
        style={{
          animation,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          padding: "20px 44px 22px",
          borderRadius: 6,
          background: "rgba(15, 26, 42, 0.62)",
          backdropFilter: "blur(14px) saturate(120%)",
          WebkitBackdropFilter: "blur(14px) saturate(120%)",
          border: "1px solid rgba(216, 206, 175, 0.18)",
          boxShadow:
            "0 18px 40px rgba(0,0,0,0.45), 0 2px 0 rgba(255,255,255,0.04) inset",
        }}
      >
        <span
          style={{
            fontFamily: SANS_STACK,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: EYEBROW_COLOR,
          }}
        >
          Side Quest
        </span>
        <span
          style={{
            fontFamily: SERIF_STACK,
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: TITLE_COLOR,
            textAlign: "center",
          }}
        >
          Accepted
        </span>
      </div>
    </div>
  );
}
