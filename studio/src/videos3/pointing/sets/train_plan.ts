// THE TRAIN'S TIMETABLE for the 'cab' and 'car' sets (TRAIN owner). One place for the run + the doors so both sets
// agree. Every time comes from the DIRECTOR's clock (../timeline.ts: the cuts + the shared events EV, which follow the
// voice), so the sets re-time themselves when the voice lands; nothing in the sets holds a fixed second.
//   s02-s04           cruising at 72 km/h (the laugh, the cab + the green signal, the two-shot)
//   s05               picking up speed from the cut (the suitcase creeps back on EV.bagCreep, hooked on EV.footHook)
//   s06               braking from EV.brake to the first stop (EV.stopA): the suitcase rolls to the wall (EV.bagBump)
//   stopA .. glideA   UNSEEN here (station A is only shown from the platform set: no platform is built in these sets; the
//                     timetable skips ~1.5 km in this window so station B is far from the first running shots)
//   s10               running in to station B (the car, the last metres beside the platform), stopped at EV.arriveB
//   arriveB .. glideB standing at STATION B: the film's platform on our LEFT; the left doors open from EV.doorsOpenB,
//                     start to close with the chime (EV.chimeB), meet DOOR_CLOSE_S later (ONE door speed, 1.3 s), the
//                     car-side lamps go out at EV.lampsOutB, the cab's door-closed lamp lights, it leaves at EV.glideB
// Imports only the clock (which imports only the words): no cycle with shots / cams / cast.
import { odometer } from "../../../kit/rail/lineside";
import type { TrainDoors } from "../../../kit/vehicles/train_jp";
import { EV, DOOR_CLOSE_S, cutS } from "../timeline";

const skip0 = EV.stopA + 2.5, skip1 = Math.max(skip0 + 2.5, EV.glideA - 1.5);
export const PLAN = {
  /** piecewise-linear speed (film s, m/s) */
  knots: [
    { t: 0, v: 20 }, { t: EV.speedUp - 0.001, v: 20 }, { t: EV.speedUp, v: 13 }, { t: EV.bagHome, v: 17.5 }, { t: EV.brake, v: 17.5 },
    { t: cutS("s07"), v: 2 }, { t: EV.stopA, v: 0 },
    // UNSEEN (the first stop is only shown from the platform set): ~1.5 km are skipped here, so station B's platform
    // does not lie beside the track of the first running shots
    { t: skip0, v: 0 }, { t: skip0 + 1, v: 300 }, { t: skip1, v: 300 }, { t: skip1 + 1, v: 0 },
    { t: EV.glideA, v: 0 }, { t: cutS("s10") - 0.01, v: 3.4 }, { t: cutS("s10"), v: 3.4 }, { t: EV.arriveB, v: 0 },
    { t: EV.glideB, v: 0 }, { t: EV.glideB + 24, v: 19.4 }, { t: 999, v: 19.4 },
  ],
  /** the braking for the first stop (the speedometer needle drops, the brake gauge rises, the suitcase rolls forward) */
  slow0: EV.brake, slow1: EV.stopA,
  /** standing at station B from / until */
  stopB: EV.arriveB, departB: EV.glideB,
  /** the left doors at station B: start to open / start to close; the leaves take openDur / closeDur s */
  doorsOpenB: EV.doorsOpenB, doorsCloseB: EV.chimeB, openDur: 1.5, closeDur: DOOR_CLOSE_S,
  /** the red car-side lamps go out this long after the leaves meet */
  lampDelay: EV.lampsOutB - EV.doorsMeetB,
  /** the green signal the driver points at stands this far ahead of the nose when s03 starts (~71 m at full stretch,
   *  ~39 m at the shot's end at 20 m/s: near enough to read through the low sun's haze). The sets put a kit lampBeacon
   *  on its green lamp (a glow with a pixel floor + a black background board). The train passes it at the end of s04 */
  signalLead: 85,
  /** station B's starting signal stands this far beyond the nose at the stop */
  startSignalLead: 95,
};
const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** the run: odometer metres, speed (m/s), the stop position, the station + signal lists for kit/rail lineside */
export const trainRun = () => {
  const dist = odometer(PLAN.knots);
  const stopAt = dist(PLAN.stopB), signalAt = dist(cutS("s03")) + PLAN.signalLead;
  const speed = (t: number) => { const h = 0.02; return Math.max(0, (dist(t + h) - dist(t - h)) / (2 * h)); };
  return { dist, stopAt, speed, signalAt, atB: (t: number) => t >= PLAN.stopB && t < PLAN.departB,
    stations: [{ noseAt: stopAt }], signals: [{ at: signalAt, aspect: "G" as const }, { at: stopAt + PLAN.startSignalLead, aspect: "G" as const }] };
};
/** the doors: the LEFT side at station B */
export const trainDoors: TrainDoors = (t) => {
  const open = ss(PLAN.doorsOpenB, PLAN.doorsOpenB + PLAN.openDur, t) * (1 - ss(PLAN.doorsCloseB, PLAN.doorsCloseB + PLAN.closeDur, t));
  return open > 0 ? { side: "left", open } : { side: "none", open: 0 };
};
/** the lit GREEN lamp of the signal at odometer `at` (STATION's signalJP: the mast 3.0 m left of our track, the head
 *  0.78 m toward it, green = the TOP lamp, 5.04 m above the rail; `zOf` = lineside's world.z). In the sets' frame
 *  (car floor y = 0, `floorY` = D.floor) */
export const greenLampAt = (zOf: (at: number, t: number) => number, floorY: number, at: number) => (t: number): [number, number, number] => [-2.22, -floorY + 5.04, zOf(at, t) + 0.1];
/** the same lamp from the run alone (for a camera that is aimed by it): lineside's z(at, t) = -(at - dist(t)) */
export const greenLampOf = (run: ReturnType<typeof trainRun>, floorY: number) => greenLampAt((at, t) => -(at - run.dist(t)), floorY, run.signalAt);
/** 1 while the train rocks (running), easing to 0 at a stop */
export const swayK = (run: ReturnType<typeof trainRun>) => (t: number) => Math.min(1, run.speed(t) / 6);
