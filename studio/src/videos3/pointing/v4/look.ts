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
  exposure: 1.35, haze: 0.0004, bloom: 0.45, bloomThreshold: 1.8,   /* v10 (audit r2 #8): cards OUT of the bloom (only lamps / lenses / fire bloom) */ env: "proc:dayRoom", skyLevel: 0.12, gi: 1.1,
  contrast: 0.36, sat: 1.5, shadowSat: 1.35, warmth: 0,   /* v10: 1.6 -> 1.5 (audit r2 #10) */ vig: 0.14, sunKelvin: 4200,   // v7 (audit r1: the most saturated film of the comparison): sat 1.85 -> 1.6
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

// ================================================================ THE v4 LAB (v4/sets/lab.ts, owner LAB): the opening v01-v05 + the loop
// LOOK v4 (2026-11-20, look director #2), judged on real draft stills of the real v4 lab beside Ricks Clips' new-look
// interiors and our clown (pointing_preview/LOOK_v4_opening_*). Round 4 (16:10, after the DIRECTOR's audit):
//   * THE LAMP: a near-BLACK housing (it was cobalt: the lens seat shares the housing material, so a lit lens over blue
//     read CYAN for green and PINK for red). On black the green is traffic-light green and the red is red.
//   * the walls: a warm APRICOT (the yellow read olive / "a yellow room"); warm and bright, never beige.
//   * the wash: a colour SPILL, not a face fill: the `near` light now sits above and just BEHIND her head (a coloured rim
//     on her hair and shoulders, the desk), the `room` light tints the back of the booth. Skin stays skin.
// HOW LAB PICKS IT UP (sets/lab.ts; layout untouched): import { LAB_PAL, LAB4_PAL, LAB4_SURF, LAB4_LIGHT, LAB4_RIG,
// LAB4_LENS, labWash } from "../look";
//   1. colours: LAB4_PAL (+ LAB_PAL hexes); room(): `floorOpts: { tint: LAB4_PAL.floor, ...LAB4_SURF.floorOpts }`,
//      `wallTint: LAB4_PAL.wall, wallOpts: { ...LAB4_SURF.wallOpts }`, `bounce: LAB4_SURF.bounce`, `trimColor: LAB4_SURF.trim`
//   2. ceilingPanel(..., { lumens: LAB4_LIGHT.ceilingLumens, kelvin: LAB4_LIGHT.ceilingKelvin })
//   3. signalHead set(): LIT lens: `emissive = LAB4_LENS.lit[k] * (LAB4_LENS.onK[k] + LAB4_LENS.flashK * flash)` (k 0 green,
//      1 red), `color = LAB4_LENS.onColor`; halo `LAB4_LENS.lit[k] * (LAB4_LENS.haloK + LAB4_LENS.haloFlash * flash)`.
//      DARK lens (frame 0, the idle look): `color = LAB4_LENS.off[k]`, `emissive = LAB4_LENS.off[k] * LAB4_LENS.offGlow`
//      (a deep green and a deep red glass that still read as a signal lamp). The LENS SEAT must NOT use the housing
//      material: give it the lens's own material (or black): in the 16:00 stills the lens dome was not visible at all
//      (only the seat disc + the halo show), so the seat IS the lens on screen.
//   4. hints.rigOpts = { ...LAB4_RIG } (the sun direction is in it: low through the LEFT windows onto her)
//   5. the wash: `add(labWash(ctx, lampV, lampAt))` (two lights, one colour, following the lamp; off when the lamp is dark)
/** the lab palette, SAME KEYS as sets/lab.ts PAL (sRGB 0..1 triples for kit/home pbr(); `wall` / `floor` are the room
 *  surface tints, linear multipliers as room() uses them) + the console */
export const LAB4_PAL = {
  /** the walls: a warm apricot (round 4; the yellow read olive); the floor: LAB's deep blue speckle */
  wall: [1.0, 0.56, 0.33] as [number, number, number], floor: [0.3, 0.45, 0.98] as [number, number, number],
  /** the hero lamp: a glossy near-black housing (lit lenses read pure green / red on it), a black visor */
  lampHousing: [0.025, 0.028, 0.04] as [number, number, number], visor: [0.04, 0.04, 0.05] as [number, number, number],
  /** THE BUTTON: cobalt base, candy-red mushroom cap, a hot red-orange glow on a press */
  buttonBase: [0.08, 0.26, 0.86] as [number, number, number], buttonCap: [0.93, 0.08, 0.06] as [number, number, number], buttonGlow: [1.0, 0.3, 0.12] as [number, number, number],
  /** her desk (orange: complementary to the blue floor) and the console the button sits on (candy teal: the red cap
   *  pops on it; a white console read grey-beige in the stills) */
  heroDesk: [0.0, 0.5, 0.52] as [number, number, number], console: [0.05, 0.7, 0.62] as [number, number, number],
  /** the rows' desks: candy, never beige */
  desks: [[0.1, 0.62, 0.45], [0.86, 0.24, 0.5], [0.42, 0.3, 0.86], [0.1, 0.55, 0.9], [0.0, 0.6, 0.6], [0.92, 0.36, 0.2]] as [number, number, number][],
  xRed: "#e8202a",
};
/** room() surface options for the lab (spread into floorOpts / wallOpts) */
export const LAB4_SURF = {
  wallOpts: { value: 1.25, sat: 1.2, ao: 0.4, cavity: 0.25, macro: { amount: 0.006 }, dirt: { bottom: 0.06, heightM: 0.2, baseY: 0, grime: 0.004, edge: 0 } },
  floorOpts: { value: 0.62, sat: 1.7, rough: 0.7, wear: { polish: 0.25,   /* v10 (audit r2 #4: white glow on the hall floor under the near lamp) */ centre: 0.3, chips: 0.04 }, dirt: { edge: 0.3, joints: 0.1, grime: 0.04 } },
  /** the windows' bounce fill (lifts the ceiling band and the window wall) and the white trim */
  bounce: 0.12, trim: [0.97, 0.97, 0.95] as [number, number, number],
};
/** practical lights of the lab (LAB's ceilingPanel calls) */
export const LAB4_LIGHT = { ceilingLumens: 1100, ceilingKelvin: 4800 };
/** the signal lamp's lenses (LAB's signalHead set(); index 0 = green, 1 = red). Emissive values are LINEAR and kept
 *  low enough that the lens does not clip to white / pink: green k 3.0, red k 2.2 (red clips sooner) */
