/**
 * Traditional sashiko motifs locked for the inner-card design. New
 * patterns added here are immediately selectable from the Quest data
 * file via the optional `pattern` field, and from the dev-only
 * keyboard cycle (Cmd+Shift+P).
 */
export type SashikoPattern = "asanoha" | "shippo" | "jujizashi" | "yabane";

export const DEFAULT_PATTERN: SashikoPattern = "asanoha";

export const SASHIKO_PATTERN_ORDER: SashikoPattern[] = [
  "asanoha",
  "shippo",
  "jujizashi",
  "yabane",
];

type PatternMeta = {
  id: SashikoPattern;
  label: string;
  /** SVG <pattern> id referenced as `url(#fillId)`. */
  fillId: string;
};

export const SASHIKO_PATTERNS: Record<SashikoPattern, PatternMeta> = {
  asanoha: { id: "asanoha", label: "Asanoha", fillId: "sashiko-asanoha" },
  shippo: { id: "shippo", label: "Shippō", fillId: "sashiko-shippo" },
  jujizashi: {
    id: "jujizashi",
    label: "Jūjizashi",
    fillId: "sashiko-jujizashi",
  },
  yabane: { id: "yabane", label: "Yabane", fillId: "sashiko-yabane" },
};

/**
 * Tile-scale factor relative to the original HTML mock at
 * `.analysis/card-mocks/sashiko-patterns.html` (which sized the
 * card at 280px wide with a 56px band). The inner card is now
 * 500px wide with a ~100px band, so the patterns are scaled by
 * the same 1.79x to keep the visual density that read well in
 * the mock. If the card width changes again, update this one
 * number to keep proportions locked.
 */
const PATTERN_SCALE = 1.79;

/**
 * Renders all sashiko <pattern> definitions inside a single invisible
 * SVG. Mounted once near the consuming card so each band can reference
 * the pattern by id via `fill="url(#sashiko-...)"`.
 */
export function SashikoPatternDefs({
  stroke = "#efeadc",
}: {
  stroke?: string;
}) {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <Asanoha stroke={stroke} />
        <Shippo stroke={stroke} />
        <Jujizashi stroke={stroke} />
        <Yabane stroke={stroke} />
      </defs>
    </svg>
  );
}

/**
 * Asanoha needs to render with NO partial hexagons at any edge of
 * the band — the user noticed half-hexagons peeking through where
 * adjacent tile rows met the band boundary. To avoid them we size
 * the asanoha tile so:
 *
 *   - 6 tiles fit exactly across the 500px card (500/6 = 83.33)
 *   - 1 tile is slightly shorter than the 100px band height
 *   - the pattern is offset down by half the leftover space so the
 *     row is centered vertically, with empty padding above and
 *     below that coincides with the blank strip inside the next
 *     tile (so no half-hex pokes in from above or below)
 *
 * If the card width or band height change, recompute these.
 */
const ASANOHA_TILES_HORIZONTAL = 6;
const ASANOHA_TILE_W = 500 / ASANOHA_TILES_HORIZONTAL;
const ASANOHA_SCALE = ASANOHA_TILE_W / 44;
const ASANOHA_TILE_H = 50.7 * ASANOHA_SCALE;
const ASANOHA_BAND_H_ASSUMED = 100;
const ASANOHA_Y_OFFSET = (ASANOHA_BAND_H_ASSUMED - ASANOHA_TILE_H) / 2;

function Asanoha({ stroke }: { stroke: string }) {
  return (
    <pattern
      id={SASHIKO_PATTERNS.asanoha.fillId}
      x="0"
      y={ASANOHA_Y_OFFSET}
      width={ASANOHA_TILE_W}
      height={ASANOHA_TILE_H}
      patternUnits="userSpaceOnUse"
    >
      <g
        transform={`scale(${ASANOHA_SCALE})`}
        fill="none"
        stroke={stroke}
        strokeWidth="0.7"
        strokeLinecap="round"
      >
        <polygon points="22,2 41.5,13.6 41.5,37 22,48.6 2.5,37 2.5,13.6" />
        <line x1="22" y1="2" x2="22" y2="25.3" />
        <line x1="41.5" y1="13.6" x2="22" y2="25.3" />
        <line x1="41.5" y1="37" x2="22" y2="25.3" />
        <line x1="22" y1="48.6" x2="22" y2="25.3" />
        <line x1="2.5" y1="37" x2="22" y2="25.3" />
        <line x1="2.5" y1="13.6" x2="22" y2="25.3" />
      </g>
    </pattern>
  );
}

function Shippo({ stroke }: { stroke: string }) {
  const s = PATTERN_SCALE;
  return (
    <pattern
      id={SASHIKO_PATTERNS.shippo.fillId}
      x="0"
      y="0"
      width={40 * s}
      height={40 * s}
      patternUnits="userSpaceOnUse"
    >
      <g transform={`scale(${s})`} fill="none" stroke={stroke} strokeWidth="0.7">
        <circle cx="0" cy="0" r="20" />
        <circle cx="40" cy="0" r="20" />
        <circle cx="20" cy="20" r="20" />
        <circle cx="0" cy="40" r="20" />
        <circle cx="40" cy="40" r="20" />
      </g>
    </pattern>
  );
}

function Jujizashi({ stroke }: { stroke: string }) {
  const s = PATTERN_SCALE;
  return (
    <pattern
      id={SASHIKO_PATTERNS.jujizashi.fillId}
      x="0"
      y="0"
      width={18 * s}
      height={18 * s}
      patternUnits="userSpaceOnUse"
    >
      <g
        transform={`scale(${s})`}
        fill="none"
        stroke={stroke}
        strokeWidth="0.9"
        strokeLinecap="round"
      >
        <line x1="9" y1="4" x2="9" y2="14" />
        <line x1="4" y1="9" x2="14" y2="9" />
      </g>
    </pattern>
  );
}

function Yabane({ stroke }: { stroke: string }) {
  const s = PATTERN_SCALE;
  return (
    <pattern
      id={SASHIKO_PATTERNS.yabane.fillId}
      x="0"
      y="0"
      width={24 * s}
      height={14 * s}
      patternUnits="userSpaceOnUse"
    >
      <g
        transform={`scale(${s})`}
        fill="none"
        stroke={stroke}
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 0 0  L 12 7  L 24 0" />
        <path d="M 0 7  L 12 14 L 24 7" />
        <path d="M 0 14 L 12 21 L 24 14" />
      </g>
    </pattern>
  );
}

export function resolvePattern(
  questPattern: SashikoPattern | undefined,
  override: SashikoPattern | null,
): SashikoPattern {
  return override ?? questPattern ?? DEFAULT_PATTERN;
}
