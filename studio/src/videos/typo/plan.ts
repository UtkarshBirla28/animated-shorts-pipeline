// CONTRACT for "The Typo That Sold More Shares Than Existed" (typo). Every module reads its anchors from here, so the
// sets (sets_*.ts), the cast (cast.ts), the cameras (cams_*.ts) and the sound (timeline.json) agree on where things are.
// Units: metres, y up, ground = 0. Each set sits >= 400 m from every other; the set modules show ONLY the set of the
// shot being drawn. Change an anchor only together with every file that reads it (or ask the LEAD).
// Plain-text names only (Mizuho / TSE / J-Com as plain words), no logos anywhere.
export type V3 = [number, number, number];
export const FPS = 30;

// ---------------- light states (lights.ts merges the look_*.ts presets; every name must exist there) ----------------
export type LightName =
  | "desk_am"     // Mizuho trading room, 2005 morning: cool blue window light + warm desk-lamp pools (hook, trader, loop)
  | "desk_dim"    // the mystery: the same room a little dimmer, the screens glow more ("But how do you sell...")
  | "alarm_red"   // the cancel beat: warning-red light pools, a red rotating alarm glow, cool shade
  | "desk_eve"    // the bill: low orange evening light through the blinds, long blind stripes
  | "street_day"  // Tokyo street, bright December day: low winter sun, crisp blue sky, grey towers
  | "lobby"       // the exchange lobby: bright modern atrium, cool white + the green / red ticker glow
  | "lobby_red"   // the crash on the ticker wall: the wall turns red, the lobby dims toward it
  | "museum"      // the pedestal: the lobby dimmed, one warm spotlight on the stack
  | "homes"       // buyers across Japan + the 27-year-old's flat: warm daytime interiors, monitor glow
  | "hall"        // the pivot: a warm, chalky community hall (new colour world)
  | "court"       // the Tokyo courtroom: calm pale daylight on blond wood
  ;

// ---------------- sets ----------------
export type SetName = "trading" | "street" | "lobby" | "homes" | "hall" | "court";

/** TRADING ROOM (Mizuho Securities, 2005) + the HERO DESK. 18 x 13 x 3.3 m (x -9..9, z -6.5..6.5). Window wall on -z
 *  (Tokyo towers outside), long rows of desks along x, 2-4 flat monitors each, curly-cord phones, paper stacks.
 *  THE HERO DESK sits front-centre: the trader sits at `trader` facing -z (his monitors in front of him, toward -z);
 *  his boss stands at his right shoulder. The hero keyboard has a big glowing ENTER key; the centre monitor is the blue
 *  ORDER SCREEN (QTY / PRICE boxes). Owners: sets_trading.ts (room) + sets_desk.ts (everything on the hero desk). */
