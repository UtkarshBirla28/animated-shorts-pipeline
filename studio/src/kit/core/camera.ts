// REAL-WORLD KIT camera grammar. Targets (his NEW-8 medians, research_notes/ricksclips/LOOK_REPORT.md): camera speed
// median 0.72 % of the frame per frame, ~43 % fast frames (> 1 %/f), ~17 % still (< 0.15 %/f); low wide lenses (camera
// 0.1-0.6 m, vertical FOV 60-75 deg), drone / top-down wides, POV, macro inserts; moves that TRAVEL through space.
// Every preset is `(params, dur) => (u) => CamState` with u = seconds since the SHOT start (0..dur). `shotCam(from, to,
// mk)` turns one into a ShotDef cam (FILM time). Subjects / targets can be a point or a function of u. Handheld shake is
// seeded value noise (pure function of u). `camSpeedStats` estimates the on-screen speed with the same formula as
// look_metrics.py, so WORKFLOW's validator can check a shot before it renders.
import * as THREE from "three";
import type { CamState, V3 } from "./ctx";

export type Sub = V3 | ((u: number) => V3);
export type Ease = "linear" | "in" | "out" | "inOut" | "inOut5";
export type CamFn = (u: number) => CamState;
export type Common = {
  /** vertical FOV in degrees (72 = the pilot's ~25 mm full-frame look on 9:16) */
  fov?: number;
  ease?: Ease;
  /** handheld micro-shake 0..1 (0.25 = a steady operator, 1 = running POV) */
  shake?: number;
  seed?: number;
  fnum?: number;
  /** focus distance (m); default: the distance to the look point (the subject) */
  focus?: number;
  /** constant roll in degrees (dutch) */
  roll?: number;
};

// ---------------------------------------------------------------- maths helpers
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const EASE: Record<Ease, (x: number) => number> = {
  linear: (x) => clamp01(x),
  in: (x) => { const u = clamp01(x); return u * u * u; },
  out: (x) => { const u = 1 - clamp01(x); return 1 - u * u * u; },
  inOut: (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); },
  inOut5: (x) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); },
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const at = (s: Sub, u: number): V3 => (typeof s === "function" ? s(u) : s);
const D2R = Math.PI / 180;

/** seeded 1D value noise in [-1, 1] (quintic), pure */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, k = f * f * f * (f * (f * 6 - 15) + 10);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), k) * 2 - 1;
};
/** fractal shake noise: 3 octaves */
const fbm = (x: number, seed: number) => noise1(x, seed) * 0.6 + noise1(x * 2.13 + 7.1, seed + 3) * 0.28 + noise1(x * 4.71 + 3.3, seed + 7) * 0.12;

/** add handheld micro-shake to a camera state (position jitter + aim wobble + roll), pure in u */
export const withShake = (c: CamState, u: number, amount = 0.25, seed = 1, rate = 1): CamState => {
  if (amount <= 0) return c;
  const t = u * rate;
  const d = len(sub(c.look, c.pos)) || 1;
  const fwd = norm(sub(c.look, c.pos)), right = norm(cross(fwd, [0, 1, 0])), up = cross(right, fwd);
  const p = 0.012 * amount, a = 0.0055 * amount * d;     // ~1.2 cm, ~0.3 deg at amount 1
  const pos = add(add(add(c.pos, mul(right, p * fbm(t * 1.1, seed))), mul(up, p * fbm(t * 1.3, seed + 11))), mul(fwd, p * 0.5 * fbm(t * 0.7, seed + 23)));
  const look = add(add(c.look, mul(right, a * fbm(t * 0.9, seed + 31))), mul(up, a * 0.8 * fbm(t * 1.05, seed + 41)));
  return { ...c, pos, look, roll: (c.roll ?? 0) + 0.35 * D2R * amount * fbm(t * 0.6, seed + 53) };
};
const finish = (c: CamState, p: Common, u: number): CamState => {
  const out = withShake({ ...c, roll: (c.roll ?? 0) + (p.roll ?? 0) * D2R }, u, p.shake ?? 0.2, p.seed ?? 1);
  if (p.fnum) out.fnum = p.fnum;
  out.focus = p.focus ?? len(sub(c.look, c.pos));
  return out;
};

