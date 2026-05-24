import parchmentUrl from "../assets/packs/parchment.png";
import parchmentBackUrl from "../assets/packs/parchment-back.png";
import parchmentSideUrl from "../assets/packs/parchment-side.png";
import metrocardUrl from "../assets/packs/metrocard.png";
import metrocardBackUrl from "../assets/packs/metrocard-back.png";
import metrocardSideUrl from "../assets/packs/metrocard-side.png";

/**
 * Identifier for a single pack visual within its set. String-typed
 * (not a literal union) because pack inventories grow per pack set;
 * we don't want adding a London pack to require a type widening here.
 */
export type PackDesignId = string;

export type PackDesign = {
  id: PackDesignId;
  /** URL of the pack-front texture image. */
  textureUrl: string;
  /** URL of the pack-back texture (vertical fold seam + seal bands). */
  backTextureUrl: string;
  /**
   * URL of the pack-side strip texture. Used on the box's left and
   * right faces. The strip's body color and seal bands are designed
   * to align with the front and back textures so the seal pattern
   * reads as a continuous wrap when the box rotates.
   */
  sideTextureUrl: string;
  /**
   * Fallback color for the card box's top and bottom faces (the very
   * thin edges along the card's length). These are almost never seen
   * at scene scale because cards stand vertical, so a flat color is
   * fine. Side faces use sideTextureUrl, not this color.
   */
  edgeColor: string;
};

/**
 * A pack set is the visual identity for one production cycle of the
 * show (e.g. NYC pilot, London series). It bundles the list of pack
 * designs that the in-app `packIndex` cycles through after each round.
 *
 * Pack sets are content-agnostic at the type level — adding a new set
 * is just appending to PACK_SETS below. Selection happens at app load
 * via the `?packs=<id>` URL param, defaulting to DEFAULT_PACK_SET_ID.
 */
export type PackSet = {
  id: string;
  label: string;
  /** Designs cycled in order by packIndex. Must contain at least one. */
  packs: PackDesign[];
};

/**
 * NYC pilot pack designs — parchment scroll + MetroCard. These are the
 * original two locked during the pilot episode and stay the default
 * until London textures are authored.
 */
const NYC_PILOT: PackSet = {
  id: "nyc-pilot",
  label: "NYC Pilot",
  packs: [
    {
      id: "parchment",
      textureUrl: parchmentUrl,
      backTextureUrl: parchmentBackUrl,
      sideTextureUrl: parchmentSideUrl,
      edgeColor: "#d6cb99",
    },
    {
      id: "metrocard",
      textureUrl: metrocardUrl,
      backTextureUrl: metrocardBackUrl,
      sideTextureUrl: metrocardSideUrl,
      edgeColor: "#f4b400",
    },
  ],
};

/**
 * London pack designs — concepts locked but textures pending. The two
 * approved looks are:
 *
 *   1. Roundel (variation A, drop shadow) — TfL red ring + navy bar
 *      reading "SIDE QUEST" on a cream paper ground, with a soft cast
 *      shadow under each element. Edge color: deep cream/buff.
 *   2. Dial — pub-sign hunter green dial, brass crown lifted from the
 *      Pillar Box concept, Playfair "SIDE QUEST" wordmark, "London
 *      Made" microcopy at the bottom. Edge color: brushed brass.
 *
 * Visual reference: `.analysis/london-packs.html`. When textures are
 * authored, drop them into `src/assets/packs/` following the existing
 * naming convention (front/back/side per pack) and uncomment the
 * entries below.
 */
const LONDON: PackSet = {
  id: "london",
  label: "London",
  packs: [
    // {
    //   id: "roundel",
    //   textureUrl: roundelUrl,
    //   backTextureUrl: roundelBackUrl,
    //   sideTextureUrl: roundelSideUrl,
    //   edgeColor: "#e8e0c4",
    // },
    // {
    //   id: "dial",
    //   textureUrl: dialUrl,
    //   backTextureUrl: dialBackUrl,
    //   sideTextureUrl: dialSideUrl,
    //   edgeColor: "#b08d4a",
    // },
  ],
};

/**
 * Registry of all available pack sets. Lookup is by id (URL param,
 * config, etc). Order here doesn't matter; the active set is chosen
 * by `getActivePackSet()`, not by position.
 */
export const PACK_SETS: Record<string, PackSet> = {
  [NYC_PILOT.id]: NYC_PILOT,
  [LONDON.id]: LONDON,
};

/**
 * Pack set used when no override is supplied. Switch to "london" once
 * the London pack textures are authored and slotted into LONDON above.
 */
export const DEFAULT_PACK_SET_ID = "nyc-pilot";

/**
 * Reads the active pack set id from the `?packs=<id>` URL param,
 * falling back to DEFAULT_PACK_SET_ID for unknown or missing values.
 *
 * Resolution happens once at module load; runtime switching is not
 * supported because the texture preload in CardPack is keyed to a
 * single set per session.
 */
export function getActivePackSetId(): string {
  if (typeof window === "undefined") return DEFAULT_PACK_SET_ID;
  const requested = new URLSearchParams(window.location.search).get("packs");
  if (requested && requested in PACK_SETS && PACK_SETS[requested].packs.length > 0) {
    return requested;
  }
  return DEFAULT_PACK_SET_ID;
}

export const ACTIVE_PACK_SET: PackSet = PACK_SETS[getActivePackSetId()];

export function packDesignAt(index: number): PackDesign {
  const packs = ACTIVE_PACK_SET.packs;
  return packs[index % packs.length];
}
