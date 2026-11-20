// THE STAGING shared by the 'cab' and 'car' sets (TRAIN owner): who stands where at the cab glass, which way the
// tourist faces in each shot, and where the yellow suitcase is at film time t. Both sets build the same people and the
// same suitcase from this file, so a shot through the partition glass (s06, the cab set) and a shot from the aisle
// (s02 / s04 / s05 / s10, the car set) show ONE staging. Every time is the DIRECTOR's clock (../timeline.ts).
// Imports only kit numbers + the clock: no cycle with shots / cams / cast.
import type { V3 } from "../../../kit/core/ctx";
import { CAB } from "../../../kit/vehicles/cab_jp";
import { D, DOORS_CAB } from "../../../kit/vehicles/dims";
import { EV, cutS } from "../timeline";

const Z = CAB.partitionZ, DZ = DOORS_CAB[0], PY = -D.floor + 1.1;
/** marks (train frame, car floor y = 0). The RIGHT partition window spans x 0.44..1.3 (sill 0.55 m), the cab door
 *  x -0.36..0.3. While running: the small boy at the aisle half of the right window with one finger on the glass, the
 *  tall tourist at its wall half, half a metre back from the glass (in a profile from the aisle side his face sits
 *  right above the boy: one tall picture); from s05 on he has stepped back to stand beside his suitcase, which is on
 *  the aisle side with a straight lane ahead of it to the wall under the window; mum waits by the left door, behind
 *  every lens (never between a lens and the two). In s06 (the lead's decision) mum LIFTS the boy up to the window
 *  at its wall half: his chest and arms show over the sill from the cab, and the suitcase's top rolls in beside them
 *  at the aisle half */
export const STAGE = {
  kid: [0.62, 0, Z + 0.13] as V3,
  tourist: [1.02, 0, Z + 0.47] as V3,        // s02 / s03: at the glass (10 cm off the wall: at 1.12 his card's plane met the car wall and cut his selfie phone)
  touristBack: [1.12, 0, Z + 0.8] as V3,     // s05 on: a step back, level with the suitcase's front wheels
  mum: [-1.0, 0, Z + 1.25] as V3,
  kidLifted: [0.98, 0, Z + 0.13] as V3,      // s06: held up at the window by mum
  // s04 only (the profile two-shot from the left wall, T-7): both a little further from that lens and closer together
  // along the glass, so the boy (nearer the lens) does not swamp the frame and the tourist's head sits right above and
  // behind his (one tall picture); hard cuts on both sides (s03 / s05 do not see the car's glass end)
  // (T-12: the tourist is the NEAR one, on the aisle half, turned three-quarter to the lens; the boy is behind him at the
  // wall half, smaller, his finger on the glass; 0.6 m apart along the glass so the man's body never covers the boy)
  // s05 only (T-8, THE NO-LOOK FOOT HOOK): he stands in the doorway zone on the aisle half, facing the cab end (the
  // lens looks back at him from near the glass); the suitcase is at his RIGHT (the wall half), its front wheels a hand
  // ahead of him. It creeps back (away from the lens) until those wheels are LEVEL with him: the wheel and his shoe are
  // then at one depth, the case's body BEHIND them, so the sneaker reads in front of it (a card's foot lives in the
  // card's plane). From s06 he is back at touristBack (the cab looks at him through the glass)
  touristS05: [0.6, 0, Z + 1.45] as V3,
  bagS05: [1.02, 0, Z + 1.42] as V3,
  kidS04: [1.18, 0, Z + 0.22] as V3,
  touristS04: [0.8, 0, Z + 0.58] as V3,
  mumLifting: [1.02, 0, Z + 0.35] as V3,     // s06: right behind him, her face behind his shoulder
  bagKnee: [0.64, 0, Z + 0.75] as V3,        // the suitcase at his knee, aisle side
  bagBump: [0.68, 0, Z + 0.27] as V3,        // against the partition under the window's aisle half (the braking)
  bagDoor: [-1.1, 0, DZ] as V3,              // parked on the ochre strip of the LEFT front doorway
  kidDoor: [-0.92, 0, DZ - 0.5] as V3,       // the boy beside it (on its cab-end side)
  mumDoor: [-0.5, 0, DZ - 0.85] as V3,
  touristPlatform: [-3.9, PY, DZ - 0.4] as V3,   // out on the platform, 2.5 m from the doorway, in sight through it
  platformY: PY,
};
/** the suitcase stands with its wide ribbed face toward the aisle / the left doorway */
export const BAG_YAW = -Math.PI / 2;
/** the suitcase's own beats, all from the clock: it creeps back while the train speeds up (EV.bagCreep) until the
 *  sneaker has it (EV.footHook), is dragged home by CAST's hook (hookAt(t).drag, see setHookDrag); it rolls forward and
 *  across to the wall beside the boy when the train brakes (EV.brake .. EV.bagBump, a small rebound); UNSEEN it is back
 *  at his knee for s10; at the second stop it is wheeled to the doorway and parked on "Stay." (EV.park) */