// ---------------------------------------------------------------- the presets
/** LOW WIDE TRACK (the pilot shot): knee-height wide lens tracking ahead of / beside a subject. The camera sits on the
 *  subject's `axis` side (horizontal unit vector subject -> camera, default +Z) at a distance easing dist[0] -> dist[1],
 *  sliding sideways side[0] -> side[1] (m, + = camera right) at `height`. Strong parallax near the lens. */
export const lowWideTrack = (p: Common & { subject: Sub; axis?: V3; dist?: [number, number]; side?: [number, number]; height?: number | [number, number]; lookH?: number }, dur: number): CamFn => {
  const ax = norm([(p.axis ?? [0, 0, 1])[0], 0, (p.axis ?? [0, 0, 1])[2]]), right = cross([0, 1, 0], ax);
  const [d0, d1] = p.dist ?? [3.2, 2.0], [s0, s1] = p.side ?? [-0.4, 0.55];
  const [h0, h1] = Array.isArray(p.height) ? p.height : [p.height ?? 0.55, p.height ?? 0.55];
  const E = EASE[p.ease ?? "inOut5"];
  return (u) => {
    const k = E(u / dur), s = at(p.subject, u);
    const d = d0 * Math.pow(d1 / d0, k);
    // `subject` is the subject's GROUND point (feet): camera height and aim height are above it
    const pos = add(add([s[0], 0, s[2]], mul(ax, d)), mul(right, lerp(s0, s1, k)));
    pos[1] = s[1] + lerp(h0, h1, k);
    const look: V3 = [s[0] + right[0] * lerp(s0, s1, k) * 0.12, s[1] + (p.lookH ?? 1.1), s[2] + right[2] * lerp(s0, s1, k) * 0.12];
    return finish({ pos, look, fov: p.fov ?? 72 }, p, u);
  };
};
/** PUSH IN: dolly from `from` toward `target`, covering `amount` of the distance (default 0.4), a slight rise / fall
 *  (`rise` m) and an optional zoom (`fovTo`). */
export const pushIn = (p: Common & { from: V3; target: Sub; amount?: number; rise?: number; fovTo?: number }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "inOut5"];
  return (u) => {
    const k = E(u / dur), tg = at(p.target, u);
    const pos = lerp3(p.from, tg, (p.amount ?? 0.4) * k); pos[1] += (p.rise ?? 0) * k;
    return finish({ pos, look: tg, fov: lerp(p.fov ?? 60, p.fovTo ?? p.fov ?? 60, k) }, p, u);
  };
};
/** PULL BACK (reveal): dolly away from `target` along target -> from, by `amount` x the start distance, rising `rise` m */
export const pullBack = (p: Common & { from: V3; target: Sub; amount?: number; rise?: number; fovTo?: number }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "inOut5"];
  return (u) => {
    const k = E(u / dur), tg = at(p.target, u), dir = sub(p.from, tg);
    const pos = add(p.from, mul(dir, (p.amount ?? 0.8) * k)); pos[1] += (p.rise ?? 0.5) * k;
    return finish({ pos, look: tg, fov: lerp(p.fov ?? 60, p.fovTo ?? p.fov ?? 60, k) }, p, u);
  };
};
/** DRONE RISE: from a low start, rise `rise` m while flying `forward` m toward the target (horizontal), the aim easing
 *  from `target` to `lookTo` (default: the target); wide (60 deg) and smooth (shake 0.08). */
