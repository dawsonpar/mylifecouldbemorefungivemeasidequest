import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CARD_SIZE, LERP } from "../state/config";

export type CardTarget = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
};

export type CardHandle = {
  setTarget(t: Partial<CardTarget>): void;
  /**
   * Trigger the cut animation on this card. Captures the current
   * clock time as t0; after `CUT_HOLD_END` the body piece begins
   * falling backward and the seal piece drifts up and back, both
   * fading out over `CUT_FALL_END - CUT_HOLD_END`.
   *
   * The slice visualization itself and the inner-card emerge are
   * handled separately by `QuestReveal.tsx`. This method only
   * controls the pack body/seal split.
   */
  beginCut(): void;
  /** Reset the cut animation back to the assembled-pack state. */
  resetCut(): void;
  group: THREE.Group | null;
};

type Props = {
  initial: CardTarget;
  /** Texture applied to the front face of the pack. */
  frontTexture: THREE.Texture | null;
  /** Texture applied to the back face of the pack. */
  backTexture: THREE.Texture | null;
  /**
   * Texture applied to the left and right side faces. Designed so the
   * top and bottom seal bands align with the front and back, producing
   * a continuous wrap visually.
   */
  sideTexture: THREE.Texture | null;
  /**
   * Fallback color for the box's top and bottom faces (the very thin
   * edges along the card's length). Side faces use sideTexture; this
   * color is also the fallback used until any texture has loaded, and
   * the color used for the freshly-cut surfaces (top of body / bottom
   * of seal).
   */
  edgeColor: string;
};

const tmp = new THREE.Vector3();
const tmpEuler = new THREE.Euler();

const CORNER_RADIUS = 0.008;
const BULGE_MAX = 0.005;
const SEAL_FRACTION = 0.08;
const PLATEAU_FRACTION = 0.88;

// Cut animation timeline (seconds from beginCut).
//
// Two sequential phases so the cut visibly reads as "seal pops off,
// THEN body falls" rather than both pieces moving on the same
// timeline. Sharing one `u` makes the body drift down at the exact
// same instant the seal lifts off; the eye reads the simultaneous
// motion as the seal being "lower than the top" because the body
// is drifting away from under it.
//
// 0.00 .. CUT_SEAL_LIFT_END:
//   Seal lifts up and angles forward (a thin foil flap peeling off
//   the top), body stays absolutely still.
// CUT_SEAL_LIFT_END .. CUT_FALL_END:
//   Body falls backward (-z, ease-in t²), tumbles, fades. Seal
//   continues drifting away from where it ended phase 1, also fades.
// after CUT_FALL_END:
//   Both pieces invisible.
const CUT_SEAL_LIFT_END = 0.3;
const CUT_FALL_END = 1.1;

// Position the seal ends up at when phase 1 completes. Phase 2
// continues from this point, so values are reused below.
const SEAL_LIFT_Y = 0.18;
const SEAL_LIFT_Z = -0.05;
const SEAL_LIFT_TILT = -0.4;

