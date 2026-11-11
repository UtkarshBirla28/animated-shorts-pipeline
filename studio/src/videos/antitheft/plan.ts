// CONTRACT for "The Anti-Theft Sign That Made People Steal" (antitheft). Every module reads its anchors from here,
// so the world (sets_ext.ts / sets_int.ts), the cast (cast.ts), the camera (story.ts) and the sound (events.json)
// agree on where things are. Units: metres, y up, ground = 0 near the trails. Signs face +z (toward the default
// camera side) unless noted. Change an anchor only together with every file that reads it.
export type V3 = [number, number, number];
export const FPS = 30;

// ---------------- light states (lights.ts implements every name) ----------------
export type LightName =
  | "noon"       // hook / setting / sign / whisper: bright desert noon, high sun, deep blue sky, puffy clouds
  | "dim"        // noon dimmed ~20 % on "vandalized" (sky and key both down; same direction)
  | "late"       // late afternoon (mystery relight): warmer, sun ~25 deg, longer shadows
  | "morning"    // the test: early morning, low golden sun ~9 deg, cool long shadows, pale peach-blue sky
  | "sunset"     // permission: golden sunset BACKLIT (sun ahead of the lens), violet-blue shade, sun disc
  | "dusk"       // twist exterior: blue hour, warm horizon band, cool body light
  | "night_int"  // storeroom: deep night blue ambient + one warm desk-lamp key
  | "classroom"  // warm interior daylight through windows
  | "blueprint"; // explainer: flat cool blue diagram space (mostly unlit materials)

// ---------------- sets ----------------
export type SetName = "trailhead" | "vista" | "trails" | "classroom" | "storeroom" | "blueprint";

/** MAIN TRAILHEAD (hook, sign, whisper, mystery, twist ending). The big brown warning sign on two posts, facing +z.
 *  The paved trail starts at the sign and runs toward -z into the badlands, low metal rail on its west (-x) side. */
export const TH = {
  base: [0, 0, 0] as V3,
  board: { cx: 0, cy: 3.17, z: 0.06, w: 2.1, h: 1.62 },      // routed-wood board, face plane at z = +0.06 (2.1 m wide so frame 0 shows both posts)
  posts: [-0.98, 0.98] as [number, number],                   // post x; posts 0.18 m square, 0 .. 3.85 m tall
  postTop: 4.3, // board raised 0.45 m (2026-11-10) so at frame 0 her face sits above the caption band and her hat clears the board
  ravenPerch: [0.78, 4.02, 0.04] as V3,                       // raven stands on the board's top-right edge (fully in frame at P0)
  flip: { x: -0.76, y: 1.32, z: 0.14, w: 0.62, h: 0.34 },    // "14 TONS / YEAR" flip counter on the left post front
  woman: [-0.05, 0, 1.8] as V3,                              // frame-0 reading spot, centred in front of the board
  fiance: [0.62, 0, 2.0] as V3,                              // beside her (whisper two-shot)
  glintRock: [0.75, 0, 1.15] as V3,                          // sparkly rainbow rock at the right post foot, behind her right shoulder (in frame at P0)
  trailDir: [0, 0, -1] as V3,
  /** dusk twist: the tourist pocketing the tagged chip stands here, right of the sign base */
  tourist: [-0.05, 0, 1.85] as V3,
};

/** VISTA (setting): painted badlands, sliced petrified logs along the trail, tourists on the paved path. */
export const VISTA = {
  trail: [[0, 0, -2], [-3, 0, -18], [-9, 0, -34], [-12, 0, -52], [-8, 0, -72], [2, 0, -90]] as V3[], // trail centre line
  trailW: 2.2,
  logs: [ // big sliced logs (centre of the log, yaw, length, radius); slices ~0.6-1.4 m long with gaps
    { c: [-6.5, 0, -27] as V3, yaw: 0.35, len: 9, r: 0.55 },
    { c: [-15.5, 0, -40] as V3, yaw: -0.6, len: 12, r: 0.7 },
    { c: [-3.5, 0, -46] as V3, yaw: 1.2, len: 7, r: 0.45 },
    { c: [-18, 0, -63] as V3, yaw: 0.1, len: 14, r: 0.8 },
    { c: [-1, 0, -64] as V3, yaw: -1.0, len: 8, r: 0.5 },
    { c: [6, 0, -38] as V3, yaw: 0.8, len: 6, r: 0.4 },
  ],
  plaque: [-3.9, 0, -26.88] as V3,      // interpretive plaque "TREES OVER 200 MILLION YEARS OLD" (sets_ext places it from the shot-3 camera; this is where it lands)
  pocketTourist: [-4.0, 0, -26.0] as V3, // the tourist who slips a chip into his pocket ("pocketing")
  walkers: [[-8.5, 0, -33], [-10.5, 0, -44], [-11.5, 0, -50], [-3.7, 0, -20]] as V3[], // on the paved centre line (WORLD-EXT A3)
};