export const TR = {
  base: [0, 0, 0] as V3,
  room: { w: 18, d: 13, h: 3.3 },
  /** the hero desk top (centre, top height); the trader faces -z across it */
  desk: { c: [0, 0, 1.15] as V3, w: 1.8, d: 0.85, top: 0.74 },
  /** hero keyboard: centre of its top face (local), width (x) / depth (z); keys face +y. ENTER is near its right end */
  kb: { c: [0.0, 0.762, 1.32] as V3, w: 0.46, d: 0.16 },
  enter: [0.178, 0.775, 1.315] as V3,           // top centre of the ENTER key cap (the frame-0 hero)
  cancelKey: [-0.2, 0.775, 1.29] as V3,         // the big red CANCEL key (left end of the keyboard; Esc-like, oversized)
  /** the ORDER SCREEN monitor: screen centre, screen size, faces +z (toward the trader) */
  screen: { c: [0.0, 1.06, 0.92] as V3, w: 0.52, h: 0.33 },
  sideScreens: [[-0.56, 1.04, 0.98], [0.56, 1.04, 0.98]] as V3[],   // two more monitors, turned ~25 deg toward him
  /** the split-flap SHARES SOLD counter (hook): stands on top of the order-screen monitor, faces +z */
  counter: { c: [0.0, 1.36, 0.9] as V3, w: 0.62, h: 0.2 },
  tea: [0.42, 0.74, 1.42] as V3,                // his tea cup (steam) on the desk, right of the keyboard
  phone: [-0.62, 0.74, 1.3] as V3,              // his curly-cord phone
  lamp: [0.72, 0.74, 0.95] as V3,               // his warm desk lamp
  printer: [-1.25, 0.0, 1.2] as V3,             // the printer on a stand left of his desk (the bill's receipt unrolls from here)
  trader: [0.0, 0.0, 1.95] as V3,               // the trader's chair / feet position (seated: eyes ~1.18 m)
  boss: [0.78, 0.0, 2.25] as V3,                // the boss stands here (eyes ~1.45 m); bursts in from x +2.5 on "Cancel it!"
  bossFrom: [2.6, 0.0, 2.6] as V3,
  /** other traders at the rows (seated marks, facing -z) for the wides */
  staff: [[-2.6, 0, 1.9], [2.7, 0, 1.9], [-2.6, 0, -1.2], [0.1, 0, -1.2], [2.7, 0, -1.2], [-5.4, 0, 1.9], [5.3, 0, -1.2]] as V3[],
  windows: { z: -6.45, y0: 0.9, y1: 3.0, x0: -8.5, x1: 8.5 },
  /** wall clocks (centre, facing): one on the window wall (seen from +z), one on the +z wall (seen in the face shots) */
  clocks: [{ c: [-3.2, 2.55, -6.43] as V3, face: 1 }, { c: [1.8, 2.5, 6.43] as V3, face: -1 }],
  /** the door the receipt runs out of (shot 12): on the +x wall */
  door: { c: [8.98, 0, 3.6] as V3, w: 1.0, h: 2.2 },
};

/** TOKYO STREET (2005, December). The street runs along x at z 0..9 (asphalt), sidewalk z -4..0, the EXCHANGE building
 *  front at z = -4 (entrance at x = 0, "TOKYO STOCK EXCHANGE" in plain letters over it), grey office towers both sides,
 *  bare cherry trees along the kerb, a white taxi, salarymen with briefcases. Exterior: sky, low winter sun. */
export const ST = {
  base: [0, 0, 400] as V3,
  facadeZ: -4,
  entrance: { c: [0, 0, -4] as V3, w: 4.0, h: 3.6 },
  sign: { c: [0, 5.0, -3.9] as V3, w: 6.5, h: 0.9 },
  trees: [[-6, 0, -0.6], [-1.8, 0, -0.6], [3.4, 0, -0.6], [7.6, 0, -0.6]] as V3[],
  taxi: [-3, 0, 3.0] as V3,                     // a white taxi crossing (left -> right along x)
  walkers: [[-2.6, 0, -2.2], [1.4, 0, -1.6], [3.0, 0, -2.6], [-0.4, 0, -3.0]] as V3[],
};

/** EXCHANGE LOBBY (shots 3 / 4 / 7 / 9). A modern atrium 26 x 22 x 9 m (x -13..13, z -11..11). The big ROUND GLASS
 *  TICKER WALL (a glass drum of scrolling green / red numbers) stands at `ticker`; the FLOOR bar on it (shot 9);
 *  the debut BELL + the little invented MASCOT on a small stage at `bell`; the "TODAY: J-COM DEBUT" board on a stand;
 *  the MUSEUM PEDESTAL with the one tidy 14,500 stack under a spotlight at `pedestal` (a lower ceiling over it at
 *  `pedCeil`, so the 41-stack tower can wobble up THROUGH it in shot 7). */
export const LB = {
  base: [400, 0, 0] as V3,
  room: { w: 26, d: 22, h: 9 },
  ticker: { c: [0, 0, -5.5] as V3, r: 4.2, y0: 0.4, y1: 5.6 },
  bell: [3.6, 0, -0.6] as V3,
  board: { c: [-2.6, 2.1, -0.4] as V3, w: 2.2, h: 0.9 },
  pedestal: { c: [-7.5, 0, 4.0] as V3, w: 1.1, h: 1.0 },   // plinth top at y 1.0; the stack sits on it
  pedCeil: 4.2,
  crowd: [[-1.5, 0, 1.2], [1.2, 0, 1.8], [5.2, 0, 0.6], [-4.4, 0, 0.9]] as V3[],
};

