// CONTRACT for "The Oil Tanks That Were Mostly Water" (saladoil). Every module reads its anchors from here, so the world
// (sets_ext.ts / sets_int.ts), the cast (cast.ts), the camera (story.ts) and the sound (timeline.json) agree on where
// things are. Units: metres, y up, ground = 0. Boards face +z (toward the default camera side) unless noted. Each set
// sits far from every other (>= 400 m), and world.ts / the set modules show ONLY the set of the shot being drawn.
// Change an anchor only together with every file that reads it (or ask the LEAD in a lead_request).
export type V3 = [number, number, number];
export const FPS = 30;

// ---------------- light states (lights.ts implements every name) ----------------
export type LightName =
  | "dawn_gold"   // hook + payoff / loop on the tank top: low golden sun over the harbour, long violet shadows, peach sky
  | "noon"        // tank farm wide + the inspection: bright high sun, deep blue sky, cream tanks, blue-violet shade
  | "late"        // the mystery on the tank top (shot 7 relights noon -> late): warm low amber sun, long shadows
  | "storm"       // the rain at the tank farm: flat grey-blue light, wet dark ground, no sun disc
  | "bank_warm"   // warm wood-panelled 1960s bank office: window daylight + a brass desk-lamp pool
  | "trading"     // 1963 commodity trading floor: stormy grey window light, cool shade
  | "cutaway"     // the tank cross-section "diagram" world: cool blue-water light, flat backdrop
  | "kitchen"     // the pivot ("You see,"): a NEW warm colour world, a sunny cartoon kitchen
  | "pump_night"  // the pump room on a Saturday night: deep blue shade + warm work-lamp pools
  | "street_grey" // the fallout street: overcast grey city
  | "office_sun"  // the young investor's small office: warm sunny window light
  | "office_glow";// office_sun warmed and brightened on "Warren Buffett" (shot 15 relight)

// ---------------- sets ----------------
export type SetName = "tanktop" | "tankfarm" | "bank" | "trading" | "cutaway" | "kitchen" | "pumproom" | "street" | "office";
type Tank = { c: V3; r: number; h: number };

/** TANK TOP (hook, inspection, mystery, payoff + loop). The hero tank is centred on base: radius 7, a FLAT roof at
 *  y = 11 with a handrail ring at the rim. A round hatch (0.42 m, a 0.25 m collar) sits 1.6 m in from the rim on the
 *  +z (camera) side; the oil surface is 0.38 m under the roof, seen only through the hatch. The harbour and a hazy
 *  city skyline lie far to -z (the dawn sun rises over them); rows of other storage tanks stand all round.
 *  FACT FIX 2026-11-14 (TIME, 4 June 1965): the man on the roof is always one of TINO'S OWN MEN (the tank man: denim
 *  overalls, cap, the weighted tape reel on his belt). He climbs, drops the tape and SHOUTS DOWN "Ninety percent
 *  full!" to the American Express inspector, who stays ON THE GROUND (never climbs, never shouts) and believes him. */