export const BAG_BEATS = { creep0: EV.bagCreep, creep1: EV.footHook, home: EV.bagHome, creepM: 0.3, brake0: EV.brake, bump: EV.bagBump,
  reset0: EV.stopA + 3, reset1: EV.stopA + 4, toDoor0: EV.doorsOpenB + 0.5, toDoor1: Math.max(EV.doorsOpenB + 1.6, EV.park) };
const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// how far the hooking foot has dragged the suitcase home, 0..1 at t. The sets replace it with CAST's hookAt(t).drag (the
// foot really moves it); this fallback (a plain ease between the two events) is only used before a set is built
let dragOf = (t: number) => ss(BAG_BEATS.creep1, BAG_BEATS.home, t);
export const setHookDrag = (f: (t: number) => number) => { dragOf = f; };
/** where the suitcase stands at film time t (car floor) */
export const bagAt = (t: number): V3 => {
  const B = BAG_BEATS, K = t >= cutS("s05") && t < B.reset1 ? STAGE.bagS05 : STAGE.bagKnee, W = STAGE.bagBump;
  const creep = B.creepM * ss(B.creep0, B.creep1, t) * (1 - Math.max(0, Math.min(1, dragOf(t))));
  // the brake: an accelerating roll to the wall (u^2), then a 3 cm rebound that settles
  const u = Math.max(0, Math.min(1, (t - B.brake0) / (B.bump - B.brake0))), hit = t >= B.bump ? 0.03 * Math.exp(-(t - B.bump) * 7) * Math.abs(Math.cos((t - B.bump) * 16)) : 0;
  const fwd = (u * u) * (1 - ss(B.reset0, B.reset1, t));
  const z = K[2] + creep + (W[2] - K[2]) * fwd + hit * (fwd > 0.99 ? 1 : 0);
  return mix([K[0] + (W[0] - K[0]) * fwd, 0, z], STAGE.bagDoor, ss(B.toDoor0, B.toDoor1, t));
};
/** HOW HIGH THE SET RAISES THE BOY'S MARK in s06 (m): 0, because CAST's castLiftPair (cab set) raises him itself
 *  (LIFT.liftM 0.3 m); anything else here stacks on top of it (he would float 0.6 m up) */
export const KID_LIFT = 0;
/** s06 on the clock: from its cut until the cab set is off screen again (the first stop is filmed from the platform) */
export const lifted = (t: number) => t >= cutS("s06") && t < EV.stopA + 2;
const inS04 = (t: number) => t >= cutS("s04") && t < cutS("s05");
export const kidAt = (t: number): V3 => (lifted(t) ? [STAGE.kidLifted[0], KID_LIFT, STAGE.kidLifted[2]] : inS04(t) ? STAGE.kidS04 : STAGE.kid);
export const mumAt = (t: number): V3 => (lifted(t) ? STAGE.mumLifting : STAGE.mum);
export const touristAt = (t: number): V3 => (t >= cutS("s06") ? STAGE.touristBack : t >= cutS("s05") ? STAGE.touristS05 : inS04(t) ? STAGE.touristS04 : STAGE.tourist);
/** the tourist's body yaw (atan2(dx, dz) of where he faces) while he rides. `yawHook` = his heading in s05 (the car set
 *  solves it so CAST's right-foot hook reaches the suitcase's wheel) */
export const touristYawAt = (t: number, yawHook = 0.68): number => {
  if (t >= EV.glideA - 1) return 0.3;                       // s10: to his own phone, toward the aisle lens
  if (t >= cutS("s06")) return 2.6;                         // s06: three-quarter to the cab glass, grinning at his clip
  if (t >= cutS("s05")) return yawHook;                     // s05: turned away from the glass, eyes on his phone
  // s04: three-quarter between the glass he jabs at (-z) and the profile lens at the left wall (-x) (T-12)
  if (t >= cutS("s04")) return -2.45;
  // s02: his BACK to the cab glass (a selfie with the driver behind him); from EV.phoneSwing he swings round to the
  // glass by the cut (12 frames, turning through the aisle side); s03 / s04: facing the glass
  return -(Math.PI - 0.15) * ss(EV.phoneSwing, cutS("s03"), t);
};
