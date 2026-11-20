// CAMERAS of the homes shot (owner HOMES): 10 BUYERS ACROSS JAPAN -> the glide into the 27-year-old's flat.
// "And all over Japan": a portrait wide on the stacked buyer rooms (cafe / grandma / office, all faces + BUY screens),
// held with a slow creep that drifts toward the flat next door; "One 27-year-old": ONE slow bell glide (orbitLog, even
// scale change) into the flat, landing on him + his three monitors; the counter reads on "¥2 billion" and holds.
import { hm } from "./plan";
import { BEAT, SHOTS } from "./beats";
import { Key, Dof, V, PV, fr, holdL, creepL, orbitLog, glide, DV, at } from "./camkit";
import { HX, ROOMS } from "./homes_layout";

const S = SHOTS;
const A = ROOMS.apartment;
/** the wide: the column of buyer rooms, a touch from the left and below (dollhouse depth) */
export const S10A = fr(hm([-0.9, 4.5, 13.6]), hm([0.12, 4.78, -0.6]), 41, 0.5, 0.5);
/** the landing: the 27-year-old (left) + his monitors, the counter in the upper middle */
export const S10B = fr(hm([A.x + 0.52, A.y + 1.45, 4.7]), hm([A.x + 0.55, A.y + 1.3, -2.8]), 29, 0.5, 0.5);
const G0 = PV(V(BEAT.one27) - 18), GD = 128;
/** the sideways travel finishes early (while the lens is still far), so the final push-in is straight */
const early = (u: number) => glide(Math.min(1, u / 0.7));
const wide = creepL(S10A, S[9].a, 0.0011, [0.004, 0, 0]);

export const CAMS: Record<number, Key[]> = {
  10: [
    { f: S[9].a - 7, s: wide },
    { f: G0, cut: true, s: orbitLog(wide, holdL(S10B, PV(V(G0) + GD), 0.0009), G0, PV(V(G0) + GD) - G0, glide, early, early) },
  ],
};
export const DOFS: Record<number, Dof[]> = {
  10: [{ f: 0, cInf: 2, focus: at(hm([0, 4.0, -1.6])) }, DV(V(G0) + 10, GD - 10, 8, at(hm([A.x - 0.3, A.y + 1.18, -2.3])))],
};
void HX;