export const TK = {
  base: [0, 0, 0] as V3,
  tank: { r: 7.0, h: 11.0 },
  hatch: { c: [0, 11.0, 5.4] as V3, r: 0.42, rim: 11.25, oil: 10.62 },
  /** the weighted measuring tape: leaves the tank man's reel here and enters the oil there (frame 0 shows it going in;
   *  shots 1 and 16 only: the loop pose) */
  tapeTop: [-0.36, 11.62, 5.42] as V3, tapeIn: [-0.12, 10.62, 5.4] as V3,
  kneel: [-0.68, 11.0, 5.45] as V3,      // Tino's tank man kneels here at the hatch (facing +x): shots 1 and 16 (loop pose)
  /** flip counter on the hatch platform's handrail (shots 1 / 16 only): "LOANS:" / "$150,000,000"; yaw = turn toward +x (rad) */
  counter: { c: [0.45, 12.3, 3.35] as V3,   /* fix1 LEAD (CAM): clear of P0 and shot 16 */ w: 1.3, h: 0.44, yaw: 0.42 },
  ladderTop: [1.75, 11.0, 6.78] as V3,   // the spiral stair arrives at the rim here (shot 4: he climbs up into frame)
  /** shot 4: the tank man's card on the top flight of the ladder (x, z; just outside the wall, on the camera side): his
   *  feet rise from y 8.2 at the shot start to the rim (y 11) on BEAT.up ("climb up,") */
  ladderOut: [1.88, 0, 7.31] as V3,
  /** shot 4 (A1): he kneels on the hatch's FAR side (0.7 m beyond its centre, away from the S4A camera, facing it) on "drop": the tape runs from his hand (tape4Top) down into the
   *  oil (tape4In), paying out from BEAT.drop to the end of "inside," */
  tapeKneel: [-0.36, 11.0, 4.8] as V3, tape4Top: [-0.16, 11.52, 5.12] as V3, tape4In: [-0.06, 10.62, 5.3] as V3,  // A1: far side of the hatch, facing the camera (no rail post across him)
  shout: [0.45, 11.0, 6.5] as V3,        // shot 4: he steps to the rail here (left of the ladder top), leans over it and shouts DOWN "Ninety percent full!"
  /** shot 4: the American Express INSPECTOR on the GROUND at the foot of the tank (3 m out from the wall): khaki jacket,
   *  flat cap, clipboard "90% FULL"; looks at the clipboard the whole time, ticks it on BEAT.believed WITHOUT LOOKING UP */
  inspGround: [0.3, 0, 10.05] as V3,
  tinoBelow: [1.55, 0, 10.5] as V3,      // shot 4: Tino on the ground next to the inspector: happy thumbs-up on BEAT.believed
  /** shot 7 (mystery): a LENDER in a suit and fedora kneels at the hatch's -x side (facing +x) and leans over it; his face
   *  is reflected in the golden oil at `reflect` (a cartoon cheat: centred in the hatch so the push lands on it) */
  peer: [-0.6, 11.0, 5.42] as V3, reflect: [-0.06, 10.626, 5.42] as V3,
  rail: { r: 6.85, h: 1.05 },
  /** other storage tanks (cream-white, rust streaks, spiral ladders) */
  tanks: [
    { c: [-17, 0, -3], r: 7, h: 12 }, { c: [-2, 0, -20], r: 6.5, h: 10 }, { c: [15, 0, -14], r: 7.5, h: 13 },
    { c: [-19, 0, -22], r: 6, h: 10 }, { c: [14, 0, 7], r: 6, h: 10 }, { c: [-15, 0, 14], r: 6.5, h: 11 },
    { c: [4, 0, -37], r: 7, h: 12 }, { c: [23, 0, -33], r: 6.5, h: 11 }, { c: [-31, 0, -38], r: 7, h: 12 },
    { c: [-36, 0, -12], r: 6, h: 10 }, { c: [33, 0, -8], r: 6.5, h: 11 },
  ] as Tank[],
  harbourZ: -60,                          // harbour water from here outward (-z); the skyline stands at z ~ -700
};

/** TANK FARM (setting, storm). A 1960s industrial waterfront: dozens of tall round tanks, catwalks, pipes, a chain-link
 *  fence along z = 16 with an open gate (x -2.6..2.6) under the gate sign "ALLIED" / "VEGETABLE OIL" (faces +z, the
 *  street side). Tino stands proudly in front of the hero tank (arms wide); a valve on its wall drips (the planted clue). */