export const droneRise = (p: Common & { start: V3; target: Sub; rise?: number; forward?: number; lookTo?: Sub }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "inOut"];
  return (u) => {
    const k = E(u / dur), tg = at(p.target, u);
    const h = norm([tg[0] - p.start[0], 0, tg[2] - p.start[2]]);
    const pos = add(p.start, [h[0] * (p.forward ?? 6) * k, (p.rise ?? 12) * k, h[2] * (p.forward ?? 6) * k]);
    const look = p.lookTo ? lerp3(tg, at(p.lookTo, u), k) : tg;
    return finish({ pos, look, fov: p.fov ?? 60 }, { shake: 0.08, ...p }, u);
  };
};
/** CRANE DOWN: from high `start` down to `endH` (eye level) moving `travel` m toward the target; the aim stays on it */
export const craneDown = (p: Common & { start: V3; target: Sub; endH?: number; travel?: number }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "inOut5"];
  return (u) => {
    const k = E(u / dur), tg = at(p.target, u);
    const h = norm([tg[0] - p.start[0], 0, tg[2] - p.start[2]]);
    const pos: V3 = [p.start[0] + h[0] * (p.travel ?? 2) * k, lerp(p.start[1], p.endH ?? 1.5, k), p.start[2] + h[2] * (p.travel ?? 2) * k];
    return finish({ pos, look: tg, fov: p.fov ?? 62 }, { shake: 0.12, ...p }, u);
  };
};
/** ORBIT: around `target` at `radius`, `height`, azimuth a0 -> a1 (deg; 0 = on +Z, 90 = on +X) */
export const orbit = (p: Common & { target: Sub; radius?: number; height?: number; a0?: number; a1?: number; lookH?: number }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "inOut"];
  return (u) => {
    const k = E(u / dur), tg = at(p.target, u), a = lerp(p.a0 ?? -25, p.a1 ?? 25, k) * D2R, r = p.radius ?? 4;
    const pos: V3 = [tg[0] + Math.sin(a) * r, (p.height ?? 1.4), tg[2] + Math.cos(a) * r];
    return finish({ pos, look: [tg[0], tg[1] + (p.lookH ?? 0), tg[2]], fov: p.fov ?? 55 }, p, u);
  };
};
/** FOLLOW SIDE: truck alongside a moving subject (profile), `side` m off its path (+ = on the subject's RIGHT, - = on its
 *  left, relative to its own heading), `lead` m ahead, at `height`; the heading comes from the subject's own motion */
export const followSide = (p: Common & { subject: (u: number) => V3; side?: number; lead?: number; height?: number; lookH?: number }, dur: number): CamFn => {
  void dur;
  return (u) => {
    const s = p.subject(u), s2 = p.subject(u + 0.25), s0 = p.subject(u - 0.25);
    const hd = norm([s2[0] - s0[0], 0, s2[2] - s0[2]]), right = cross(hd, [0, 1, 0]);
    const pos = add(add(s, mul(right, p.side ?? 3.2)), mul(hd, p.lead ?? 0.4)); pos[1] = p.height ?? 0.9;
    const look: V3 = [s[0] + hd[0] * (p.lead ?? 0.4) * 0.6, p.lookH ?? 1.05, s[2] + hd[2] * (p.lead ?? 0.4) * 0.6];
    return finish({ pos, look, fov: p.fov ?? 62 }, { shake: 0.3, ...p }, u);
  };
};
/** POV HANDHELD: eye-height walk from `from` to `to` (or along `path(u)`), looking `look` (default ahead, 6 m), with a
 *  step bob (`stepHz` ~1.9 steps/s) and strong shake */
