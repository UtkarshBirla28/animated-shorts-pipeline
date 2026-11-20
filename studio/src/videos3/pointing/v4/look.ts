// v4 LOOK (owner: LOOK, the look director): the vivid look's palette, materials and lights for the sets' owners to
// IMPORT. Owners keep their layout; this file only says what things are made of and how they are lit. Nothing here
// places anything by itself.
//   import { LAB_PAL, LAB_RIG, candy, glow, signalWash } from "../v4/look";      (from sets/*.ts)
//   import { ... } from "./look";                                              (from v4/*)
// Measured target for every set (pointing_preview/LOOK_v2_sets_sheet.jpg): beige / grey share < 15 %, vivid share
// (C* > 40) > 25 %, mean chroma ~30 (his new films: 31-34). Pale pastels FAIL that test: use the colours below at full
// strength and let the light, not the paint, make the highlights.
import * as THREE from "three";
import type { Built, KitCtx, RigSpec, V3 } from "../../../kit/core/ctx";

/** sRGB hex -> a Color (three converts sRGB hex to linear) */
const C = (hex: string) => new THREE.Color(hex);

// ================================================================ THE LAB (a bright, playful 1990s test lab)
export const LAB_PAL = {
  /** the walls: a clear teal, a lighter band at dado / picture-rail height, a white trim */
  wall: "#24a9a6", wallBand: "#bdf0e6", trim: "#fbfaf6",
  /** surface tints for kit/surfaces room() (linear-ish multipliers, as sets/lab.ts uses them) */
  wallTint: [0.2, 0.74, 0.78] as [number, number, number], floorTint: [0.4, 0.55, 0.95] as [number, number, number],
  /** the floor: a deep blue speckled vinyl (sets/lab.ts floorOpts value 0.66, sat 1.5) */
  floor: "#3d63c8",
  /** CANDY: the button boards, the lamp housings, the counters (use each at full strength; never the suitcase's yellow) */
  candy: ["#ff3b3b", "#ff8a1f", "#2bd18f", "#2fa7ff", "#8a5cff", "#ff4fa3"],
  /** the board faces the candy buttons sit on (white enamel) and the board frames (a deep navy) */
  boardFace: "#f6f4ee", boardFrame: "#1e2c5c",
  /** chairs / stools: one colour per seat, from this list in turn */
  chairs: ["#ff8a1f", "#2fa7ff", "#ff3b3b", "#2bd18f"],
  /** the HEROES: the big signal lamp (lens colours, lit) and the big button */
  lampGreen: "#29ff6e", lampRed: "#ff2a1f", lampOff: "#3a4a40", lampHousing: "#1c1f26", lampVisor: "#11131a",
  button: "#ff2a1f", buttonRing: "#f2f2f2", buttonBase: "#1e2c5c",
  /** posters without text: backgrounds + shapes */
  posterBg: ["#1d3f8a", "#c8263c", "#0f7a5c", "#5b2fa8"], posterInk: ["#f07a1a", "#2bb37a", "#1f8fd6", "#e8452c", "#d23f8f", "#f4f1ea", "#11a3a3"],
  /** the clock rim, plants' pots */
  clockRim: [0.8, 0.12, 0.1] as [number, number, number], pot: "#e8603a",
};
/** the lab's light + grade (spread it into the set's Built.hints.rigOpts; under the interiorWarm rig). A sunny morning
 *  through the window (a 4200 K sun under the 4500 K white balance = warm, not orange), a clean daylit room fill, the
 *  vivid grade of the platform (golden highlights, cool shadows), a stronger bloom so the lit lamp glows */
export const LAB_RIG: Partial<RigSpec> = {
  exposure: 1.35, haze: 0.0004, bloom: 0.45, bloomThreshold: 1.05, env: "proc:dayRoom", skyLevel: 0.12, gi: 1.1,
  contrast: 0.36, sat: 1.85, shadowSat: 1.5, warmth: 0, vig: 0.14, sunKelvin: 4200,
  hiTint: [1.015, 1.0, 0.975], loTint: [0.95, 0.99, 1.07],
};

// ================================================================ materials
/** a glossy candy plastic / enamel (button caps, lamp housings, board frames, chairs): clear coat, mid roughness */
export const candy = (hex: string, o: { rough?: number; clearcoat?: number } = {}) =>
  new THREE.MeshPhysicalMaterial({ color: C(hex), roughness: o.rough ?? 0.32, clearcoat: o.clearcoat ?? 1, clearcoatRoughness: 0.12, name: "look:candy" + hex });
