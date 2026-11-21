// kit/vehicles (TRAIN owner): K-P3, the fit-out of a Tokyo commuter car (E231 / E233 / E235-like), seen up close in
// the packed-car shots. Car-local frame with the FLOOR at y = 0 (the caller lifts it to D.floor), z' along the car
// (a cab car starts at the cab partition, D.cabDepth). Everything is lit by the car's OWN environment map (mats.ts
// carEnv: white ceiling + LED strips, daylight window bands, the grey floor) because three's sky IBL is not occluded.
// Long 7-seat benches in deep-green moquette between the doors (dished cushions with a worn nap on the front edge, low
// backs under the windows, a heater grille in the skirt, stainless 2-3-2 stanchions), white end partitions with a
// rounded top and a grab pole, blue-grey priority benches at the car ends with PICTOGRAM stickers and ORANGE strap
// rings, white rounded-triangle rings on grey straps on two full-length rails (instanced; they all swing with the
// car's sway: one shared signal + a per-strap lag, `carSway(t)`), stainless pipe + frosted-panel luggage racks, cream
// laminate walls with panel seams, 6 cm window reveals, roller blinds on some windows, the curved ceiling with panel
// joints, the centre duct louvres and two LED strip covers, BLANK ad frames over the windows and BLANK hanging ads
// over the aisle (pastel shapes only), two LCDs above every door (a route-dot pictogram whose highlight steps along,
// and an abstract pastel ad), the RED door lamp above every door (blinks while the leaves move), ribbed
// aluminium thresholds with the door guide slot + worn OCHRE strips at the doorways (never a clean yellow: the suitcase is the only one), a worn speckled vinyl floor (grime
// along the bench fronts and in the doorway corners, a polished walking line), a red extinguisher box, an intercom
// panel, the glass gangway door. No text anywhere.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { D, DOORS_CAB, DOORS_MID, windowsOf } from "./dims";
import { parts, rbox, box, cyl, quad, quadN, quadUV, meshes, dirtKey, tintKey, gridHoles, rng, sstep, tube, put } from "./geo";
import { vmat, glass, lamp, canvasTex, screenMat, carEnv, PAL } from "./mats";

/** the car's shared rock: lateral acceleration-like signal (-1..1), pure in t. Crowds use it with their own lag. */
export const carSway = (t: number) => 0.55 * Math.sin(t * 2 * Math.PI * 0.42) + 0.28 * Math.sin(t * 2 * Math.PI * 1.07 + 1.3) + 0.12 * Math.sin(t * 2 * Math.PI * 2.3 + 0.4);

export type InteriorJPOpts = {
  /** a cab car (the interior starts at the partition) */
  cab?: boolean;
  /** false = no wall handrails in the cab car's front standing zone (v4's v21: one ended at the kid's head) */
  frontRails?: boolean;
  /** door open fraction 0..1 at t (any side; drives the red door lamps: they BLINK while the leaves move) */
  doors?: (t: number) => number;
  /** the red door lamps while the doors STAND open: 0 = dark (default: only the blinking while they move is a checked
   *  fact), 1 = steady */
  doorLampOpen?: number;
  /** sway amount (0 = stopped, 1 = running at speed) at t */
  swayK?: (t: number) => number;
  /** the lateral sway signal (~ -1..1) felt `lag` s late (default carSway); films pass their crowd's rock for unison */
  sway?: (t: number, lag: number) => number;
  /** blinds: share of windows with the blind part down (default 0.2) */
  blinds?: number;
  /** the blank hanging ads over the aisle (default true; they hang down to 1.86 m: turn off for a camera that flies
   *  along the ceiling) */
  hangingAds?: boolean;
  /** colour overrides (sRGB hex) for a film's look: wall laminate, seats, priority seats, strap rings, floor */
  colors?: Partial<Record<"lam" | "seat" | "seatP" | "ringW" | "ringO" | "belt" | "floor" | "blind", string>>;
  seed?: number;
  /** add the two LED strips as real RECT practical lights too (default false: the environment map + the emissive
   *  covers already light the car, and every extra light costs every shader of the set) */
  lights?: boolean;
  lumens?: number;
};

