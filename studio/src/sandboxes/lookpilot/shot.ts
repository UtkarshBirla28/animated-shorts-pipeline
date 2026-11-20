// LOOK PILOT (three.js route): the one 5-s shot as pure functions of continuous time t (seconds), so the renderer can
// sample any sub-frame time (camera motion blur by accumulation). World units are metres, Y up. The path runs along Z:
// the phone guy walks toward +Z (toward the lens), the camera tracks backward (+Z) ahead of him at knee height.
export type V3 = [number, number, number];
export const FPS = 30;
export const FRAMES = 150;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const ease = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// ---------------- the phone guy ----------------
/** walking speed (m/s): the "phone" gait's stride (0.9 m) at a brisk-but-chatting cadence (~16 f per step) */
export const WALK_V = 0.85;
export const CHAR_Z0 = -4.7;
/** his ground point (feet) at time t: straight down the path with a slow phone-walker's weave */
export const charPos = (t: number): V3 => [0.32 + 0.09 * Math.sin(t * 1.25 + 0.6) + 0.03 * Math.sin(t * 2.9), 0, CHAR_Z0 + WALK_V * t];
/** metres walked by time t (feeds walkPhase, so the stance foot never slides) */
export const charMetres = (t: number) => WALK_V * t + 0.37;

// ---------------- the camera ----------------
/** vertical FOV 72 deg on the 9:16 frame = ~25 mm full-frame equivalent (diagonal) */
export const FOV = 72;
export const LENS_MM = 25;
/** camera-to-subject distance: 3.55 m (figure ~35 % of the frame) -> 2.15 m (~55 %), eased so the scale change is even */
const distAt = (t: number) => 3.25 * Math.pow(1.95 / 3.25, ease(t / 5) * 0.85 + 0.15 * (t / 5));
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export const camAt = (t: number): Cam => {
  const c = charPos(t), d = distAt(t);
  // sideways drift: the camera slides from the path's left half to its right half while it backs up (strong parallax on
  // the hedge, the trunks, the lamp and the bench); a small handheld-ish float on top (two slow sines, no noise)
  const u = ease(t / 5);
  const x = -0.38 + 0.95 * u + 0.025 * Math.sin(t * 1.7 + 0.3);
  const y = 0.62 + 0.03 * Math.sin(t * 2.1 + 1.1) + 0.04 * u;
  const z = c[2] + d;
  // aim: his chest, a touch above, so his feet sit low in frame and the canopy fills the top
  const look: V3 = [c[0] * 0.6 + 0.1 * (x - c[0]) - 0.05, 1.12 + 0.05 * u, c[2] - 0.6];
  return { pos: [x, y, z], look, fov: FOV, roll: 0.6 * Math.PI / 180 * Math.sin(t * 0.9 + 0.4) - 0.4 * Math.PI / 180 };
};
/** the focus distance (m) at t: on the phone guy */
export const focusAt = (t: number) => { const c = camAt(t).pos, p = charPos(t); return Math.hypot(c[0] - p[0], 1.2 - c[1], c[2] - p[2]); };

// ---------------- the sun ----------------
/** toward the sun: from behind-left of the subject (seen from the lens), low. Azimuth measured from the lens's forward (-Z)
 *  toward screen-left (-X), elevation above the horizon */
export const SUN_AZ = 48, SUN_EL = 28;
export const sunDir = (): V3 => {
  const a = (SUN_AZ * Math.PI) / 180, e = (SUN_EL * Math.PI) / 180;
  return [-Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)];
};

// ---------------- the cyclist (crosses behind him on the cross path) ----------------
export const CROSS_Z = -12.2;
export const cyclistAt = (t: number): { x: number; on: boolean; metres: number } => {
  const t0 = 0.4, v = 4.2;            // m/s, right -> left: behind him (x ~ 0) at t ~ 3 s
  const x = 11 - v * (t - t0);
  return { x, on: x > -12 && x < 13, metres: v * (t - t0) };
};

// ---------------- pigeons on the path (flutter up as he nears) ----------------
export type Pig = { x: number; z: number; face: 1 | -1; seed: number; tUp: number; dir: V3 };
export const PIGEONS: Pig[] = [
  { x: 0.62, z: -2.9, face: 1, seed: 1, tUp: 1.75, dir: [2.6, 0.9, -0.9] },
  { x: -0.42, z: -3.25, face: -1, seed: 2, tUp: 1.5, dir: [-2.4, 1.0, -0.7] },
  { x: 0.25, z: -2.45, face: 1, seed: 3, tUp: 2.15, dir: [2.1, 1.05, -1.3] },
];
