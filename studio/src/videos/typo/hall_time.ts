// HALL + COURT story timing (owner HALL): the frames and world points the hall / court props act on, as pure functions,
// so the cast (CHAR: the pinning hand, the crowd's grabbing arms, the judge's point, the hands passing the receipt slice)
// can sync to them. Everything is keyed to BEAT words (never literal frames). Read-only for every other owner.
import { BEAT } from "./beats";
import { HL, CT, hl, ct } from "./plan";
import type { V3 } from "./plan";

const cl = (x: number) => Math.max(0, Math.min(1, x));

// ---------------- shot 11: the notice board ----------------
/** the cartoon hand pushes the pin of "SELLING!" in over [PIN_F - 3, PIN_F + 3]; the note appears at PIN_F (a bounce) */
export const PIN_F = BEAT.pin + 2;
/** the eight tear-off tabs: tab i is snatched at TAB_F(i) (a 3 f stagger from "doesn't"), all gone before "check" */
export const TABS = 8;
export const TAB_FLY = 8;
export const TAB_F = (i: number) => BEAT.doesntStop + 1 + i * 3;
/** the crowd member (HL.crowd index) whose hand catches tab i, and the world point the tab flies to (that hand) */
export const TAB_HAND = (i: number) => [1, 2, 0, 3, 1, 2, 0, 3][i % 8];
export const tabTarget = (i: number): V3 => { const c = HL.crowd[TAB_HAND(i)]; return hl([c[0] + 0.12 * ((i % 3) - 1), 1.78, c[2] - 0.12]); };
/** the note (set-local, plan.ts HL.note) and its size; the tabs hang from its lower edge */
export const NOTE = { c: HL.note, w: 0.66, h: 0.8, tabH: 0.22 };
/** the CANCEL button is pinned on the board at BTN_F (its 4 corner pins push in over 6 f) */
export const BTN_F = BEAT.cancelBtn - 2;
/** the bug: antennae peek out of the crack at BUG_PEEK, it crawls out (BUG_OUT .. BUG_SIT) and sits; the BUG tag swings
 *  down beside it over [TAG_F, TAG_F + 14] and is settled on "bug." */
export const BUG_PEEK = BEAT.system - 8;
export const BUG_OUT = BEAT.system + 2;
export const BUG_SIT = BEAT.bug - 6;
export const TAG_F = BEAT.system + 5;

// ---------------- shot 13: the court ----------------
/** the wall calendar (a HALL-local constant, not in plan.ts: only HALL reads it): its page face centre (court-local) */
export const CAL = { c: [-1.98, 3.1, -5.93] as V3, w: 0.9, h: 1.16 };
/** year pages 2005 .. 2013: page k (2005 + k) tears off at CAL_F(k + 1); "2013" is up from CAL_F(8) = BEAT.ruled */
export const CAL_F = (k: number) => BEAT.years + 4 + ((BEAT.ruled - BEAT.years - 4) * k) / 8;
export const calYear = (f: number) => { let k = 0; while (k < 8 && f >= CAL_F(k + 1)) k++; return 2005 + k; };
/** the evidence table top centre (court-local) */
export const EVID: V3 = [CT.evidence.c[0], CT.evidence.top, CT.evidence.c[2]];
/** the receipt slice: torn on "pay", lifted and carried to the lawyer's hand by "part" + 14; SLICE_HAND = where his hand
 *  takes it (world). CHAR: the judge points at the button from "court"; a hand may follow slicePos(f). */
export const SLICE_F = BEAT.pay - 2;
export const SLICE_DUR = 20;
export const SLICE_FROM: V3 = [EVID[0] + 0.45, EVID[1] + 0.007, EVID[2] + 0.22];
export const SLICE_HAND: V3 = [CT.lawyer[0] - 0.5, 1.2, CT.lawyer[2] - 0.25];
export const sliceU = (f: number) => cl((f - SLICE_F) / SLICE_DUR);
/** world position of the torn slice at frame f (court-local -> world) */
export const slicePos = (f: number): V3 => {
  const u = sliceU(f), s = u * u * (3 - 2 * u), lift = Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.32;
  return ct([SLICE_FROM[0] + (SLICE_HAND[0] - SLICE_FROM[0]) * s, SLICE_FROM[1] + (SLICE_HAND[1] - SLICE_FROM[1]) * s + lift, SLICE_FROM[2] + (SLICE_HAND[2] - SLICE_FROM[2]) * s]);
};
