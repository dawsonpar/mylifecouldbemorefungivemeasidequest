import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Phase, Quest } from "../lib/types";
import { CARD_SIZE } from "../state/config";
import { useAppStore } from "../state/store";
import { usePhaseTime } from "./usePhaseTime";
import {
  SASHIKO_PATTERNS,
  SashikoPatternDefs,
  resolvePattern,
} from "./sashiko-patterns";

// Card sits at world-center (y=0) at the pack's z so it reads as
// vertically centered on a recorded frame. The pack itself is
// positioned by CardPack.tsx (`CHOSEN_WORLD`); it can be off-center
// without affecting this.
const PACK_POSITION: [number, number, number] = [0, 0, 1.5];

/**
 * Temporary debug flag for iterating on the pack-cut animation in
 * isolation. While true, the inner card and its quest text are
 * hidden so the body fall + seal drift in `Card.tsx` can be
 * evaluated without anything in front of it. Flip back to false
 * once the cut animation is locked.
 */
const HIDE_INNER_CARD_FOR_CUT_TESTING = false;

/**
 * Reveal beat: an inner card slides out and forward to a larger
 * size, with the quest face projected via drei <Html>. The card
 * adopts a sashiko (Japanese stitched-cloth) aesthetic; the pattern
 * is selected from the registry by combining the dev-only keyboard
 * override with the quest's own optional `pattern` field.
 */
export function QuestReveal() {
  const phase = useAppStore((s) => s.phase);
  const currentQuest = useAppStore((s) => s.currentQuest);
  const phaseTime = usePhaseTime(phase, "openPack");

  // Show the quest face during openPack, accept, and acceptOutro.
  // During reject/throw the card has collapsed into the crumple ball;
  // keeping the quest face up would block the ball's path to the
  // trash can in the background. acceptOutro keeps it mounted so the
  // fade-out keyframe can play before the card unmounts at idle.
  const showQuestFace =
    phase === "openPack" || phase === "accept" || phase === "acceptOutro";

  if (!currentQuest || !showQuestFace) return null;
  if (HIDE_INNER_CARD_FOR_CUT_TESTING) return null;

  return (
    <group position={PACK_POSITION}>
      <InnerCard quest={currentQuest} phaseTime={phaseTime} phase={phase} />
    </group>
  );
}