export const LAB4_LENS = {
  /** lit colours (linear) */
  lit: [[0.03, 0.85, 0.16], [0.95, 0.02, 0.012]] as [number, number, number][],
  onK: [1.0, 1.4], flashK: 0.5, onColor: [0.35, 0.35, 0.35] as [number, number, number],
  haloK: 0.55, haloFlash: 0.6,
  /** the lens glass: how much it mirrors the room (a lit red lens mirrored the orange-lit wall and read SALMON) */
  envK: 0.12, rough: 0.75,   // v10: 0.55 -> 0.75 (audit r2 #9: a green speck on the red lens)
    // v7: 0.3 -> 0.55 (audit r1: the OFF lenses' gloss read as ON at frame 0)
  /** v5 THE RED LENS (the lead: "salmon"): a bright red emission tone-maps to salmon / pink. The lit red lens body = a
   *  DEEP red (`redBody`, linear) with a moderate emission (LAB's red emissive x `redK`); the glow is the halo + bloom */
  redBody: [0.2, 0.0, 0.0] as [number, number, number], redK: 0.35,
  /** the DARK lenses (frame 0 idle): deep green and deep red glass with a faint glow of their own */
  off: [[0.006, 0.05, 0.02], [0.055, 0.004, 0.003]] as [number, number, number][], offGlow: 0.35,   // v7: darker again (audit r1: off read ON)   // v5: darker (the dark red lens read LIT under the key / green spill in the Go run, 23:25 stills)
  /** OLD single-lens fields (kept so older code still compiles) */
  rgb: { 0: [0.08, 0.08, 0.07], 1: [0.62, 0.015, 0.02], 2: [0.06, 0.72, 0.2] } as Record<number, [number, number, number]>,
  base: 2.4, offColor: [0.02, 0.2, 0.07] as [number, number, number], offEmissive: [0.007, 0.07, 0.025] as [number, number, number], haloBase: 0.4,
  /** the lamp's own small point light (the room colour comes from labWash) */
  lightLumens: 700,
};
/** LAB: USE THIS ({ ...LAB4_RIG }), not LAB_RIG + sun 95 / 25. Tested 16:40 on the real lab (out/pointing_v4/look_try_rig5): her
 *  face L* 92 warm cream (254,226,195), the room bright apricot; with sun 95 / 25 the sun misses her face (L* 82, a
 *  dimmer brownish room). The 15:59 white face was a 3-minute diagnostic value (sun 45), not this rig.
 *  The lab rig over interiorWarm (Built.hints.rigOpts): LAB_RIG + the sun LOW through the left windows (azimuth 84 =
 *  from screen left, a little toward the lens; elevation 13 = the shaft reaches her at desk / face height) */
export const LAB4_RIG: Partial<RigSpec> = {
  ...LAB_RIG, exposure: 1.55, sunAz: 84, sunEl: 11, sunKelvin: 4300, sunIntensity: 9, haze: 0.0004,   /* v8: 0.0009 -> 0.0004 (audit r1: v07 hazy) */ gi: 1.1, skyLevel: 0.12,
  bloom: 0.42, bloomThreshold: 1.8, vig: 0.12,   // v10: 1.3 -> 1.8 (audit r2 #8: cards out of the bloom)
    // v7: 1.1 -> 1.3 (audit r1: a head blown to a white bulb in v10b)
};
/** the wash strengths. TWO lights, one colour: `near` sits just above and BEHIND her head (a coloured rim on her
 *  hair and shoulders + spill on the desk; a light in front of the lens painted her whole face green), `room` hangs high BEHIND her (default: 2.3 m behind the lens, 0.55 m above it, inside the booth; or `o.roomPos`): the walls, the floor, the ceiling take the
 *  colour: a single lamp-side light fell off before the back wall in the stills). Gains: green = a clear cast, red = the
 *  flood; `*Flash` = the extra kick of a Go flash */
export const LAB4_WASH = {
  // v7 (audit r1 BLOCKER 2: a hard green half-moon on her face on every Go): the green moves from the NEAR light (above /
  // behind her head: it lit one side of her face card) onto the high ROOM light (an even wash)
  // v8 (04:57, every-frame check of v03 after batch 3: a soft green CRESCENT on the left half of her face on each Go = the
  // room light behind-left rimming one side): the NEAR light now hangs IN FRONT of her, high, on the camera side
  // (`front` / `side` / `up` metres from the lens) and carries the green as an even frontal wash; it never carries the red
  // (her face must not go red-on-red: the red stays a back light = the room light)
  near: { lumens: 1600, range: 5, back: -1.7, up: 0.7, side: 0.5, green: 0.42, greenFlash: 0.3, red: 0.0, redFlash: 0.0 },
  room: { lumens: 6000, range: 12, back: 2.3, up: 0.55, green: 0.3, greenFlash: 0.2, red: 0.5, redFlash: 0.15,
    /** v6: lamp DARK = a low amber glow high behind her (the room's warm practical): the wall behind her rich, not flat */
    dark: 0.07, darkColor: "#ff8a30" },
};
/** v5 THE ROOM PER LAMP STATE (the lead 22:55: "THE RED IS NOT RED": on the 7th Go the room read orange-pink, the lens
 *  salmon; green read yellow-olive on the apricot wall). Red light ADDED to a white-lit apricot room is orange; a true
 *  alarm red needs the white light to go away. So while the lamp is lit the booth's white light drops: the IBL fill and
 *  the sun to `env` / `sun` of the rig's own values, the ceiling panels to `panel` (LAB applies `labPanelK`), the warm
 *  key (LAB4_KEY) to `key`; the coloured washes carry the room. Green drops less (a fresh green room, her face still
 *  warm skin), red drops to a dark crimson with her face lit low by the key + a red rim from the near wash.
 *  Only while the CAMERA is in the booth (x < 20): the hall has its own redRoomDim. */
