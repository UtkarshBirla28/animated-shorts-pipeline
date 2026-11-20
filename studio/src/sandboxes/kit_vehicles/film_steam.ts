// TRAIN sandbox: the v4 STEAM set (sets/steam.ts) on its own clock: one 60-frame row per framing (FRAMES_steam), so a
// still of frame 30 + 60 k shows framing k mid-move. COMP KitSteam (Root.tsx). Rows = the script v4 steam lines 13-18:
// 0 event (13), 1 cabSide (13), 2 wideCab (14-15), 3 coalOut (15-16), 4 boss (17), 5 noseGlass (18).
import type { Film, ShotDef, V3 } from "../../kit/core/ctx";
import { build_steam, STEAM_RIG, STEAM_SHOW, type CrewPlan } from "../../videos3/pointing/sets/steam";
import { FRAMES_steam } from "../../videos3/pointing/sets/steam.cams";

const F = 1.38, P = Math.PI;
const HORI_LOOK: V3 = [-3.1, 6.0, -60];
type Row = [id: keyof typeof FRAMES_steam, az: number, el: number, exposure: number, crew: CrewPlan];
const ROWS: Row[] = [
  // the sun behind the lens's left shoulder: the engine's front + left side lit; Hori leaning from the left opening
  ["event", 40, 22, 0.72, { hori: { pos: [-1.08, F, 6.95], yaw: -(P - 0.5) }, fireman: { pos: [0.4, F, 7.4], yaw: P - 0.3 }, official: null, shovel: true }],
  // the sun low ahead: gold through the round window; the semaphore 40 m ahead, soft in the glass
  ["cabSide", -20, 12, 0.85, { hori: { pos: [-0.42, F, 6.55], yaw: P + 0.5, look: HORI_LOOK }, fireman: { pos: [0.5, F, 7.4], yaw: P - 0.3 }, official: null, shovel: true, signal: 40 }],
  // the sun from the front right: the cab interior + the men lit through the right opening
  ["wideCab", -60, 18, 0.82, { hori: { pos: [-0.6, F, 6.85], yaw: 1.25 }, fireman: { pos: [0.45, F, 7.35], yaw: P - 0.4 }, official: null, shovel: true, cutaway: true }],
  ["coalOut", 35, 20, 0.74, { hori: { pos: [-0.35, F, 6.7], yaw: P - 0.2 }, fireman: { pos: [-1.08, F, 7.15], yaw: -(P - 0.6), look: HORI_LOOK }, official: null, shovel: false, signal: 30 }],
  ["boss", -60, 18, 0.82, { hori: { pos: [-0.62, F, 6.8], yaw: P - 0.2 }, fireman: { pos: [0.1, F, 7.3], yaw: P - 0.4 }, official: { pos: [0.18, F, 7.6], yaw: -2.0, look: [-0.62, 2.9, 6.8] }, shovel: true, cutaway: true }],
  // the sun from ahead-left: Hori's profile at the left window rim-lit, the boss behind him in the warm cab light
  ["noseGlass", 25, 16, 0.84, { hori: { pos: [-0.72, F, 6.42], yaw: P }, fireman: { pos: [0.7, F, 7.75], yaw: P - 0.3 }, official: { pos: [-0.25, F, 7.35], yaw: 1.9, look: [-0.72, 2.9, 6.42] }, shovel: false }],
];
const N = 60;
STEAM_SHOW.crew = (t: number) => ROWS[Math.max(0, Math.min(ROWS.length - 1, Math.floor((t * 30) / N)))][4];
const shots: ShotDef[] = ROWS.map(([id, az, el, ex], i) => ({ id, from: i * N, to: (i + 1) * N, set: "steam", rig: "golden",
  rigOpts: { ...STEAM_RIG, sunAz: az, sunEl: el, exposure: ex }, cam: FRAMES_steam[id](i * N, (i + 1) * N) }));
export const FILM_STEAM: Film = { slug: "kit_steam", fps: 30, total: ROWS.length * N, sets: { steam: build_steam }, shots };