export const povHandheld = (p: Common & { from?: V3; to?: V3; path?: (u: number) => V3; look?: Sub; stepHz?: number; bob?: number }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "linear"];
  return (u) => {
    const k = E(u / dur);
    const base = p.path ? p.path(u) : lerp3(p.from ?? [0, 1.62, 4], p.to ?? [0, 1.62, 0], k);
    const ph = u * (p.stepHz ?? 1.9) * Math.PI;
    const bob = p.bob ?? 0.025;
    const pos: V3 = [base[0] + Math.sin(ph) * bob * 0.6, base[1] + Math.abs(Math.cos(ph)) * bob - bob * 0.5, base[2]];
    let look: V3;
    if (p.look) look = at(p.look, u);
    else { const nx = p.path ? p.path(u + 0.2) : lerp3(p.from ?? [0, 1.62, 4], p.to ?? [0, 1.62, 0], E((u + 0.2) / dur)); const f = norm(sub(nx, base)); look = add(base, mul([f[0], -0.06, f[2]], 6)); }
    return finish({ pos, look, fov: p.fov ?? 70, roll: Math.sin(ph) * 0.6 * D2R }, { shake: 0.7, ...p }, u);
  };
};
/** MACRO TOP-DOWN: inches above a prop looking (almost) straight down, a slow slide `slide` [dx, dz] m and a turn `turn`
 *  (deg); narrow lens, shallow focus (f/2) */
export const macroTopDown = (p: Common & { target: V3; height?: number; slide?: [number, number]; turn?: number; tilt?: number }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "inOut"];
  return (u) => {
    const k = E(u / dur), sl = p.slide ?? [0.06, -0.04], h = p.height ?? 0.28;
    const a = (p.turn ?? 12) * D2R * (k - 0.5), tilt = p.tilt ?? 0.08;
    const c: V3 = [p.target[0] + sl[0] * (k - 0.5), p.target[1], p.target[2] + sl[1] * (k - 0.5)];
    const pos: V3 = [c[0] + Math.sin(a) * h * tilt, c[1] + h, c[2] + Math.cos(a) * h * tilt];
    // a tiny offset of the aim keeps lookAt well defined when looking straight down; the turn is the roll
    return finish({ pos, look: [c[0] - Math.sin(a) * 0.001, c[1], c[2] - Math.cos(a) * 0.001], fov: p.fov ?? 40 }, { fnum: 2.0, shake: 0.1, ...p }, u);
  };
};
/** LOCKED WITH DRIFT: a nearly static frame with a slow drift (`drift` m over the shot) and a breath of shake */
export const lockedWithDrift = (p: Common & { pos: V3; look: Sub; drift?: V3 }, dur: number): CamFn => {
  const E = EASE[p.ease ?? "linear"];
  return (u) => {
    const k = E(u / dur), dr = p.drift ?? [0.12, 0.02, -0.1];
    return finish({ pos: add(p.pos, mul(dr, k)), look: at(p.look, u), fov: p.fov ?? 55 }, { shake: 0.12, ...p }, u);
  };
};

// ---------------------------------------------------------------- whip pans (transitions)
const yawLook = (c: CamState, deg: number): CamState => {
  const d = sub(c.look, c.pos), a = deg * D2R, cs = Math.cos(a), sn = Math.sin(a);
  return { ...c, look: add(c.pos, [d[0] * cs + d[2] * sn, d[1], -d[0] * sn + d[2] * cs]) };
};
/** WHIP OUT: the last `len` s of a shot whip-pan away (accelerating, `deg` total across the cut, `dir` 1 = to the
 *  right). Pair with `whipIn` on the next shot; cut on the blur peak. */