export const LAB4_ROOM = {
  // v6 (03:00): frame 0 / the loop deeper + richer behind her (env 0.45, the sun off her face: it bleached her pale),
  // her light = the warm key; the amber room glow (LAB4_WASH.room.dark) warms the wall behind her
  // v7 (audit r1 BLOCKER 1: flickering tan / pale RECTANGLES on her face in v01, v03, v36 = the low sun's window-pane
  // patches on her card through the sun-visibility noise): NO SUN in the booth in any lamp state; her light = the key
  dark: { env: 0.45, sun: 0.0, panel: 1, key: 1 },
  green: { env: 0.3, sun: 0.0, panel: 0.45, key: 0.55 },   // panel = the dark value: labPanelK is per state (no time average), so the panels must not jump on each Go flash
  red: { env: 0.04, sun: 0.0, panel: 0, key: 0.22 },   // v7: key 0.12 -> 0.22 (audit r1: her face grey-pink and muddy in v05)
};
/** FRAME 0 v5: THE ONE LIGHT IDEA (the lead: "the lamp, her face and the button must glow against the room, depth
 *  behind her"): a warm stage KEY from high front-left pools on her face, the button and the lamp; the booth's white
 *  ceiling light drops (`panelK`, LAB) so the room falls a step darker toward the back and the edges; the dark lamp's two
 *  lenses keep a faint glow of their own colour and the button cap a faint red glow (frame 0 + the loop only, never
 *  inside the Go run: LAB, values `idle` / `capGlow`). The key lives in labWash (LAB already calls it). */
export const LAB4_KEY = {
  /** the key spot (world, booth): high front-left (the window side), aimed between her face and the button */
  pos: [1.7, 2.8, 0.9] as V3, target: [0.3, 1.15, -0.9] as V3, kelvin: 3000, lumens: 2700, angle: 0.42, penumbra: 0.85, range: 7, shadow: false,   // v7: NO shadow (the lamp hood's hard shadow on her face = the audit's half-moon); 2700 lm (the sun is gone)
  /** the booth's two ceiling panels x this when the lamp is dark (the key replaces their front light) */
  panelK: 0.45,
  /** frame 0 / the loop (lamp dark): each lens glows with its own lit colour x idle; the button cap's red glow */
  idle: 0.03, capGlow: 0.18,
};
/** LAB: the booth ceiling panels' dimmer for lamp state s (0 dark, 2 green, 1 red): `p.lamp?.set(labPanelK(L.state))`
 *  (replaces the 0.35 while red), and the panel's diffuser glow mesh x the same factor (it stays a white streak) */
export const labPanelK = (s: 0 | 1 | 2) => (s === 1 ? LAB4_ROOM.red.panel : s === 2 ? LAB4_ROOM.green.panel : LAB4_KEY.panelK);
/** the room's white fill dimmer that never loses the rig's values: the IBL (environmentIntensity), the GI bounce probe +
 *  the ground hemisphere + any ambient (x kEnv: the 23:10 trial left them on and the red read orange), the sun (x kSun).
 *  Whatever the rig / GI set since our last write is taken as the new base */
export const roomDimmer = (ctx: KitCtx) => {
  type Ch = { get: () => number; set: (v: number) => void; base: number; last: number; sun: boolean };
  let chans: Ch[] | null = null;
  const ch = (get: () => number, set: (v: number) => void, sun = false): Ch => ({ get, set, base: get(), last: NaN, sun });
  return (kEnv: number, kSun: number) => {
    if (!chans) {
      chans = [ch(() => ctx.scene.environmentIntensity, (v) => { ctx.scene.environmentIntensity = v; }),
        // the drawn sky seen through the windows (a bright blue window behind her in the red read as a hole)
        ch(() => ctx.scene.backgroundIntensity, (v) => { ctx.scene.backgroundIntensity = v; })];
      let sun: THREE.DirectionalLight | null = null;
      ctx.scene.traverse((o) => { const l = o as THREE.Light & { isLightProbe?: boolean; isHemisphereLight?: boolean; isAmbientLight?: boolean; isDirectionalLight?: boolean };
        if (l.isDirectionalLight && l.castShadow && !sun) { sun = l as THREE.DirectionalLight; chans!.push(ch(() => l.intensity, (v) => { l.intensity = v; }, true)); }
        else if (l.isLightProbe || l.isHemisphereLight || l.isAmbientLight) chans!.push(ch(() => l.intensity, (v) => { l.intensity = v; })); });
    }
    for (const c of chans) { const v = c.get(); if (v !== c.last) c.base = v; c.last = c.base * (c.sun ? kSun : kEnv); c.set(c.last); }
  };
};
/** THE ROOM WASH for the lab: two coloured point lights (see LAB4_WASH) following the lamp's state (0 dark = off, 2 green,
 *  1 red; `flash` 0..1 = the kick of a Go flash) + (v5) the warm KEY (LAB4_KEY) and the room dimmer (LAB4_ROOM).
 *  `state(t)` = LAB's lamp function for every lab shot (lab_plan.ts lampAt). Add `.object`, call `.update(t, cam)`.
 *  The light count never changes (colour / dimmer only). */
export const labWash = (ctx: KitCtx, lensPos: V3, state: (t: number) => { state: 0 | 1 | 2; flash: number }, o: { roomPos?: V3 } = {}) => {
  const g = new THREE.Group(); g.name = "look:labWash";
  const colorAt = (t: number) => { const s = state(t).state; return s === 2 ? LAB_PAL.lampGreen : s === 1 ? LAB_PAL.lampRed : null; };
  const gain = (W: { green: number; greenFlash: number; red: number; redFlash: number }) => (t: number) => { const s = state(t); return s.state === 2 ? W.green + W.greenFlash * s.flash : s.state === 1 ? W.red + W.redFlash * s.flash : 0; };
  const N = LAB4_WASH.near, Rm = LAB4_WASH.room;
  const near = signalWash(ctx, { pos: [lensPos[0] + N.side, lensPos[1] + N.up, lensPos[2] - N.back], lumens: N.lumens, range: N.range, colorAt: (t) => (state(t).state === 2 ? LAB_PAL.lampGreen : null), gainAt: gain(N) });
  const roomPos: V3 = o.roomPos ?? [lensPos[0], lensPos[1] + Rm.up, lensPos[2] - Rm.back];
  const roomColor = (t: number) => colorAt(t) ?? Rm.darkColor, roomGain = (t: number) => (state(t).state === 0 ? Rm.dark : gain(Rm)(t));
  const room = signalWash(ctx, { pos: roomPos, lumens: Rm.lumens, range: Rm.range, colorAt: roomColor, gainAt: roomGain });
  g.add(near.object, room.object);
  const K = LAB4_KEY;
  const key = ctx.practical ? ctx.practical({ kind: "spot", pos: K.pos, target: K.target, kelvin: K.kelvin, lumens: K.lumens, angle: K.angle, penumbra: K.penumbra, range: K.range, shadow: K.shadow, shadowNear: 0.3, bulb: false, seed: 91 }) : null;
  if (key) { key.set(1); g.add(key.object); }
  const dim = roomDimmer(ctx); let dimmed = false;
  return { object: g, update: (t: number, cam: THREE.Camera) => {
    near.update?.(t, cam); room.update?.(t, cam);
    // the hall / elsewhere: put the room's white light back ONCE (the booth and the hall share one scene and one rig), then
    // leave it alone (the hall has its own redRoomDim)
    if (!cam || cam.position.x > 20) { if (dimmed) { dim(1, 1); dimmed = false; } return; }
    // v6 (the director's 02:11 audit: her face flashed WHITE between the Go flashes = the white light jumped back up each
    // time the lamp went dark): the white light follows the share of GREEN in the last 0.6 s (a pure function of t: 12
    // samples), so a 0.17 s Go flash barely moves it and only the lamp's own colour comes and goes; a held green (v02)
    // still reaches the full green look; the RED is instant (the cut is the punch)
    const D = LAB4_ROOM.dark, G = LAB4_ROOM.green, s = state(t).state;
    if (s === 1) { const R = LAB4_ROOM.red; dim(R.env, R.sun); dimmed = true; key?.set(R.key); return; }
    let g = 0; for (let i = 0; i < 12; i++) if (state(t - i * 0.05).state === 2) g += 1 / 12;
    const mix = (a: number, b: number) => a + (b - a) * g;
    dim(mix(D.env, G.env), mix(D.sun, G.sun)); dimmed = true; key?.set(mix(D.key, G.key));
  } };
};