function InnerCard({
  quest,
  phaseTime,
  phase,
}: {
  quest: Quest;
  phaseTime: { current: number };
  phase: Phase;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const devOverride = useAppStore((s) => s.devPatternOverride);
  const pattern = resolvePattern(quest.pattern, devOverride);
  const { fillId } = SASHIKO_PATTERNS[pattern];

  const SLIDE_DELAY = 0.35;
  const SLIDE_DURATION = 0.7;

  // Render dimensions slightly larger than the pack so it's clear
  // this is a different card emerging.
  const innerSize = useMemo(
    () => ({
      width: CARD_SIZE.width * 1.1,
      height: CARD_SIZE.height * 1.1,
    }),
    [],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    // Accept (and other downstream phases) holds the card at its
    // landed scale. phaseTime is keyed to openPack only and would
    // otherwise snap back to 0 here, shrinking the card mid-beat.
    if (phase !== "openPack") {
      g.position.set(0, 0, 0);
      g.scale.setScalar(0.6 + 0.55);
      return;
    }
    const t = phaseTime.current;
    const eased =
      t < SLIDE_DELAY
        ? 0
        : Math.min(1, (t - SLIDE_DELAY) / SLIDE_DURATION);
    const e = easeOutCubic(eased);
    // No y/z motion: the card stays centered at the pack position
    // and only grows in scale as it surfaces. The pack body falls
    // away on its own (Card.tsx cut animation) revealing the card
    // beneath rather than the card sliding in from elsewhere.
    g.position.set(0, 0, 0);
    g.scale.setScalar(0.6 + e * 0.55);
  });

  // Card sizing follows typography research: body line-height 1.5
  // to 1.7x, heading 1.1 to 1.3x, optimal line length 50 to 75
  // characters. Content inset is ~10.4% of width on each side so
  // body wraps near the lower end of that range and never feels
  // edge-to-edge. Spacing follows an 8-pt grid for vertical rhythm.
  const pxW = 500;
  const pxH = Math.round(pxW * (innerSize.height / innerSize.width));
  const bandH = Math.round(pxH * 0.14);
  // Top inset hosts a tiny eyebrow caption only, so the pattern band
  // already feels well-separated from the first line. Bottom inset
  // sits below a multi-line body block which carries more visual
  // weight, so we add more space below to balance the perceived
  // breathing room on both sides.
  const stackInsetTop = bandH + 40;
  const stackInsetBottom = bandH + 60;

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0.6}>
      {/*
        No backing boxGeometry: it would scale with the parent group
        during slide-in but drei <Html transform> sizes itself from
        camera distance, so the two diverge in screen space. The HTML
        overlay's indigo gradient + sashiko bands ARE the card face.
      */}
      <Html
        transform
        occlude
        position={[0, 0, CARD_SIZE.depth / 2 + 0.001]}
        distanceFactor={1}
        style={{ pointerEvents: "none" }}
      >
        <SashikoPatternDefs />
        <div
          style={{
            width: `${pxW}px`,
            height: `${pxH}px`,
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            background: "linear-gradient(180deg, #1a3a5c 0%, #14304d 100%)",
            color: "#efeadc",
            fontFamily: "Inter, system-ui, sans-serif",
            // Fade-out keyframe runs only during acceptOutro. Duration
            // matches ACCEPT_OUTRO_MS in useAutoAdvance.ts; `forwards`
            // pins opacity at 0 so the card stays invisible through
            // the brief gap before idle takes over.
            animation:
              phase === "acceptOutro"
                ? "acceptOutroFade 0.7s ease-in forwards"
                : undefined,
          }}
        >
          {/* indigo cloth grain */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          {/* top + bottom sashiko bands */}
          <svg
            preserveAspectRatio="xMidYMid slice"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              width: "100%",
              height: `${bandH}px`,
              zIndex: 2,
            }}
          >
            <rect width="100%" height="100%" fill={`url(#${fillId})`} />
          </svg>
          <svg
            preserveAspectRatio="xMidYMid slice"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: `${bandH}px`,
              zIndex: 2,
            }}
          >
            <rect width="100%" height="100%" fill={`url(#${fillId})`} />
          </svg>

          {/* content stack */}
          <div
            style={{
              position: "absolute",
              top: stackInsetTop,
              bottom: stackInsetBottom,
              left: 52,
              right: 52,
              display: "flex",
              flexDirection: "column",
              zIndex: 3,
            }}
          >
            {/* Eyebrow. Small-cap label benefits from wide tracking
                (0.32em) so the spaced caps read as editorial rather
                than a missed kerning pair. */}
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.32em",
                fontWeight: 500,
                color: "#d8ceaf",
                textTransform: "uppercase",
                marginBottom: 32,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Side Quest</span>
            </div>
            {/* Title. Heading leading kept tight at 1.1x (within the
                1.1 to 1.3 range that headings sit best at — larger
                type wants less line-height). Slight negative tracking
                keeps the Noto Serif JP wordmark looking confident. */}
            <h3
              style={{
                fontFamily:
                  '"Noto Serif JP", "Cormorant Garamond", serif',
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                color: "#f5efde",
                margin: "0 0 28px",
              }}
            >
              {quest.title}
            </h3>
            {/* Description. Body leading at 1.6x (within the 1.5 to
                1.7 readability range). Content width ~396px puts the
                line length at 40 to 50 characters which is on the
                short-but-comfortable side of the 50 to 75 range —
                a deliberate trade for the card aspect. */}
            <p
              style={{
                fontSize: 19,
                lineHeight: 1.6,
                fontWeight: 300,
                color: "#f3ecd4",
                margin: 0,
                marginBottom: "auto",
              }}
            >
              {quest.description}
            </p>
            {quest.requirements && (
              <div
                style={{
                  borderTop: "1px solid rgba(239,234,220,0.22)",
                  paddingTop: 20,
                  marginTop: 32,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.32em",
                    fontWeight: 500,
                    color: "#cac0a3",
                    textTransform: "uppercase",
                    marginBottom: 14,
                    display: "block",
                  }}
                >
                  Required
                </span>
                <div
                  style={{
                    fontSize: 17,
                    lineHeight: 1.6,
                    fontWeight: 400,
                    color: "#f3ecd4",
                  }}
                >
                  {quest.requirements}
                </div>
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