/** a lit lens / indicator: an emissive colour that blooms (intensity ~2-6 for a lamp, ~1 for a small indicator). Change
 *  `.emissiveIntensity` per frame to switch it (never `.visible` on a lit fixture: see kit/core NOTES) */
export const glow = (hex: string, intensity = 3) =>
  new THREE.MeshStandardMaterial({ color: C(hex), emissive: C(hex), emissiveIntensity: intensity, roughness: 0.25, toneMapped: true, name: "look:glow" + hex });

// ================================================================ lights
export type WashOpts = {
  /** where the light sits (just in front of the lamp's lens) and where it aims (spot) */
  pos: V3; target?: V3;
  /** the colour at film time t (null = off). Use LAB_PAL.lampGreen / lampRed */
  colorAt: (t: number) => string | null;
  /** lumens at full (default 2600: a strong coloured wash on a 6 x 7 m room under interiorWarm's practicalK 1) */
  lumens?: number;
  /** a dimmer 0..1+ at film time t (default 1): e.g. green 0.7, red 1.25 = the full red wash */
  gainAt?: (t: number) => number;
  /** point (default: the whole room takes the colour) or spot (a wide cone toward `target`) */
  kind?: "spot" | "point";
  /** metres to zero (default 8) */
  range?: number;
  /** soft shadows from it (counts toward the set's max 2 shadowed practicals) */
  shadow?: boolean;
};
/** THE SIGNAL WASH: one coloured practical light that tints the room with the lamp (green or red), switched by
 *  `colorAt(t)`. One light whatever the colour (colour changes are free; the light count never changes). Add
 *  `.object` to the set and call `.update(t)` from the set's update. */
export const signalWash = (ctx: KitCtx, o: WashOpts): Built & { practical: ReturnType<NonNullable<KitCtx["practical"]>> | null } => {
  const g = new THREE.Group(); g.name = "look:signalWash";
  if (!ctx.practical) return { object: g, practical: null };
  const kind = o.kind ?? "point";
  const p = ctx.practical({ kind, pos: o.pos, ...(kind === "spot" ? { target: o.target ?? [o.pos[0], 0, o.pos[2] + 2], angle: 1.15, penumbra: 0.85 } : {}),
    color: "#ffffff", lumens: (o.lumens ?? 2600) * 1.3, range: o.range ?? 9, shadow: !!o.shadow, shadowNear: 0.2, bulb: false, seed: 61 });
  g.add(p.object);
  const tmp = new THREE.Color();
  return {
    object: g, practical: p,
    update: (t: number) => {
      const c = o.colorAt(t);
      if (!c) { p.set(0); return; }
      tmp.set(c); p.light.color.copy(tmp); p.set(Math.max(0, Math.min(1, (o.gainAt?.(t) ?? 1) / 1.3)));
    },
  };
};

// ================================================================ the other sets (same rules)
/** the New York station (lines 19-21): deep teal lower tiles, a red band, white tile above, a yellow edge, warm
 *  tungsten pools (the station's fixtures at 3200 K under undergroundWarm's 3600 K white balance), text-free posters */
export const NY_PAL = {
  /** kit/subway/station.ts tile tints (lower wall teal with sat 1.4, the band red, white glazed tile above the band) */
  tilesLow: [0.06, 0.5, 0.46] as [number, number, number], band: [0.85, 0.2, 0.14] as [number, number, number],
  /** the train's interior glow seen from the platform (nyTrain selfLit; was 0.5) */
  trainSelfLit: 0.9,
  /** text-free posters (sets/ny_station.ts LOOK block) */
  posterBg: ["#c8263c", "#1d3f8a", "#f07a1a", "#5b2fa8", "#0f7a5c", "#d23f8f"], posterInk: ["#f4f1ea", "#2bb37a", "#1f8fd6", "#e8452c", "#ffd23a", "#11a3a3"],
  /** line bullets (for STATION / TRAIN if the car gets route discs: one strong colour each, white glyph-free disc) */
  bullets: ["#ee352e", "#00933c", "#0039a6", "#ff6319", "#b933ad"],
};
export const NY_RIG: Partial<RigSpec> = { sat: 1.85, shadowSat: 1.5, contrast: 0.34, exposure: 3.3, warmth: 0.25 };
/** the platform / cab / car daylight grade (the platform presets already carry it: sets/jp_platform.ts VIVID) */
export const DAY_GRADE: Partial<RigSpec> = { warmth: 0.15, haze: 0.0002, contrast: 0.36, sat: 1.8, shadowSat: 1.5, hiTint: [1.015, 1.0, 0.975], loTint: [0.95, 0.99, 1.07] };
