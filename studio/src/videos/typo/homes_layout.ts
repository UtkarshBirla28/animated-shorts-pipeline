// HOMES LAYOUT (owner HOMES): the cut-open building of shot 10 in set-local metres (origin = HM.base). A narrow 2005
// Japanese mid-rise seen from the street (+z): column A (x = 0) stacks the three buyer rooms (internet cafe at street
// level, grandma's flat, the office on top), column B (x = 4.6) holds the 27-year-old's small flat next to grandma.
// Portrait framing: the stack of three 2.5 m rooms fills a 9:16 frame. Every room is open at z = 0 (the cut face) and
// 3.5 m deep. The marks below are where CHAR's cards sit (the LEAD mirrors them into plan.ts HM).
import type { V3 } from "./plan";
import { BEAT } from "./beats";

export const HX = {
  W: 4.0, D: 3.5, H: 2.5, SLAB: 0.3,
  /** the facade frame: cut face of the slabs / pillars at z 0..FZ */
  FZ: 0.25,
  colA: 0, colB: 4.6, colC: -4.6,
  floors: [0.4, 3.2, 6.0] as number[],
  roofY: 8.5,
};
export const ROOMS = {
  office: { x: HX.colA, y: 6.0, w: HX.W },
  grandma: { x: HX.colA, y: 3.2, w: HX.W },
  cafe: { x: HX.colA, y: 0.4, w: HX.W },
  apartment: { x: HX.colB, y: 3.2, w: HX.W },
};
/** the people's marks (feet / seat position, set-local). Each looks toward his / her screen (direction `face`: +1 = the
 *  screen is to screen-right, -1 = left); all are seated (office / cafe / apartment on a chair: eyes ~1.18 m above the
 *  floor; grandma kneels on a floor cushion: eyes ~0.85 m) */
export const MARKS = {
  office: { p: [-0.5, 6.0, -1.55] as V3, face: 1, seat: "chair" },
  grandma: { p: [0.35, 3.2, -1.55] as V3, face: -1, seat: "floor" },
  cafe: { p: [-0.35, 0.4, -1.45] as V3, face: 1, seat: "chair" },
  buyer: { p: [HX.colB - 0.1, 3.2, -2.2] as V3, face: 1, seat: "chair" },
};
/** the mice (the hand rests here) and the BUY screens' centres */
export const MICE = {
  office: [0.12, 6.0 + 0.71, -1.95] as V3,
  grandma: [-0.25, 3.2 + 0.44, -1.62] as V3,
  cafe: [0.12, 0.4 + 0.73, -1.95] as V3,
  buyer: [HX.colB + 0.16, 3.2 + 0.75, -2.88] as V3,
};
/** the BUY clicks (picture frames): staggered between "buyers" and "shares." so the rooms read "all clicking BUY" */
export const CLICK = {
  office: BEAT.buyers + 3,
  grandma: BEAT.buyers + 15,
  cafe: BEAT.buyers + 27,
  buyer: BEAT.shares4 + 6,
};
/** the apartment counter: spins from "makes", lands on +¥2,000,000,000 at "¥2" + 2 */
export const COUNTER = { spin0: BEAT.makes - 1, land: BEAT.b2 + 2 };