export const TF = {
  base: [400, 0, 0] as V3,
  hero: { c: [0, 0, -4] as V3, r: 7, h: 12 },                 // front wall at z = 3
  gate: { z: 16, half: 2.6, sign: { cy: 3.5, w: 3.4, h: 1.1 } },
  tino: [-0.2, 0, 12.8] as V3,                                 // A1: just inside the open gate, under the sign (big on "Meet Tino")
  valve: [-1.75, 1.2, 12.1] as V3,                              // A1: on a pipe riser at Tino's left (screen left), a pipe run back to the hero tank; the drip falls from its spout to the ground
  ladder: [3.4, 0, 2.12] as V3,                                 // spiral ladder foot on the hero tank (storm: the lenders climb)
  lenders: [[2.4, 0, 4.4], [4.3, 0, 4.0], [3.45, 2.3, 2.45]] as V3[],  // far layer: [2] = the climber on the spiral stair
  /** A1 shot 9: a file of 4 lenders (suits, fedoras, umbrellas) walks in through the gate from z 14.5 to lenderFileTo (z 8.5),
   *  starts staggered 6 f, between ~BEAT.lenders - 6 and the end of the shot; all inside x -1.6..1.5 (never behind the fence mesh) */
  lenderFile: [[-1.4, 0, 14.5], [-0.5, 0, 14.5], [0.4, 0, 14.5], [1.3, 0, 14.5]] as V3[], lenderFileTo: 8.5,
  notice: [1.33, 3.2, 16.07] as V3,   /* fix1 LEAD (WORLD-EXT anchor) */                            // shot 9: "BANKRUPT" notice slapped onto the gate sign (BEAT.bust)
  tanks: [
    { c: [-15, 0, -5], r: 6.5, h: 11 }, { c: [15, 0, -5], r: 6.5, h: 11 }, { c: [-8, 0, -21], r: 6, h: 10 },
    { c: [9, 0, -22], r: 7, h: 12 }, { c: [-23, 0, -24], r: 6.5, h: 11 }, { c: [24, 0, -23], r: 6, h: 10 },
    { c: [0, 0, -37], r: 7, h: 13 }, { c: [-30, 0, 2], r: 6, h: 10 }, { c: [30, 0, 3], r: 6, h: 10 },
  ] as Tank[],
};

/** BANK (shots 3, 5, 6). Warm wood-panelled 1960s bank office, 8 x 7 x 3.4 m (x -4..4, z -3.5..3.5). The banker stands
 *  behind the desk facing +z; a back-wall window shows a storage tank on the horizon; an easel chart stands left. */
export const BK = {
  base: [0, 0, 400] as V3,
  room: { w: 8, d: 7, h: 3.4 },
  desk: { c: [0, 0, -0.8] as V3, w: 2.0, d: 0.9, top: 0.78 },
  banker: [0, 0, -1.55] as V3,
  receipt: [-0.2, 0.785, -0.7] as V3,      // "OIL RECEIPT"; the red "APPROVED" stamp mark lands on it on BEAT.money
  stamp: [0.45, 0.785, -0.85] as V3,       // rubber stamp + ink pad
  cash: [0.35, 0.785, -0.7] as V3, cashTo: [0.1, 0.785, -0.45] as V3, /* fix2 LEAD (CHAR): toward the unseen borrower, in frame */ /* fix1 LEAD (CHAR) */ // shot 3: the cash stack slides across (BEAT.againstIt)
  stacks: [[-0.32, 0.785, -0.5], [0.0, 0.785, -0.46], [0.32, 0.785, -0.52]] as V3[], // shot 5: grow on BEAT.more1 / more2
  window: { c: [1.9, 1.8, -3.48] as V3, w: 1.4, h: 1.5 },
  /** easel chart (shot 6), yaw = turn toward +x (rad): "ALL US OIL" (small drum pile, US map) | "TINO'S OIL" (bigger pile) */
  chart: { c: [-2.3, 1.6, -1.9] as V3, w: 1.6, h: 1.05, yaw: 0.4 },
  tinoChart: [-1.05, 0, -1.95] as V3,      // A1 shot 6: Tino stands at the chart's right edge, proud, gestures at TINO'S OIL as it grows
};

/** TRADING FLOOR (shot 8). 1963 commodity exchange, 14 x 12 x 6 m (x -7..7, z -6..6); a big chalk board on the north
 *  wall, tall east windows with stormy grey light, traders at phone desks. */
