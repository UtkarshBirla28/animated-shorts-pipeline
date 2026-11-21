// v4 CAMERAS (DIRECTOR): a v4 shot's camera = the set owner's camera for the shot id (CAMS["v4_<id>"] or CAMS["<id>"] in
// the set's camera table, re-exported by v4/sets/<set>.ts), else the director's default view of the set (camkit.ts),
// then the director's REST (camkit.withRest): every shot ends still.
import type { CamState } from "../../../kit/core/ctx";
import { DEFAULT_VIEW, easeGlide, pushRest, restFrames, withRest, type ShotCam } from "./camkit";
import { CAMS as CAMS_cab } from "./sets/cab";
import { CAMS as CAMS_car } from "./sets/car";
import { CAMS as CAMS_jp_platform } from "./sets/jp_platform";
import { CAMS as CAMS_lab } from "./sets/lab";
import { CAMS as CAMS_kitchen } from "./sets/kitchen";
import { CAMS as CAMS_ny_station } from "./sets/ny_station";
import { CAMS as CAMS_steam } from "./sets/steam";

export const CAM_TABLES: Record<string, Record<string, ShotCam>> = {
  cab: CAMS_cab, car: CAMS_car, jp_platform: CAMS_jp_platform, lab: CAMS_lab, kitchen: CAMS_kitchen, ny_station: CAMS_ny_station, steam: CAMS_steam,
};
/** the owner's camera of a v4 shot, or null */
export const ownerCam = (id: string, set: string): ShotCam | null => CAM_TABLES[set]?.["v4_" + id] ?? CAM_TABLES[set]?.[id] ?? null;
/** the DIRECTOR'S DRIFT (shot plan `drift`): a slow push (+) or pull (-) along the lens's own view line, `drift` x the
 *  distance to the look point, eased over the moving part of the shot, on top of the owner's camera (meant for a STILL
 *  owner camera: the "NO move" shots that made the film stand still 46 % of the time). The look point and fov stay. */
/** the drift's travel is capped in METRES (lead 02:20: with a far look point a share of the look distance carried v23b's
 *  lens out through the cab front): at most DRIFT_MAX_M along the view line, measured on the shot's first frame */
export const DRIFT_MAX_M = 0.6;
export const driftMetres = (cam: (t: number) => CamState, from: number, drift: number, maxM = DRIFT_MAX_M) => {
  const c = cam(from / FPS), d = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
  return { d, m: Math.min(Math.abs(drift) * d, maxM), k: d > 1e-6 ? Math.sign(drift) * Math.min(Math.abs(drift), maxM / d) : 0 };
};
export const withDrift = (cam: (t: number) => CamState, from: number, to: number, drift: number, rest?: number, maxM = DRIFT_MAX_M) => {
  const t0 = from / FPS, t1 = (to - restFrames(from, to, rest)) / FPS, kk = driftMetres(cam, from, drift, maxM).k;
  return (t: number): CamState => {
    // rest: 0 (a continuous move, the shot has no rest): a steady linear creep to the cut, never slowing to a stop
    const lin = Math.max(0, Math.min(1, (t - t0) / Math.max(1e-3, t1 - t0)));
    const c = cam(t), u = restFrames(from, to, rest) === 0 ? lin : easeGlide(lin), k = kk * u;
    const pos: [number, number, number] = [c.pos[0] + (c.look[0] - c.pos[0]) * k, c.pos[1] + (c.look[1] - c.pos[1]) * k, c.pos[2] + (c.look[2] - c.pos[2]) * k];
    return { ...c, pos, ...(c.focus !== undefined ? { focus: Math.hypot(c.look[0] - pos[0], c.look[1] - pos[1], c.look[2] - pos[2]) } : {}) };
  };
};
const FPS = 30;
/** the shot's camera, glide then rest; `missing` collects the shots on the director's default view; `freeze` = the whole
 *  shot holds the camera of its first frame (stillness IS the picture: the red beat, the frozen face) */
export const camOf = (id: string, set: string, from: number, to: number, rest: number | undefined, missing: string[], drift?: number, freeze?: boolean, driftMaxM?: number): ((t: number) => CamState) => {
  const own = ownerCam(id, set);
  if (!own) missing.push(id);
  const sc: ShotCam = own ?? pushRest(DEFAULT_VIEW[set] ?? DEFAULT_VIEW.cab, 0.35, rest);
  const base = sc(from, to);
  if (freeze) { const c0 = base(from / FPS); return () => c0; }
  return withRest(drift ? withDrift(base, from, to, drift, rest, driftMaxM ?? DRIFT_MAX_M) : base, from, to, rest);
};