// ================================================================ the 1994 HALL (v4/sets/lab_hall.ts, owner LAB; v06-v16)
/** The hall is the same lab as the booth: SAME apricot walls (the 16:00 hall still had the teal wallTint, which goes
 *  muddy grey under the hall's red flood, and its ceiling read as a big grey slab). LAB: in lab_hall.ts room() use
 *  `wallTint: LAB4_PAL.wall, wallOpts: { ...LAB4_SURF.wallOpts }, floorOpts: { tint: LAB4_PAL.floor, ...LAB4_SURF.floorOpts },
 *  bounce: LAB4_SURF.bounce`, ceilingPanel lumens LAB4_LIGHT.ceilingLumens, hints.rigOpts `{ ...HALL_RIG }`; keep your
 *  signalWash (red 1.3 is right for the FLOOD of the hall: the faces there are small).
 *  16:55 stills of the hall (out/pointing_v4/look_hall_kitchen f258 / f362 / f508 / f557): the rows of candy desks and
 *  people read well; THREE fixes: (1) the yellow ceiling plane (#ffe58a) reads MUSTARD over a third of every wide: use
 *  HALL_LOOK.ceiling (a pale sky blue: cool against the apricot walls, it turns magenta-red in the flood);
 *  (2) the 11 m ceiling panel blooms into a white glare streak: lumens HALL_LOOK.panelLumens; (3) the red flood lights
 *  the ceiling orange and leaves the floor pink: hang the two red washes LOWER (y HALL_LOOK.washY, over the desks) so
 *  the people, desks and floor go red. */
/** v5 (22:50): the ceiling a clear sky blue (the pale [0.62, 0.8, 0.98] measured grey-blue, C* < 22, over a third of
 *  the wides), the panel 1100 lm (its glare streak was the biggest white in v06 / v08) */
export const HALL_LOOK = { ceiling: [0.22, 0.52, 1.0] as [number, number, number], panelLumens: 1100, washY: 1.7 };
export const HALL_RIG: Partial<RigSpec> = { ...LAB_RIG, exposure: 1.6, sunAz: 84, sunEl: 14, sunKelvin: 4300, sunIntensity: 10, haze: 0.0008, gi: 1.1 };
/** HALL RED v2 (19:30, the lead: the flood read PASTEL SALMON). A deep alarm red needs the WHITE light to go away while
 *  the red is on: red added on top of a bright white-lit room is pink / salmon. During the hall's red states LAB calls
 *  `dim(1)` (else `dim(0)`) from the set's update: the room's IBL fill and the sun drop to HALL_RED.envK / sunK of the rig's
 *  own values (taken when the red starts, put back when it ends; untouched otherwise), the ceiling panels go to HALL_RED.panelK, and
 *  the two red washes run at HALL_RED.washGain. Ceiling + floor keep LAB's warm-neutral red-state colours. */
export const HALL_RED = { envK: 0.16, sunK: 0.05, panelK: 0.06, washGain: 0.55,   // v8: envK 0.08 -> 0.16, panelK 0 -> 0.06 (audit r1: faces red-on-red)
 
  /** the hall ceiling + floor colours while red (darker than LAB's warm neutral 0.85 / 0.42: a light surface under a strong red reads salmon) */
  ceiling: [0.5, 0.42, 0.4] as [number, number, number], floor: [0.26, 0.2, 0.18] as [number, number, number] };
export const redRoomDim = (ctx: KitCtx) => {
  let sun: THREE.DirectionalLight | null = null, base: { env: number; sun: number } | null = null;
  return (k: number) => {
    if (!sun) ctx.scene.traverse((o) => { const l = o as THREE.DirectionalLight; if (!sun && l.isDirectionalLight && l.castShadow) sun = l; });
    const S = sun as THREE.DirectionalLight | null;
    if (k <= 0) { if (base) { ctx.scene.environmentIntensity = base.env; if (S) S.intensity = base.sun; base = null; } return; }   // untouched unless WE dimmed it
    if (!base) base = { env: ctx.scene.environmentIntensity, sun: S ? S.intensity : 0 };
    ctx.scene.environmentIntensity = base.env * (1 - (1 - HALL_RED.envK) * k);
    if (S) S.intensity = base.sun * (1 - (1 - HALL_RED.sunK) * k);
  };
};