/** THE TWO / THREE TRAILS (the test, the two signs, the results, permission). Three trail heads in a row facing +z:
 *  JASPER (x -3.2), LONG LOGS (x 0), CRYSTAL (x +3.2) relative to TT. Sign A stands at the JASPER head, Sign B at the
 *  LONG LOGS head (side by side, 3.2 m apart). */
export const TT = {
  base: [60, 0, 30] as V3,
  heads: { jasper: -3.2, longlogs: 0, crystal: 3.2 },          // x offsets of the three trail heads
  marker: { dx: -1.15, h: 1.15 },                              // wooden name post left of each head
  signA: { dx: -3.2, cy: 1.55, w: 0.92, h: 0.92, z: 0.05 },   // 3-foot square panel on two thin posts
  signB: { dx: 0.0, cy: 1.55, w: 0.92, h: 0.92, z: 0.05 },
  led: { dy: 0.78, w: 0.8, h: 0.26 },                          // LED "PIECES MISSING" counter above each panel (cy + dy)
  chipsTrail: "longlogs" as const,                             // the marked chips for the test shot lie on this path
  /** chips along a path: 20 per path, every ~1.3 m from z = -1.5 to -26 (relative to TT), alternating sides */
  chipZ: Array.from({ length: 20 }, (_, i) => -1.5 - i * 1.3),
  stamp: { dx: 0.0, y: 1.55 },                                 // giant rubber stamp lands on Sign B's face
};

/** CLASSROOM (analogy). Room 9 x 7 x 3.2 m, chalkboard on the north wall facing +z. */
export const CL = {
  base: [0, 0, 2000] as V3,
  room: { w: 9, d: 7, h: 3.2 },                                // centred on base in x, z from -3.5 to +3.5
  board: { cx: 0, cy: 1.7, z: -3.45, w: 4.2, h: 1.3 },         // green chalkboard
  teacher: [-1.4, 0, -2.6] as V3,
  student: [0.2, 0, -0.6] as V3,                               // honest student, front row centre
  desks: [[-2.4, -0.6], [0.2, -0.6], [2.8, -0.6], [-2.4, 1.2], [0.2, 1.2], [2.8, 1.2]] as [number, number][],
};

/** STOREROOM (twist). Night, one warm desk lamp. Room 7 x 5.5 x 3 m. */
export const SR = {
  base: [2000, 0, 0] as V3,
  room: { w: 7, d: 5.5, h: 3.0 },
  crate: [0.2, 0, -1.2] as V3,                                 // "CONSCIENCE PILE" crate, heap of rainbow rocks on top
  desk: [-2.0, 0, -1.6] as V3, lamp: [-2.3, 0.78, -1.8] as V3, // lamp on the desk (bulb ~0.4 m above the top)
  assistant: [1.3, 0, -0.6] as V3,
  bucket: [1.05, 0, -0.6] as V3,                              // "BAIT" bucket
};

/** BLUEPRINT (explainer). Flat cool-blue diagram space; a path that forks into two arrows. */
export const BP = {
  base: [-2000, 0, 0] as V3,
  person: [0, 0, 2.0] as V3,                                   // the bean-head person at the fork
  fork: [0, 0, 0] as V3,
  ruleArrow: { dir: -0.38, len: 7 },                           // "THE RULE" branch heading (rad, 0 = -z): sets_int draws it through ruleFigure
  crowdArrow: { dir: 0.30, len: 7 },                           // "EVERYONE ELSE" branch, drawn through crowd
  ruleFigure: [-2.2, 0, -4.5] as V3,                           // one tiny figure on the rule branch
  crowd: [2.6, 0, -5.5] as V3,                                 // centre of the huge crowd
  signFloat: [0.9, 2.6, -1.9] as V3, // CAM A3: THE RULE label fully clear left of the panel in the shot 11 sign framing                             // where the floating "MANY PAST VISITORS" sign settles
};

/** measured cartoon adult (frame 0, 2026-11-10): hat top ~1.66 m, eyes ~1.29 m, chin ~1.08 m */
export const EYE = 1.29;

export const SETS: Record<SetName, V3> = {
  trailhead: TH.base, vista: [0, 0, -40], trails: TT.base, classroom: CL.base, storeroom: SR.base, blueprint: BP.base,
};
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