const wrap = (t: THREE.Texture, tileM: number) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tileM, 1 / tileM); t.needsUpdate = true; return t; };
/** speckled vinyl: grey with dark / pale / tan chips, tileable (0.6 m) */
const speckleTex = () => wrap(canvasTex(512, 512, (g) => {
  g.fillStyle = "#7e8083"; g.fillRect(0, 0, 512, 512);
  const R = rng(91);
  for (let i = 0; i < 5600; i++) {
    const x = R() * 512, y = R() * 512, r = 0.6 + R() * 1.7, c = R();
    g.fillStyle = c < 0.45 ? "rgba(44,46,50,0.75)" : c < 0.82 ? "rgba(212,212,206,0.75)" : "rgba(128,104,80,0.6)";
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { if (x + dx < -4 || x + dx > 516 || y + dy < -4 || y + dy > 516) continue; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 6.3); g.fill(); }
  }
}), 0.6);
/** floor wear as roughness (G): a satin base, long polished streaks along the car, dull scuffed patches; tile 2.4 m */
const scuffTex = () => wrap(canvasTex(512, 512, (g) => {
  const R = rng(57), gv = (v: number, a: number) => `rgba(0,${Math.round(v * 255)},0,${a})`;
  g.fillStyle = gv(0.5, 1); g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { const x = R() * 512, w = 2 + R() * 14, y = R() * 512, L = 80 + R() * 380; g.fillStyle = gv(0.3 + R() * 0.1, 0.35); for (const dy of [-512, 0, 512]) g.fillRect(x, y + dy, w, L); }
  for (let i = 0; i < 60; i++) { const x = R() * 512, y = R() * 512, r = 10 + R() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, gv(0.72, 0.5)); gr.addColorStop(1, gv(0.72, 0)); g.fillStyle = gr; for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); }
  for (let i = 0; i < 160; i++) { g.strokeStyle = gv(0.75, 0.5); g.lineWidth = 0.8 + R() * 1.4; const x = R() * 512, y = R() * 512, a = R() * 6.3, L = 6 + R() * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
}, false), 2.4);
/** a blank poster: pastel shapes + pale "lines" (no text) */
const posterTex = (seed: number, w = 256, h = 184) => canvasTex(w, h, (g) => {
  // LOOK v2: saturated poster colours (were pastels on cream, which read as beige at distance)
  const R = rng(seed), pal = ["#e8452c", "#1f8fd6", "#f07a1a", "#2bb37a", "#d23f8f", "#6a4fd0", "#11a3a3"];
  g.fillStyle = ["#1d3f8a", "#f4f1ea", "#c8263c", "#0f7a5c", "#5b2fa8", "#f4f1ea", "#0f6a9a"][seed % 7]; g.fillRect(0, 0, w, h);
  g.fillStyle = pal[seed % pal.length]; g.fillRect(0, 0, w * (0.3 + 0.3 * R()), h);
  for (let i = 0; i < 4; i++) { g.fillStyle = pal[(R() * pal.length) | 0]; g.globalAlpha = 0.85; const x = R() * w, y = R() * h, r = 20 + R() * 60; if (R() < 0.5) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } else g.fillRect(x - r, y - r * 0.5, r * 2, r); }
  g.globalAlpha = 1; g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(w * 0.07, h * 0.76, w * 0.47, h * 0.055); g.fillRect(w * 0.07, h * 0.85, w * 0.31, h * 0.045);   // abstract "lines" (no text)
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
});
const lcdRouteTex = () => canvasTex(512, 160, (g) => {
  g.fillStyle = "#0d1a24"; g.fillRect(0, 0, 512, 160);
  g.fillStyle = "#0e6c3f"; g.fillRect(30, 74, 452, 12);
  for (let i = 0; i < 9; i++) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(40 + i * 54, 80, 11, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#0e6c3f"; g.beginPath(); g.moveTo(470, 40); g.lineTo(495, 55); g.lineTo(470, 70); g.fill();       // an arrow
  g.fillStyle = "#26384a"; g.fillRect(0, 0, 512, 22);
  for (let i = 0; i < 9; i++) { g.fillStyle = "#3d566c"; g.fillRect(28 + i * 54, 104, 24, 30); }                    // blank station tiles (no text)
});
const lcdAdTex = (seed: number) => canvasTex(512, 160, (g) => {
  const R = rng(seed + 7); const grd = g.createLinearGradient(0, 0, 512, 160); grd.addColorStop(0, "#f6d8c4"); grd.addColorStop(1, "#c9e4f2"); g.fillStyle = grd; g.fillRect(0, 0, 512, 160);
  for (let i = 0; i < 5; i++) { g.fillStyle = ["#ffffff", "#f2b38f", "#8fc7e8", "#bde3a8"][i % 4]; g.globalAlpha = 0.8; g.beginPath(); g.arc(R() * 512, R() * 160, 18 + R() * 40, 0, Math.PI * 2); g.fill(); }
});
const pictoTex = (kind: number) => canvasTex(128, 128, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#2f62b0"; g.fillRect(6, 6, 116, 116); g.fillStyle = "#ffffff";
  const head = (x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  if (kind === 0) { head(58, 30, 10); g.fillRect(50, 42, 16, 40); g.fillRect(50, 80, 6, 30); g.fillRect(60, 80, 6, 30); g.fillRect(70, 52, 4, 58); }          // cane
  else if (kind === 1) { head(62, 28, 10); g.beginPath(); g.ellipse(62, 66, 16, 24, 0, 0, Math.PI * 2); g.fill(); g.fillRect(54, 86, 6, 26); g.fillRect(64, 86, 6, 26); } // expecting
  else if (kind === 2) { head(52, 30, 10); g.fillRect(44, 42, 16, 40); g.fillRect(44, 80, 6, 30); g.fillRect(54, 80, 6, 30); head(80, 52, 7); g.fillRect(74, 60, 12, 16); } // with a child
  else { g.beginPath(); g.arc(64, 74, 26, 0, Math.PI * 2); g.lineWidth = 8; g.strokeStyle = "#fff"; g.stroke(); head(60, 30, 10); g.fillRect(54, 42, 12, 26); }   // wheelchair
});

/** a rounded-triangle strap ring (apex up), as one closed tube; ~11 cm high, 19 mm thick */
const ringGeo = () => {
  const pts: THREE.Vector3[] = [], W = 0.092, H = 0.104;
  const corners: [number, number][] = [[0, 0], [W / 2, -H], [-W / 2, -H]];
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 3];
    for (let k = 0; k < 6; k++) { const u = k / 6; pts.push(new THREE.Vector3(ax + (bx - ax) * u, ay + (by - ay) * u, 0)); }
  }
  const c = new THREE.CatmullRomCurve3(pts, true, "centripetal", 0.5);
  return new THREE.TubeGeometry(c, 60, 0.0095, 8, true);
};

