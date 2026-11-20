// CAMERA KIT of 'pointing' (tools/v3/new_short_v3.py): the bible's preset + params -> a CORE camera (kit/core/camera.ts),
// placed at a subject MARK (ground point, metres, set coordinates; camera on the mark's +Z side). LEAD-owned.
import type { CamState, V3 } from "../../kit/core/ctx";
import { shotCam, craneDown, droneRise, followSide, lockedWithDrift, lowWideTrack, macroTopDown, orbit, povHandheld, pullBack, pushIn, whipPan } from "../../kit/core/camera";
export type CamParams = { fov?: number; height_m?: number; dist_m?: [number, number]; ease?: "linear" | "in" | "out" | "inOut" | "inOut5";
  shake?: number; walk_mps?: number; lookH?: number; rise?: number; forward?: number; endH?: number; travel?: number; a0?: number; a1?: number };
export type ShotCam = (from: number, to: number) => (t: number) => CamState;
export const mk = (preset: string, mark: V3, p: CamParams, seed = 7): ShotCam => (from, to) =>
  shotCam(from, to, (d) => {
    const m = mark, [d0, d1] = p.dist_m ?? [3, 2.2], h = p.height_m ?? 1.2, lookH = p.lookH ?? 1.1, walk = p.walk_mps ?? 0;
    const c = { fov: p.fov, ease: p.ease, shake: p.shake ?? 0, seed };
    switch (preset) {
      case "craneDown": return craneDown({ ...c, start: [m[0], h, m[2] + d0], target: [m[0], 1.0, m[2]], endH: p.endH ?? 1.2, travel: p.travel ?? d0 - d1 }, d);
      case "droneRise": return droneRise({ ...c, start: [m[0], h, m[2] + d0], target: [m[0], 0.8, m[2]], rise: p.rise ?? 1.5, forward: p.forward ?? d0 - d1 }, d);
      case "followSide": return followSide({ ...c, subject: (u: number) => [m[0] + (walk || 1.2) * u, m[1], m[2]], side: d0, height: h, lookH }, d);
      case "lockedWithDrift": return lockedWithDrift({ ...c, pos: [m[0] + 0.2, h, m[2] + d0], look: [m[0], lookH, m[2]] }, d);
      case "lowWideTrack": return lowWideTrack({ ...c, subject: walk ? (u: number) => [m[0], m[1], m[2] - walk * u] : m, dist: [d0, d1], height: h, lookH }, d);
      case "macroTopDown": return macroTopDown({ ...c, target: [m[0], 0.8, m[2]], height: Math.max(0.15, h - 0.8) }, d);
      case "orbit": return orbit({ ...c, target: [m[0], lookH, m[2]], radius: d0, height: h, a0: p.a0, a1: p.a1, lookH: 0 }, d);
      case "povHandheld": return povHandheld({ ...c, from: [m[0], 1.6, m[2] + d0], to: [m[0], 1.6, m[2] + d1] }, d);
      case "pullBack": return pullBack({ ...c, from: [m[0] + 0.3, h, m[2] + d0], target: [m[0], lookH, m[2]], amount: Math.max(0.02, (d1 - d0) / d0), rise: 0.3 }, d);
      case "pushIn": return pushIn({ ...c, from: [m[0] + 0.3, h, m[2] + d0], target: [m[0], lookH, m[2]], amount: Math.max(0.02, (d0 - d1) / d0) }, d);
      case "whipPan": return whipPan({ ...c, pos: [m[0], h, m[2] + d0], lookA: [m[0], lookH, m[2]], lookB: [m[0] + 3, lookH, m[2]] }, d);
      default: throw new Error(`unknown camera preset ${preset}`);
    }
  });
