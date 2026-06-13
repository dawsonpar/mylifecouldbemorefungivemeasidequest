/**
 * Knicks-themed quest-card faces, locked from the v4 mockups at
 * `.analysis/card-mocks/knicks-quest-cards-v4.html`. Two variants:
 *
 *   - "knicks-fade"  (Card A): balanced 50/50 orange->blue halftone
 *                    fade with a left-aligned retro layered wordmark.
 *                    Used for the ep5 "tech conference" film card.
 *   - "knicks-burst" (Card B): navy comic-pop radial burst, centered
 *                    wordmark. Locked for future use.
 *
 * Both are pure presentational components rendered inside the
 * QuestReveal <Html> overlay, sized to the 500px-wide card face. They
 * take a pre-split kicker / hero-lines / description so the title can
 * read as a stacked wordmark (e.g. GO TO A / TECH / CONFERENCE).
 */

export type KnicksVariant = "knicks-fade" | "knicks-burst";

const BLUE = "#0a3a7a";
const ORANGE = "#f6821f";

const HERO_SHADOW =
  "3px 3px 0 #fff, -3px 3px 0 #fff, 3px -3px 0 #fff, -3px -3px 0 #fff," +
  `7px 7px 0 ${BLUE}, 8px 8px 0 ${BLUE}, 11px 11px 0 rgba(0,0,0,0.4)`;

type Props = {
  variant: KnicksVariant;
  kicker?: string;
  heroLines: string[];
  description: string;
};

export function KnicksCardFace({ variant, kicker, heroLines, description }: Props) {
  return variant === "knicks-burst" ? (
    <BurstFace kicker={kicker} heroLines={heroLines} description={description} />
  ) : (
    <FadeFace kicker={kicker} heroLines={heroLines} description={description} />
  );
}

function HeroWordmark({
  lines,
  fontSize,
  align = "left",
}: {
  lines: string[];
  fontSize: number;
  align?: "left" | "center";
}) {
  return (
    <div
      style={{
        position: "relative",
        fontFamily: '"Archivo Black", system-ui, sans-serif',
        textTransform: "uppercase",
        lineHeight: 0.84,
        letterSpacing: "-0.01em",
        color: ORANGE,
        textShadow: HERO_SHADOW,
        fontSize,
      }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            display: "block",
            transform: "skewX(-11deg)",
            transformOrigin: "bottom left",
            ...(align === "center" ? { textAlign: "center" } : {}),
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}

/* ----- Card A: Halftone Fade ----- */
function FadeFace({
  kicker,
  heroLines,
  description,
}: Omit<Props, "variant">) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        background:
          `linear-gradient(176deg, ${ORANGE} 6%, #d9650f 50%, ${BLUE} 94%)`,
        color: "#fff",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 40,
      }}
    >
      {/* halftone dots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(11,11,16,0.3) 2.8px, transparent 3.3px)",
          backgroundSize: "17px 17px",
          opacity: 0.5,
        }}
      />
      <Grain />
      <div
        style={{
          position: "relative",
          fontFamily: "'Bebas Neue', system-ui, sans-serif",
          letterSpacing: "0.2em",
          fontSize: 29,
          lineHeight: 1,
          marginBottom: 6,
          textShadow: "0 2px 5px rgba(0,0,0,0.5)",
        }}
      >
        {kicker ?? "SIDE QUEST"}
      </div>
      <HeroWordmark lines={heroLines} fontSize={56} />
      <div
        style={{
          position: "relative",
          fontWeight: 500,
          fontSize: 28,
          lineHeight: 1.15,
          marginTop: 19,
          textShadow: "0 2px 5px rgba(0,0,0,0.45)",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ----- Card B: Comic Pop Burst (locked for future use) ----- */
function BurstFace({
  kicker,
  heroLines,
  description,
}: Omit<Props, "variant">) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        background: "#15356e",
        color: "#fff",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 34,
      }}
    >
      {/* irregular jagged orange spikes (two conic layers) */}
      <div
        style={{
          position: "absolute",
          inset: "-30%",
          background:
            "repeating-conic-gradient(from 2deg at 50% 50%, #e8651e 0deg 2.4deg, transparent 2.4deg 9deg)," +
            "repeating-conic-gradient(from 5deg at 50% 50%, #f6821f 0deg 4deg, transparent 4deg 15deg)",
          mixBlendMode: "screen",
          opacity: 0.92,
        }}
      />
      {/* yellow speed streaks */}
      <div
        style={{
          position: "absolute",
          inset: "-30%",
          background:
            "repeating-conic-gradient(from 1deg at 50% 50%, rgba(255,210,120,0.9) 0deg 0.35deg, transparent 0.35deg 23deg)",
          mixBlendMode: "screen",
          opacity: 0.5,
        }}
      />
      {/* edge vignette so navy dominates the corners */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, transparent 28%, rgba(15,40,95,0.55) 64%, #0e2a5c 100%)",
        }}
      />
      {/* molten core behind the wordmark */}
      <div
        style={{
          position: "absolute",
          left: "11%",
          top: "23%",
          width: "78%",
          height: "54%",
          background:
            "radial-gradient(closest-side at 50% 50%, rgba(246,130,31,0.95) 0%, rgba(232,101,30,0.5) 40%, transparent 72%)",
        }}
      />
      {/* halftone dots concentrated at the core */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(11,11,16,0.34) 2.4px, transparent 2.8px)",
          backgroundSize: "13px 13px",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, #000 18%, transparent 60%)",
          maskImage:
            "radial-gradient(circle at 50% 50%, #000 18%, transparent 60%)",
          opacity: 0.7,
        }}
      />
      <Grain />
      <div
        style={{
          position: "relative",
          fontFamily: "'Bebas Neue', system-ui, sans-serif",
          letterSpacing: "0.2em",
          fontSize: 29,
          lineHeight: 1,
          marginBottom: 4,
          textShadow: "0 2px 6px rgba(0,0,0,0.5)",
        }}
      >
        {kicker ?? "SIDE QUEST"}
      </div>
      <HeroWordmark lines={heroLines} fontSize={52} align="center" />
      <div
        style={{
          position: "relative",
          fontWeight: 500,
          fontSize: 27,
          lineHeight: 1.15,
          marginTop: 18,
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/** Vintage grain overlay shared by both faces. */
function Grain() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        mixBlendMode: "overlay",
        opacity: 0.32,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