// ================================================================ the KITCHEN, MORNING (v17, owner LAB; line 10 "cereal in the fridge")
/** KITCHEN v2 (19:30). THE JOKE IS THE BOX: the cereal box must be the brightest, most colourful thing in the frame, so
 *  everything around it calms down one step: a WHITE fridge (a red fridge and yellow cupboards fought the red / yellow
 *  box), a cool white fridge light pooled on the box, sky-blue cupboards, fresh mint walls, a warm wood floor and a low
 *  golden morning sun through the back window lying across the floor and the person.
 *  LAB, in v4/sets/kitchen.ts: (1) `export const KPAL = { ...KPAL_LAB, ...KITCHEN_PAL }` (same keys); (2) hints.rigOpts
 *  `{ ...KITCHEN_RIG }` (the sun comes in through the BACK window, low: azimuth 18 / elevation 14; was 150 / 22 =
 *  behind the lens, no sun in frame); (3) the box: `cerealLook(front, side)` on its two materials (a soft self-glow so it
 *  reads lit by the fridge); (4) `add(fridgePool(ctx, <the box position>))` (one cool spot from the fridge top onto the
 *  box) and the fridge's own point light at KITCHEN_LIGHT.fridgeLumens. */
export const KITCHEN_PAL = {
  wall: [0.42, 0.86, 0.66] as [number, number, number], floor: [0.82, 0.48, 0.26] as [number, number, number],
  // v5 (00:25, LAB took v2 and it measured WORSE: the white fridge + its glare = 17 % beige, C 27): a deep COBALT retro
  // fridge (the red / yellow box pops on its complement), less fridge light, a step less exposure
  cabinets: [0.32, 0.62, 0.98] as [number, number, number], fridge: [0.1, 0.26, 0.82] as [number, number, number],
  fridgeIn: [0.98, 0.99, 1.0] as [number, number, number], cat: [0.98, 0.52, 0.14] as [number, number, number], trim: [0.97, 0.97, 0.95] as [number, number, number],
};
export const KITCHEN_LIGHT = { fridgeLumens: 180, poolLumens: 110,   // v10 (audit r2 #11: the white glow ate the cereal box)
  poolKelvin: 6500, cerealGlow: 0.2 };