export const whipOut = (cam: CamFn, dur: number, o: { dir?: 1 | -1; len?: number; deg?: number } = {}): CamFn => {
  const L = o.len ?? 0.27, D = (o.deg ?? 80) / 2, s = -(o.dir ?? 1);
  return (u) => { const c = cam(u), k = clamp01((u - (dur - L)) / L); return k > 0 ? yawLook(c, s * D * k * k * k) : c; };
};
/** WHIP IN: the first `len` s of a shot arrive from a whip (decelerating), matching whipOut's speed at the cut */
export const whipIn = (cam: CamFn, o: { dir?: 1 | -1; len?: number; deg?: number } = {}): CamFn => {
  const L = o.len ?? 0.27, D = (o.deg ?? 80) / 2, s = -(o.dir ?? 1);
  return (u) => { const c = cam(u), k = clamp01(u / L); return k < 1 ? yawLook(c, -s * D * (1 - k) * (1 - k) * (1 - k)) : c; };
};
/** WHIP PAN within one shot: hold on look A, whip to look B at `at` s (len s), hold */
export const whipPan = (p: Common & { pos: V3; lookA: V3; lookB: V3; at?: number; len?: number }, dur: number): CamFn => {
  return (u) => {
    const m = p.at ?? dur / 2, L = p.len ?? 0.35, k = EASE.inOut5((u - (m - L / 2)) / L);
    const dA = sub(p.lookA, p.pos), dB = sub(p.lookB, p.pos);
    const aA = Math.atan2(dA[0], dA[2]), aB = Math.atan2(dB[0], dB[2]);
    let da = aB - aA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const a = aA + da * k, r = Math.hypot(dA[0], dA[2]) * (1 - k) + Math.hypot(dB[0], dB[2]) * k, y = lerp(dA[1], dB[1], k);
    return finish({ pos: p.pos, look: [p.pos[0] + Math.sin(a) * r, p.pos[1] + y, p.pos[2] + Math.cos(a) * r], fov: p.fov ?? 60 }, { shake: 0.25, ...p }, u);
  };
};

// ---------------------------------------------------------------- shots
/** a ShotDef cam from a preset: `cam: shotCam(0, 90, (d) => lowWideTrack({...}, d))` (frames [from, to) at 30 fps) */
export const shotCam = (from: number, to: number, mk: (dur: number) => CamFn): ((t: number) => CamState) => {
  const dur = (to - from) / 30, f = mk(dur), t0 = from / 30;
  return (t) => f(t - t0);
};
/** a subject that moves on FILM time, seen from a shot starting at frame `from` (u = shot seconds) */
export const onShot = (from: number, fn: (t: number) => V3) => (u: number) => fn(u + from / 30);

// ---------------------------------------------------------------- on-screen speed (look_metrics.py formula)
const camA = new THREE.PerspectiveCamera(), camB = new THREE.PerspectiveCamera(), v = new THREE.Vector3();
const place = (c: THREE.PerspectiveCamera, s: CamState, aspect: number) => {
  c.fov = s.fov; c.aspect = aspect; c.near = 0.05; c.far = 5000; c.updateProjectionMatrix();
  c.position.set(...s.pos); c.up.set(0, 1, 0); c.lookAt(...s.look); if (s.roll) c.rotateZ(s.roll); c.updateMatrixWorld();
};
export type SpeedStats = { median: number; p90: number; mean: number; fastShare: number; stillShare: number; frames: number; perFrame: number[] };
/** % of the frame per frame between consecutive frames [from, to), the look_metrics.py formula: points are projected
 *  through both cameras, a 2D similarity is fitted, speed = centre shift as % of width / height + |ln scale| x 100
 *  (rotation about the centre / roll does not count, as there).
 *  Default depth model ("frame", 2026-11-19 after WORKFLOW's caveat): a real frame is mostly BACKGROUND, so the 8 x 14
 *  grid puts the central subject region (|x| < 0.3, |y| < 0.35 of the half-frame, ~10 % of the points) at the look
 *  distance and every other point at the background depth `bgDepth` (default 3 x the look distance, clamped 5-60 m).
 *  An orbit / follow that keeps its subject centred now reads as the background sliding past (as look_metrics sees it).
 *  `depthK` (legacy) puts EVERY point at k x the look distance instead (e.g. [0.7, 1, 2]). */
