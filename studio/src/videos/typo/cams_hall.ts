// CAMERAS of the hall + court shots (owner HALL): 11 PIVOT (the giant notice board: SELLING!, tabs, empty pockets; the
// CANCEL button + the bug) and 13 COURT (three judges, the broken CANCEL on the evidence table, 2005 -> 2013).
// 11: A = a low wide on the giant board in the warm hall (crowd in front, lanterns + bunting above), a hold with a creep
//     for "You see ... notice board."; B = a gentle push to the SELLING! note + the crowd's hands (pin, tabs, pockets);
//     C = ONE bell glide on "And the cancel button?" to the button, held settled through "had a bug."
// 13: one framing from the well: the bench with the three judges, the calendar (2013), the evidence table, a slow creep.
import { hl, ct, HL, CT } from "./plan";
import { BEAT, SHOTS } from "./beats";
import { Key, Dof, V, PV, fr, holdL, creepL, cruise, VK, DV, at } from "./camkit";
import { CAL } from "./hall_time";

const S = SHOTS;
const NOTE_T = hl([HL.note[0], HL.note[1] - 0.3, HL.note[2]]);
const S11A = fr(hl([0.25, 1.35, 4.3]), hl([0, 2.3, HL.board.c[2]]), 58, 0.5, 0.37);
// the push frames the note + tabs AND the seller (HL.crowd[2]) with his turned-out pockets; crowd faces ~y 995
const S11B = fr(hl([0.1, 1.25, 2.6]), hl([-0.15, 1.9, HL.note[2]]), 44, 0.5, 0.42);
const S11C = fr(hl([1.75, 2.85, -0.95]), hl([HL.button[0] + 0.1, HL.button[1] - 0.02, HL.button[2]]), 36, 0.5, 0.4);
const R11B_V = V(BEAT.board) + 2, R11B_VD = 52;          // the push to the note lands on "pin up"
const R11C_V = V(BEAT.andCancel) - 16, R11C_VD = 82;     // the bell glide to the button (pins on mid-glide), settled before the bug peeks (peak <= 45 px/f)
// from behind the lawyer's right shoulder: calendar, three judges, the evidence button AND the lawyer's hand-off
const S13 = fr(ct([3.0, 2.05, 4.4]), ct([-0.5, 1.45, -4.8]), 50, 0.5, 0.42);
// fix4 (5): TWO closer framings instead of the far wide: A = the pointing judge (+ the left judge, the flipping calendar,
// the CANCEL button on the table below the captions); a CUT before "pay" to B = the receipt slice torn off the table and
// handed to the exchange's lawyer (seen from the bench side: his face reads)
const S13A = fr(ct([1.5, 1.55, 0.8]), ct([0, 1.8, -4.8]), 43, 0.74, 0.46);
const S13B = fr(ct([-0.6, 1.5, -2.6]), ct([1.45, 1.2, -0.15]), 44, 0.52, 0.42);
export const CUT13 = BEAT.pay - 12;
void CAL; void CT; void S13;

export const CAMS: Record<number, Key[]> = {
  11: [
    { f: S[10].a - 7, s: creepL(S11A, S[10].a, 0.0012, [0, 0.0006, 0]) },
    VK(R11B_V, R11B_VD, holdL(S11B, PV(R11B_V + R11B_VD), 0.0012), cruise(0.4, 0.45)),
    VK(R11C_V, R11C_VD, holdL(S11C, PV(R11C_V + R11C_VD), 0.001), cruise(0.4, 0.45)),
  ],
  13: [{ f: S[12].a - 7, s: holdL(S13A, S[12].a, 0.0008) }, { f: CUT13, cut: true, s: holdL(S13B, CUT13, 0.0012) }],
};
export const DOFS: Record<number, Dof[]> = {
  11: [{ f: 0, cInf: 3, focus: at(hl([0, 2.3, HL.board.c[2]])) }, DV(R11B_V, R11B_VD, 2.5, at(hl([-0.2, 1.6, -3.6]))), DV(R11C_V, R11C_VD, 5, at(hl(HL.button)))],
  13: [{ f: 0, cInf: 2.5, focus: at(ct([0, 1.6, -4.6])) }, { f: CUT13, cInf: 4, focus: at(ct([1.6, 1.2, 0])) }],
};