export const KITCHEN_RIG: Partial<RigSpec> = { ...LAB_RIG, exposure: 1.3, sunAz: 80, sunEl: 18, sunKelvin: 3800, sunIntensity: 8, haze: 0.0003, gi: 1.2, warmth: 0.1, env: "proc:dayRoom", skyLevel: 0.12 };
/** the cereal box's materials: a soft self-glow of its own print (it reads as lit by the fridge, the brightest thing) */
export const cerealLook = (front: THREE.MeshStandardMaterial, side: THREE.MeshStandardMaterial) => {
  front.emissive.setRGB(1, 1, 1); front.emissiveMap = front.map; front.emissiveIntensity = KITCHEN_LIGHT.cerealGlow; front.needsUpdate = true;
  side.emissive.copy(side.color); side.emissiveIntensity = KITCHEN_LIGHT.cerealGlow * 0.6;
};
/** a cool spot from just inside the fridge top onto the box (`box` = the box centre, world) */
export const fridgePool = (ctx: KitCtx, box: V3): Built => {
  const g = new THREE.Group(); g.name = "look:fridgePool";
  if (!ctx.practical) return { object: g };
  const p = ctx.practical({ kind: "spot", pos: [box[0], box[1] + 0.55, box[2] + 0.35], target: box, angle: 0.5, penumbra: 0.7, kelvin: KITCHEN_LIGHT.poolKelvin, lumens: KITCHEN_LIGHT.poolLumens, bulb: false, seed: 77 });
  p.set(1); g.add(p.object);
  return { object: g };
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
/** the platform / cab / car daylight grade (the platform presets already carry it: sets/jp_platform.ts VIVID) */
export const DAY_GRADE: Partial<RigSpec> = { warmth: 0.15, haze: 0.0002, contrast: 0.36, sat: 1.8, shadowSat: 1.5, hiTint: [1.015, 1.0, 0.975], loTint: [0.95, 0.99, 1.07] };

// ================================================================ NEW YORK (v4/sets/ny_station.ts, owner STATION; v31-v35)
/** NY v2 (17:30, the lead: "the darkest, murkiest place in the film"). The station becomes a BRIGHT, CLEAN tiled hall:
 *  CREAM glazed tile is the dominant surface (the lower wall was deep teal), a cobalt band as the one cool accent, the red
 *  quarry floor, kelly-green columns (were near-black green under heavy grime), a SKY-BLUE painted ceiling (white
 *  read tan over the concrete: 25 % beige), less dirt on every
 *  tile, strong even light (brighter fixture rows, a warm room fill instead of the dark one, a thin fog instead of the
 *  murk). STATION, in v4/sets/ny_station.ts:
 *    1. `nyLook(st.mats, st.object)` (add `st.object`: the lower walls are not in `mats`);
 *    2. nyStation(..., { lumens: NY_LIGHT.lumens, kelvin: NY_LIGHT.kelvin, ... });
 *    3. hints.rigOpts = { ...NY_RIG } (replaces the inline { sat, shadowSat, contrast, exposure, warmth });
 *    4. nyTrain(..., { selfLit: NY_LIGHT.trainSelfLit }) and a small warm light on the conductor in his window:
 *       ctx.practical({ kind: "point", pos: <0.35 m in front of his face, inside the cab>, kelvin: NY_LIGHT.condKelvin,
 *       lumens: NY_LIGHT.condLumens, bulb: false }) so his face is lit, not a grey head in a dark window. */
export const NY_LOOK = {
  /** linear tint multipliers (x the surface's own albedo) */
  // v6 (02:40, STATION's rebuilt NY): the floor still read pink-grey (L 60, C < 22): a deeper red + its own saturation;
  // the ceiling a more saturated sky blue; the ceiling pipes cream (they read white)
  floor: [0.62, 0.04, 0.015] as [number, number, number], floorSat: 1.6,
  // v9 (07:20, lead + audit r1 #13: the sky-blue ceiling read as SKY): a warm CREAM tile ceiling; the blue stays in the
  // cobalt band, the car stripe and the clothes
  ceil: [1.0, 0.75, 0.46] as [number, number, number], ceilSat: 1.3,   // (07:35: [1, 0.8, 0.52] = cream but v32 vivid 15 -> 9 %; [1, 0.7, 0.4] read orange wood: v31 C 33 / v 44 %, v32 23 / 18 %, v35 27 / 26 %; this sits between)
  pipes: [0.72, 0.56, 0.34] as [number, number, number],
  /** v5 (22:50): the 22:30 stills measured the cream tile + the pale pink floor as most of NY's beige (v31-v33 30-44 %):
   *  a warm BUTTER tile (still reads as glazed tile) and a deeper red quarry floor */
  tilesLow: [1.0, 0.93, 0.8] as [number, number, number], tiles: [1.0, 0.97, 0.9] as [number, number, number],   // (v5 butter tile tried 00:05: read olive under the warm light: back to cream)
  band: [0.06, 0.22, 0.8] as [number, number, number],
  /** column paint (sRGB-ish linear for the kit's paintedSteel), lighter grime */
  columns: [0.025, 0.28, 0.12] as [number, number, number], columnGrime: 0.3,
  /** the conductor's uniform (navy) and the sign card (warm cardboard is fine: it is the hero) */
  uniform: "#1f2f6b",
};
/** the station's light (STATION's nyStation / nyTrain arguments + the conductor's face light) */
export const NY_LIGHT = { lumens: 3600, kelvin: 3600, trainSelfLit: 0.55, condKelvin: 3800, condLumens: 260,   // v6: window glow 0.95 -> 0.55 (STATION: too white)
  /** v6: a warm face fill on the two New Yorkers (their faces read flat grey: the window spill lights their backs) */
  pairFill: { pos: [-0.75, 1.8, 1.75] as V3, kelvin: 3400, lumens: 380 } };
/** the station rig over undergroundWarm (Built.hints.rigOpts): a bright warm room fill (proc:warmRoom, not warmDark),
 *  thin fog, more bounce */
export const NY_RIG: Partial<RigSpec> = { env: "proc:warmRoom", skyLevel: 0.2, gi: 2.2, fog: 0.003, exposure: 3.4, sat: 1.5, shadowSat: 1.35, contrast: 0.3, warmth: 0.1, vig: 0.16, bloom: 0.5, bloomThreshold: 1.8 };   // v10: cards out of the bloom

// ================================================================ LOOK PASSES (v5): one door for LOOK into every set and shot
/** v5 (look director #3). Several sets never import this file (TRAIN's cab / car / steam, STATION's JP platform), so
 *  their colour fixes could only travel as notes. Two hooks fix that, wired ONCE by the DIRECTOR in v4/film.ts:
 *    import { withLook, SHOT_RIG } from "./look";
 *    sets: { cab: withLook("cab", build_cab), car: withLook("car", build_car), ... }       (every set)
 *    SHOTS: rigOpts: { ...(r.rigOpts ?? {}), ...(SHOT_RIG[p.id] ?? {}) }                 (a shot's rig trims)
 *  `SET_LOOK[set]` runs once after the owner's build (recolours by material name / colour; never moves anything);
 *  `SHOT_RIG[shot]` = LOOK's grade / exposure trims for one shot (a shot's rigOpts win over the set's). Both are
 *  empty-safe: a set or shot without an entry is untouched. Proved first through lookdev/v4 (the same two hooks). */
export const SHOT_RIG: Record<string, Partial<RigSpec>> = {};
export const SET_LOOK: Record<string, (root: THREE.Object3D, ctx: KitCtx) => void> = {};
export const withLook = (setId: string, build: (ctx: KitCtx) => Promise<Built>) => async (ctx: KitCtx): Promise<Built> => {
  const b = await build(ctx);
  try { SET_LOOK[setId]?.(b.object, ctx); } catch (e) { console.warn(`[look] SET_LOOK ${setId} failed`, e); }
  return b;
};
/** THE DRAWN SKY (v5). Measured on the 22:30 cold stills: in the steam shots v22-v28 and the platform v19 the beige is
 *  the SKY (je_gray_park's pale grey-blue + its big grey clouds: 20-35 % of the frame), not the cab or the coal. Ricks
 *  Clips' skies are a clean deep blue (C* 47-51, #2691e7). This dome draws that sky behind everything: a vertical
 *  gradient (zenith deep blue -> horizon pale blue), drawn FIRST with no depth (all geometry, the cartoon clouds and the
 *  smoke draw over it), no fog, following the camera. The IBL (the light on everything) is untouched: only the
 *  picture of the sky changes. Values are LINEAR radiance before exposure / AgX (tuned on stills). */
export const SKY = {
  zenith: [0.012, 0.1, 0.62] as [number, number, number], horizon: [0.2, 0.46, 0.95] as [number, number, number],
  /** a warm glow low on the horizon toward the sun side (golden afternoon), 0 = none */
  glow: [1.0, 0.82, 0.55] as [number, number, number], glowK: 0.25,
  /** the gradient's curve (dir.y^pow) and the overall level (x exposure of the shot's rig) */
  pow: 0.55, level: 1.0,
};
export const skyDome = (o: Partial<typeof SKY> = {}) => {
  const S = { ...SKY, ...o };
  const v3 = (c: [number, number, number], k = 1) => new THREE.Vector3(c[0] * k, c[1] * k, c[2] * k);
  const mat = new THREE.ShaderMaterial({ name: "look:sky", side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uZ: { value: v3(S.zenith, S.level) }, uH: { value: v3(S.horizon, S.level) }, uG: { value: v3(S.glow, S.level * S.glowK) }, uP: { value: S.pow }, uK: { value: 1 } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uZ; uniform vec3 uH; uniform vec3 uG; uniform float uP; varying vec3 vD; uniform float uK; void main(){ float y = clamp(vD.y, 0.0, 1.0); vec3 c = mix(uH, uZ, pow(y, uP)); c += uG * pow(1.0 - y, 6.0) * (0.6 + 0.4 * max(0.0, -vD.z)); gl_FragColor = vec4(c * uK, 1.0); }" });
  const m = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), mat);
  m.name = "look:skyDome"; m.renderOrder = -1000; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
  // the GI bounce bake (kit/core gi.ts: a CubeCamera, sky + IBL switched off = first bounce only) must not see the drawn
  // sky: on a cube face (fov 90, square) the dome draws black (23:45 stills: a washed blue bounce over the whole platform)
  m.onBeforeRender = (_r, _s, cam) => { m.position.setFromMatrixPosition(cam.matrixWorld); m.updateMatrixWorld();
    const pc = cam as THREE.PerspectiveCamera; mat.uniforms.uK.value = pc.isPerspectiveCamera && Math.abs(Math.abs(pc.fov) - 90) < 0.01 && Math.abs(pc.aspect - 1) < 0.01 ? 0 : 1; mat.uniformsNeedUpdate = true; };
  return m;
};
/** every material under root (arrays flattened), once each */
export const eachMat = (root: THREE.Object3D, f: (m: THREE.Material, o: THREE.Mesh) => void) => {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => { const me = o as THREE.Mesh; if (!me.isMesh || !me.material) return; for (const m of Array.isArray(me.material) ? me.material : [me.material]) if (!seen.has(m)) { seen.add(m); f(m, me); } });
};

