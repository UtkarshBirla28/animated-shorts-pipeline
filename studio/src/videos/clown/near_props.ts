// THE COUNT'S FOREGROUND THINGS (owner LOOK, p3): what the set actually DRAWS at EDIT's plan.ts Q1_NEAR marks. Pure data
// (no three.js), so the set (square_p3.ts) and the projection check (out/clown/look_p3/near_check.mjs) read the SAME boxes.
// Rule (quiz animator, after the first pass hid half of Q1 behind full planters): every thing stays INSIDE its mark's own
// half width `w` and height `h`, and lower still when the mark is close to the lens; low, plain, small: a flower tub, a
// kerb stone, a backpack, a paper cup, a leaf pile. Nothing may hide feet, knees, pigeons, the dog, a phone person, the
// clown (wheel to hat) or the bills.
import { Q1_NEAR, type V3 } from "./plan";

export type NearKind = "tub" | "kerb" | "pack" | "cup" | "leaves";
/** a drawn thing: its foot p, half width hw (x), half depth hd (z), height h (m) */
export type NearThing = { id: string; kind: NearKind; p: V3; hw: number; hd: number; h: number };
const SHAPE: Record<string, { kind: NearKind; hw: number; hd: number; h: number }> = {
  planter: { kind: "tub", hw: 0.36, hd: 0.17, h: 0.38 },    /* a low flower tub: box 0.22 m, flowers to 0.38 m */
  low2: { kind: "kerb", hw: 0.34, hd: 0.13, h: 0.16 },      /* a kerb stone (it is 1-2.5 m from the lens: kept very low) */
  small1: { kind: "pack", hw: 0.17, hd: 0.12, h: 0.28 },    /* a backpack left on the ground */
  small2: { kind: "cup", hw: 0.2, hd: 0.16, h: 0.09 },      /* a paper cup on its side among a few leaves */
  early: { kind: "leaves", hw: 0.22, hd: 0.18, h: 0.08 },   /* a leaf pile */
};
/** the things to draw: one per mark, never larger than the mark's own w / h */
export const NEAR_DRAWN: NearThing[] = (Q1_NEAR ?? []).map((m) => {
  const s = SHAPE[m.id] ?? { kind: "leaves" as NearKind, hw: 0.2, hd: 0.16, h: 0.08 };
  return { id: m.id, kind: s.kind, p: m.p, hw: Math.min(s.hw, m.w), hd: Math.min(s.hd, m.w), h: Math.min(s.h, m.h) };
});
