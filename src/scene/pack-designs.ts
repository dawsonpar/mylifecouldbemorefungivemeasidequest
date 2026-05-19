import parchmentUrl from "../assets/packs/parchment.png";
import parchmentBackUrl from "../assets/packs/parchment-back.png";
import parchmentSideUrl from "../assets/packs/parchment-side.png";
import metrocardUrl from "../assets/packs/metrocard.png";
import metrocardBackUrl from "../assets/packs/metrocard-back.png";
import metrocardSideUrl from "../assets/packs/metrocard-side.png";

export type PackDesignId = "parchment" | "metrocard";

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
 * Pack designs in rotation order. The store's packIndex advances after
 * each completed pack-open (accept or reject). Cards alternate per slot
 * within a single round.
 */
export const PACK_DESIGNS: PackDesign[] = [
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
];

export function packDesignAt(index: number): PackDesign {
  return PACK_DESIGNS[index % PACK_DESIGNS.length];
}