type SurfU = { sSat?: { value: number }; sCol?: { value: THREE.Vector4 }; sDirt?: { value: THREE.Vector4 }; sDirt2?: { value: THREE.Vector4 } };
type SurfLike = THREE.Material & { userData?: { surf?: { U?: SurfU }; U?: { psCol?: { value: THREE.Color }; psMisc?: { value: THREE.Vector4 } } } };
const surfU = (m: unknown) => (m as SurfLike | undefined)?.userData?.surf?.U;
const tintSurf = (m: unknown, c: [number, number, number]) => { const v = surfU(m)?.sCol?.value; if (v) v.set(c[0], c[1], c[2], v.w); };
/** less grime: bottom dirt and streaks down, grime x k */
const cleanSurf = (m: unknown, k = 0.35) => { const U = surfU(m); if (U?.sDirt) U.sDirt.value.y *= k; if (U?.sDirt2) { U.sDirt2.value.y *= k; U.sDirt2.value.z *= k; } };
const near3 = (v: THREE.Vector4, a: number[]) => Math.abs(v.x - a[0]) < 0.005 && Math.abs(v.y - a[1]) < 0.005 && Math.abs(v.z - a[2]) < 0.005;
/** recolour + clean the NY station (see NY_LOOK). `mats` = nyStation's mats; `root` = its object (finds the lower walls by
 *  their kit tint, which are not in mats). Safe on missing keys; call once after the build. */
export const nyLook = (mats: Record<string, unknown>, root?: THREE.Object3D) => {
  tintSurf(mats.floor, NY_LOOK.floor); { const U = surfU(mats.floor); if (U?.sSat) U.sSat.value = NY_LOOK.floorSat; }
  root?.traverse((o) => { if (o.name !== "conduits") return; o.traverse((c) => { const U = ((c as THREE.Mesh).material as SurfLike | undefined)?.userData?.U; if (U?.psCol) U.psCol.value.setRGB(...NY_LOOK.pipes); }); });
  tintSurf(mats.ceil, NY_LOOK.ceil); cleanSurf(mats.ceil, 0.3); { const U = surfU(mats.ceil); if (U?.sSat) U.sSat.value = NY_LOOK.ceilSat; }
  for (const k of ["tiles", "tilesFar"]) { tintSurf(mats[k], NY_LOOK.tiles); cleanSurf(mats[k]); }
  tintSurf(mats.band, NY_LOOK.band);
  for (const k of ["green", "greenB"]) { const U = (mats[k] as SurfLike | undefined)?.userData?.U; if (U?.psCol) U.psCol.value.setRGB(...NY_LOOK.columns); if (U?.psMisc) U.psMisc.value.z = NY_LOOK.columnGrime; }
  root?.traverse((o) => { const m = (o as THREE.Mesh).material; const v = surfU(m)?.sCol?.value;
    if (v && near3(v, [0.06, 0.5, 0.46])) { tintSurf(m, NY_LOOK.tilesLow); cleanSurf(m); } });
};
/** THE TRAIN'S ONE STRONG COLOUR (STATION decides): the NY cars' brushed steel body tinted a deep cherry red (the
 *  "Redbird" cars ran on NYC lines until 2003), so the train is a colour block, not a grey wall filling a third of every
 *  frame (18:05 stills: the steel side was most of the remaining beige). STATION: `nyTrainLook(train.object)` once after
 *  nyTrain(); keep it off for a steel train. */
export const NY_TRAIN = { body: [0.62, 0.07, 0.06] as [number, number, number], flute: [0.55, 0.06, 0.05] as [number, number, number] };
export const nyTrainLook = (root: THREE.Object3D) => {
  root.traverse((o) => { const m = (o as THREE.Mesh).material; const v = surfU(m)?.sCol?.value; if (!v) return;
    if (near3(v, [0.86, 0.86, 0.88])) tintSurf(m, NY_TRAIN.body); else if (near3(v, [0.84, 0.84, 0.86])) tintSurf(m, NY_TRAIN.flute); });
};

// ================================================================ v5 SET PASSES + SHOT TRIMS (wired through withLook / SHOT_RIG)
/** the day exteriors (TRAIN's steam world, the JP platform, today's lineside seen through the cab / car windows): the
 *  drawn deep-blue sky; less fog so the far hills stay green (STEAM_RIG fog 0.0009 turned 1-2 km hills ~85 % grey) */
const daySky = (root: THREE.Object3D) => { root.add(skyDome()); };
/** the steam plume (kit steam_fx "steam-fx" shader): lit side a clean bright white (it read grey-cream = beige over a
 *  quarter of v22 / v26), the shade side a cartoon blue-lavender instead of grey */
export const STEAM_SMOKE = { lit: [1.3, 1.28, 1.24] as [number, number, number], shade: "#7d93c6" };
/** v6 (lead: the fire must be the warm centre of the cab shots): TRAIN's fire light (0xff7a1e; TRAIN sets its intensity
 *  every frame) reaches further and falls off softer, and the warm floor pool in front of the firehole is brighter */
export const STEAM_CLOUDS = { opacity: 0.45 };   // v9: 0.55 -> 0.45 (v30 sky)
/** v9 (TRAIN + lead: the engine read NAVY): a true warm black: less clear coat / metal (they mirrored the blue sky), the
 *  sky reflection cut, a warm black base; brass + red details untouched */