export const camSpeedStats = (cam: (t: number) => CamState, from: number, to: number, o: { aspect?: number; depthK?: number[]; bgDepth?: number } = {}): SpeedStats => {
  const aspect = o.aspect ?? 9 / 16, W = 540, H = 960;
  const per: number[] = [];
  for (let f = from; f < to - 1; f++) {
    const A = cam(f / 30), B = cam((f + 1) / 30);
    place(camA, A, aspect); place(camB, B, aspect);
    const d0 = Math.max(0.3, len(sub(A.look, A.pos)));
    const P: number[] = [], Q: number[] = [];
    const pt = (nx: number, ny: number, depth: number) => {
      v.set(nx, ny, 0.5).unproject(camA).sub(camA.position).normalize().multiplyScalar(depth).add(camA.position);
      const q = v.clone().project(camB);
      if (!Number.isFinite(q.x) || q.z > 1 || q.z < -1) return;
      P.push((nx * 0.5 + 0.5) * W, (0.5 - ny * 0.5) * H); Q.push((q.x * 0.5 + 0.5) * W, (0.5 - q.y * 0.5) * H);
    };
    if (o.depthK) {
      for (const k of o.depthK) for (let iy = 0; iy < 10; iy++) for (let ix = 0; ix < 6; ix++) pt(-0.9 + (1.8 * ix) / 5, -0.9 + (1.8 * iy) / 9, d0 * k);
    } else {
      const bg = o.bgDepth ?? Math.min(60, Math.max(5, d0 * 3));
      for (let iy = 0; iy < 14; iy++) for (let ix = 0; ix < 8; ix++) {
        const nx = -0.92 + (1.84 * ix) / 7, ny = -0.92 + (1.84 * iy) / 13;
        pt(nx, ny, Math.abs(nx) < 0.3 && Math.abs(ny) < 0.35 ? d0 : Math.max(bg, d0 * 1.05));
      }
    }
    const n = P.length / 2;
    if (n < 6) { per.push(NaN); continue; }
    let mx = 0, my = 0, qx = 0, qy = 0;
    for (let i = 0; i < n; i++) { mx += P[2 * i]; my += P[2 * i + 1]; qx += Q[2 * i]; qy += Q[2 * i + 1]; }
    mx /= n; my /= n; qx /= n; qy /= n;
    let sa = 0, sb = 0, ss = 0;
    for (let i = 0; i < n; i++) {
      const x = P[2 * i] - mx, y = P[2 * i + 1] - my, x2 = Q[2 * i] - qx, y2 = Q[2 * i + 1] - qy;
      sa += x * x2 + y * y2; sb += x * y2 - y * x2; ss += x * x + y * y;
    }
    const a = sa / ss, b = sb / ss, s = Math.hypot(a, b);
    const cx = W / 2, cy = H / 2;
    const ncx = a * (cx - mx) - b * (cy - my) + qx, ncy = b * (cx - mx) + a * (cy - my) + qy;
    per.push(Math.hypot((ncx - cx) / W, (ncy - cy) / H) * 100 + Math.abs(Math.log(s)) * 100);
  }
  const ok = per.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  const q = (p: number) => (ok.length ? ok[Math.min(ok.length - 1, Math.floor(p * ok.length))] : 0);
  return { median: q(0.5), p90: q(0.9), mean: ok.reduce((s, x) => s + x, 0) / Math.max(1, ok.length), fastShare: ok.filter((x) => x > 1).length / Math.max(1, ok.length),
    stillShare: ok.filter((x) => x < 0.15).length / Math.max(1, ok.length), frames: ok.length, perFrame: per };
};
/** pass / fail against his targets for a whole film's per-frame speeds (median >= 0.7, fast >= 35 %, still <= 20 %) */
export const speedVerdict = (s: Pick<SpeedStats, "median" | "fastShare" | "stillShare">) => ({
  median: s.median >= 0.7, fast: s.fastShare >= 0.35, still: s.stillShare <= 0.2,
  ok: s.median >= 0.7 && s.fastShare >= 0.35 && s.stillShare <= 0.2,
});
