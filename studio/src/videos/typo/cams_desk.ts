// CAMERAS of the hero-desk shots (owner DESK): 1 HOOK, 6 TYPING + "Easy mistake.", 8 MYSTERY + CANCEL, 14 PAYOFF / LOOP.
// FRAME 0 = THE LAST FRAME (the loop): P0 = A0, the front-right medium of the calm trader under the big SHARES SOLD
// board, his finger over the glowing ENTER key (fix2, Design A); camAt(1, 0) === camAt(14, TOTAL - 1) exactly
// (LOOP_LAND = VOICE_TOTAL - 1).
import { tr, TR, V3 } from "./plan";
import { BEAT, SHOTS } from "./beats";
import { VOICE_TOTAL } from "./voicewarp";
import { Key, Dof, Cam, V, PV, fr, holdL, cruise, orbitLog, DV, at, VK, CUT, glide } from "./camkit";
import { CUT6, CUT8, STARE8 } from "./desk_beats";

const S = SHOTS;
// FIX2 (audit 2, Design A "the calm man under the board"): shots 1 and 14 are ONE front-right medium of the trader at
// his desk: the big hanging SHARES SOLD board over his head (top third), his face (middle), the caption band, and his
// finger over the glowing ENTER key in the lower right. FRAME 0 = THE LAST FRAME = A0 exactly (same creep speed).
const FACE0: V3 = tr([0, 1.18, 1.95]);
const A0 = fr(tr([1.67, 1.36, -0.23]), FACE0, 40, 0.5, 0.525);
export const P0: Cam = { pos: A0.pos, look: A0.look, fov: A0.fov, roll: 0 };
const A_RATE = 0.0009;
/** shot 1: A0 (hold + creep) -> ONE slow push (about 14 % closer over 5.5 s; his chin stays above the caption band, the
 *  board stays whole in the top third) while the board races and the paper flies */
const C1 = fr(tr([1.44, 1.385, 0.075]), FACE0, 40, 0.5, 0.533);
const RC1_V = V(BEAT.typo) + 8, RC1_VD = 168;
const LOOP_LAND = VOICE_TOTAL - 1;
/** shot 14: the same lens pulled back and a little wider (the hanging clock over the board is in the top of the frame:
 *  "one second" = its second hand ticks), then one slow push back in that lands exactly on frame 0 */
const W14 = fr(tr([2.09, 1.4, -0.78]), FACE0, 46.7, 0.5, 0.56);
const R14_V = V(BEAT.theFight) - 6, R14_VD = 70;

// shot 6: from behind his right shoulder onto the order screen + the counter (QTY / PRICE fill), then a CUT to his
// deadpan face from the front-left (past the left monitor: the monitors hide his face from straight in front)
const S6A = fr(tr([0.65, 1.75, 2.5]), tr([0, 1.15, 0.92]), 39, 0.52, 0.455);   // fix2 (audit 9): a hair wider + lower: the order slip clipped on top of the counter is in frame with the two boxes
const S6B = fr(tr([-1.2, 1.28, 1.0]), tr([0.0, 1.18, 1.95]), 44, 0.5, 0.42);
// shot 8: a slow push on his face in the screen glow -> "Cancel it!": a gentle pull back to the two-shot with the boss ->
// "They press cancel.": a CUT to the CANCEL key + the screen (each "Nothing." a settled frame)
const S8A = fr(tr([1.6, 1.35, 0.7]), tr([0.0, 1.18, 1.95]), 40, 0.5, 0.42);
// the two-shot is SETTLED before the boss bursts in from frame left (bossFrom) on "Cancel it!": both faces whole
const S8B = fr(tr([2.6, 1.6, -0.1]), tr([0.38, 1.35, 2.1]), 43, 0.53, 0.42);   // fix2 (audit 4): closer (48 -> 43): the two faces carry the shout
// the pull-back starts as "exist?" ends (slow bell: the "?" frame is still near-held) and reveals the boss bursting in
// (peak <= 45 px/f: P2 camcheck)
const R8_V = V(BEAT.exist2End) - 22, R8_VD = 56;
// each "Nothing.": a CUT to his frozen stare (a slightly high front-right medium past the right monitor), the same held
// frame both times; "Again." cuts back to the key + screen
const S8F = fr(tr([1.2, 1.55, 0.6]), tr([0.0, 1.18, 1.95]), 40, 0.42, 0.37);
// fix2 (audit 7): the SECOND "Nothing." is a different picture: the two-shot (the boss leaning in beside him, both staring
// at the dead screen, one certificate drifting down between them)
const S8G = fr(tr([2.5, 1.52, 0.05]), tr([0.3, 1.33, 2.08]), 50, 0.5, 0.43);
const K8A = fr(tr([-0.7, 1.3, 2.0]), tr([-0.1, 1.04, 1.05]), 48, 0.5, 0.5);
const K8B = fr(tr([-0.63, 1.27, 1.92]), tr([-0.1, 1.03, 1.05]), 48, 0.5, 0.5);
export const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: holdL(A0, 0, A_RATE) }, VK(RC1_V, RC1_VD, holdL(C1, PV(RC1_V + RC1_VD), 0.0008))],
  6: [{ f: S[5].a - 7, s: holdL(S6A, S[5].a, 0.0019) }, CUT(V(CUT6), holdL(S6B, CUT6, 0.0018))],
  8: [{ f: S[7].a - 7, s: holdL(S8A, S[7].a, 0.003) }, { f: PV(R8_V), cut: true, s: orbitLog(holdL(S8A, S[7].a, 0.003), holdL(S8B, PV(R8_V + R8_VD), 0.0008), PV(R8_V), PV(R8_V + R8_VD) - PV(R8_V), cruise(0.3, 0.4)) },
    CUT(V(CUT8), holdL(K8A, CUT8, 0.0012)), CUT(V(STARE8[0][0]), holdL(S8F, STARE8[0][0], 0.0006)), CUT(V(STARE8[0][1]), holdL(K8B, STARE8[0][1], 0.0008)),
    CUT(V(STARE8[1][0]), holdL(S8G, STARE8[1][0], 0.0007))],
  14: [{ f: S[13].a - 7, s: holdL(W14, S[13].a, 0.0009) },
    { f: PV(R14_V), cut: true, s: orbitLog(holdL(W14, S[13].a, 0.0009), holdL(A0, LOOP_LAND, A_RATE), PV(R14_V), PV(R14_V + R14_VD) - PV(R14_V), glide, glide, glide) }],
};
const FACE = tr([0, 1.18, 1.95]);
export const DOFS: Record<number, Dof[]> = {
  1: [{ f: 0, cInf: 3.2, focus: at(tr([-0.1, 1.3, 2.1])) }],
  6: [{ f: 0, cInf: 6, focus: at(tr(TR.screen.c)) }, { f: CUT6, cInf: 10, focus: at(FACE) }],
  8: [{ f: 0, cInf: 10, focus: at(FACE) }, DV(R8_V, R8_VD, 7, at(tr([0.35, 1.25, 2.05]))), { f: CUT8, cInf: 6, focus: at(tr([-0.1, 0.98, 1.1])) },
    { f: STARE8[0][0], cInf: 10, focus: at(FACE) }, { f: STARE8[0][1], cInf: 6, focus: at(tr([-0.1, 0.98, 1.1])) }, { f: STARE8[1][0], cInf: 6, focus: at(tr([0.35, 1.25, 2.05])) }],
  14: [{ f: 0, cInf: 3.2, focus: at(tr([-0.1, 1.3, 2.1])) }],
};
void (null as unknown as V3);