function smoothstep01(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

function plateauFalloff(t: number): number {
  const x = Math.abs(t);
  if (x <= PLATEAU_FRACTION) return 1;
  if (x >= 1) return 0;
  const u = (x - PLATEAU_FRACTION) / (1 - PLATEAU_FRACTION);
  return 1 - smoothstep01(u);
}

function cushionBulgeAt(xn: number, yn: number): number {
  const bodyTop = 1 - SEAL_FRACTION * 2;
  const bodyBottom = -1 + SEAL_FRACTION * 2;
  if (yn > bodyTop || yn < bodyBottom) return 0;
  const bodyHalfHeight = 1 - SEAL_FRACTION * 2;
  const localY = yn / bodyHalfHeight;
  return BULGE_MAX * plateauFalloff(xn) * plateauFalloff(localY);
}

/**
 * Builds one slice of the pack between full-pack y-ratios `yMin` and
 * `yMax` (where 0 is the bottom of the full pack and 1 is the top).
 *
 * Edge rounding is applied using the FULL pack bounds, not the
 * piece's own bounds. That means vertices at the cut surface (where
 * the piece is internally clipped) are NOT in the rounding zone and
 * stay flat, while vertices at the full pack's outer edges still
 * round into a fillet of radius `CORNER_RADIUS`. The body's top face
 * and the seal's bottom face are therefore both flat — exactly what
 * we want for a clean cut.
 *
 * Cushion bulge is applied only when `applyBulge` is true (passed
 * for the body, which contains the bulged plateau region; not for
 * the seal, which is entirely seal-region and stays flat).
 *
 * UVs on lateral faces (+X, -X, +Z, -Z) are remapped so that the
 * piece samples only the V=[yMin, yMax] strip of the source texture.
 * Body and seal therefore tile the SAME texture without any seam
 * because their UVs meet exactly at v = 1 - SEAL_FRACTION.
 */
function buildPackGeometry(
  yMin: number,
  yMax: number,
  applyBulge: boolean,
): THREE.BoxGeometry {
  const W = CARD_SIZE.width;
  const H = CARD_SIZE.height;
  const D = CARD_SIZE.depth;
  const r = CORNER_RADIUS;
  const yRange = yMax - yMin;
  const pieceH = H * yRange;
  // Segment count proportional to piece height so vertex density
  // stays uniform between body and seal pieces. Minimum 6 for the
  // seal's edge rounding.
  const segH = Math.max(6, Math.round(40 * yRange));
  const geom = new THREE.BoxGeometry(W, pieceH, D, 32, segH, 6);
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;
  const uv = geom.attributes.uv;

  // Translate so vertex y values reflect the piece's position WITHIN
  // the full pack frame. Edge rounding then reasons about full-pack
  // bounds, which keeps the cut face flat and the outer edges
  // rounded.
  const yCenterShift = ((yMin + yMax) / 2 - 0.5) * H;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) + yCenterShift);
  }

  // Capture which face each vertex was generated on (using the
  // BoxGeometry's pre-modification normals) so we can selectively
  // apply the bulge after rounding has changed everything.
  const zFace = new Int8Array(pos.count);
  const isLateral = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const nz = norm.getZ(i);
    const ny = norm.getY(i);
    zFace[i] = nz > 0.99 ? 1 : nz < -0.99 ? -1 : 0;
    isLateral[i] = Math.abs(ny) < 0.5 ? 1 : 0;
  }

  // Edge rounding (all vertices, full-pack bounds).
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const cx = Math.max(-W / 2 + r, Math.min(W / 2 - r, x));
    const cy = Math.max(-H / 2 + r, Math.min(H / 2 - r, y));
    const cz = Math.max(-D / 2 + r, Math.min(D / 2 - r, z));
    const ox = x - cx;
    const oy = y - cy;
    const oz = z - cz;
    const L = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (L > 1e-6) {
      const scale = r / L;
      pos.setX(i, cx + ox * scale);
      pos.setY(i, cy + oy * scale);
      pos.setZ(i, cz + oz * scale);
    }
  }

  // Cushion bulge on front/back face vertices.
  if (applyBulge) {
    for (let i = 0; i < pos.count; i++) {
      const dir = zFace[i];
      if (dir === 0) continue;
      const x = pos.getX(i);
      const y = pos.getY(i);
      const xn = x / (W / 2);
      const yn = y / (H / 2);
      const bulge = cushionBulgeAt(xn, yn);
      pos.setZ(i, pos.getZ(i) + bulge * dir);
    }
  }

  // Translate the piece back so its center sits at y = 0 in its own
  // local frame (the parent group will position the piece in world).
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) - yCenterShift);
  }

  // Remap V on lateral faces so the piece samples V=[yMin, yMax] of
  // the source texture. Default BoxGeometry V goes 0..1 across each
  // face's height; we squeeze that into [yMin, yMax].
  for (let i = 0; i < pos.count; i++) {
    if (!isLateral[i]) continue;
    const v = uv.getY(i);
    uv.setY(i, v * yRange + yMin);
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/**
 * The pack is rendered as TWO mesh groups: a body piece (lower 92%
 * of the pack) and a top-seal piece (upper 8%). Both pieces use the
 * same textures but UV-scaled so the body samples the bottom 92% of
 * the texture and the seal samples the top 8%. At rest they sit
 * adjacent and look like one solid pack; during the cut animation
 * they animate independently.
 *
 * The slice flash and the inner-card emerge are owned by
 * `QuestReveal.tsx`, not by this component. Card.tsx is only
 * responsible for the pack body / seal split.
 *
 * Material array order is fixed by Three.js BoxGeometry face groups:
 *   0 = +X (right)
 *   1 = -X (left)
 *   2 = +Y (top)
 *   3 = -Y (bottom)
 *   4 = +Z (front)
 *   5 = -Z (back)
 *
 * For the body piece, material-2 (+Y top) is the cut surface and
 * uses flat edgeColor. For the seal piece, material-3 (-Y bottom)
 * is the cut surface. Both are normally hidden inside the joined
 * pack and only become visible once the pieces separate.
 */
export const Card = forwardRef<CardHandle, Props>(function Card(
  { initial, frontTexture, backTexture, sideTexture, edgeColor },
  ref,
) {
  const group = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const sealRef = useRef<THREE.Group>(null);

  const target = useRef<CardTarget>({ ...initial });
  const opacityRef = useRef(initial.opacity);

  // Cut animation state. cutT0 is the wall-clock time the cut began,
  // or null when no cut is in progress. cutTumble holds randomized
  // tumble axes for the body's fall.
  const cutT0 = useRef<number | null>(null);
  const cutTumble = useRef({ x: 0, z: 0 });

  const bodyColor = useMemo(() => new THREE.Color(edgeColor), [edgeColor]);

  // Body and seal geometries are identical for every Card instance
  // and never change after construction. Build once per mount.
  const bodyGeom = useMemo(
    () => buildPackGeometry(0, 1 - SEAL_FRACTION, true),
    [],
  );
  const sealGeom = useMemo(
    () => buildPackGeometry(1 - SEAL_FRACTION, 1, false),
    [],
  );

  // Y position of each piece in the pack's local frame so they
  // assemble into a single pack at rest.
  const bodyY = -CARD_SIZE.height * SEAL_FRACTION * 0.5;
  const sealY = CARD_SIZE.height * (1 - SEAL_FRACTION) * 0.5;

  useImperativeHandle(
    ref,
    () => ({
      setTarget(t) {
        Object.assign(target.current, t);
      },
      beginCut() {
        cutT0.current = performance.now() / 1000;
        // Randomize tumble for variety per cut. Small magnitudes so
        // the body's fall reads as natural, not chaotic.
        cutTumble.current = {
          x: (Math.random() - 0.5) * 0.6,
          z: (Math.random() - 0.5) * 0.6,
        };
      },
      resetCut() {
        cutT0.current = null;
      },
      get group() {
        return group.current;
      },
    }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = target.current;
    const k = Math.min(1, delta * LERP.position);
    const r = Math.min(1, delta * LERP.rotation);
    const s = Math.min(1, delta * LERP.scale);

    // Group transform follows the standard target lerp.
    g.position.lerp(tmp.set(...t.position), k);
    tmpEuler.set(t.rotation[0], t.rotation[1], t.rotation[2]);
    g.rotation.x += (tmpEuler.x - g.rotation.x) * r;
    g.rotation.y += (tmpEuler.y - g.rotation.y) * r;
    g.rotation.z += (tmpEuler.z - g.rotation.z) * r;
    const ns = g.scale.x + (t.scale - g.scale.x) * s;
    g.scale.setScalar(ns);
    opacityRef.current += (t.opacity - opacityRef.current) * s;

    const baseAlpha = opacityRef.current;
    let bodyAlpha = baseAlpha;
    let sealAlpha = baseAlpha;

    if (cutT0.current !== null) {
      // Both ends of this subtraction must come from the same clock.
      // `beginCut` captures `performance.now()`, so we have to read
      // it here too. Mixing in `state.clock.elapsedTime` (THREE.Clock)
      // made `elapsed` diverge by tens of seconds under HMR and the
      // cut visibly "completed" on the first frame.
      const elapsed = performance.now() / 1000 - cutT0.current;

      // Phase 1 — seal lifts off, body stays absolutely still.
      if (elapsed < CUT_SEAL_LIFT_END) {
        const u = elapsed / CUT_SEAL_LIFT_END;
        const e = smoothstep01(u);
        if (bodyRef.current) {
          bodyRef.current.position.set(0, bodyY, 0);
          bodyRef.current.rotation.set(0, 0, 0);
        }
        if (sealRef.current) {
          sealRef.current.position.set(
            0,
            sealY + SEAL_LIFT_Y * e,
            SEAL_LIFT_Z * e,
          );
          sealRef.current.rotation.x = SEAL_LIFT_TILT * e;
        }
      }
      // Phase 2 — body falls and fades, seal continues drifting away.
      else if (elapsed < CUT_FALL_END) {
        const u =
          (elapsed - CUT_SEAL_LIFT_END) /
          (CUT_FALL_END - CUT_SEAL_LIFT_END);
        const u2 = u * u; // ease-in (gravity feel)
        const fade = 1 - smoothstep01(u);

        bodyAlpha = baseAlpha * fade;
        sealAlpha = baseAlpha * fade;

        if (bodyRef.current) {
          bodyRef.current.position.set(
            0,
            bodyY - 0.4 * u2,
            -1.7 * u2,
          );
          bodyRef.current.rotation.x = cutTumble.current.x * u;
          bodyRef.current.rotation.z = cutTumble.current.z * u;
        }
        if (sealRef.current) {
          // Continue from end-of-phase-1 position so there's no jump
          // at the phase boundary.
          sealRef.current.position.set(
            0,
            sealY + SEAL_LIFT_Y + 0.5 * u,
            SEAL_LIFT_Z - 0.6 * u2,
          );
          sealRef.current.rotation.x = SEAL_LIFT_TILT - 0.5 * u;
        }
      }
      // After fall completes — pieces invisible.
      else {
        bodyAlpha = 0;
        sealAlpha = 0;
      }
    } else {
      // No cut: snap inner pieces back to assembled positions.
      if (bodyRef.current) {
        bodyRef.current.position.set(0, bodyY, 0);
        bodyRef.current.rotation.set(0, 0, 0);
      }
      if (sealRef.current) {
        sealRef.current.position.set(0, sealY, 0);
        sealRef.current.rotation.set(0, 0, 0);
      }
    }

    applyOpacity(bodyRef.current, bodyAlpha);
    applyOpacity(sealRef.current, sealAlpha);
  });

  return (
    <group ref={group} position={initial.position} rotation={initial.rotation}>
      <group ref={bodyRef} position={[0, bodyY, 0]}>
        <mesh geometry={bodyGeom}>
          {/* +X right side */}
          <meshBasicMaterial
            attach="material-0"
            map={sideTexture ?? undefined}
            color={sideTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
          {/* -X left side */}
          <meshBasicMaterial
            attach="material-1"
            map={sideTexture ?? undefined}
            color={sideTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
          {/* +Y top — CUT surface, flat color */}
          <meshBasicMaterial
            attach="material-2"
            color={bodyColor}
            toneMapped={false}
          />
          {/* -Y bottom — flat color (rarely seen) */}
          <meshBasicMaterial
            attach="material-3"
            color={bodyColor}
            toneMapped={false}
          />
          {/* +Z front */}
          <meshBasicMaterial
            attach="material-4"
            map={frontTexture ?? undefined}
            color={frontTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
          {/* -Z back */}
          <meshBasicMaterial
            attach="material-5"
            map={backTexture ?? undefined}
            color={backTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
        </mesh>
      </group>
      <group ref={sealRef} position={[0, sealY, 0]}>
        <mesh geometry={sealGeom}>
          <meshBasicMaterial
            attach="material-0"
            map={sideTexture ?? undefined}
            color={sideTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
          <meshBasicMaterial
            attach="material-1"
            map={sideTexture ?? undefined}
            color={sideTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
          {/* +Y top — flat color (rarely seen) */}
          <meshBasicMaterial
            attach="material-2"
            color={bodyColor}
            toneMapped={false}
          />
          {/* -Y bottom — CUT surface, flat color */}
          <meshBasicMaterial
            attach="material-3"
            color={bodyColor}
            toneMapped={false}
          />
          <meshBasicMaterial
            attach="material-4"
            map={frontTexture ?? undefined}
            color={frontTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
          <meshBasicMaterial
            attach="material-5"
            map={backTexture ?? undefined}
            color={backTexture ? "#ffffff" : bodyColor}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
});

function applyOpacity(node: THREE.Object3D | null, alpha: number) {
  if (!node) return;
  node.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m instanceof THREE.MeshBasicMaterial) {
          m.opacity = alpha;
          m.transparent = true;
        }
      }
    }
  });
}