export const STEAM_BLACK = { black: "#0e0b09", smoke: "#14110f", env: 0.4, clearcoat: 0.25, metal: 0.08 };
export const STEAM_FIRE = { distance: 5.5, decay: 1.1, pool: 1.45 };   // v10: TRAIN's own falloff again (the fire = a warm rim, not a flood: audit r2 #5)
/** v10 (audit r2 #5: faces + deck one orange): TRAIN's warm cab fill (0xffc89a) becomes a cool sky fill */
export const STEAM_CABFILL = "#fff0dc";   // (09:00: the sky-blue fill + warmth 0 bleached the cab to C 14-16: a near-neutral warm white)
SET_LOOK.steam = (root) => { daySky(root); eachMat(root, (m, me) => {
  if (m.name === "steam-fx") { const U = (m as THREE.ShaderMaterial).uniforms; U?.uLit?.value?.setRGB?.(...STEAM_SMOKE.lit); U?.uShade?.value?.set?.(STEAM_SMOKE.shade); return; }
  const bm = m as THREE.MeshBasicMaterial, gp = (me.geometry as THREE.PlaneGeometry).parameters as { width?: number; height?: number } | undefined;
  if (bm.blending === THREE.AdditiveBlending && bm.map && gp && Math.abs((gp.width ?? 0) - 1.5) < 0.01 && Math.abs((gp.height ?? 0) - 1.2) < 0.01) bm.color.setScalar(STEAM_FIRE.pool); });
  // v7 (audit r1: v22 sky "overcast white"): the steam world's big cartoon cloud planes (MeshBasic, colour 1.15) thinner
  eachMat(root, (m) => { const bm = m as THREE.MeshBasicMaterial; if (bm.isMeshBasicMaterial && bm.transparent && bm.map && Math.abs(bm.color.r - 1.15) < 0.01 && Math.abs(bm.color.b - 1.18) < 0.01) bm.opacity = STEAM_CLOUDS.opacity; });
  eachMat(root, (m) => { const pm = m as THREE.MeshPhysicalMaterial; if (!pm.isMeshStandardMaterial || !pm.color) return; const h = pm.color.getHexString();
    if (h === "141415") { pm.color.set(STEAM_BLACK.black); pm.envMapIntensity = STEAM_BLACK.env; pm.metalness = STEAM_BLACK.metal; if (pm.isMeshPhysicalMaterial) pm.clearcoat = STEAM_BLACK.clearcoat; }
    else if (h === "1b1b1c") { pm.color.set(STEAM_BLACK.smoke); pm.envMapIntensity = STEAM_BLACK.env; pm.metalness = STEAM_BLACK.metal; } });
  root.traverse((o) => { const l = o as THREE.PointLight; if (l.isPointLight && Math.abs(l.color.getHex() - 0xffc89a) < 0x020202) l.color.set(STEAM_CABFILL); });
  root.traverse((o) => { const l = o as THREE.PointLight; if (l.isPointLight && (() => { const h = l.color.getHex(); return Math.abs((h >> 16) - 0xff) <= 2 && Math.abs(((h >> 8) & 255) - 0x7a) <= 3 && Math.abs((h & 255) - 0x1e) <= 3; })()) { l.distance = STEAM_FIRE.distance; l.decay = STEAM_FIRE.decay; } }); };
// (jp_platform: no dome: its sky top is already a deep blue and its clouds read right; 23:45 trial)

SET_LOOK.car = (root) => { daySky(root); };
// v7 (audit r1: the most saturated film of the comparison): the day sets' saturation about -12 % (STEAM_RIG / VIVID 1.75,
// today.ts 1.8); v27: more haze (the far field from above read as a GREEN SKY)
const STEAM_TRIM: Partial<RigSpec> = { fog: 0.00035, sat: 1.55 };
for (const id of ["v22", "v23", "v23b", "v24", "v25", "v26", "v27", "v28", "v29", "v30"]) SHOT_RIG[id] = { ...STEAM_TRIM };
SHOT_RIG.v27 = { ...STEAM_TRIM, fog: 0.0009 };   // v9: 0.0016 greyed the whole frame (C 12.6 in pass 2): back to STEAM_RIG's own haze
SHOT_RIG.v19 = { sat: 1.55 }; SHOT_RIG.v20 = { sat: 1.6 }; SHOT_RIG.v21 = { sat: 1.6 };
// v10 (audit r2 #8): cards out of the bloom on the day / steam shots too; (#5) the steam CAB shots: no warm trim, more sky fill
for (const id of ["v19", "v20", "v21", "v22", "v23", "v23b", "v24", "v25", "v26", "v27", "v28", "v29", "v30"]) SHOT_RIG[id] = { ...(SHOT_RIG[id] ?? {}), bloomThreshold: 1.8 };
for (const id of ["v23", "v24", "v25", "v28", "v29", "v30"]) SHOT_RIG[id] = { ...SHOT_RIG[id] };   // (09:05: warmth 0 / skyLevel 0.32 and 0.08 / 0.25 both drained the new tan cab: STEAM_RIG's own warmth + sky kept)
/** v10 (audit r2 #3): LAB's second station box beside her (st2*, candy green) read as "a green light is on" in the red: warm wood */
export const LAB_ST2 = "#8a5a3a";
SET_LOOK.lab = (root) => { root.traverse((o) => { if (!o.name.startsWith("st2")) return; const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m?.color) m.color.set(LAB_ST2); }); };

/** today's cab (v20): the cab ceiling a clear sky blue (#86b9e6 read grey-blue), the grey desk a deep teal-navy; and
 *  the shot a step brighter (L* 42 at 22:30) */
SET_LOOK.cab = (root) => { daySky(root); eachMat(root, (m) => { const sm = m as THREE.MeshStandardMaterial; if (!sm.color) return;
  if (sm.name === "cab-ceil") sm.color.set("#4a9cf0"); else if (sm.name === "cab-desk") sm.color.set("#1f5f8a"); }); };
// (v20 is TRAIN's side-on exterior since 23:40: no exposure trim; the cab ceiling / desk recolour is harmless there)
/** NOT USED (00:05 trial: the tinted steel read olive-khaki under the station's warm light; plain steel is better). NY: the brushed-steel cars (most of v32's frame) a cooler, deeper steel: reads as metal in the station's shade, not
 *  a pale grey wall (tint x the kit's [0.86, 0.86, 0.88]) */
export const NY_STEEL = { body: [0.5, 0.56, 0.68] as [number, number, number], flute: [0.46, 0.52, 0.64] as [number, number, number] };
SET_LOOK.ny_station = (root, ctx) => { if (!ctx.practical) return; const F = NY_LIGHT.pairFill;
  const p = ctx.practical({ kind: "point", pos: F.pos, kelvin: F.kelvin, lumens: F.lumens, bulb: false, range: 3.2, seed: 71 }); p.set(1); root.add(p.object); };
export const nySteelTry = (root: THREE.Object3D) => { root.traverse((o) => { const m = (o as THREE.Mesh).material; const v = surfU(m)?.sCol?.value; if (!v) return;
  if (near3(v, [0.86, 0.86, 0.88])) tintSurf(m, NY_STEEL.body); else if (near3(v, [0.84, 0.84, 0.86])) tintSurf(m, NY_STEEL.flute); }); };
