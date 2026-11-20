// CAMERAS of the Tokyo shots (owner TOKYO): 2 STREET (a glide across the zebra toward the exchange doors, the taxi
// crossing in front), 3 LOBBY (the ticker drum + the debut stage + the TODAY banner), 4 PEDESTAL (a museum medium of the
// one stack + plaque), 7 41x (a low wide that cranes up with the tower through the mezzanine), 9 CRASH (the chart
// panel on the drum: the line plunges onto the FLOOR bar).
import { st, lb, LB, ST } from "./plan";
import { SHOTS, BEAT } from "./beats";
import { Key, Dof, fr, holdL, logGlide, orbitLog, cruise, glide, at } from "./camkit";

const S = SHOTS;
const PED = LB.pedestal.c, TWX = PED[0] + 1.3, TWZ = PED[2] - 0.75;
// 2: from across the street (the vending machines + a bare cherry framing) to mid-crossing, the doors ahead
const S2a = fr(st([1.3, 2.7, 18.5]), st([0, 3.6, ST.facadeZ]), 60, 0.5, 0.5);
// fix4 (1): the glide goes much further in (22.5 m -> 10.5 m): the walkers + the trader read big, the sign + date stay in
// (low lens, the horizon at ~59 % of the frame: the walkers' heads stay ABOVE the caption band)
const S2b = fr(st([0.35, 1.35, 7.3]), st([0, 2.5, ST.facadeZ]), 64, 0.5, 0.5);
// 3: from the front-right across the stage to the drum
const S3 = fr(lb([7.9, 1.5, 5.6]), lb([LB.bell[0], 1.6, LB.bell[2]]), 50, 0.53, 0.5);
// 4: the museum medium
const S4 = fr(lb([PED[0] + 0.9, 1.6, PED[2] + 4.9]), lb([PED[0] - 0.1, 0.95, PED[2] + 0.4]), 37, 0.5, 0.5);
// 7: low wide on the pedestal + the tower base -> craned up to the mezzanine where it breaks through
// fix4 (3): re-aimed on the 4-wide paper WALL (it runs from the tower base toward -z = frame right), the one stack left of it
const S7a = fr(lb([0.6, 0.75, 6.6]), lb([TWX - 0.3, 1.0, PED[2] - 1.2]), 60, 0.5, 0.64);
const S7b = fr(lb([2.2, 2.2, 4.9]), lb([-5.6, LB.pedCeil - 0.25, 4.1]), 62, 0.5, 0.4);
// 9: the chart panel on the drum
const S9 = fr(lb([-1.52, 1.8, 7.11]), lb([-0.5, 2.95, -1.33]), 50, 0.5, 0.42);

export const CAMS: Record<number, Key[]> = {
  2: [{ f: S[1].a - 7, s: logGlide(S2a, S2b, st([0, 0, ST.facadeZ])[2], S[1].a - 7, S[1].b - S[1].a + 14, cruise(0.3, 0.45)) }],
  3: [{ f: S[2].a - 7, s: holdL(S3, S[2].a, 0.0016) }],
  4: [{ f: S[3].a - 7, s: holdL(S4, S[3].a, 0.0012) }],
  7: [{ f: S[6].a - 7, s: holdL(S7a, S[6].a, 0.001) }, { f: S[6].a + 2, cut: true, s: orbitLog(holdL(S7a, S[6].a, 0.001), holdL(S7b, S[6].a + 66, 0.0012), S[6].a + 2, 64, glide) }],
  9: [{ f: S[8].a - 7, s: holdL(S9, S[8].a, 0.0018) }],
};
export const DOFS: Record<number, Dof[]> = {
  2: [{ f: 0, cInf: 2, focus: at(st([0, 3, ST.facadeZ])) }],
  3: [{ f: 0, cInf: 4, focus: at(lb([LB.bell[0], 1.4, LB.bell[2]])) }],
  4: [{ f: 0, cInf: 9, focus: at(lb([PED[0], 1.1, PED[2]])) }],
  7: [{ f: 0, cInf: 3, focus: at(lb([TWX, 2.4, TWZ])) }],
  9: [{ f: 0, cInf: 3, focus: at(lb([-0.5, 2.9, -1.33])) }],
};