export const TR = {
  base: [0, 0, -400] as V3,
  room: { w: 14, d: 12, h: 6 },
  board: { c: [0, 3.7, -5.95] as V3, w: 5.2, h: 3.0 },          // A1: raised 0.4 m. "SOYBEAN OIL" + a chalk line chart that dives on BEAT.crashed1
  traders: [[-1.4, 0, -1.6], [-0.4, 0, -0.5], [0.7, 0, -1.3], [1.6, 0, -0.3], [-1.7, 0, 1.4], [1.7, 0, 1.3]] as V3[],  // A1: front pair spread to x +-1.7
  windows: { x: 6.98, zs: [-3.5, 0, 3.5], cy: 3.2, w: 2.0, h: 3.2 },
  tino: [-0.55, 0, 0.95] as V3,   // fix1 LEAD (CHAR): Tino on the floor, front left third (shot 8 crash grimace)
};

/** CUTAWAY (shots 10, 12). A diagram world: one storage tank cut open on the z = 0 plane (we look in from +z): a huge
 *  blue water body with a thin golden oil layer on top, a small fish, a roof hatch; a flat cool backdrop. */
export const CU = {
  base: [-400, 0, 0] as V3,
  tank: { r: 3.2, h: 8.5 },
  water: 8.05,                              // water surface (full tank)
  oil: 8.3,                                 // oil surface: a thin 0.25 m golden layer
  hatch: { c: [0, 8.5, -1.5] as V3, r: 0.45 },
  fish: { y: 4.7, z: 0.12,  /* fix1 LEAD (CHAR/CAM) */ x0: -2.5, x1: 2.5 },  // build r1: in front of the opaque cut face
  pour: [-2.2, 9.8, -1.2] as V3,            // shot 12: the pipe mouth that pours water, then a thin stream of oil
  sign: { c: [0, 9.24, -2.45] as V3, w: 0.8, h: 0.3 }, /* fix2: = sets_int SIGN12 (rx -0.55) */ // shot 12: "LOOKS FULL" board on the roof just behind the hatch
};

/** KITCHEN (shot 11, the pivot). A warm cartoon kitchen, 6 x 5 x 2.8 m; a table with a glass salad-dressing bottle. */
export const KI = {
  base: [0, 0, 800] as V3,
  room: { w: 6, d: 5, h: 2.8 },
  table: { c: [0, 0, 0] as V3, w: 1.4, d: 0.9, top: 0.76 },
  bottle: { c: [0.05, 0.76, 0.1] as V3, h: 0.32, r: 0.058 }, // oil (gold) over vinegar (ruby): settles, the oil rises to the top
  window: { c: [0.3, 1.6, -2.48] as V3, w: 1.4, h: 1.0 },
};

/** PUMP ROOM (shot 13). A Saturday-night pipe gallery, 13 x 9 x 5 m (x -6.5..6.5, z -4.5..4.5). Three storage-tank walls
 *  bulge through the back wall (fronts at z -4.2), each with a "COUNTED" plate; one main pipe runs tank to tank. */
export const PR = {
  base: [800, 0, 0] as V3,
  room: { w: 13, d: 9, h: 5 },
  tanks: [[-3.0, 0, -5.55], [0, 0, -5.55], [3.0, 0, -5.55]] as V3[], tankR: 1.35,
  counters: [[-3.0, 2.6, -4.17], [0, 2.6, -4.17], [3.0, 2.6, -4.17]] as V3[], counter: { w: 1.0, h: 0.62 },
  pipe: { y: 1.2, z: -3.6 },
  valves: [[-2.3, 0.62, -3.3], [1.5, 0.62, -3.3]] as V3[],   // A2 LEAD: wheels below the blob's path (top rim ~1.26 m < blob feet 1.42), on a short stem off the lower pipe run
  workers: [[-2.65, 0, -2.7], [1.15, 0, -2.95]] as V3[],     // A2 LEAD: 0.35 m outside each wheel (3/4 back view pulls)
  calendar: { c: [-5.2, 2.0, -4.47] as V3, w: 0.6, h: 0.8 }, // "SATURDAY"
  lamps: [[-2.0, 3.8, -2.6], [1.6, 3.8, -2.5]] as V3[],      // warm work lamps (bulbs)
  blobY: 1.42,                                             // the oil blob rides on top of the pipe, tank A -> B -> C
  blobCU: [2.25, 1.42, -3.55] as V3,                       // where it stops (by tank C) for "the hardest-working oil"
};

