// CAMERAS of the trading-room shots (owner TRADING): 5 THE TRADER (the room wide down the rows to the window wall ->
// one slow glide in to the trader + boss) and 12 THE BILL (the evening room down the aisle to the open door: trucks,
// ghost certificates -> cash envelopes, the receipt racing out of the door; then a crane down onto its TOTAL).
import { tr, type V3 } from "./plan";
import { BEAT, SHOTS } from "./beats";
import { Key, Dof, V, PV, fr, holdL, cruise, VK, DV, at, orbitLog, glide } from "./camkit";

const S = SHOTS;
// ---- shot 5: the wide from the +z end down the rows (the window clock, the towers), then the glide to the hero desk
const S5A = fr(tr([1.2, 2.2, 6.2]), tr([-0.8, 0.85, -4.6]), 54, 0.5, 0.43);
const S5B = fr(tr([0.35, 1.8, 5.2]), tr([0.42, 1.3, 2.1]), 42, 0.5, 0.45);
const R5_V = V(BEAT.simple) + 1, R5_VD = 56;
// ---- shot 12: high over the aisle at the -x end looking down the room to the open +x door, then the TOTAL
/** where the receipt's TOTAL rests (trading_bill.ts: MARGIN 2.5 m of tail after it, the aisle at z 2.75) */
export const TOTAL_AT: V3 = [0.38, 0.0, 2.75];
// fix2 (audit 5): LOWER and CLOSER (the old high wide left him 12 % of the frame over a striped floor): the slumped
// trader fills the left of the frame (about half its height), the buy-back trucks roll up on the right, the ghosts rise
// between; then a small rise + widen as the ghosts turn to cash
// fix4 (4): much CLOSER on him (4.3 m -> 2.9 m: his face carries the four beats), still room on the right for the ghosts
const S12A = fr(tr([-2.75, 1.42, 2.7]), tr([0, 1.18, 1.95]), 46, 0.3, 0.43);
const S12B = fr(tr([-3.3, 1.7, 2.7]), tr([0, 1.18, 1.95]), 50, 0.3, 0.5);
const S12C = fr(tr([-1.7, 2.22, 2.8]), tr(TOTAL_AT), 42, 0.5, 0.36);
const R12A_V = V(BEAT.n96k) + 7, R12A_VD = 40;
const R12C_V = V(BEAT.theBill) - 26, R12C_VD = 90;

export const CAMS: Record<number, Key[]> = {
  5: [{ f: S[4].a - 7, s: holdL(S5A, S[4].a, 0.0014) }, VK(R5_V, R5_VD, holdL(S5B, PV(R5_V + R5_VD), 0.0012), cruise(0.4, 0.45))],
  12: [
    { f: S[11].a - 7, s: holdL(S12A, S[11].a, 0.0012) },
    VK(R12A_V, R12A_VD, holdL(S12B, PV(R12A_V + R12A_VD), 0.0008), cruise(0.4, 0.4)),
    { f: PV(R12C_V), cut: true, s: orbitLog(holdL(S12B, PV(R12A_V + R12A_VD), 0.0008), holdL(S12C, PV(R12C_V + R12C_VD), 0.0012), PV(R12C_V), PV(R12C_V + R12C_VD) - PV(R12C_V), cruise(0.38, 0.45), glide, glide) },
  ],
};
export const DOFS: Record<number, Dof[]> = {
  5: [{ f: 0, cInf: 2, focus: at(tr([0, 1.2, 0.0])) }, DV(R5_V, R5_VD, 7, at(tr([0.35, 1.3, 2.05])))],
  12: [{ f: 0, cInf: 3, focus: at(tr([1.0, 1.0, 3.0])) }, DV(R12C_V, R12C_VD, 7, at(tr(TOTAL_AT)))],
};