/** HOMES ACROSS JAPAN (shot 10). A cut-open building seen from the street side (+z): open "dollhouse" rooms. The three
 *  BUYER rooms (an office worker, a grandma with reading glasses, a student in an internet cafe) and the small tidy
 *  APARTMENT of the 27-year-old (grey hoodie, three monitors, cup noodle). Each room: 4.0 w x 3.0 h x 3.5 d, open at
 *  z = 0 (the cut face), its floor at `y`. The apartment is the room the camera glides into on "One 27-year-old". */
export const HM = {
  base: [-400, 0, 0] as V3,
  rooms: {
    // P2 HOMES layout (homes_layout.ts is the detailed source: seats MARKS, MICE, CLICK frames)
    office: { x: 0, y: 6.0, w: 4.0 },
    grandma: { x: 0, y: 3.2, w: 4.0 },
    cafe: { x: 0, y: 0.4, w: 4.0 },
    apartment: { x: 4.6, y: 3.2, w: 4.0 },
  },
  depth: 3.5, height: 2.5,
  /** the 27-year-old's seat in the apartment (set-local) */
  buyer: [4.5, 3.2, -2.2] as V3,
};

/** COMMUNITY HALL NOTICE BOARD (shot 11, the pivot). Warm chalky hall 14 x 10 x 4.5 m; a GIANT cork notice board on the
 *  back wall (z = -4.9), its face centre `board.c`. The cartoon hand pins "SELLING!" at `note`; the crowd's tear-off
 *  tabs hang under it; later the big CANCEL button is pinned at `button` and a bug crawls out of it. */
export const HL = {
  base: [0, 0, -400] as V3,
  room: { w: 14, d: 10, h: 4.5 },
  board: { c: [0, 2.3, -4.86] as V3, w: 6.0, h: 3.4 },
  note: [-0.6, 2.6, -4.82] as V3,
  button: [1.7, 2.2, -4.8] as V3,
  crowd: [[-2.0, 0, -2.6], [-0.9, 0, -2.2], [0.3, 0, -2.5], [1.4, 0, -2.1], [-2.8, 0, -1.6]] as V3[],
};

/** TOKYO COURTROOM (shot 13). Pale blond-wood panelling, 14 x 12 x 5 m. Three judges at the raised bench (z -4.2, top
 *  1.5 m, judges seated behind it), the evidence table in the well with the broken CANCEL button, the exchange's lawyer
 *  (dark suit, briefcase) at his table on the right, a wall calendar that flips 2005 -> 2013. No gavel. */
export const CT = {
  base: [-400, 0, 400] as V3,
  room: { w: 14, d: 12, h: 5 },
  bench: { c: [0, 0, -4.2] as V3, w: 6.0, top: 1.24 },   // P2 HALL: 1.24 so the seated judges' robes + pointing arm show
  judges: [[-1.7, 0.5, -4.8], [0, 0.5, -4.8], [1.7, 0.5, -4.8]] as V3[],   // seated on a 0.5 m dais (eyes ~1.7 m)
  evidence: { c: [0, 0, -1.2] as V3, top: 0.78 },
  lawyer: [2.4, 0, 0.4] as V3,
  calendar: { c: [-4.6, 2.6, -5.9] as V3, w: 1.0, h: 1.3 },
};

/** measured cartoon adult (toon.ts): hat top ~1.66 m, eyes ~1.29 m, chin ~1.08 m (standing); seated eyes ~1.18 m */
export const EYE = 1.29;
export const EYE_SEATED = 1.18;

export const SETS: Record<SetName, V3> = { trading: TR.base, street: ST.base, lobby: LB.base, homes: HM.base, hall: HL.base, court: CT.base };
/** exterior sets (sky, sun, clouds are theirs); every other set is an interior */
export const EXTERIOR: Record<SetName, boolean> = { trading: false, street: true, lobby: false, homes: false, hall: false, court: false };
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// place helpers (set-local -> world), also usable in `node scripts/project.mjs` expressions
export const tr = (d: V3) => add(TR.base, d), st = (d: V3) => add(ST.base, d), lb = (d: V3) => add(LB.base, d);
export const hm = (d: V3) => add(HM.base, d), hl = (d: V3) => add(HL.base, d), ct = (d: V3) => add(CT.base, d);