export const interiorJP = async (ctx: KitCtx, o: InteriorJPOpts = {}): Promise<Built & { strapCount: number; lights: unknown[] }> => {
  const cab = !!o.cab, R = rng((o.seed ?? 5) * 31 + 7);
  const z0 = cab ? D.cabDepth : D.body0 + 0.04, z1 = D.body1 - 0.04, X = D.innerHW;
  const doors = cab ? DOORS_CAB : DOORS_MID, wins = windowsOf(doors, (cab ? 0.2 : D.body0) + 0.3, D.body1 - 0.3, cab);
  const env = carEnv(ctx, 1, 0), E = { envMap: env, env: 1 };
  const M: Record<string, THREE.Material> = {
    // LOOK v2 (2026-11-20, look director): warm floor, sky-blue panels, deep-blue seats, coloured ads, blue blinds
    // (was floor #ffffff grey speckle, laminate PAL.laminate #e6e4de, seats PAL.moquette #245240, priority PAL.priority, blind #cfc6ad)
    floor: vmat("in-floor", { color: "#c47a45", rough: 0.5, albedo: speckleTex(), roughMap: scuffTex(), dirtColor: "#3a3835", dirtRough: 0.8, tintK: 0.1, tintRough: 0.3, ...E }),
    lam: vmat("in-laminate", { color: "#cfe2f2", rough: 0.5, map: "satin", tile: 0.2, normalScale: 0.05, dirtColor: "#8a8478", dirtRough: 0.6, ...E }),
    lamDark: vmat("in-kick", { color: "#63666a", rough: 0.55, map: "peel", tile: 0.2, normalScale: 0.25, dirtColor: "#2c2a27", ...E }),
    ceil: vmat("in-ceiling", { color: PAL.ceiling, rough: 0.55, map: "satin", tile: 0.25, normalScale: 0.04, dirtColor: "#a8a398", dirtRough: 0.6, envMap: env, env: 1.75 }),
    louvre: vmat("in-louvre", { color: "#dedcd6", rough: 0.4, metal: 0.2, dirtColor: "#8d8778", ...E }),
    led: vmat("in-led", { color: "#ffffff", rough: 0.4, useDirt: false, emissive: "#fff5e6", emissiveIntensity: 2.0, ...E }),
    seat: vmat("in-moquette", { color: "#2453b8", rough: 0.92, map: "weave", tile: 0.05, normalScale: 0.7, dirtColor: "#587a64", dirtRough: 0.6, ...E }),
    seatP: vmat("in-moquette-prio", { color: "#d9542e", rough: 0.92, map: "weave", tile: 0.05, normalScale: 0.7, dirtColor: "#8a9bb0", dirtRough: 0.6, ...E }),
    frame: vmat("in-seatframe", { color: "#8a8e92", rough: 0.5, metal: 0.8, map: "brush", tile: 0.3, normalScale: 0.12, dirtColor: "#34322e", ...E }),
    chrome: vmat("in-pipe", { color: PAL.chrome, rough: 0.22, metal: 1, map: "brush", tile: 0.25, normalScale: 0.06, dirtColor: "#7d776c", dirtRough: 0.4, ...E }),
    frost: glass("in-frost", { tint: 0xd8dcdc, opacity: 0.5, rough: 0.5, ...E }),
    glass: glass("in-gangway", { tint: 0x0a0c0d, opacity: 0.1, ...E }),
    blind: vmat("in-blind", { color: "#6fb0e6", rough: 0.85, map: "weave", tile: 0.03, normalScale: 0.4, side: THREE.DoubleSide, dirtColor: "#9b9278", ...E }),
    yellow: vmat("in-floorstrip", { color: PAL.ochre, rough: 0.6, map: "ribs", tile: 0.04, normalScale: 0.5, dirtColor: "#4a4334", dirtRough: 0.8, ...E }),
    alu: vmat("in-threshold", { color: "#b0b3b5", rough: 0.42, metal: 1, map: "ribs", tile: 0.03, normalScale: 0.6, dirtColor: "#3e3b36", ...E }),
    red: vmat("in-red", { color: "#c8261e", rough: 0.4, ...E }),
    dark: vmat("in-dark", { color: "#121314", rough: 0.6, useDirt: false, ...E }),
    belt: vmat("in-belt", { color: "#73777b", rough: 0.75, map: "weave", tile: 0.02, normalScale: 0.6, useDirt: false, ...E }),
    ringW: vmat("in-ring", { color: "#f4f3ee", rough: 0.3, useDirt: false, ...E }),
    ringO: vmat("in-ring-prio", { color: "#ee8a2a", rough: 0.3, useDirt: false, ...E }),
    lcdFrame: vmat("in-lcdframe", { color: "#26282b", rough: 0.35, metal: 0.3, useDirt: false, ...E }),
    door: vmat("in-doorframe", { color: "#b7babd", rough: 0.5, metal: 1, map: "brush", tile: 0.3, normalScale: 0.1, dirtColor: "#3e3b36", ...E }),
    paper: vmat("in-paper", { color: "#f4f2ea", rough: 0.8, side: THREE.DoubleSide, useDirt: false, ...E }),
  };
  for (const [k, c] of Object.entries(o.colors ?? {})) { const m = M[k] as THREE.MeshStandardMaterial | undefined; if (m && c) m.color.set(c); }
  const P = parts();
  // ---- the floor: speckled vinyl, grime along the bench fronts + in the doorway corners, a polished walking line
  {
    const g = new THREE.PlaneGeometry(2 * X, z1 - z0, 14, Math.max(2, ((z1 - z0) / 0.25) | 0));
    g.rotateX(-Math.PI / 2); g.translate(0, 0, (z0 + z1) / 2);
    const p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
    put(P, "floor", g, false);
  }
  const atDoor = (z: number) => doors.some((d) => Math.abs(z - d) < D.doorW / 2 + 0.17);
  dirtKey(P, "floor", (x, _y, z) => {
    const ax = Math.abs(x), n = 0.5 + 0.5 * Math.sin(z * 2.3 + x * 3.1) * Math.sin(z * 0.71 + 1.3);
    if (atDoor(z)) return sstep(0.95, 1.36, ax) * (0.3 + 0.15 * n) + 0.08 * n;                      // doorway: dirt toward the threshold
    return sstep(0.66, 0.87, ax) * (0.48 + 0.25 * n) + 0.07 * n * n;                                  // aisle: grime along the bench fronts
  });
  tintKey(P, "floor", (x, _y, z) => (sstep(0.5, 0.05, Math.abs(x)) * 0.7 - 0.2) * (0.75 + 0.25 * Math.sin(z * 1.1)));

  // ---- walls (both sides): inner lining at x = +-X facing inward, holes for doors + windows
  const holes: { u0: number; u1: number; y0: number; y1: number; door: boolean }[] = [];
  for (const dz of doors) holes.push({ u0: dz - D.doorW / 2, u1: dz + D.doorW / 2, y0: 0, y1: D.doorH, door: true });
  for (const [a, b] of wins) holes.push({ u0: a, u1: b, y0: D.winY0, y1: D.winY1, door: false });
  const blindsShare = o.blinds ?? 0.2;
  const cy = (x: number) => D.ceilS + (D.ceilC - D.ceilS) * Math.cos((Math.min(1, Math.abs(x) / X) * Math.PI) / 2);
  for (const s of [1, -1]) {
    const x = s * X, In: V3 = [-s, 0, 0];
    const q = (k: string, u0: number, y0: number, u1: number, y1: number, xx = x) => quadN(P, k, [xx, y0, u0], [xx, y0, u1], [xx, y1, u1], [xx, y1, u0], In);
    /** a rounded box standing on the lining of side s, `a`..`b` metres INTO the car (negative = into the wall) */
    const wb = (k: string, a: number, b: number, y0: number, y1: number, u0: number, u1: number, r = 0.004) => rbox(P, k, s > 0 ? X - b : -X + a, y0, u0, s > 0 ? X - a : -X + b, y1, u1, r);
    gridHoles(z0, z1, 0.08, D.ceilS, holes, (u0, y0, u1, y1) => q("lam", u0, y0, u1, y1));
    gridHoles(z0, z1, 0, 0.08, holes.filter((h) => h.door), (u0, y0, u1, y1) => q("lamDark", u0, y0, u1, y1));
    // panel seams at the window piers (a hair line) + a row of screws under the rack
    for (const h of holes) if (!h.door) for (const u of [h.u0 - 0.1, h.u1 + 0.1]) box(P, "dark", s > 0 ? X - 0.0012 : -X, 0.08, u, s > 0 ? X : -X + 0.0012, D.ceilS, u + 0.002);
    for (const h of holes) {
      const xa = Math.min(x, s * D.hw * 0.999), xb = Math.max(x, s * D.hw * 0.999);
      if (!h.door) {
        // the 6 cm reveal (sill, head, jambs), a sill lip, the blind box + maybe a part-down blind
        rbox(P, "lam", xa - 0.002, h.y0 - 0.012, h.u0, xb, h.y0, h.u1, 0.004);
        rbox(P, "lam", xa - 0.002, h.y1, h.u0, xb, h.y1 + 0.012, h.u1, 0.004);
        rbox(P, "lam", xa - 0.002, h.y0, h.u0 - 0.012, xb, h.y1, h.u0, 0.004); rbox(P, "lam", xa - 0.002, h.y0, h.u1, xb, h.y1, h.u1 + 0.012, 0.004);
        wb("door", -0.002, 0.014, h.y0 - 0.02, h.y0 - 0.002, h.u0 - 0.02, h.u1 + 0.02, 0.005);
        wb("lam", 0, 0.05, h.y1 + 0.012, h.y1 + 0.055, h.u0 - 0.01, h.u1 + 0.01, 0.01);
        if (R() < blindsShare) {
          const drop = 0.22 + R() * 0.3, by = h.y1 - drop * (h.y1 - h.y0);
          quad(P, "blind", [s * (X + 0.02), by, h.u0 + 0.01], [s * (X + 0.02), by, h.u1 - 0.01], [s * (X + 0.02), h.y1, h.u1 - 0.01], [s * (X + 0.02), h.y1, h.u0 + 0.01]);
          rbox(P, "frame", s > 0 ? X + 0.005 : -X - 0.035, by - 0.02, h.u0 + 0.01, s > 0 ? X + 0.035 : -X - 0.005, by, h.u1 - 0.01, 0.006);
        }
        // BLANK ad frames over the window (aluminium frame, a pastel poster)
        if (h.u1 - h.u0 > 1.5) for (const c of [h.u0 + 0.55, h.u1 - 0.55]) {
          const y0 = D.ceilS - 0.31, y1 = D.ceilS - 0.035;
          wb("door", 0, 0.012, y0 - 0.014, y1 + 0.014, c - 0.4, c + 0.4, 0.004);
          const k = `poster${(R() * 6) | 0}`, xx = s * (X - 0.0135);
          if (s < 0) quadUV(P, k, [xx, y0, c + 0.385], [xx, y0, c - 0.385], [xx, y1, c - 0.385], [xx, y1, c + 0.385]);
          else quadUV(P, k, [xx, y0, c - 0.385], [xx, y0, c + 0.385], [xx, y1, c + 0.385], [xx, y1, c - 0.385]);
        }
      } else {
        // door frame posts + header, the pocket's black brush seals, the ribbed threshold + guide slot + yellow strip
        rbox(P, "door", s > 0 ? X - 0.035 : -D.hw + 0.03, 0, h.u0 - 0.05, s > 0 ? D.hw - 0.03 : -X + 0.035, D.doorH + 0.03, h.u0, 0.006);
        rbox(P, "door", s > 0 ? X - 0.035 : -D.hw + 0.03, 0, h.u1, s > 0 ? D.hw - 0.03 : -X + 0.035, D.doorH + 0.03, h.u1 + 0.05, 0.006);
        rbox(P, "lam", s > 0 ? X - 0.03 : -D.hw + 0.03, D.doorH, h.u0 - 0.05, s > 0 ? D.hw - 0.03 : -X + 0.03, D.doorH + 0.05, h.u1 + 0.05, 0.006);
        for (const u of [h.u0 - 0.004, h.u1 - 0.004]) box(P, "dark", s > 0 ? X + 0.0 : -D.hw + 0.058, 0.01, u, s > 0 ? D.hw - 0.058 : -X - 0.0, D.doorH, u + 0.008);
        rbox(P, "alu", s > 0 ? X - 0.13 : -D.hw + 0.02, -0.004, h.u0 - 0.03, s > 0 ? D.hw - 0.02 : -X + 0.13, 0.006, h.u1 + 0.03, 0.003);
        box(P, "dark", s > 0 ? D.hw - 0.045 : -D.hw + 0.031, 0.0, h.u0 - 0.6, s > 0 ? D.hw - 0.031 : -D.hw + 0.045, 0.0068, h.u1 + 0.6);
        rbox(P, "yellow", s > 0 ? X - 0.22 : -X + 0.13, 0.0, h.u0 + 0.01, s > 0 ? X - 0.13 : -X + 0.22, 0.0075, h.u1 - 0.01, 0.003);
        // header: an LCD housing with two screens, the red door lamp bar is separate, a speaker grille
        const hy = D.doorH + 0.05, xq = s * (X - 0.0915);
        rbox(P, "lcdFrame", s > 0 ? X - 0.09 : -X + 0.01, hy + 0.02, h.u0 + 0.06, s > 0 ? X - 0.01 : -X + 0.09, hy + 0.24, h.u1 - 0.06, 0.012, 3);
        const half = (h.u1 - h.u0 - 0.16) / 2;
        for (const [k, a] of [["lcdRoute", h.u0 + 0.08], ["lcdAd", h.u0 + 0.08 + half]] as const) {
          if (s < 0) quadUV(P, k, [xq, hy + 0.04, a + half - 0.012], [xq, hy + 0.04, a + 0.012], [xq, hy + 0.22, a + 0.012], [xq, hy + 0.22, a + half - 0.012]);
          else quadUV(P, k, [xq, hy + 0.04, a + 0.012], [xq, hy + 0.04, a + half - 0.012], [xq, hy + 0.22, a + half - 0.012], [xq, hy + 0.22, a + 0.012]);
        }
        for (let i = 0; i < 7; i++) wb("dark", 0.03, 0.0315, D.doorH + 0.012, D.doorH + 0.038, h.u0 + 0.12 + i * 0.012, h.u0 + 0.126 + i * 0.012, 0.001);
        // an intercom panel + its red button beside the door
        wb("lam", 0, 0.04, 1.3, 1.47, h.u1 + 0.08, h.u1 + 0.18, 0.01); wb("red", 0.04, 0.046, 1.35, 1.39, h.u1 + 0.11, h.u1 + 0.15, 0.008);
        for (let i = 0; i < 5; i++) wb("dark", 0.04, 0.0415, 1.41 + i * 0.008, 1.414 + i * 0.008, h.u1 + 0.1, h.u1 + 0.16, 0.001);
      }
    }
  }
  // ---- ceiling: curved side panels with joints, the centre duct with louvres, LED strip covers
  const xs = [-X, -1.2, -1.0, -0.8, -0.62, -0.5, 0.5, 0.62, 0.8, 1.0, 1.2, X];
  for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1]; if (a === -0.5) continue; quadN(P, "ceil", [a, cy(a), z1], [a, cy(a), z0], [b, cy(b), z0], [b, cy(b), z1], [0, -1, 0]); }
  quadN(P, "ceil", [-0.5, D.ceilC + 0.01, z1], [-0.5, D.ceilC + 0.01, z0], [0.5, D.ceilC + 0.01, z0], [0.5, D.ceilC + 0.01, z1], [0, -1, 0]);
  rbox(P, "ceil", -0.34, D.ceilC - 0.07, z0, 0.34, D.ceilC + 0.005, z1, 0.02, 3);
  for (let z = z0 + 0.2; z < z1 - 0.2; z += 0.11) rbox(P, "louvre", -0.2, D.ceilC - 0.076, z, 0.2, D.ceilC - 0.07, z + 0.035, 0.002, 1);
  for (const s of [1, -1]) { rbox(P, "ceil", s * 0.56 - 0.075, cy(0.56) - 0.03, z0, s * 0.56 + 0.075, cy(0.56) + 0.01, z1, 0.012); rbox(P, "led", s * 0.56 - 0.055, cy(0.56) - 0.042, z0 + 0.1, s * 0.56 + 0.055, cy(0.56) - 0.028, z1 - 0.1, 0.008); }
  for (let z = z0 + 1.2; z < z1 - 0.3; z += 1.2) for (const s of [1, -1]) for (let i = (xs.length - 1) / 2 + 1 | 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1]; if (a < 0.6) continue;
    quadN(P, "dark", [s * a, cy(a) - 0.0012, z], [s * b, cy(b) - 0.0012, z], [s * b, cy(b) - 0.0012, z + 0.0025], [s * a, cy(a) - 0.0012, z + 0.0025], [0, -1, 0]);
  }
  // ---- benches between / beyond the doors
  const spans: [number, number, boolean][] = [];
  const dh = D.doorW / 2 + 0.17;
  if (!cab) spans.push([z0 + 0.06, doors[0] - dh, true]);
  for (let i = 0; i < doors.length - 1; i++) spans.push([doors[i] + dh, doors[i + 1] - dh, false]);
  spans.push([doors[doors.length - 1] + dh, z1 - 0.06, true]);
  const prioSeats: [number, number][] = [];
  for (const [a, b, prio] of spans) {
    const L = b - a, n = Math.max(1, Math.min(7, Math.floor(L / 0.44)));
    if (n < 2) continue;
    const w = L / n, kSeat = prio ? "seatP" : "seat";
    if (prio) prioSeats.push([a, b]);
    for (const s of [1, -1]) {
      const xf = s * (X - 0.53), xw = s * X, xa = Math.min(xf, xw), xb = Math.max(xf, xw);
      // frame + heater skirt (5 cm above the floor) with a slotted grille, cushions (dished), low backs under the windows
      rbox(P, "frame", xa + (s > 0 ? 0.04 : 0), 0.05, a, xb - (s > 0 ? 0 : 0.04), 0.36, b, 0.02);
      for (let z = a + 0.1; z < b - 0.1; z += 0.03) box(P, "dark", s > 0 ? xa + 0.0385 : xb - 0.04, 0.12, z, s > 0 ? xa + 0.04 : xb - 0.0385, 0.26, z + 0.012);
      rbox(P, "frame", xa - (s > 0 ? 0.0 : -0.02), 0.34, a, xb - (s > 0 ? 0.02 : 0), 0.37, b, 0.01);
      for (let i = 0; i < n; i++) {
        const c0 = a + i * w + 0.006, c1 = a + (i + 1) * w - 0.006;
        rbox(P, kSeat, xa - (s < 0 ? 0 : 0.012), 0.35, c0, xb + (s < 0 ? 0.012 : 0), 0.435, c1, 0.035, 3);
        rbox(P, kSeat, s > 0 ? X - 0.13 : -X + 0.015, 0.455, c0 + 0.008, s > 0 ? X - 0.015 : -X + 0.13, 0.86, c1 - 0.008, 0.045, 3);
      }
      // stanchions 2-3-2 (7 seats) from the cushion front to the rack
      const cuts = n === 7 ? [2, 5] : n >= 5 ? [Math.round(n / 2)] : [];
      for (const ci of cuts) { const z = a + ci * w; cyl(P, "chrome", [s * (X - 0.52), 0.36, z], [s * (X - 0.52), 1.745, z], 0.0165, 14); rbox(P, "frame", s * (X - 0.52) - 0.022, 0.355, z - 0.022, s * (X - 0.52) + 0.022, 0.385, z + 0.022, 0.006); tube(P, "chrome", [[s * (X - 0.52), 1.72, z], [s * (X - 0.5), 1.752, z], [s * (X - 0.31), 1.752, z]], 0.014, 8); }
      // end partitions: a white panel with a rounded top front corner + a grab pole up to the rack + a cross rail
      for (const [ez, dir] of [[a - 0.03, -1], [b + 0.03, 1]] as const) {
        const xin = s * (X - 0.62);
        rbox(P, "lam", Math.min(xin + s * 0.07, xw), 0.06, ez - 0.018, Math.max(xin + s * 0.07, xw), 1.16, ez + 0.018, 0.016, 3);
        rbox(P, "lam", Math.min(xin, xin + s * 0.09), 0.06, ez - 0.018, Math.max(xin, xin + s * 0.09), 1.08, ez + 0.018, 0.018, 3);
        rbox(P, "lamDark", Math.min(xin, xw), 0.0, ez - 0.02, Math.max(xin, xw), 0.07, ez + 0.02, 0.006);
        cyl(P, "chrome", [xin, 0.03, ez + dir * 0.03], [xin, 1.752, ez + dir * 0.03], 0.017, 14);
        tube(P, "chrome", [[xin, 1.72, ez + dir * 0.03], [xin + s * 0.03, 1.752, ez + dir * 0.03], [s * (X - 0.31), 1.752, ez + dir * 0.03]], 0.015, 8);
        cyl(P, "chrome", [xin, 1.16, ez + dir * 0.03], [xw, 1.16, ez + dir * 0.03], 0.012, 10);
        for (const yy of [0.03, 1.16]) cyl(P, "frame", [xin, yy - 0.012, ez + dir * 0.03], [xin, yy + 0.012, ez + dir * 0.03], 0.024, 12);
      }
      // luggage rack: two pipes, cast brackets, a frosted panel with its front lip
      rbox(P, "frost", s > 0 ? X - 0.29 : -X + 0.03, 1.757, a, s > 0 ? X - 0.03 : -X + 0.29, 1.767, b, 0.003);
      for (const px of [X - 0.31, X - 0.04]) cyl(P, "chrome", [s * px, 1.752, a - 0.02], [s * px, 1.752, b + 0.02], 0.0125, 10);
      for (let z = a + 0.08; z < b; z += Math.max(0.55, (b - a - 0.16) / 5)) { tube(P, "chrome", [[s * X, 1.87, z], [s * (X - 0.1), 1.82, z], [s * (X - 0.31), 1.752, z]], 0.01, 8); rbox(P, "frame", s > 0 ? X - 0.02 : -X, 1.83, z - 0.02, s > 0 ? X : -X + 0.02, 1.9, z + 0.02, 0.006); }
    }
    dirtKey(P, kSeat, (x, y) => sstep(X - 0.44, X - 0.54, Math.abs(x)) * sstep(0.39, 0.435, y) * 0.5 + sstep(0.8, 0.86, y) * 0.25);
  }
  // priority stickers on the window glass (pictograms only) above the priority benches
  for (const [a, b] of prioSeats) for (const s of [1, -1]) for (let i = 0; i < 2; i++) {
    const c = a + (b - a) * (0.3 + i * 0.4), k = `picto${(i + (s > 0 ? 0 : 2)) % 4}`, xx = s * (D.hw - 0.018);
    if (s < 0) quadUV(P, k, [xx - 0.002, D.winY1 - 0.2, c + 0.06], [xx - 0.002, D.winY1 - 0.2, c - 0.06], [xx - 0.002, D.winY1 - 0.08, c - 0.06], [xx - 0.002, D.winY1 - 0.08, c + 0.06]);
    else quadUV(P, k, [xx + 0.002, D.winY1 - 0.2, c - 0.06], [xx + 0.002, D.winY1 - 0.2, c + 0.06], [xx + 0.002, D.winY1 - 0.08, c + 0.06], [xx + 0.002, D.winY1 - 0.08, c - 0.06]);
  }
  // ---- the two full-length strap rails, hung from the ceiling every ~1.2 m
  const r0 = z0 + 0.3, r1 = z1 - 0.3;
  for (const s of [1, -1]) {
    cyl(P, "chrome", [s * 0.86, 1.99, r0], [s * 0.86, 1.99, r1], 0.015, 12);
    for (let z = r0 + 0.05; z <= r1; z += 1.21) { cyl(P, "chrome", [s * 0.86, 1.99, z], [s * 0.86, cy(0.86), z], 0.011, 8); rbox(P, "frame", s * 0.86 - 0.025, cy(0.86) - 0.012, z - 0.025, s * 0.86 + 0.025, cy(0.86), z + 0.025, 0.004); }
  }
  // ---- BLANK hanging ads over the aisle (two per bench bay): a clamp rail on two hangers, two posters side by side
  const adZ: number[] = [];
  if (o.hangingAds !== false) for (const [a, b] of spans) { const L = b - a; if (L < 2.4) continue; adZ.push(a + L * 0.27, a + L * 0.73); }
  adZ.forEach((z, i) => {
    rbox(P, "door", -0.56, 2.16, z - 0.012, 0.56, 2.19, z + 0.012, 0.006);
    for (const hx of [-0.4, 0.4]) cyl(P, "chrome", [hx, 2.19, z], [hx, cy(hx), z], 0.006, 6);
    for (const sx of [-1, 1]) {
      const k = `hang${(i * 2 + (sx > 0 ? 1 : 0)) % 4}`, x0 = sx > 0 ? 0.02 : -0.535, x1 = sx > 0 ? 0.535 : -0.02;
      quadUV(P, k, [x0, 1.885, z + 0.002], [x1, 1.885, z + 0.002], [x1, 2.165, z + 0.002], [x0, 2.165, z + 0.002]);
      quadUV(P, k, [x1, 1.885, z - 0.002], [x0, 1.885, z - 0.002], [x0, 2.165, z - 0.002], [x1, 2.165, z - 0.002]);
    }
  });
  // ---- end walls: the gangway door (glass) at the rear (and the front for mid cars), extinguisher box
  const endW = (z: number, dir: number) => {
    gridHoles(-X, X, 0, D.ceilS, [{ u0: -0.42, u1: 0.42, y0: 0, y1: 1.92 }], (u0, y0, u1, y1) => quadN(P, "lam", [u0, y0, z], [u1, y0, z], [u1, y1, z], [u0, y1, z], [0, 0, -dir]));
    // the gap between the flat wall top and the curved ceiling
    for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1]; quadN(P, "lam", [a, D.ceilS, z], [b, D.ceilS, z], [b, Math.max(cy(b), D.ceilS) + 0.012, z], [a, Math.max(cy(a), D.ceilS) + 0.012, z], [0, 0, -dir]); }
    rbox(P, "door", -0.46, 0, z - 0.03, -0.42, 1.95, z + 0.03, 0.006); rbox(P, "door", 0.42, 0, z - 0.03, 0.46, 1.95, z + 0.03, 0.006); rbox(P, "door", -0.46, 1.92, z - 0.03, 0.46, 1.97, z + 0.03, 0.006);
    // the sliding gangway door: a stainless frame round a big pane, a handle
    const zd = z - dir * 0.04;
    rbox(P, "door", -0.42, 0.0, zd - 0.015, 0.42, 0.25, zd + 0.015, 0.006); rbox(P, "door", -0.42, 1.8, zd - 0.015, 0.42, 1.92, zd + 0.015, 0.006);
    rbox(P, "door", -0.42, 0.25, zd - 0.015, -0.34, 1.8, zd + 0.015, 0.006); rbox(P, "door", 0.34, 0.25, zd - 0.015, 0.42, 1.8, zd + 0.015, 0.006);
    quad(P, "glass", [-0.34, 0.25, zd], [0.34, 0.25, zd], [0.34, 1.8, zd], [-0.34, 1.8, zd]);
    rbox(P, "chrome", 0.26, 0.95, zd - dir * 0.03 - 0.012, 0.3, 1.2, zd - dir * 0.03 + 0.012, 0.008);
    rbox(P, "red", 0.75, 0.72, Math.min(z - dir * 0.09, z - dir * 0.005), 1.05, 1.0, Math.max(z - dir * 0.09, z - dir * 0.005), 0.015);
    rbox(P, "lamDark", -X, 0, Math.min(z, z - dir * 0.006), -0.46, 0.08, Math.max(z, z - dir * 0.006), 0.002, 1); rbox(P, "lamDark", 0.46, 0, Math.min(z, z - dir * 0.006), X, 0.08, Math.max(z, z - dir * 0.006), 0.002, 1);
  };
  endW(z1, 1);
  if (!cab) endW(z0, -1);
  // ---- cab car front standing zone: wall handrails between the partition and the first door
  if (cab && (o.frontRails ?? true)) for (const s of [1, -1]) { const za = z0 + 0.12, zb = doors[0] - D.doorW / 2 - 0.1; cyl(P, "chrome", [s * (X - 0.045), 0.95, za], [s * (X - 0.045), 0.95, zb], 0.014, 10); for (const z of [za + 0.03, zb - 0.03]) cyl(P, "chrome", [s * X, 0.95, z], [s * (X - 0.045), 0.95, z], 0.01, 8); }
  // ---- grime: kick panels + lower walls, hand marks on the door posts, dusty louvres
  dirtKey(P, "lam", (x, y, z) => sstep(0.5, 0.06, y) * 0.22 + 0.04 * Math.max(0, Math.sin(z * 3.1 + x)));
  dirtKey(P, "louvre", () => 0.25);
  dirtKey(P, "chrome", (_x, y) => sstep(1.0, 1.4, y) * sstep(1.75, 1.5, y) * 0.12 + sstep(0.3, 0.02, y) * 0.35);
  dirtKey(P, "alu", (x, _y, z) => 0.18 + 0.2 * Math.abs(Math.sin(z * 9.1 + x * 4)));
  dirtKey(P, "yellow", (_x, _y, z) => 0.12 + 0.25 * Math.max(0, Math.sin(z * 7.3)));

  const mats: Record<string, THREE.Material> = { ...M };
  for (let i = 0; i < 6; i++) mats[`poster${i}`] = vmat(`in-poster${i}`, { color: "#ffffff", rough: 0.55, albedo: posterTex(100 + i, 384, 132), useDirt: false, ...E });
  for (let i = 0; i < 4; i++) mats[`hang${i}`] = vmat(`in-hang${i}`, { color: "#ffffff", rough: 0.7, albedo: posterTex(200 + i, 320, 190), useDirt: false, ...E });
  for (let i = 0; i < 4; i++) mats[`picto${i}`] = vmat(`in-picto${i}`, { color: "#ffffff", rough: 0.4, albedo: pictoTex(i), useDirt: false, ...E });
  mats.lcdRoute = screenMat("lcd-route", lcdRouteTex(), 0.9);
  mats.lcdAd = screenMat("lcd-ad", lcdAdTex(o.seed ?? 5), 0.8);
  const root = new THREE.Group(); root.name = "interiorJP";
  root.add(meshes(P, mats, { name: "interior-fit", noCast: ["frost", "glass", "led", "lcdRoute", "lcdAd", "floor", "dark"] }));

  // ---- the route highlight dots on the LCDs (one small emissive dot per route screen, stepping along the line)
  const hlGeo = new THREE.CircleGeometry(0.009, 16), hlMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.2).multiplyScalar(3), toneMapped: true });
  const hls: { m: THREE.Mesh; a: number; half: number; s: number }[] = [];
  for (const dz of doors) for (const s of [1, -1]) {
    const m = new THREE.Mesh(hlGeo, hlMat); m.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    const h0 = dz - D.doorW / 2, half = (D.doorW - 0.16) / 2; root.add(m); hls.push({ m, a: h0 + 0.08, half, s });
    m.position.set(s * (X - 0.01 - 0.0825), D.doorH + 0.05 + 0.04 + 0.18 * (80 / 160), 0);
  }
  // ---- red door lamps (one material: they blink together): a bar above every door, under the LCD housing
  const dl = lamp("doorlamps", "#ff2614", "#4a0d08", 8);
  const dlGeo = new THREE.BoxGeometry(0.012, 0.024, 0.16);
  for (const dz of doors) for (const s of [1, -1]) { const m = new THREE.Mesh(dlGeo, dl); m.position.set(s * (X - 0.036), D.doorH + 0.028, dz); root.add(m); }

  // ---- straps: belts + sleeves + rings, instanced, swinging about the rail (lateral) with the car's sway
  const straps: { p: V3; lag: number; prio: boolean }[] = [];
  const isPrio = (z: number) => prioSeats.some(([a, b]) => z > a - 0.1 && z < b + 0.1);
  for (const s of [1, -1]) for (let z = r0 + 0.2; z <= r1 - 0.2; z += 0.262) straps.push({ p: [s * 0.86, 1.99, z], lag: 0.06 + 0.03 * (((z * 7.3) | 0) % 3) + (s > 0 ? 0.02 : 0), prio: isPrio(z) });
  const beltGeo = new THREE.BoxGeometry(0.028, 0.215, 0.0045); beltGeo.translate(0, -0.1075 - 0.012, 0);
  const sleeveGeo = new THREE.CylinderGeometry(0.014, 0.017, 0.05, 10); sleeveGeo.translate(0, -0.238, 0);
  const rg = ringGeo(); rg.translate(0, -0.256, 0);
  const sb = new THREE.InstancedMesh(beltGeo, M.belt, straps.length), sl = new THREE.InstancedMesh(sleeveGeo, M.ringW, straps.length);
  const prioN = straps.filter((s) => s.prio).length;
  const sw = new THREE.InstancedMesh(rg, M.ringW, Math.max(1, straps.length - prioN)), so = new THREE.InstancedMesh(rg, M.ringO, Math.max(1, prioN));
  for (const m of [sb, sl, sw, so]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; root.add(m); }
  if (!prioN) so.visible = false;
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Eu = new THREE.Euler(), Vp = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
  const swayK = o.swayK ?? (() => 1);
  const setStraps = (t: number) => {
    let iw = 0, io = 0;
    straps.forEach((st, i) => {
      const k = swayK(t), lat = (o.sway ? o.sway(t, st.lag) : carSway(t - st.lag)) * 0.11 * k + 0.01 * Math.sin(t * 3.1 + i), fore = 0.03 * k * Math.sin(t * 0.7 + i * 0.3);
      Eu.set(fore, 0, lat); Q.setFromEuler(Eu); Vp.set(...st.p); M4.compose(Vp, Q, S1);
      sb.setMatrixAt(i, M4); sl.setMatrixAt(i, M4);
      if (st.prio) so.setMatrixAt(io++, M4); else sw.setMatrixAt(iw++, M4);
    });
    for (const m of [sb, sl, sw, so]) m.instanceMatrix.needsUpdate = true;
  };
  // ---- optional practical LED strips (rect, no shadow, no glowing panel: the covers are the emissive part)
  const lights: unknown[] = [];
  if (o.lights && ctx.practical) for (const s of [1, -1]) {
    const L = ctx.practical({ kind: "rect", pos: [s * 0.56, cy(0.56) - 0.05, (z0 + z1) / 2], target: [s * 0.5, 0, (z0 + z1) / 2], size: [0.12, z1 - z0 - 0.4], kelvin: 4300, lumens: o.lumens ?? 6000, bulb: false });
    root.add(L.object); lights.push(L);
  }
  const doorsFn = o.doors ?? (() => 0);
  const update = (t: number) => {
    setStraps(t);
    const f = doorsFn(t), moving = f > 0.02 && f < 0.98;
    dl.userData.set(moving ? (Math.floor(t * 3) % 2 === 0 ? 1 : 0.15) : f >= 0.98 ? (o.doorLampOpen ?? 0) : 0);
    const step = Math.floor(t / 1.6) % 9;
    for (const h of hls) { const u = (40 + step * 54) / 512; h.m.position.z = h.s > 0 ? h.a + h.half - 0.012 - u * (h.half - 0.024) : h.a + 0.012 + u * (h.half - 0.024); }
  };
  update(0);
  void cyl;
  return { object: root, update, strapCount: straps.length, lights };
};