/** STREET (shot 14). A grey 1960s city street: a newsstand with a headline board, a stock board on the facade, a firm's
 *  door under it that gets a CLOSED sign. No company logos anywhere. */
export const ST = {
  base: [0, 0, -800] as V3,
  stand: [-0.3, 0, -2.6] as V3,
  poster: { c: [-0.3, 1.95, -2.18] as V3, w: 0.9, h: 1.1 },   // "OIL TANKS" / "FULL OF" / "WATER" (the paper spins in onto it)
  board: { c: [0.5, 3.7, -5.98] as V3, w: 3.0, h: 1.4 },      // "SHARES" + red down arrows (drop on BEAT.crashed2)
  door: { c: [1.3, 0, -5.98] as V3, w: 1.0, h: 2.2, sign: [1.3, 1.75, -5.94] as V3 }, // CLOSED sign on the door
  people: [[1.55, 0, -2.45], [2.4, 0, -3.3],  /* fix1: [0] = CHAR READER */ [-2.4, 0, -4.1]] as V3[],
};

/** OFFICE (shot 15). The young investor's small warm office, 5.5 x 5 x 3 m (x -2.75..2.75, z -2.5..2.5). He sits at the
 *  desk facing +z; the back-wall window behind him looks across the street at a cafe where people pay with cards. */
export const OF = {
  base: [-800, 0, 0] as V3,
  room: { w: 5.5, d: 5, h: 3 },
  desk: { c: [0, 0, -0.95] as V3, w: 1.5, d: 0.8, top: 0.76 },
  investor: [0, 0, -1.6] as V3,
  paper: [-0.15, 0.77, -0.7] as V3, slip: [0.53, 0.77, -0.72] as V3, /* A2 LEAD: clear of the centred caption box */ // the newspaper; the "BUY" slip (written on BEAT.bought)
  window: { c: [0, 1.8, -2.48] as V3, w: 2.2, h: 1.3 },
  cafe: [0, 0, -14] as V3,                                           // the cafe front across the street (seen through the window)
};

/** measured cartoon adult (antitheft toon.ts, 2026-11-10): hat top ~1.66 m, eyes ~1.29 m, chin ~1.08 m */
export const EYE = 1.29;

export const SETS: Record<SetName, V3> = {
  tanktop: TK.base, tankfarm: TF.base, bank: BK.base, trading: TR.base, cutaway: CU.base, kitchen: KI.base, pumproom: PR.base,
  street: ST.base, office: OF.base,
};
/** exterior sets (sky, sun, clouds, rain are theirs); every other set is an interior */
export const EXTERIOR: Record<SetName, boolean> = {
  tanktop: true, tankfarm: true, street: true, bank: false, trading: false, cutaway: false, kitchen: false, pumproom: false, office: false,
};
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// place helpers (set-local -> world), also usable in `node scripts/project.mjs` expressions
export const tk = (d: V3) => add(TK.base, d), tf = (d: V3) => add(TF.base, d), bk = (d: V3) => add(BK.base, d), tr = (d: V3) => add(TR.base, d);
export const cu = (d: V3) => add(CU.base, d), ki = (d: V3) => add(KI.base, d), pr = (d: V3) => add(PR.base, d), st = (d: V3) => add(ST.base, d);
export const of = (d: V3) => add(OF.base, d);
