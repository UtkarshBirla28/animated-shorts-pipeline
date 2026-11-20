// KIT CORE proof film: 3 shots, 6 s, one set (a copy of the pilot world), three camera presets, two rigs.
//  s1 golden  lowWideTrack: knee-height wide lens tracking ahead of the phone guy (the pilot shot, faster)
//  s2 golden  followSide:   profile truck from the lawn, the bench wiping the foreground, whip-pan out at the end
//  s3 dusk    droneRise:    arrives from the whip, rises over the path as the street lamps glow
import type { Film, ShotDef, V3 } from "../../kit/core/ctx";
import { shotCam, onShot, lowWideTrack, followSide, droneRise, whipOut, whipIn, lockedWithDrift } from "../../kit/core/camera";
import { buildPath } from "./sets/path";
import { buildRoom } from "./sets/room";
import { buildPhoneSet, povCam, phoneAt } from "./sets/phone";
import { charPos } from "./sets/pilot_shot";
import { mkLights, type LightTest } from "./sets/lights";

const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const FILM: Film = {
  slug: "kit_core_test", fps: 30, total: 180, cardLight: "scene",     // the pilot card reads directionalShadowMap[1]
  sets: { path: buildPath },
  shots: [
    { id: "s1", from: 0, to: 60, set: "path", rig: "golden",
      cam: shotCam(0, 60, (d) => lowWideTrack({ subject: onShot(0, charPos), axis: [0, 0, 1], dist: [3.4, 2.0], side: [-0.45, 0.55], height: [0.6, 0.66], lookH: 1.12, fov: 72, shake: 0.25 }, d)) },
    { id: "s2", from: 60, to: 120, set: "path", rig: "golden",
      cam: shotCam(60, 120, (d) => whipOut(followSide({ subject: onShot(60, charPos), side: -3.2, lead: 0.5, height: 0.85, lookH: 1.0, fov: 64, shake: 0.3 }, d), d, { dir: 1, len: 0.3, deg: 90 })) },
    { id: "s3", from: 120, to: 180, set: "path", rig: "dusk",
      cam: shotCam(120, 180, (d) => whipIn(droneRise({ start: [1.1, 0.8, 2.6], target: onShot(120, (t) => up(charPos(t), 1.0)), rise: 3.6, forward: 2.2, fov: 62 }, d), { dir: 1, len: 0.3, deg: 90 })) },
  ],
};

// RIG SHEET: one frame per rig, the same camera (the pilot's view at ~2.4 s), for look checks of every rig
const RIG_NAMES = ["golden", "morning", "noon", "overcastWarm", "dusk", "interiorWarm", "nightPractical"];
const sheetCam = lockedWithDrift({ pos: [0.1, 0.64, -0.75], look: [0.1, 1.15, -6.0], fov: 72, drift: [0, 0, 0], shake: 0 }, 1);
export const RIG_SHEET: Film = {
  slug: "kit_core_rigs", fps: 30, total: RIG_NAMES.length, cardLight: "scene",
  sets: { path: buildPath },
  shots: RIG_NAMES.map((rig, i): ShotDef => ({ id: rig, from: i, to: i + 1, set: "path", rig, cam: () => sheetCam(0) })),
};

// ROOM TEST: the interior rigs + practicals + GI on a small test room (frames 0-29 interiorWarm by day, 30-59 the same room
// at night under nightPractical)
const roomCam = lockedWithDrift({ pos: [-0.4, 1.45, 2.3], look: [0.35, 0.95, -1.6], fov: 76, drift: [0.12, 0, -0.1], shake: 0.1 }, 1);
export const ROOM: Film = {
  slug: "kit_core_room", fps: 30, total: 60,
  sets: { room: buildRoom },
  shots: [
    { id: "day", from: 0, to: 30, set: "room", rig: "interiorWarm", cam: (t) => roomCam(t) },
    { id: "night", from: 30, to: 60, set: "room", rig: "nightPractical", cam: (t) => roomCam(t - 1) },
  ],
};

// PHONE TEST (K-K1): p1 = full-frame phone POV (the record UI overlay); p2 = over the shoulder onto the phone in hand:
// its screen replays the scene 2.5 s earlier from the POV camera (record UI on the screen), the live scene behind
export const PHONE: Film = {
  slug: "kit_core_phone", fps: 30, total: 120, cardLight: "scene",
  sets: { phone: buildPhoneSet },
  shots: [
    { id: "p1", from: 0, to: 45, set: "phone", rig: "golden", cam: (t) => povCam(t) },
    { id: "p2", from: 45, to: 120, set: "phone", rig: "golden",
      cam: (t) => { const p = phoneAt(t).pos; return { pos: [p[0] + 0.2, p[1] + 0.13, p[2] + 0.42 - 0.03 * (t - 1.5)], look: [p[0] - 0.02, p[1] - 0.005, p[2]], fov: 42, fnum: 2.8 }; } },
  ],
};

// LIGHT BUDGET TEST: one frame per variant (each still = a fresh browser = a clean shader compile); the frame number
// picks the variant. `kit compile ...` in the log = the compile time for that number of lights (12 lit programs).
export const LIGHT_VARIANTS: [string, LightTest][] = [
  ["base", {}], ["rect4", { rect: 4 }], ["rect8", { rect: 8 }], ["rect16", { rect: 16 }],
  ["point8", { point: 8 }], ["point16", { point: 16 }], ["spot8", { spot: 8 }], ["spot16", { spot: 16 }],
  ["row16", { glow: 16 }],                                         // 16 glow-only panels + 2 long rect lights
  ["nyc18", { rect: 16, spot: 2, shadowSpots: 2 }],                // the NY station's count: 16 rect + 2 shadowed spots
  ["early8", { rect: 8, early: true }],                            // a render inside the first update (capture)
];
const hallCam = lockedWithDrift({ pos: [-6.2, 1.55, -0.6], look: [1.5, 1.1, -3.4], fov: 72, drift: [0, 0, 0], shake: 0 }, 1);
export const LIGHTS: Film = {
  slug: "kit_core_lights", fps: 30, total: LIGHT_VARIANTS.length,
  sets: Object.fromEntries(LIGHT_VARIANTS.map(([id, v]) => [id, mkLights(v)])),
  shots: LIGHT_VARIANTS.map(([id], i): ShotDef => ({ id, from: i, to: i + 1, set: id, rig: "nightPractical", cam: () => hallCam(0) })),
};
// OFF-LAMP TEST: "blink" = a lamp dimmed to 0 for the first half second with lamp.set(0) (must NOT recompile or stall);
// "hide" = the wrong way, a lamp group hidden with .visible (must trigger the pipeline's warnings: kit-recompile)
export const BLINK: Film = {
  slug: "kit_core_blink", fps: 30, total: 60,
  sets: { blink: mkLights({ rect: 2, point: 2, spot: 2, shadowSpots: 1, blink: true }), hide: mkLights({ rect: 2, point: 2, spot: 2, shadowSpots: 1, hide: true, at: 1.5 }) },
  shots: [
    { id: "blink", from: 0, to: 30, set: "blink", rig: "nightPractical", cam: () => hallCam(0) },
    { id: "hide", from: 30, to: 60, set: "hide", rig: "nightPractical", cam: () => hallCam(0) },
  ],
};
