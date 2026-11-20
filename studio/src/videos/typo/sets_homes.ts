// HOMES (owner HOMES): shot 10, "And all over Japan, buyers grab the cheap shares. One 27-year-old ... makes over ¥2
// billion." A cut-open 2005 Japanese mid-rise seen from the street: a tiled facade with four rooms opened like dollhouse
// windows (hatched concrete reveals, a cream painted frame round each cut), balconies with laundry and AC units on the
// closed flats, a vending machine and a bicycle on the pavement. Column A stacks the buyers (internet cafe at street
// level, grandma's tatami room, the office on top); column B holds the 27-year-old's small tidy flat next to grandma.
// Every buyer's PC shows a big green BUY button that is clicked (cursor glide, press, ring flash) between "buyers" and
// "shares."; the flat's top monitor counts up to +¥2,000,000,000 on "¥2 billion" with a glint.
// Layout / marks / click frames: homes_layout.ts. Painters: homes_tex.ts, homes_screens.ts.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Kit } from "./build";
import type { Lighting, SetModule } from "./sets";
import { HM, V3 } from "./plan";
import {
  RB, C, TM, CE, basic, plane, contact, glowSprite, bulb, Motes, wispTex, glareTex, cylY, lam, tx, TAU, vs, vph, VF,
  sm, clamp01, lerp, hash, NOINK, P3, shadeHex, speck, grain, rrect, jit,
} from "./setkit";
import * as T from "./homes_tex";
import * as S from "./homes_screens";
import { HX, ROOMS, MARKS, MICE, CLICK, COUNTER } from "./homes_layout";

const o = HM.base;
const { W, D, H, FZ } = HX;
const XL = -7.0, XR = 7.0, ZB = -3.7;
const frac = (x: number) => x - Math.floor(x);
const wp = (x: number, y: number, z: number): P3 => [o[0] + x, o[1] + y, o[2] + z];
const ink = (m: THREE.Mesh) => { m.layers.set(NOINK); return m; };

type Scr = { g: THREE.Group; mesh: THREE.Mesh; mats: THREE.MeshBasicMaterial[]; cursor: THREE.Mesh; ring: THREE.Mesh; click: number; sw: number; sh: number; yc: number; zf: number; ph: number };
type Steam = { ms: THREE.Mesh[]; p: P3; h: number; s: number; ph: number };

export class HomesSet implements SetModule {
  readonly sets = ["homes" as const];
  readonly group = new THREE.Group();
  private rb = new RB(o);
  private scr: Scr[] = [];
  private steams: Steam[] = [];
  private swingers: { m: THREE.Object3D; ax: "x" | "y" | "z"; a: number; w: number; ph: number; base: number }[] = [];
  private spinners: { m: THREE.Object3D; w: number }[] = [];
  private hands: { m: THREE.Mesh; kind: 0 | 1 | 2; h0: number; m0: number }[] = [];
  private motes: { m: Motes; seed: number }[] = [];
  private fanHead = new THREE.Group();
  private tail: THREE.Group[] = [];
  private neon: THREE.MeshBasicMaterial[] = [];
  private led!: THREE.MeshBasicMaterial;
  private counter = new S.Counter();
  private counterMat!: THREE.MeshBasicMaterial;
  private glint!: THREE.Mesh;
  private charts: THREE.Texture[] = [];
  private fluo!: THREE.MeshBasicMaterial;

  constructor(_kit: Kit) {
    const g = this.group;
    this.buildShell(g);
    this.buildOffice(g);
    this.buildGrandma(g);
    this.buildCafe(g);
    this.buildApartment(g);
    this.buildExtras(g);
    this.buildStreet(g);
    this.rb.done(g);
  }

  // ======================================================================================== the building shell
  private buildShell(g: THREE.Group) {
    const rb = this.rb, conc = C("#a59c94"), tile = TM("hmTile", () => T.tileTex()), sec = TM("hmSection", T.sectionTex), cream = C("#f2ead6");
    const slabs: [number, number][] = [[0, 0.4], [2.9, 3.2], [5.7, 6.0], [8.5, 8.9]];
    for (const [y0, y1] of slabs) { rb.box(conc, XL, y0, ZB, XR, y1, FZ); rb.wallZ(tile, XL, XR, y0, y1, FZ + 0.002, 1, 1, 1); }
    const pil: [number, number][] = [[-7.0, -6.6], [-2.6, -2.0], [2.0, 2.6], [6.6, 7.0]];
    for (const [x0, x1] of pil) for (let k = 0; k < 3; k++) { rb.box(conc, x0, slabs[k][1], ZB, x1, slabs[k + 1][0], FZ); rb.wallZ(tile, x0, x1, slabs[k][1], slabs[k + 1][0], FZ + 0.002, 1, 1, 1); }
    // the side walls + the parapet (tiled), a metal coping
    for (const [x, f] of [[XL, -1], [XR, 1]] as [number, number][]) rb.wallX(tile, ZB, FZ, 0, 9.4, x, f, 1, 1);
    rb.box(conc, XL, 8.9, -0.05, XR, 9.4, FZ); rb.wallZ(tile, XL, XR, 8.9, 9.4, FZ + 0.002, 1, 1, 1);
    rb.box(C("#8a9098"), XL - 0.02, 9.4, -0.08, XR + 0.02, 9.46, FZ + 0.03);
    for (const x of [XL, XR - 0.15]) rb.box(conc, x, 8.9, ZB, x + 0.15, 9.4, 0);
    // a rooftop water tank on legs + a TV antenna (peek above the parapet)
    { const tx0 = -1.4, tz = -2.0; for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) rb.seg(C("#6a6e74"), [tx0 + dx, 8.9, tz + dz], [tx0 + dx, 9.6, tz + dz], 0.04);
      rb.geo(cylY(0.62, 1.0, 20), C("#d8d4c8"), tx0, 9.6, tz); rb.geo(cylY(0.64, 0.06, 20), C("#8a8e94"), tx0, 10.6, tz);
      rb.seg(C("#5a5e64"), [1.6, 8.9, -1.6], [1.6, 11.2, -1.6], 0.025);
      for (let k = 0; k < 4; k++) rb.seg(C("#5a5e64"), [1.6 - 0.5 + k * 0.08, 10.5 + k * 0.15, -1.6], [1.6 + 0.5 - k * 0.08, 10.5 + k * 0.15, -1.6], 0.012); }
    // cells: four CUT rooms (open), the rest closed flats with windows (+ balconies upstairs)
    const cols = [HX.colC, HX.colA, HX.colB], cut = new Set(["1,0", "1,1", "1,2", "2,1"]);
    cols.forEach((c, ci) => HX.floors.forEach((fy, k) => {
      const x0 = c - W / 2, x1 = c + W / 2, y0 = fy, y1 = fy + H;
      if (cut.has(`${ci},${k}`)) {
        rb.wallX(sec, 0, FZ, y0, y1, x0, 1, 0.5, 0.5); rb.wallX(sec, 0, FZ, y0, y1, x1, -1, 0.5, 0.5);
        rb.flatY(sec, x0, x1, 0, FZ, y1, -1, 0.5, 0.5);
        // the cream painted frame round the cut
        rb.box(cream, x0 - 0.1, y1, FZ, x1 + 0.1, y1 + 0.1, FZ + 0.04); rb.box(cream, x0 - 0.1, y0 - 0.1, FZ, x1 + 0.1, y0, FZ + 0.04);
        rb.box(cream, x0 - 0.1, y0, FZ, x0, y1, FZ + 0.04); rb.box(cream, x1, y0, FZ, x1 + 0.1, y1, FZ + 0.04);
        return;
      }
      rb.box(conc, x0, y0, -0.06, x1, y1, FZ);
      const lit = (ci + k) % 2 === 0;
      rb.panel(TM(`hmCell${ci}${k}`, () => T.cellTex(`hmCell${ci}${k}`, ["#c8a87a", "#9ab0c8", "#d8b0b8", "#b8c89a"][(ci * 3 + k) % 4], lit)), W, H, c, fy + H / 2, FZ + 0.003);
      if (k > 0 && !(ci === 2 && k === 2)) this.balcony(g, c, fy, ci * 3 + k);   // none over the flat (the glide passes under it)
    }));
  }
  private balcony(g: THREE.Group, c: number, fy: number, seed: number) {
    const rb = this.rb, x0 = c - W / 2 + 0.08, x1 = c + W / 2 - 0.08, zf = 1.15, conc = C("#b4aca2");
    rb.box(conc, x0, fy - 0.16, FZ, x1, fy, zf);
    rb.box(C("#c8d4dc"), x0, fy, zf - 0.04, x1, fy + 1.0, zf); rb.panel(TM("hmBalc", () => T.balconyTex()), x1 - x0, 1.0, c, fy + 0.5, zf + 0.003);
    for (const x of [x0, x1 - 0.04]) rb.box(C("#c8d4dc"), x, fy, FZ, x + 0.04, fy + 1.0, zf);
    rb.box(C("#8a9098"), x0, fy + 1.0, zf - 0.06, x1, fy + 1.04, zf + 0.01);
    // AC unit (a spinning fan behind its grille)
    const ax = x1 - 0.55, az = 0.75;
    rb.box(C("#e8e6de"), ax - 0.38, fy, az - 0.15, ax + 0.38, fy + 0.56, az + 0.15);
    const fan = new THREE.Group(); fan.position.set(...wp(ax - 0.08, fy + 0.28, az + 0.152)); g.add(fan);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10, -0.35, 0.7), basic("hmAcBlade", () => ({ color: new THREE.Color("#3a3e46"), side: THREE.DoubleSide }))); b.rotation.z = (k / 3) * TAU; fan.add(ink(b)); }
    this.spinners.push({ m: fan, w: 9 + seed });
    const grille = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.23, 24), C("#9a9a96")); grille.position.set(...wp(ax - 0.08, fy + 0.28, az + 0.156)); g.add(grille);
    // the laundry pole + three hanging cloths that sway
    rb.seg(C("#9aa0a8"), [x0 + 0.3, fy + 1.95, 0.75], [x1 - 0.3, fy + 1.95, 0.75], 0.02);
    for (const x of [x0 + 0.3, x1 - 0.3]) rb.seg(C("#9aa0a8"), [x, fy + 1.95, 0.75], [x, fy + 2.45, 0.2], 0.015);
    const cols = ["#f4f2ec", "#7a9ac8", "#e8a0a0", "#f2d27a", "#9ac89a"];
    for (let k = 0; k < 3; k++) {
      const cw = 0.4 + hash(seed + k) * 0.25, ch = 0.5 + hash(seed * 3 + k) * 0.3;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch).translate(0, -ch / 2, 0), lam("si:hmCloth" + cols[(seed + k) % 5], () => ({ color: cols[(seed + k) % 5], side: THREE.DoubleSide })));
      m.position.set(...wp(x0 + 0.7 + k * 0.85, fy + 1.94, 0.75)); m.castShadow = true; m.receiveShadow = true; g.add(m);
      this.swingers.push({ m, ax: "x", a: 0.12, w: 1.6 + 0.3 * k, ph: seed + k * 1.7, base: 0 });
    }
  }

  // ================================================================================ shared room helpers
  /** floor / ceiling / side + back walls of a cut room (column centre c, floor fy); win = a back window (room-local) */
  private room(c: number, fy: number, m: { floor?: THREE.Material; fsu?: number; wall: THREE.Material; ceil: THREE.Material; skirt: THREE.Material }, win?: { x0: number; x1: number; y0: number; y1: number }) {
    const rb = this.rb, x0 = c - W / 2, x1 = c + W / 2, y1 = fy + H;
    if (m.floor) rb.flatY(m.floor, x0, x1, -D, FZ, fy + 0.001, 1, m.fsu ?? 2, m.fsu ?? 2);
    rb.flatY(m.ceil, x0, x1, -D, 0, y1 - 0.001, -1, 2, 2);
    rb.wallX(m.wall, -D, 0, fy, y1, x0 + 0.001, 1, 1.5, 1.5); rb.wallX(m.wall, -D, 0, fy, y1, x1 - 0.001, -1, 1.5, 1.5);
    const zb = -D + 0.001;
    if (win) {
      const a = c + win.x0, b = c + win.x1, wy0 = fy + win.y0, wy1 = fy + win.y1;
      rb.wallZ(m.wall, x0, a, fy, y1, zb, 1, 1.5, 1.5); rb.wallZ(m.wall, b, x1, fy, y1, zb, 1, 1.5, 1.5);
      rb.wallZ(m.wall, a, b, fy, wy0, zb, 1, 1.5, 1.5); rb.wallZ(m.wall, a, b, wy1, y1, zb, 1, 1.5, 1.5);
      // reveals + an aluminium frame, a sill, a centre mullion
      const rv = C("#e6e0d4"), al = C("#b8bcc2");
      rb.box(rv, a - 0.02, wy0, -D - 0.2, a, wy1, -D); rb.box(rv, b, wy0, -D - 0.2, b + 0.02, wy1, -D); rb.box(rv, a, wy1, -D - 0.2, b, wy1 + 0.02, -D);
      rb.box(al, a - 0.05, wy0 - 0.02, -D - 0.04, b + 0.05, wy0 + 0.03, -D + 0.08);
      rb.box(al, a - 0.05, wy1 - 0.03, -D - 0.12, b + 0.05, wy1 + 0.04, -D + 0.01);
      for (const x of [a - 0.05, b]) rb.box(al, x, wy0, -D - 0.12, x + 0.05, wy1, -D + 0.01);
      rb.box(al, (a + b) / 2 - 0.02, wy0, -D - 0.1, (a + b) / 2 + 0.02, wy1, -D - 0.05);
    } else rb.wallZ(m.wall, x0, x1, fy, y1, zb, 1, 1.5, 1.5);
    // skirting
    rb.box(m.skirt, x0, fy, -D, x1, fy + 0.07, -D + 0.015, false);
    for (const x of [x0, x1 - 0.015]) rb.box(m.skirt, x, fy, -D, x + 0.015, fy + 0.07, 0, false);
  }
  /** the city view behind a back window: an unlit painted plane 1.4 m behind the glass + a glass sheen */
  private view(g: THREE.Group, key: string, seed: number, cx: number, cy: number, w: number, h: number) {
    plane(g, basic("hmView" + key, () => ({ map: T.viewTex("hmView" + key, seed), color: new THREE.Color(0.96, 0.96, 0.96) })), w + 3.2, h + 2.4, wp(cx, cy + 0.3, -D - 1.4), 0, 0, 0, true);
    plane(g, basic("hmGlare", () => ({ map: glareTex(), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })), w, h, wp(cx, cy, -D - 0.08), 0, 0, 0, true);
  }
  /** a monitor (CRT or LCD) standing at p (set-local, on the desk top), turned by yaw; its screen material `mat` */
  private monitor(g: THREE.Group, p: P3, yaw: number, kind: "crt" | "lcd", sw: number, sh: number, mat: THREE.Material) {
    const G = new THREE.Group(); G.position.set(...wp(...p)); G.rotation.y = yaw; g.add(G);
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const ms = new THREE.Mesh(geo, m); ms.position.set(x, y, z); ms.castShadow = true; ms.receiveShadow = true; G.add(ms); return ms; };
    let yc: number, zf: number;
    if (kind === "crt") {
      const cs = C("#dcd4bf"), bw = sw + 0.12, bh = sh + 0.12;
      add(new THREE.BoxGeometry(0.34, 0.04, 0.3), cs, 0, 0.02, -0.1);
      yc = 0.06 + bh / 2; zf = 0.07;
      add(new THREE.BoxGeometry(bw, bh, 0.14), cs, 0, yc, 0);
      add(new THREE.BoxGeometry(bw * 0.78, bh * 0.8, 0.34), C("#cfc6b0"), 0, yc - 0.01, -0.24);
      add(new THREE.BoxGeometry(sw + 0.03, sh + 0.03, 0.01), C("#3a3a36"), 0, yc, 0.068);
      add(new THREE.BoxGeometry(0.03, 0.015, 0.01), C("#3ac85a"), bw / 2 - 0.06, yc - bh / 2 + 0.03, 0.072);
      zf = 0.075;
    } else {
      const bk = C("#26262c"), bw = sw + 0.05, bh = sh + 0.05;
      add(new THREE.BoxGeometry(0.26, 0.015, 0.2), bk, 0, 0.008, -0.04);
      add(new THREE.BoxGeometry(0.05, 0.12, 0.03), bk, 0, 0.07, -0.06);
      yc = 0.12 + bh / 2;
      add(new THREE.BoxGeometry(bw, bh, 0.035), bk, 0, yc, -0.02);
      zf = 0.0;
    }
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat); scr.position.set(0, yc, zf); G.add(ink(scr));
    return { G, scr, yc, zf };
  }
  /** a BUY screen on a monitor: idle / pressed / done materials, a cursor and a press ring */
  private buyScreen(g: THREE.Group, key: string, p: P3, yaw: number, kind: "crt" | "lcd", sw: number, sh: number, click: number) {
    const a = sw / sh, mats = ([0, 1, 2] as const).map((s) => basic(`hmScr_${key}_${s}`, () => ({ map: S.buyTex("hm" + key, a, s), color: new THREE.Color(1, 1, 1) })));
    const M = this.monitor(g, p, yaw, kind, sw, sh, mats[0]);
    const cursor = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.13, sw * 0.13).translate(sw * 0.065 - sw * 0.012, -sw * 0.065 + sw * 0.01, 0), basic("hmCursorM", () => ({ map: S.cursorTex(), transparent: true, alphaTest: 0.1, depthWrite: false })));
    cursor.renderOrder = 3; M.G.add(ink(cursor));
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic("hmRing_" + key, () => ({ map: S.ringTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 2.2, 1.1) })));
    ring.position.set(0, M.yc + this.btnY(sh), M.zf + 0.008); ring.renderOrder = 4; M.G.add(ink(ring));
    this.scr.push({ g: M.G, mesh: M.scr, mats, cursor, ring, click, sw, sh, yc: M.yc, zf: M.zf, ph: hash(click) * TAU });
    return M;
  }
  /** the BUY button's centre (local y offset from the screen centre) */
  private btnY(sh: number) { return (0.5 - 0.64) * sh; }
  private steam(g: THREE.Group, p: P3, h = 0.2, s = 0.05, n = 3) {
    const ms: THREE.Mesh[] = [];
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: wispTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.renderOrder = 5; g.add(ink(m)); ms.push(m); }
    this.steams.push({ ms, p, h, s, ph: hash(p[0] * 3 + p[1]) });
  }
  private clock(g: THREE.Group, p: P3, r: number, h0: number, m0: number, rim = "#c9a14a") {
    this.rb.geo(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.035, 28).rotateX(Math.PI / 2), C(rim), p[0], p[1], p[2] + 0.018);
    plane(g, basic("hmClockF" + rim, () => ({ map: T.clockTex("hmClock" + rim, rim), transparent: true, alphaTest: 0.05 })), r * 2, r * 2, wp(p[0], p[1], p[2] + 0.037), 0, 0, 0, true);
    for (const [L, w, k] of [[r * 0.5, r * 0.09, 0], [r * 0.75, r * 0.06, 1], [r * 0.82, r * 0.025, 2]] as number[][]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.003).translate(0, L / 2 - r * 0.08, 0), basic("hmHand" + k, () => ({ color: k === 2 ? new THREE.Color("#c8201a") : new THREE.Color("#1a1420") })));
      m.position.set(...wp(p[0], p[1], p[2] + 0.04 + k * 0.002)); g.add(ink(m)); this.hands.push({ m, kind: k as 0 | 1 | 2, h0, m0 });
    }
  }
  /** a low-poly potted plant (painted pot, clustered leaf blobs) */
  private plant(p: P3, h: number, pot = "#c06a3a", leaf = "#4a8a4a", r = 0.16) {
    const rb = this.rb;
    rb.geo(cylY(r * 0.8, r * 1.2, 14, false, r), C(pot), p[0], p[1], p[2]);
    rb.seg(C("#5a3a22"), [p[0], p[1] + r, p[2]], [p[0], p[1] + h * 0.7, p[2]], 0.018);
    for (let k = 0; k < 7; k++) {
      const a = k * 2.4, rr = r * (0.7 + 0.6 * hash(k + p[0])), y = p[1] + h * (0.45 + 0.5 * hash(k * 3 + p[2]));
      rb.geo(new THREE.IcosahedronGeometry(rr * 1.4, 0), C(jit(() => hash(k * 7 + p[0] * 13), leaf, 0.14)), p[0] + Math.cos(a) * rr, y, p[2] + Math.sin(a) * rr, a, k, 0, [1, 0.8, 1]);
    }
    this.contactAt(p, r * 3, r * 3);
  }
  private contactAt(p: P3, w: number, d: number, op = 0.4) { contact(this.group, wp(p[0], p[1] + 0.004, p[2]), w, d, op); }
  /** an office / desk chair seated at mark m (seat behind the card plane, backrest on the side away from the screen) */
  private chair(m: P3, side: number, seat = "#33363c", back = "#2a2c32", pad = false, stool = false) {
    const rb = this.rb, [x, y, z] = m;
    rb.geo(new THREE.CylinderGeometry(stool ? 0.19 : 0.22, stool ? 0.17 : 0.2, 0.08, 20), C(seat), x, y + 0.46, z - (stool ? 0.3 : 0.22));
    // the backrest sits well behind the card plane (never over the sitter's torso); a stool has none
    if (!stool) rb.geo(new THREE.CapsuleGeometry(0.15, pad ? 0.36 : 0.18, 4, 12), C(back), x - side * 0.27, y + (pad ? 0.82 : 0.76), z - 0.5, 0, 0, side * 0.12, [0.35, 1, 0.8]);
    if (pad) for (const dz of [-0.4, -0.08]) rb.box(C(back), x - 0.22, y + 0.5, z + dz - 0.03, x + 0.2, y + 0.62, z + dz + 0.03);
    rb.seg(C("#5a5e64"), [x, y + 0.08, z - 0.22], [x, y + 0.42, z - 0.22], 0.025);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.3; rb.seg(C("#3a3c42"), [x, y + 0.07, z - 0.22], [x + Math.cos(a) * 0.26, y + 0.04, z - 0.22 + Math.sin(a) * 0.26], 0.018); }
    this.contactAt([x, y, z - 0.22], 0.7, 0.6, 0.35);
  }

  // ================================================================================ OFFICE (top floor)
  private buildOffice(g: THREE.Group) {
    const rb = this.rb, R = ROOMS.office, c = R.x, fy = R.y;
    this.room(c, fy, { floor: TM("hmCarpet", T.carpetTex), fsu: 2, wall: TM("hmOfWall", () => T.plasterTex("hmOfWall", "#e4ddd0")), ceil: TM("hmOfCeil", () => T.plasterTex("hmOfCeil", "#efece4")), skirt: C("#5a5e66") },
      { x0: -0.9, x1: 1.5, y0: 1.42, y1: 2.3 });
    this.view(g, "of", 1, c + 0.3, fy + 1.86, 2.4, 0.88);
    // venetian blinds half down (tilted slats) + the bottom rail and a pull cord
    for (let k = 0; k < 10; k++) rb.rbox(TM("hmSlat", T.slatTex), 2.38, 0.008, 0.05, c + 0.3, fy + 2.26 - k * 0.032, -D + 0.07, 0, 0.55, 0, false);
    rb.box(C("#d8d2c4"), c - 0.9, fy + 1.93, -D + 0.04, c + 1.5, fy + 1.95, -D + 0.1);
    { const cg = new THREE.Group(); cg.position.set(...wp(c + 1.38, fy + 1.94, -D + 0.1)); g.add(cg); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.5, 5).translate(0, -0.25, 0), C("#e8e2d0")); cg.add(cord);
      const ac = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), C("#e8e2d0")); ac.position.y = -0.51; cg.add(ac); this.swingers.push({ m: cg, ax: "z", a: 0.06, w: 2.1, ph: 0.4, base: 0 }); }
    // cubicle partitions (fabric, aluminium caps)
    const fab = TM("hmFabric", () => T.fabricTex()), cap = C("#b8bcc2");
    rb.box(fab, c - 1.5, fy, -2.78, c + 1.85, fy + 1.32, -2.7); rb.box(cap, c - 1.5, fy + 1.32, -2.79, c + 1.85, fy + 1.35, -2.69);
    rb.box(fab, c - 1.5, fy, -2.78, c - 1.42, fy + 1.32, -1.15); rb.box(cap, c - 1.51, fy + 1.32, -2.78, c - 1.41, fy + 1.35, -1.15);
    // memos pinned to the partition
    for (let k = 0; k < 4; k++) rb.panel(C(["#f8f0a0", "#f8f6ee", "#a8e0f0", "#f8c8d8"][k]), 0.1, 0.1, c - 1.2 + k * 0.17 + (k > 1 ? 1.6 : 0), fy + 1.1 - (k % 2) * 0.12, -2.695, 0, 0, (hash(k) - 0.5) * 0.3);
    // the steel desk (grey-green), a drawer pedestal, a modesty panel
    const steel = C("#a2aca4"), dk = C("#8a948c");
    rb.box(steel, c - 0.2, fy + 0.69, -2.62, c + 1.5, fy + 0.73, -1.8);
    rb.box(dk, c + 1.0, fy + 0.04, -2.6, c + 1.48, fy + 0.69, -1.83);
    for (let k = 0; k < 3; k++) rb.box(C("#c8ccc8"), c + 1.18, fy + 0.18 + k * 0.2, -1.83, c + 1.3, fy + 0.2 + k * 0.2, -1.81);
    rb.box(dk, c - 0.2, fy + 0.25, -2.6, c + 1.0, fy + 0.69, -2.56);
    rb.box(dk, c - 0.2, fy, -2.6, c - 0.16, fy + 0.69, -1.82);
    // the CRT + BUY
    this.buyScreen(g, "of", [c + 0.6, fy + 0.73, -2.25], -0.3, "crt", 0.7, 0.525, CLICK.office);
    rb.rbox(C("#e2dccb"), 0.46, 0.028, 0.16, c + 0.5, fy + 0.745, -1.98, -0.15);
    rb.rbox(C("#e2dccb"), 0.06, 0.025, 0.1, MICE.office[0], fy + 0.745, MICE.office[2], -0.1);
    rb.panel(C("#3a4a6a"), 0.22, 0.18, MICE.office[0], fy + 0.732, MICE.office[2], 0, -Math.PI / 2);
    // paper stacks, an in-tray, a phone, a mug (steam), a desk fan
    for (let k = 0; k < 7; k++) rb.rbox(C(k % 2 ? "#f4f0e6" : "#e8e4d8"), 0.3, 0.012, 0.22, c + 0.06, fy + 0.737 + k * 0.012, -2.42, (hash(k) - 0.5) * 0.15);
    rb.rbox(TM("hmPaper", T.paperTex), 0.21, 0.002, 0.28, c + 0.08, fy + 0.83, -2.4, 0.2);
    rb.box(C("#5a6a8a"), c - 0.15, fy + 0.73, -2.15, c + 0.2, fy + 0.8, -1.93); rb.rbox(C("#f8f6ee"), 0.3, 0.01, 0.2, c + 0.02, fy + 0.8, -2.04, 0.1);
    rb.rbox(C("#2a2c30"), 0.2, 0.07, 0.22, c + 1.22, fy + 0.765, -1.98, -0.2); rb.rbox(C("#2a2c30"), 0.22, 0.05, 0.06, c + 1.22, fy + 0.82, -2.02, -0.2);
    rb.geo(cylY(0.04, 0.1, 16), C("#f2eee4"), c + 0.92, fy + 0.73, -1.92); rb.geo(new THREE.TorusGeometry(0.025, 0.007, 6, 12), C("#f2eee4"), c + 0.965, fy + 0.78, -1.92);
    rb.geo(new THREE.CircleGeometry(0.035, 14).rotateX(-Math.PI / 2), C("#4a2a16"), c + 0.92, fy + 0.822, -1.92);
    this.steam(g, [c + 0.92, fy + 0.83, -1.92], 0.2, 0.05);
    this.deskFan(g, [c + 1.32, fy + 0.73, -2.42]);
    // filing cabinet (front-left) with binders on top
    rb.box(C("#9aa29c"), c - 1.98, fy, -1.1, c - 1.55, fy + 1.05, -0.55);
    for (let k = 0; k < 3; k++) { rb.box(C("#b8c0ba"), c - 1.55, fy + 0.1 + k * 0.33, -1.06, c - 1.54, fy + 0.38 + k * 0.33, -0.59); rb.box(C("#d8dcd8"), c - 1.54, fy + 0.3 + k * 0.33, -0.9, c - 1.52, fy + 0.32 + k * 0.33, -0.75); }
    for (let k = 0; k < 4; k++) rb.box(C(["#2f4a7a", "#c8a050", "#7a2a2a", "#3a6a4a"][k]), c - 1.95 + k * 0.08, fy + 1.05, -1.0, c - 1.88 + k * 0.08, fy + 1.33, -0.68);
    this.contactAt([c - 1.76, fy, -0.82], 0.7, 0.8);
    // the wall clock (~9:31, ticking), a calendar, a ficus, the fluorescent light
    this.clock(g, [c - 1.45, fy + 1.98, -D + 0.01], 0.17, 9, 31, "#e8e4dc");
    rb.panel(TM("hmCal", T.calendarTex), 0.3, 0.4, c + 1.76, fy + 1.75, -D + 0.012);
    this.plant([c + 1.72, fy, -1.05], 1.45, "#c8c0b0", "#3e7a46", 0.17);
    rb.box(C("#e8e8e4"), c - 0.5, fy + H - 0.05, -2.0, c + 0.9, fy + H, -1.6, false);
    this.fluo = basic("hmFluo", () => ({ color: new THREE.Color(1.7, 1.75, 1.7) }));
    plane(g, this.fluo, 1.3, 0.3, wp(c + 0.2, fy + H - 0.052, -1.8), 0, Math.PI / 2, 0, true);
    this.chair(MARKS.office.p, 1);
    this.motes.push({ m: new Motes(g, 40, 11, o, [c - 0.6, fy + 0.9, -3.2], [c + 1.6, fy + 2.3, -1.2], new THREE.Color(0.4, 0.36, 0.28), 0.012, 0.05), seed: 3 });
  }
  private deskFan(g: THREE.Group, p: P3) {
    const rb = this.rb;
    rb.geo(cylY(0.08, 0.02, 16), C("#3a4a44"), p[0], p[1], p[2]); rb.seg(C("#3a4a44"), [p[0], p[1], p[2]], [p[0], p[1] + 0.2, p[2]], 0.012);
    this.fanHead.position.set(...wp(p[0], p[1] + 0.24, p[2])); g.add(this.fanHead);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.005, 6, 32), C("#c8ccc8")); cage.position.z = 0.05; this.fanHead.add(cage);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.08, 16).rotateX(Math.PI / 2), C("#3a4a44")); motor.position.z = -0.01; motor.castShadow = true; this.fanHead.add(motor);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.002, 0.002), C("#c8ccc8")); sp.rotation.z = (k / 6) * Math.PI; sp.position.z = 0.055; this.fanHead.add(sp); }
    const blades = new THREE.Group(); blades.position.z = 0.04; this.fanHead.add(blades);
    for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12, -0.35, 0.7), lam("si:hmFanBlade", () => ({ color: "#8ac0d8", side: THREE.DoubleSide }))); bl.rotation.z = (k / 3) * TAU; blades.add(bl); }
    this.spinners.push({ m: blades, w: -0.9 * 30 });
    this.fanHead.rotation.y = 0;
  }

  // ================================================================================ GRANDMA (middle floor)
  private buildGrandma(g: THREE.Group) {
    const rb = this.rb, R = ROOMS.grandma, c = R.x, fy = R.y;
    this.room(c, fy, { wall: TM("hmJuraku", T.jurakuTex), ceil: TM("hmGmCeil", () => T.flooringTex("hmGmCeil", "#c8a072")), skirt: C("#7a5232") }, { x0: -1.55, x1: 0.15, y0: 0.82, y1: 1.92 });
    rb.panel(TM("hmTatami", T.tatamiTex), W, D, c, fy + 0.002, -D / 2, 0, -Math.PI / 2);
    rb.flatY(C("#8a6040"), c - W / 2, c + W / 2, 0, FZ, fy + 0.002, 1, 1, 1);
    this.view(g, "gm", 2, c - 0.7, fy + 1.37, 1.7, 1.1);
    // the nageshi rail round the walls + a wooden sill
    const wd = C("#8a5a34");
    rb.box(wd, c - W / 2, fy + 1.98, -D, c + W / 2, fy + 2.05, -D + 0.04); for (const x of [c - W / 2, c + W / 2 - 0.04]) rb.box(wd, x, fy + 1.98, -D, x + 0.04, fy + 2.05, 0);
    // lace curtain + two flowered side curtains (they breathe in the draft)
    plane(g, basic("hmLace", () => ({ map: tx("hmLaceT", 128, 128, (q) => { q.clearRect(0, 0, 128, 128); q.fillStyle = "rgba(255,255,255,0.55)"; q.fillRect(0, 0, 128, 128); q.strokeStyle = "rgba(255,255,255,0.9)"; q.lineWidth = 2; for (let k = 0; k < 8; k++) { q.beginPath(); q.arc(16 + (k % 4) * 32, 32 + Math.floor(k / 4) * 64, 12, 0, TAU); q.stroke(); } }), transparent: true, depthWrite: false })), 1.0, 1.05, wp(c - 1.0, fy + 1.38, -D + 0.03), 0, 0, 0, true);
    const cm = lam("si:hmGmCurt", () => ({ map: tx("hmGmCurtT", 256, 512, (q, r) => { q.fillStyle = "#efe2c8"; q.fillRect(0, 0, 256, 512); for (let k = 0; k < 40; k++) { q.fillStyle = ["#d88a8a", "#8ab08a", "#e8b860"][k % 3]; q.beginPath(); q.arc(r() * 256, r() * 512, 8, 0, TAU); q.fill(); } for (let x = 0; x < 256; x += 32) { q.fillStyle = "rgba(0,0,0,0.08)"; q.fillRect(x, 0, 12, 512); } }), side: THREE.DoubleSide }));
    rb.seg(C("#b89a6a"), [c - 1.85, fy + 1.98, -D + 0.12], [c + 0.45, fy + 1.98, -D + 0.12], 0.012);
    for (const x of [c - 1.7, c + 0.28]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.3).translate(0, -0.65, 0), cm); m.position.set(...wp(x, fy + 1.97, -D + 0.12)); m.castShadow = true; m.receiveShadow = true; g.add(m); this.swingers.push({ m, ax: "x", a: 0.07, w: 1.3, ph: x, base: 0.04 }); }
    // the tansu chest (drawers) with a framed photo, a bonsai, a small radio
    const tansu = C("#7a4a28");
    rb.box(tansu, c + 0.72, fy, -D, c + 1.88, fy + 1.0, -3.06);
    rb.panel(TM("hmTansu", () => tx("hmTansuT", 512, 440, (q, r) => { q.fillStyle = "#8a5430"; q.fillRect(0, 0, 512, 440); grain(q, r, 0, 0, 512, 440, 40, "#3a1a08", true, 0.06, 0.16); for (let j = 0; j < 4; j++) for (let i = 0; i < (j < 1 ? 2 : 1); i++) { const w = j < 1 ? 236 : 488, x = 12 + i * 252, y = 12 + j * 106; q.strokeStyle = "rgba(40,16,4,0.7)"; q.lineWidth = 4; q.strokeRect(x, y, w, 96); q.fillStyle = "#2a2a2a"; q.fillRect(x + w / 2 - 30, y + 40, 60, 12); q.fillStyle = "#c8a050"; q.beginPath(); q.arc(x + w / 2, y + 46, 9, 0, TAU); q.fill(); } })), 1.12, 0.96, c + 1.3, fy + 0.5, -3.058);
    rb.rbox(C("#3a2418"), 0.3, 0.24, 0.02, c + 1.0, fy + 1.13, -3.28, 0, -0.12); rb.panel(TM("hmPhoto", T.photoTex), 0.27, 0.21, c + 1.0, fy + 1.13, -3.266, 0, -0.12);
    rb.geo(cylY(0.09, 0.07, 14, false, 0.11), C("#3a5a7a"), c + 1.6, fy + 1.0, -3.3);
    rb.seg(C("#5a3a22"), [c + 1.6, fy + 1.07, -3.3], [c + 1.66, fy + 1.24, -3.3], 0.015);
    for (let k = 0; k < 4; k++) rb.geo(new THREE.IcosahedronGeometry(0.07, 0), C("#3a6a3a"), c + 1.52 + k * 0.06, fy + 1.24 + (k % 2) * 0.05, -3.3 + (k - 1.5) * 0.03, k, k, 0, [1.4, 0.6, 1]);
    rb.box(C("#c84a3a"), c + 1.2, fy + 1.0, -3.38, c + 1.42, fy + 1.13, -3.24); rb.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 14).rotateX(Math.PI / 2), C("#e8e0d0"), c + 1.27, fy + 1.065, -3.235);
    // the pendulum wall clock
    { const cx = c + 1.3, cy = fy + 1.7; rb.box(C("#6a3a1e"), cx - 0.17, cy - 0.45, -D, cx + 0.17, cy + 0.2, -D + 0.08);
      rb.box(C("#2a1810"), cx - 0.12, cy - 0.4, -D + 0.075, cx + 0.12, cy - 0.12, -D + 0.08);
      this.clock(g, [cx, cy, -D + 0.07], 0.13, 2, 8, "#c9a14a");
      const pg = new THREE.Group(); pg.position.set(...wp(cx, cy - 0.12, -D + 0.082)); g.add(pg);
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.004).translate(0, -0.1, 0), C("#d8b050")); pg.add(rod);
      const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 18).rotateX(Math.PI / 2), C("#e8c060")); bob.position.y = -0.22; pg.add(bob);
      plane(g, basic("hmClockGlass", () => ({ color: new THREE.Color(0.25, 0.25, 0.3), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending })), 0.24, 0.28, wp(cx, cy - 0.26, -D + 0.09), 0, 0, 0, true);
      this.swingers.push({ m: pg, ax: "z", a: 0.3, w: Math.PI, ph: 0, base: 0 }); }
    rb.panel(TM("hmCal", T.calendarTex), 0.27, 0.36, c - 1.8, fy + 1.45, -D + 0.012);
    // the kotatsu: quilt + top board, the CRT on it (+ BUY), keyboard / mouse, tea + steam, a bowl of mikan
    const kx = c - 0.55, kz = -1.8;
    rb.box(TM("hmQuilt", T.quiltTex), kx - 0.55, fy + 0.01, kz - 0.52, kx + 0.55, fy + 0.36, kz + 0.52);
    rb.box(TM("hmQuilt", T.quiltTex), kx - 0.6, fy, kz - 0.57, kx + 0.6, fy + 0.06, kz + 0.57);
    rb.box(C("#a0683a"), kx - 0.47, fy + 0.36, kz - 0.47, kx + 0.47, fy + 0.4, kz + 0.47);
    this.contactAt([kx, fy, kz], 1.6, 1.5, 0.45);
    this.buyScreen(g, "gm", [kx - 0.12, fy + 0.4, kz - 0.18], 0.38, "crt", 0.66, 0.495, CLICK.grandma);
    rb.rbox(C("#e2dccb"), 0.42, 0.026, 0.15, kx + 0.15, fy + 0.413, kz + 0.25, 0.3);
    rb.rbox(C("#e2dccb"), 0.055, 0.025, 0.09, MICE.grandma[0], fy + 0.413, MICE.grandma[2], 0.2);
    { const tx0 = kx - 0.32, tz = kz + 0.3; rb.geo(new THREE.SphereGeometry(0.075, 14, 10), C("#4a6a5a"), tx0, fy + 0.46, tz, 0, 0, 0, [1, 0.8, 1]); rb.seg(C("#4a6a5a"), [tx0 + 0.06, fy + 0.47, tz], [tx0 + 0.13, fy + 0.53, tz], 0.012); rb.geo(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), C("#2a2a2a"), tx0, fy + 0.52, tz, Math.PI / 2);
      rb.geo(cylY(0.032, 0.06, 14, false, 0.028), C("#e8e0cc"), tx0 + 0.16, fy + 0.4, tz + 0.06); rb.geo(new THREE.CircleGeometry(0.03, 12).rotateX(-Math.PI / 2), C("#8aa04a"), tx0 + 0.16, fy + 0.456, tz + 0.06);
      this.steam(g, [tx0 + 0.16, fy + 0.46, tz + 0.06], 0.17, 0.045); }
    { const bx = kx + 0.28, bz = kz - 0.3; rb.geo(new THREE.SphereGeometry(0.1, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2), C("#e8e0d0"), bx, fy + 0.5, bz);
      for (let k = 0; k < 5; k++) rb.geo(new THREE.SphereGeometry(0.035, 10, 8), C("#f2902a"), bx + Math.cos(k * 1.26) * 0.045 * (k < 4 ? 1 : 0), fy + 0.44 + (k < 4 ? 0 : 0.04), bz + Math.sin(k * 1.26) * 0.045 * (k < 4 ? 1 : 0), 0, 0, 0, [1, 0.85, 1]); }
    // her floor cushion + the cat on its own cushion (tail sways)
    const zb = TM("hmZabuton", T.zabutonTex);
    rb.rbox(zb, 0.55, 0.07, 0.55, c + 0.38, fy + 0.035, -1.72, 0.1);
    rb.rbox(zb, 0.5, 0.06, 0.5, c - 1.45, fy + 0.03, -0.9, -0.2);
    this.cat(g, [c - 1.45, fy + 0.06, -0.9]);
    // the washi pendant lamp over the kotatsu (pull cord sways)
    { const lx = kx, lz = kz, ly = fy + 1.95; rb.seg(C("#2a2a2a"), [lx, fy + H, lz], [lx, ly + 0.2, lz], 0.006);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), CE("#f6e6c4", "#ffc880", 0.55)); sh.scale.set(1, 0.75, 1); sh.position.set(...wp(lx, ly, lz)); sh.castShadow = false; g.add(sh);
      for (let k = -2; k <= 2; k++) { const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.22 * Math.cos(k * 0.3), 0.003, 4, 30).rotateX(Math.PI / 2), C("#a08060")); r2.position.set(...wp(lx, ly + 0.165 * Math.sin(k * 0.3) * 0.75 / 0.75, lz)); g.add(r2); }
      glowSprite(g, wp(lx, ly - 0.05, lz), 0.9, new THREE.Color(0.45, 0.3, 0.14));
      const cg = new THREE.Group(); cg.position.set(...wp(lx + 0.05, ly - 0.15, lz + 0.05)); g.add(cg); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.45, 5).translate(0, -0.225, 0), C("#e8dcc0")); cg.add(cord);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), C("#c83a2a")); kn.position.y = -0.46; cg.add(kn); this.swingers.push({ m: cg, ax: "x", a: 0.08, w: 1.7, ph: 1.2, base: 0 }); }
    // a pothos on a little stand (front right) and a floor vase
    rb.box(C("#6a4028"), c + 1.55, fy, -0.95, c + 1.9, fy + 0.45, -0.6); this.plant([c + 1.72, fy + 0.45, -0.78], 0.6, "#e8e0d0", "#5a9a4a", 0.12);
    this.motes.push({ m: new Motes(g, 40, 21, o, [c - 1.6, fy + 0.6, -3.3], [c + 0.3, fy + 2.0, -1.0], new THREE.Color(0.45, 0.36, 0.22), 0.012, 0.05), seed: 7 });
  }
  /** a curled ginger cat (spheres) with a swaying tail (a chain of segments) */
  private cat(g: THREE.Group, p: P3) {
    const rb = this.rb, fur = C("#e8963a"), [x, y, z] = p;
    rb.geo(new THREE.SphereGeometry(0.17, 16, 12), fur, x, y + 0.11, z, 0.3, 0, 0, [1.25, 0.65, 0.95]);
    rb.geo(new THREE.SphereGeometry(0.095, 14, 10), fur, x + 0.15, y + 0.15, z + 0.08);
    for (const s of [-1, 1]) rb.geo(new THREE.ConeGeometry(0.035, 0.07, 8), fur, x + 0.15 + s * 0.05, y + 0.23, z + 0.07, 0, 0, -s * 0.3);
    rb.geo(new THREE.SphereGeometry(0.05, 10, 8), C("#f8f0e0"), x + 0.19, y + 0.12, z + 0.15, 0, 0, 0, [1, 0.7, 0.6]);
    for (const s of [-1, 1]) rb.geo(new THREE.SphereGeometry(0.012, 6, 4), C("#2a1a26"), x + 0.15 + s * 0.035, y + 0.16, z + 0.17, 0, 0, 0, [1, 0.35, 0.5]);
    for (let k = 0; k < 3; k++) rb.box(C("#c8702a"), x - 0.1 + k * 0.08, y + 0.21, z - 0.05, x - 0.07 + k * 0.08, y + 0.215, z + 0.08);
    // tail: 6 segments, each a child of the previous
    let parent: THREE.Object3D = g; const base = new THREE.Group(); base.position.set(...wp(x - 0.18, y + 0.06, z + 0.05)); base.rotation.y = 0.6; g.add(base); parent = base;
    for (let k = 0; k < 6; k++) {
      const s = new THREE.Group(); if (k) s.position.x = -0.055; parent.add(s);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.022 - k * 0.0015, 0.04, 4, 8).rotateZ(Math.PI / 2).translate(-0.028, 0, 0), k > 3 ? C("#c8702a") : fur); m.castShadow = true; s.add(m);
      this.tail.push(s); parent = s;
    }
    this.contactAt([x, y, z], 0.55, 0.45, 0.4);
  }

  // ================================================================================ INTERNET CAFE (street level)
  private buildCafe(g: THREE.Group) {
    const rb = this.rb, R = ROOMS.cafe, c = R.x, fy = R.y;
    const dcarp = TM("hmCafeCarpet", () => tx("hmCafeCarpetT", 512, 512, (q, r) => { q.fillStyle = "#2a2e4a"; q.fillRect(0, 0, 512, 512); for (let k = 0; k < 260; k++) { q.fillStyle = ["#e84aa0", "#4ad0e8", "#f2d24a", "#6a5ac8"][k % 4]; q.globalAlpha = 0.5; q.save(); q.translate(r() * 512, r() * 512); q.rotate(r() * 6); q.fillRect(-6, -2, 12, 4); q.restore(); } q.globalAlpha = 1; speck(q, r, 512, 512, 3000, ["#1a1e30", "#3a3e5a"], 1, 2, 0.4); }));
    this.room(c, fy, { floor: dcarp, fsu: 1.6, wall: TM("hmCafeWall", () => T.plasterTex("hmCafeWall", "#3a4656")), ceil: TM("hmCafeCeil", () => T.plasterTex("hmCafeCeil", "#26262e")), skirt: C("#1a1a20") });
    // manga shelves along the back wall (behind the booth)
    const pal = ["#e84a4a", "#4a8ae8", "#f2d24a", "#f2f2f2", "#4ab86a", "#e88a2a", "#c84ab0", "#2a2a3a"];
    rb.box(C("#3a2418"), c - 1.98, fy, -D, c - 0.15, fy + 2.15, -3.12); rb.panel(TM("hmManga", () => T.spinesTex("hmMangaT", pal)), 1.79, 2.1, c - 1.065, fy + 1.08, -3.118);
    rb.box(C("#3a2418"), c + 0.35, fy, -D, c + 1.98, fy + 2.15, -3.12); rb.panel(TM("hmManga2", () => T.spinesTex("hmMangaT2", pal)), 1.59, 2.1, c + 1.165, fy + 1.08, -3.118);
    // the neon tube over the shelves (magenta wave + cyan line) and its glow
    const nm = basic("hmNeonM", () => ({ color: new THREE.Color(2.4, 0.5, 1.9) })), nc = basic("hmNeonC", () => ({ color: new THREE.Color(0.5, 2.0, 2.4) })); this.neon.push(nm, nc);
    const pts: THREE.Vector3[] = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push(new THREE.Vector3(...wp(c - 1.8 + 3.6 * u, fy + 2.32 + 0.05 * Math.sin(u * TAU * 4), -D + 0.04))); }
    g.add(ink(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.012, 6), nm)));
    g.add(ink(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(...wp(c - 1.8, fy + 2.2, -D + 0.04)), new THREE.Vector3(...wp(c + 1.8, fy + 2.2, -D + 0.04))), 4, 0.01, 6), nc)));
    for (let k = 0; k < 5; k++) glowSprite(g, wp(c - 1.6 + k * 0.8, fy + 2.28, -D + 0.1), 1.0, new THREE.Color(0.35, 0.12, 0.32));
    // the booth: partitions, the desk, an LCD (+ BUY), keyboard / mouse, headphones, a melon soda, the PC tower (LED)
    const bw = C("#4a3226"), bcap = C("#2a1a14");
    rb.box(bw, c - 1.1, fy, -2.62, c + 1.65, fy + 1.45, -2.55); rb.box(bcap, c - 1.12, fy + 1.45, -2.64, c + 1.67, fy + 1.49, -2.53);
    for (const x of [c - 1.1, c + 1.6]) { rb.box(bw, x, fy, -2.62, x + 0.05, fy + 1.45, -0.75); rb.box(bcap, x - 0.01, fy + 1.45, -2.62, x + 0.06, fy + 1.49, -0.75); }
    rb.panel(basic("hmBooth12", () => ({ map: tx("hmBooth12T", 128, 96, (q) => { q.fillStyle = "#f2d24a"; rrect(q, 4, 4, 120, 88, 10); q.fill(); q.fillStyle = "#1a1a20"; q.font = "bold 64px Arial Black, Arial"; q.textAlign = "center"; q.fillText("12", 64, 72); }, true) })), 0.16, 0.12, c + 1.598, fy + 1.3, -1.0, -Math.PI / 2);
    rb.box(C("#5a3a2a"), c - 1.05, fy + 0.7, -2.55, c + 1.6, fy + 0.74, -1.85);
    this.buyScreen(g, "cf", [c + 0.6, fy + 0.74, -2.25], -0.28, "lcd", 0.76, 0.48, CLICK.cafe);
    rb.rbox(C("#1e1e24"), 0.46, 0.022, 0.15, c + 0.45, fy + 0.752, -2.0, -0.12);
    rb.rbox(C("#1e1e24"), 0.055, 0.024, 0.09, MICE.cafe[0], fy + 0.752, MICE.cafe[2], -0.1);
    { const hx = c - 0.75, hz = -2.2; rb.geo(new THREE.TorusGeometry(0.09, 0.012, 6, 16, Math.PI), C("#1e1e24"), hx, fy + 0.84, hz, 0.4); for (const s of [-1, 1]) rb.geo(cylY(0.045, 0.035, 14), C("#c83a3a"), hx + s * 0.085 * Math.cos(0.4), fy + 0.74, hz - s * 0.085 * Math.sin(0.4)); }
    { const dx = c + 1.25, dz = -1.98; const cup = new THREE.Mesh(cylY(0.045, 0.16, 16, false, 0.038), basic("hmSoda", () => ({ color: new THREE.Color(0.35, 0.9, 0.45), transparent: true, opacity: 0.8 }))); cup.position.set(...wp(dx, fy + 0.74, dz)); g.add(cup);
      rb.geo(cylY(0.047, 0.012, 16), C("#f8f8f8"), dx, fy + 0.9, dz); rb.seg(C("#e84a4a"), [dx + 0.01, fy + 0.9, dz], [dx + 0.04, fy + 1.04, dz + 0.01], 0.006); }
    rb.box(C("#1a1a20"), c + 1.12, fy, -2.45, c + 1.38, fy + 0.46, -1.98);
    this.led = basic("hmLed", () => ({ color: new THREE.Color(0.3, 1.3, 0.6) }));
    plane(g, this.led, 0.015, 0.015, wp(c + 1.25, fy + 0.4, -1.978), 0, 0, 0, true);
    // the padded recliner
    this.chair(MARKS.cafe.p, 1, "#2a2a30", "#b02a34", true);
    // a poster on the left wall, the downlight
    rb.panel(TM("hmPoster", T.posterTex), 0.4, 0.56, c - W / 2 + 0.01, fy + 1.75, -1.4, Math.PI / 2);
    bulb(g, wp(c + 0.2, fy + H - 0.03, -1.7), 0.04, "#ffe0b0", 3, 0.4, 0.3);
    // the street-level step, the vertical NET CAFE sign on the left pillar (lit)
    rb.box(C("#b8b0a4"), c - W / 2, 0, FZ, c + W / 2, 0.2, 0.62);
    rb.box(C("#1a1830"), -2.42, 0.75, FZ, -2.18, 2.75, FZ + 0.12);
    plane(g, basic("hmCafeSign", () => ({ map: T.cafeSignTex() })), 0.2, 1.9, wp(-2.3, 1.75, FZ + 0.122), 0, 0, 0, true);
    glowSprite(g, wp(-2.3, 1.75, FZ + 0.3), 1.6, new THREE.Color(0.3, 0.12, 0.3));
    this.motes.push({ m: new Motes(g, 30, 31, o, [c - 0.8, fy + 0.8, -2.5], [c + 1.5, fy + 2.2, -0.8], new THREE.Color(0.25, 0.2, 0.32), 0.01, 0.04), seed: 11 });
  }

  // ================================================================================ THE 27-YEAR-OLD'S FLAT
  private buildApartment(g: THREE.Group) {
    const rb = this.rb, R = ROOMS.apartment, c = R.x, fy = R.y;
    this.room(c, fy, { floor: TM("hmFloor", () => T.flooringTex()), fsu: 2, wall: TM("hmApWall", () => T.plasterTex("hmApWall", "#f0ebe0")), ceil: TM("hmApCeil", () => T.plasterTex("hmApCeil", "#f6f2ea")), skirt: C("#d8d0c0") },
      { x0: -1.75, x1: -0.45, y0: 0.85, y1: 2.1 });
    this.view(g, "ap", 3, c - 1.1, fy + 1.47, 1.3, 1.25);
    // curtains (pale blue) in the draft
    rb.seg(C("#c8ccd0"), [c - 2.0, fy + 2.2, -D + 0.12], [c - 0.2, fy + 2.2, -D + 0.12], 0.012);
    const cm = lam("si:hmApCurt", () => ({ map: tx("hmApCurtT", 256, 512, (q, r) => { q.fillStyle = "#9cc0dc"; q.fillRect(0, 0, 256, 512); for (let x = 0; x < 256; x += 28) { q.fillStyle = "rgba(20,40,80,0.13)"; q.fillRect(x, 0, 10, 512); } speck(q, r, 256, 512, 500, ["#7aa0c0"], 1, 2, 0.3); }), side: THREE.DoubleSide }));
    for (const x of [c - 1.93, c - 0.3]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.45).translate(0, -0.72, 0), cm); m.position.set(...wp(x, fy + 2.19, -D + 0.12)); m.castShadow = true; m.receiveShadow = true; g.add(m); this.swingers.push({ m, ax: "x", a: 0.09, w: 1.1, ph: x * 2, base: 0.05 }); }
    // the desk (pale wood) + three monitors: two on the desk, the counter screen on an arm above
    const dw = C("#d6c6a4");
    rb.box(dw, c - 0.18, fy + 0.7, -3.46, c + 1.62, fy + 0.74, -2.78);
    for (const x of [c - 0.15, c + 1.55]) rb.box(C("#b8b0a0"), x, fy, -3.42, x + 0.05, fy + 0.7, -2.82);
    rb.box(C("#c8bc9c"), c - 0.15, fy + 0.5, -3.44, c + 1.6, fy + 0.53, -3.4);
    this.buyScreen(g, "ap", [c + 0.22, fy + 0.74, -3.12], 0.1, "lcd", 0.5, 0.32, CLICK.buyer);
    const chB = S.chartTex("hmChartB", 2, true); this.charts.push(chB);
    this.monitor(g, [c + 0.82, fy + 0.74, -3.1], -0.12, "lcd", 0.5, 0.32, basic("hmChartBm", () => ({ map: chB })));
    rb.seg(C("#2a2a30"), [c + 0.52, fy + 0.74, -3.4], [c + 0.52, fy + 1.45, -3.4], 0.02);
    rb.seg(C("#2a2a30"), [c + 0.52, fy + 1.45, -3.4], [c + 0.52, fy + 1.6, -3.3], 0.016);
    this.counterMat = basic("hmCounterM", () => ({ map: this.counter.tex }));
    const top = this.monitor(g, [c + 0.52, fy + 1.15, -3.28], 0, "lcd", 0.9, 0.5, this.counterMat);
    top.G.children.slice(0, 2).forEach((m) => { m.visible = false; });
    this.counter.draw("+¥0", 0, 0);
    this.glint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic("hmGlintM", () => ({ map: S.glintTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.8, 1.4) })));
    this.glint.position.set(0.36, top.yc + 0.1, 0.02); this.glint.renderOrder = 6; this.glint.visible = false; top.G.add(ink(this.glint));
    // keyboard, mouse + pad, the cup noodle (steam, chopsticks), an energy drink can, a clamp lamp
    rb.rbox(C("#1e1e24"), 0.44, 0.022, 0.14, c + 0.52, fy + 0.752, -3.0, 0.05);
    rb.panel(C("#3a3e4a"), 0.24, 0.2, MICE.buyer[0], fy + 0.742, MICE.buyer[2], 0, -Math.PI / 2);
    rb.rbox(C("#1e1e24"), 0.055, 0.024, 0.09, MICE.buyer[0], fy + 0.752, MICE.buyer[2], 0.1);
    { const nx = c + 1.02, nz = -2.92; rb.geo(new THREE.CylinderGeometry(0.06, 0.045, 0.11, 18, 1, true).translate(0, 0.055, 0), lam("si:hmNoodle", () => ({ map: T.noodleTex(), side: THREE.DoubleSide })), nx, fy + 0.74, nz);
      rb.geo(new THREE.CircleGeometry(0.056, 18).rotateX(-Math.PI / 2), C("#e8c070"), nx, fy + 0.84, nz);
      rb.rbox(C("#f2ece0"), 0.1, 0.004, 0.08, nx - 0.02, fy + 0.86, nz - 0.07, 0.2, 0.9);
      rb.seg(C("#d8b880"), [nx - 0.09, fy + 0.855, nz + 0.02], [nx + 0.09, fy + 0.85, nz - 0.01], 0.004); rb.seg(C("#d8b880"), [nx - 0.09, fy + 0.86, nz + 0.035], [nx + 0.09, fy + 0.855, nz + 0.005], 0.004);
      this.steam(g, [nx, fy + 0.86, nz], 0.24, 0.06); }
    rb.geo(cylY(0.03, 0.12, 14), C("#2a6ad0"), c + 1.5, fy + 0.74, -3.2);
    // his chair
    this.chair(MARKS.buyer.p, 1, "#3a3c44", "#2a2c34", false, true);
    rb.geo(new THREE.CircleGeometry(0.75, 28).rotateX(-Math.PI / 2), TM("hmApRug", () => tx("hmApRugT", 256, 256, (q, r) => { q.fillStyle = "#8a8e98"; q.fillRect(0, 0, 256, 256); speck(q, r, 256, 256, 4000, ["#6a6e78", "#a8acb4"], 1, 2, 0.5); q.strokeStyle = "rgba(240,240,240,0.4)"; q.lineWidth = 6; q.beginPath(); q.arc(128, 128, 110, 0, TAU); q.stroke(); })), c - 0.2, fy + 0.004, -2.0, 0, 0, 0, 1, false);
    // mini fridge (+ a kettle on it), the folded futon, the clothes rail (front-left), a wall shelf of books
    rb.box(C("#e8eae8"), c + 1.62, fy, -3.46, c + 1.98, fy + 0.85, -3.0); rb.panel(TM("hmFridge", T.fridgeTex), 0.36, 0.83, c + 1.8, fy + 0.425, -2.998);
    rb.geo(cylY(0.07, 0.16, 16, false, 0.055), C("#f2f2ee"), c + 1.8, fy + 0.85, -3.22); rb.seg(C("#2a2a30"), [c + 1.86, fy + 0.95, -3.22], [c + 1.88, fy + 0.88, -3.22], 0.012);
    const fu = TM("hmFuton", T.futonTex);
    for (let k = 0; k < 3; k++) rb.rbox(fu, 0.82, 0.14, 0.62, c + 1.48 + (hash(k) - 0.5) * 0.04, fy + 0.07 + k * 0.145, -1.75, (hash(k + 3) - 0.5) * 0.08);
    rb.rbox(C("#f2f2ec"), 0.5, 0.1, 0.3, c + 1.46, fy + 0.5, -1.78, 0.1);
    this.contactAt([c + 1.48, fy, -1.75], 1.1, 0.9, 0.45);
    { const rx0 = c - 1.95, rx1 = c - 1.0, rz = -0.85; for (const x of [rx0, rx1]) { rb.seg(C("#b8bcc2"), [x, fy, rz], [x, fy + 1.6, rz], 0.015); rb.seg(C("#b8bcc2"), [x, fy + 0.02, rz - 0.22], [x, fy + 0.02, rz + 0.22], 0.012); }
      rb.seg(C("#b8bcc2"), [rx0, fy + 1.6, rz], [rx1, fy + 1.6, rz], 0.012);
      const cl = ["#8a8e96", "#f2f0ea", "#2a3a5a", "#d86a4a"], kinds = [0, 1, 2, 3];
      for (let k = 0; k < 4; k++) { const x = rx0 + 0.14 + k * 0.22, w = 0.42;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.5).translate(0, -w * 0.75, 0), lam(`si:hmGarm${k}`, () => ({ map: T.garmentTex(kinds[k], cl[k]), alphaTest: 0.5, side: THREE.DoubleSide })));
        m.position.set(...wp(x, fy + 1.62, rz + 0.04 * k)); m.castShadow = true; m.receiveShadow = true; g.add(m);
        this.swingers.push({ m, ax: "x", a: 0.04, w: 0.9, ph: k * 1.3, base: 0 }); }
      this.contactAt([(rx0 + rx1) / 2, fy, rz], 1.2, 0.5, 0.3); }
    rb.box(C("#d6c6a4"), c + 1.0, fy + 1.82, -D, c + 1.98, fy + 1.85, -3.25);
    rb.panel(TM("hmApBooks", () => T.spinesTex("hmApBooksT", ["#2a4a7a", "#c8a050", "#7a2a2a", "#f2f2f2", "#3a6a4a"], "#d6c6a4", 1)), 0.96, 0.32, c + 1.49, fy + 2.0, -3.252);
    // the ceiling light (+ a swaying pull cord), a wall clock-less calendar
    rb.geo(cylY(0.25, 0.06, 28), C("#f2f2ee"), c, fy + H - 0.06, -1.8);
    plane(g, basic("hmApLight", () => ({ color: new THREE.Color(1.55, 1.48, 1.32) })), 0.44, 0.44, wp(c, fy + H - 0.062, -1.8), 0, Math.PI / 2, 0, true);
    { const cg = new THREE.Group(); cg.position.set(...wp(c + 0.05, fy + H - 0.06, -1.8)); g.add(cg); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.22, 5).translate(0, -0.11, 0), C("#f2f2ee")); cg.add(cord);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), C("#3a8ae0")); kn.position.y = -0.23; cg.add(kn); this.swingers.push({ m: cg, ax: "z", a: 0.07, w: 1.9, ph: 2.2, base: 0 }); }
    rb.panel(TM("hmCal", T.calendarTex), 0.24, 0.32, c - 0.2, fy + 1.9, -D + 0.012);
    // the indoor AC over the window (its louver nods), a framed mountain print over the desk
    rb.box(C("#f4f2ec"), c - 1.55, fy + 2.18, -D, c - 0.65, fy + 2.44, -D + 0.22);
    rb.box(C("#d8d6d0"), c - 1.5, fy + 2.2, -D + 0.215, c - 0.7, fy + 2.24, -D + 0.225);
    plane(g, basic("hmAcLed", () => ({ color: new THREE.Color(0.4, 1.3, 0.6) })), 0.012, 0.012, wp(c - 0.75, fy + 2.3, -D + 0.222), 0, 0, 0, true);
    { const lv = new THREE.Group(); lv.position.set(...wp(c - 1.1, fy + 2.19, -D + 0.2)); g.add(lv); const fl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.006, 0.08).translate(0, 0, 0.04), C("#e8e6e0")); fl.castShadow = true; lv.add(fl);
      this.swingers.push({ m: lv, ax: "x", a: 0.18, w: 0.5, ph: 0.3, base: 0.55 }); }
    rb.box(C("#2a1a14"), c + 0.24, fy + 1.98, -D, c + 0.84, fy + 2.38, -D + 0.025); rb.panel(TM("hmPrint", T.printTex), 0.58, 0.385, c + 0.54, fy + 2.18, -D + 0.027);
    this.motes.push({ m: new Motes(g, 50, 41, o, [c - 1.8, fy + 0.6, -3.3], [c - 0.2, fy + 2.1, -1.2], new THREE.Color(0.7, 0.58, 0.38), 0.018, 0.05), seed: 13 });
  }

  // ================================================================================ LIVED-IN EXTRAS (every room finished)
  /** a cable run through set-local points (thin dark segments) */
  private cable(pts: P3[], col = "#26262c", r = 0.008) { for (let k = 0; k < pts.length - 1; k++) this.rb.seg(C(col), pts[k], pts[k + 1], r, false, 6); }
  /** a small framed picture on a wall (ry 0 = back wall, PI/2 = left wall): w x h metres, `draw` paints the 160-wide picture */
  private framed(key: string, x: number, y: number, z: number, ry: number, w: number, h: number, draw: Parameters<typeof tx>[3], frame = "#3a2418") {
    const rb = this.rb;
    if (ry) rb.rbox(C(frame), 0.03, h + 0.05, w + 0.05, x, y, z, 0); else rb.rbox(C(frame), w + 0.05, h + 0.05, 0.03, x, y, z, 0);
    rb.panel(TM(key, () => tx(key + "T", 160, Math.round((160 * h) / w), draw)), w, h, x + (ry ? 0.017 : 0), y, z + (ry ? 0 : 0.017), ry);
  }
  private buildExtras(g: THREE.Group) {
    const rb = this.rb, O = ROOMS.office, GM = ROOMS.grandma, CF = ROOMS.cafe, AP = ROOMS.apartment;
    // ------------------------------------------------ OFFICE: a lamp, a whiteboard chart, a bin, a coat, cables
    { const c = O.x, fy = O.y;
      rb.geo(cylY(0.07, 0.025, 16), C("#2a2c30"), c + 0.55, fy + 0.74, -2.4);
      rb.seg(C("#2a2c30"), [c + 0.55, fy + 0.76, -2.4], [c + 0.6, fy + 1.04, -2.34], 0.007); rb.seg(C("#2a2c30"), [c + 0.6, fy + 1.04, -2.34], [c + 0.72, fy + 1.0, -2.2], 0.007);
      rb.geo(new THREE.ConeGeometry(0.07, 0.09, 14, 1, true).rotateX(-2.0), C("#3a6a4a"), c + 0.74, fy + 0.98, -2.18); glowSprite(g, wp(c + 0.74, fy + 0.9, -2.16), 0.5, new THREE.Color(0.9, 0.7, 0.35));
      // a whiteboard on the right wall: a falling-then-rising sales chart
      rb.box(C("#b8bcc2"), c + W / 2 - 0.035, fy + 1.0, -2.95, c + W / 2, fy + 1.88, -1.55);
      rb.panel(TM("hmWhiteboard", () => tx("hmWhiteboardT", 280, 176, (q) => { q.fillStyle = "#f6f7f4"; q.fillRect(0, 0, 280, 176); q.strokeStyle = "#2a3a5a"; q.lineWidth = 3; q.beginPath(); q.moveTo(24, 20); q.lineTo(24, 150); q.lineTo(260, 150); q.stroke();
        q.strokeStyle = "#d8402a"; q.lineWidth = 5; q.beginPath(); q.moveTo(26, 40); q.lineTo(80, 70); q.lineTo(130, 62); q.lineTo(180, 104); q.lineTo(250, 124); q.stroke();
        q.fillStyle = "#2a3a5a"; q.font = "bold 20px Arial"; q.fillText("Q4 TARGET", 40, 30); q.fillStyle = "#3a8a4a"; for (let k = 0; k < 4; k++) q.fillRect(200 + k * 14, 40 - k * 4, 10, 8 + k * 4);
        q.fillStyle = "#c8402a"; q.beginPath(); q.arc(240, 22, 7, 0, TAU); q.fill(); })), 1.34, 0.84, c + W / 2 - 0.037, fy + 1.44, -2.25, -Math.PI / 2);
      rb.geo(cylY(0.1, 0.26, 14, true, 0.085), C("#6a6e78"), c + 0.55, fy, -1.2);
      this.cable([[c + 1.0, fy + 0.74, -2.5], [c + 1.1, fy + 0.3, -2.5], [c + 1.3, fy + 0.05, -2.3], [c + 1.9, fy + 0.04, -2.0]], "#2a2a30");
      rb.rbox(C("#e8e4a8"), 0.06, 0.06, 0.004, c - 0.9, fy + 1.55, -D + 0.006, 0.1); rb.rbox(C("#f4a8c0"), 0.06, 0.06, 0.004, c - 0.75, fy + 1.42, -D + 0.006, -0.1); }
    // ------------------------------------------------ GRANDMA: reading glasses, photos, a hanging plant, a fan, a knitting basket
    { const c = GM.x, fy = GM.y, lx = c - W / 2 + 0.012;
      { const gx = c + 0.02, gy = fy + 0.462, gz = -1.4, gl = C("#7a2a3a");
        for (const s of [-1, 1]) rb.geo(new THREE.TorusGeometry(0.028, 0.0035, 6, 16).rotateX(Math.PI / 2), gl, gx + s * 0.034, gy, gz);
        rb.seg(gl, [gx - 0.006, gy, gz], [gx + 0.006, gy, gz], 0.003, false, 5); rb.seg(gl, [gx - 0.062, gy, gz], [gx - 0.07, gy, gz + 0.09], 0.003, false, 5); rb.seg(gl, [gx + 0.062, gy, gz], [gx + 0.07, gy, gz + 0.09], 0.003, false, 5); }
      const pic = (c0: string, c1: string): Parameters<typeof tx>[3] => (q) => { q.fillStyle = c0; q.fillRect(0, 0, 160, 220); q.fillStyle = c1; q.fillRect(0, 140, 160, 80); q.fillStyle = "#f0d8c0"; q.beginPath(); q.arc(60, 90, 22, 0, TAU); q.arc(104, 96, 18, 0, TAU); q.fill(); q.fillStyle = "#3a3a4a"; q.fillRect(38, 112, 44, 70); q.fillStyle = "#a8484a"; q.fillRect(86, 114, 36, 70); };
      this.framed("hmFam1", lx, fy + 1.62, -1.5, Math.PI / 2, 0.22, 0.28, pic("#a8c8e0", "#6a9a5a"), "#5a3a22");
      this.framed("hmFam2", lx, fy + 1.5, -1.96, Math.PI / 2, 0.3, 0.2, pic("#e8d8a8", "#8a6a4a"), "#3a2418");
      this.framed("hmFam3", lx, fy + 1.72, -2.4, Math.PI / 2, 0.2, 0.26, pic("#c8b8e0", "#5a7a9a"), "#b89a5a");
      this.framed("hmFam4", lx, fy + 1.36, -2.4, Math.PI / 2, 0.16, 0.2, pic("#e0c0b0", "#7a9a6a"), "#5a3a22");
      // a hanging pothos by the window (the vines sway)
      { const hx = c - 1.55, hz = -2.9; rb.seg(C("#5a4a3a"), [hx, fy + H, hz], [hx, fy + 1.95, hz], 0.004, false, 4); rb.geo(cylY(0.09, 0.1, 14, false, 0.12), C("#c8b898"), hx, fy + 1.85, hz);
        const vg = new THREE.Group(); vg.position.set(...wp(hx, fy + 1.9, hz)); g.add(vg); const lm = lam("si:hmVine", () => ({ color: "#4a8a4a" }));
        for (let k = 0; k < 7; k++) { const L = 0.22 + 0.07 * (k % 4), ang = k * 0.9; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0).scale(1, 2.2, 1), lm); m.position.set(Math.cos(ang) * 0.09, -L * 0.5, Math.sin(ang) * 0.09); vg.add(m);
          const m2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), lm); m2.position.set(Math.cos(ang) * 0.1, -L, Math.sin(ang) * 0.1); vg.add(m2); }
        const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0).scale(1.2, 0.6, 1.2), lm); top.position.y = 0.02; vg.add(top);
        this.swingers.push({ m: vg, ax: "z", a: 0.05, w: 0.8, ph: 1.7, base: 0 }); }
      // a little standing fan at the right wall (its blades spin)
      { const fx = c + 1.72, fz = -1.7; rb.geo(cylY(0.13, 0.03, 16), C("#e8e8e4"), fx, fy, fz); rb.seg(C("#d8d8d2"), [fx, fy + 0.03, fz], [fx, fy + 0.62, fz], 0.012);
        rb.geo(new THREE.TorusGeometry(0.15, 0.007, 6, 28), C("#c8ccd0"), fx, fy + 0.74, fz); rb.geo(cylY(0.03, 0.05, 10).rotateX(Math.PI / 2), C("#d8d8d2"), fx, fy + 0.74, fz - 0.03);
        const sp = new THREE.Group(); sp.position.set(...wp(fx, fy + 0.74, fz + 0.01)); g.add(sp); const bl = lam("si:hmBlade", () => ({ color: "#9ac8e8", transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
        for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.13).translate(0, 0.075, 0), bl); b.rotation.z = (k * TAU) / 3; sp.add(b); } this.spinners.push({ m: sp, w: 3.3 }); }
      // a knitting basket with yarn balls and the needles
      { const kx = c + 1.0, kz = -1.15; rb.geo(cylY(0.13, 0.12, 16, false, 0.16), C("#b8884a"), kx, fy, kz);
        for (const [dx, dz, col] of [[-0.04, -0.02, "#d8484a"], [0.05, 0.02, "#f2d24a"], [0.0, 0.07, "#4a8ad8"]] as [number, number, string][]) rb.geo(new THREE.SphereGeometry(0.06, 12, 10), C(col), kx + dx, fy + 0.15, kz + dz);
        rb.seg(C("#e8d8b0"), [kx - 0.04, fy + 0.13, kz], [kx + 0.14, fy + 0.34, kz - 0.06], 0.005, false, 4); rb.seg(C("#e8d8b0"), [kx - 0.02, fy + 0.13, kz + 0.02], [kx + 0.17, fy + 0.3, kz + 0.0], 0.005, false, 4); } }
    // ------------------------------------------------ INTERNET CAFE: snacks, a lucky cat, a ceiling fan, a lamp, a menu board
    { const c = CF.x, fy = CF.y;
      rb.rbox(C("#d8382a"), 0.12, 0.17, 0.035, c - 0.35, fy + 0.83, -2.3, 0.25, -0.15); rb.rbox(C("#f2d24a"), 0.09, 0.07, 0.036, c - 0.35, fy + 0.84, -2.28, 0.25, -0.15);
      rb.geo(cylY(0.07, 0.05, 16, false, 0.05), C("#f2f2ee"), c - 0.12, fy + 0.74, -2.0); for (let k = 0; k < 7; k++) rb.seg(C("#f2c24a"), [c - 0.12 + (k - 3) * 0.014, fy + 0.79, -2.0], [c - 0.12 + (k - 3) * 0.02, fy + 0.89, -2.0 + ((k % 3) - 1) * 0.01], 0.006, false, 5);
      rb.rbox(C("#f2e870"), 0.07, 0.07, 0.004, c - 0.8, fy + 1.2, -2.545, 0.1);
      { const mx = c + 1.38, mz = -2.3; rb.geo(new THREE.SphereGeometry(0.06, 14, 10).scale(1, 1.15, 0.9), C("#f6f2ea"), mx, fy + 0.8, mz); rb.geo(new THREE.SphereGeometry(0.045, 14, 10), C("#f6f2ea"), mx, fy + 0.89, mz);
        for (const s of [-1, 1]) rb.geo(new THREE.ConeGeometry(0.018, 0.04, 4), C("#f6f2ea"), mx + s * 0.03, fy + 0.94, mz); rb.geo(new THREE.CircleGeometry(0.012, 8), C("#d8a838"), mx, fy + 0.84, mz + 0.058);
        const pw = new THREE.Group(); pw.position.set(...wp(mx + 0.05, fy + 0.84, mz + 0.02)); g.add(pw); const pm = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8).translate(0, 0.035, 0), C("#f6f2ea")); pm.castShadow = true; pw.add(pm); this.swingers.push({ m: pw, ax: "z", a: 0.5, w: 1.6, ph: 0, base: -0.3 }); }
      { const fx = c - 0.9, fz = -1.6, fyc = fy + H - 0.14; rb.seg(C("#2a2a30"), [fx, fy + H, fz], [fx, fyc, fz], 0.01, false, 6);
        const hold = new THREE.Group(); hold.position.set(...wp(fx, fyc, fz)); hold.rotation.x = Math.PI / 2; g.add(hold); const sp = new THREE.Group(); hold.add(sp);
        const bm = C("#6a4a30"); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.075).translate(0.2, 0, 0), bm); b.rotation.y = (k * TAU) / 4; sp.add(b); }
        sp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12).rotateX(Math.PI / 2), C("#2a2a30"))); this.spinners.push({ m: sp, w: 2.4 }); }
      rb.geo(cylY(0.05, 0.02, 14), C("#c8c8cc"), c - 0.92, fy + 0.74, -2.38); rb.seg(C("#c8c8cc"), [c - 0.92, fy + 0.76, -2.38], [c - 0.86, fy + 0.96, -2.3], 0.006); glowSprite(g, wp(c - 0.84, fy + 0.94, -2.28), 0.5, new THREE.Color(0.8, 0.55, 0.25));
      rb.box(C("#2a1a14"), c - W / 2, fy + 1.0, -2.78, c - W / 2 + 0.03, fy + 1.78, -2.04);
      rb.panel(TM("hmCafeMenu", () => tx("hmCafeMenuT", 160, 240, (q) => { q.fillStyle = "#1a1a24"; q.fillRect(0, 0, 160, 240); q.fillStyle = "#f2d24a"; q.font = "bold 26px Arial"; q.fillText("DRINK BAR", 14, 34); q.font = "17px Arial"; const it = ["COLA", "MELON SODA", "ICED TEA", "COFFEE", "RAMEN", "FRIES"]; for (let k = 0; k < it.length; k++) { q.fillStyle = "#ffffff"; q.fillText(it[k], 14, 70 + k * 28); q.fillStyle = "#e84aa0"; q.fillRect(122, 56 + k * 28, 24, 3); } })), 0.7, 0.76, c - W / 2 + 0.033, fy + 1.4, -2.41, Math.PI / 2); }
    // ------------------------------------------------ THE 27-YEAR-OLD'S FLAT: posters, a bed edge, snacks, noodle cups, cables, an LED strip
    { const c = AP.x, fy = AP.y;
      this.framed("hmPosterA", c + 1.28, fy + 1.36, -D + 0.013, 0, 0.44, 0.62, (q) => { q.fillStyle = "#1a2a5a"; q.fillRect(0, 0, 160, 226); const gr = q.createLinearGradient(0, 0, 0, 226); gr.addColorStop(0, "#e84a8a"); gr.addColorStop(1, "#2a1a5a"); q.fillStyle = gr; q.fillRect(8, 8, 144, 210);
        q.fillStyle = "#f8e8a0"; q.beginPath(); q.arc(80, 88, 34, 0, TAU); q.fill(); q.fillStyle = "#14102a"; q.beginPath(); q.moveTo(8, 218); q.lineTo(50, 140); q.lineTo(80, 180); q.lineTo(112, 120); q.lineTo(152, 218); q.fill(); q.fillStyle = "#fff"; q.font = "bold 16px Arial"; q.fillText("NEON 2005", 34, 36); }, "#1a1a20");
      this.framed("hmPosterB", c + 1.8, fy + 1.3, -D + 0.013, 0, 0.26, 0.4, (q) => { q.fillStyle = "#f2e8c8"; q.fillRect(0, 0, 160, 246); q.fillStyle = "#c83a2a"; q.fillRect(0, 0, 160, 80); q.fillStyle = "#1a1a20"; q.beginPath(); q.arc(80, 150, 36, 0, TAU); q.fill(); q.fillStyle = "#f2e8c8"; q.fillRect(62, 140, 14, 8); q.fillRect(86, 140, 14, 8); }, "#3a2a1a");
      // the bed edge (a low frame, a mattress, a rumpled duvet and a pillow) along the left wall
      rb.box(C("#8a6a48"), c - 1.98, fy, -2.55, c - 1.02, fy + 0.2, -1.2); rb.rbox(C("#f2f0ea"), 0.93, 0.14, 1.32, c - 1.5, fy + 0.27, -1.88, 0);
      rb.rbox(TM("hmDuvet", () => tx("hmDuvetT", 128, 128, (q, r) => { q.fillStyle = "#6a8ab8"; q.fillRect(0, 0, 128, 128); for (let k = 0; k < 10; k++) { q.fillStyle = k % 2 ? "#5a7aa8" : "#7a9ac8"; q.fillRect(0, k * 13, 128, 7); } speck(q, r, 128, 128, 200, ["#4a6a98", "#8aaad8"], 1, 2, 0.3); })), 0.93, 0.07, 0.85, c - 1.5, fy + 0.37, -1.65, 0.03, 0, 0.03);
      rb.rbox(C("#f8f6f0"), 0.44, 0.09, 0.28, c - 1.5, fy + 0.4, -2.33, 0.1);
      // snacks on the desk and floor, more cup noodles, a pile of cans
      rb.rbox(C("#e8402a"), 0.13, 0.17, 0.03, c - 0.02, fy + 0.83, -3.2, 0.2, -0.15); rb.rbox(C("#f2d24a"), 0.1, 0.06, 0.031, c - 0.02, fy + 0.84, -3.18, 0.2, -0.15);
      rb.rbox(C("#3a8a48"), 0.11, 0.15, 0.03, c + 0.12, fy + 0.82, -3.35, -0.3, -0.12);
      for (const [dx, dz, y0] of [[1.38, -2.5, 0.74], [1.6, -1.2, 0]] as number[][]) rb.geo(new THREE.CylinderGeometry(0.06, 0.045, 0.1, 14).translate(0, 0.05, 0), C(dz < -2 ? "#d8482a" : "#e8d8b0"), c + dx, fy + y0, dz);
      for (let k = 0; k < 4; k++) rb.geo(cylY(0.03, 0.12, 12), C(["#2a6ad0", "#d8382a", "#4ab86a", "#c8c8cc"][k]), c - 0.72 + (k % 2) * 0.07, fy, -2.9 + Math.floor(k / 2) * 0.07);
      rb.rbox(C("#2a2c34"), 0.14, 0.03, 0.09, c + 0.1, fy + 0.755, -2.9, 0.4);
      rb.geo(new THREE.TorusGeometry(0.075, 0.011, 6, 16, Math.PI), C("#1e1e24"), c + 0.9, fy + 1.0, -3.3, 0, 0, Math.PI); rb.geo(cylY(0.035, 0.03, 12).rotateZ(Math.PI / 2), C("#d8402a"), c + 0.82, fy + 0.96, -3.3);
      // cables: from the monitors down behind the desk, then a loose bundle across the floor to a power strip
      this.cable([[c + 0.22, fy + 0.74, -3.4], [c + 0.25, fy + 0.4, -3.42], [c + 0.5, fy + 0.05, -3.4], [c + 0.9, fy + 0.03, -3.3], [c + 1.3, fy + 0.03, -3.1]], "#1e1e24", 0.01);
      this.cable([[c + 0.82, fy + 0.74, -3.38], [c + 0.8, fy + 0.35, -3.4], [c + 0.95, fy + 0.05, -3.2], [c + 1.1, fy + 0.03, -2.9], [c + 1.3, fy + 0.03, -3.1]], "#e8e8ec", 0.007);
      this.cable([[c + 1.3, fy + 0.03, -3.1], [c + 1.5, fy + 0.03, -2.6], [c + 1.3, fy + 0.03, -2.2], [c + 1.1, fy + 0.03, -2.15]], "#26262c", 0.012);
      rb.rbox(C("#e8e8e4"), 0.34, 0.035, 0.07, c + 1.1, fy + 0.02, -2.15, 0.3); for (let k = 0; k < 4; k++) rb.rbox(C(k < 3 ? "#d8402a" : "#4ac870"), 0.012, 0.004, 0.012, c + 1.0 + k * 0.07, fy + 0.04, -2.14, 0.3);
      // a magenta LED strip under the shelf + its glow on the wall
      rb.box(CE("#ff5aa8", "#ff3a90", 1.6), c + 0.95, fy + 1.76, -D + 0.01, c + 1.98, fy + 1.775, -D + 0.03, false); for (let k = 0; k < 3; k++) glowSprite(g, wp(c + 1.15 + k * 0.38, fy + 1.7, -D + 0.12), 0.9, new THREE.Color(0.5, 0.12, 0.3)); }
  }

  // ================================================================================ STREET
  private buildStreet(g: THREE.Group) {
    const rb = this.rb;
    rb.flatY(TM("hmPave", () => tx("hmPaveT", 512, 512, (q, r) => { q.fillStyle = "#b8b0a6"; q.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { q.fillStyle = jit(r, "#c4bcb0", 0.05); q.fillRect(x + 2, y + 2, 60, 60); } speck(q, r, 512, 512, 3000, ["#8a8278", "#d8d0c4"], 1, 3, 0.35); })), -16, 16, FZ, 4.0, 0, 1, 2, 2);
    rb.box(C("#a8a29a"), -16, 0, 4.0, 16, 0.14, 4.18);
    rb.flatY(TM("hmRoad", () => tx("hmRoadT", 512, 512, (q, r) => { q.fillStyle = "#56565e"; q.fillRect(0, 0, 512, 512); speck(q, r, 512, 512, 6000, ["#3a3a42", "#76767e"], 1, 3, 0.45); })), -16, 16, 4.18, 30, -0.02, 1, 3, 3);
    rb.flatY(C("#f2f0e8"), -16, 16, 6.5, 6.62, -0.015, 1, 1, 1);
    // the vending machine (lit front) in front of the closed shop on the left
    { const vx = -3.4, vz = 0.62; rb.box(C("#dfe6ee"), vx - 0.48, 0, vz - 0.35, vx + 0.48, 1.85, vz + 0.35);
      plane(g, basic("hmVendF", () => ({ map: T.vendTex(), color: new THREE.Color(1.05, 1.05, 1.05) })), 0.9, 1.8, wp(vx, 0.92, vz + 0.352), 0, 0, 0, true);
      glowSprite(g, wp(vx, 1.2, vz + 0.7), 2.4, new THREE.Color(0.22, 0.25, 0.3)); this.contactAt([vx, 0, vz], 1.4, 1.0, 0.5); }
    // a bicycle parked by the cafe, a planter at the step
    { const bx = 1.0, bz = 1.5, iron = C("#3a6a8a"); for (const dx of [-0.48, 0.48]) rb.geo(new THREE.TorusGeometry(0.31, 0.022, 8, 28), C("#1e1e24"), bx + dx, 0.33, bz, 0.12);
      rb.seg(iron, [bx - 0.48, 0.33, bz], [bx - 0.05, 0.36, bz + 0.02], 0.02); rb.seg(iron, [bx - 0.05, 0.36, bz + 0.02], [bx + 0.3, 0.75, bz + 0.03], 0.02); rb.seg(iron, [bx - 0.48, 0.33, bz], [bx - 0.15, 0.78, bz + 0.03], 0.02);
      rb.seg(iron, [bx - 0.15, 0.78, bz + 0.03], [bx + 0.3, 0.75, bz + 0.03], 0.02); rb.seg(iron, [bx + 0.3, 0.75, bz + 0.03], [bx + 0.48, 0.33, bz + 0.05], 0.02); rb.seg(iron, [bx - 0.05, 0.36, bz], [bx - 0.18, 0.86, bz], 0.02);
      rb.box(C("#2a2a2a"), bx - 0.28, 0.86, bz - 0.06, bx - 0.08, 0.9, bz + 0.06); rb.seg(C("#9aa0a8"), [bx + 0.3, 0.75, bz + 0.03], [bx + 0.32, 0.98, bz + 0.03], 0.016);
      rb.seg(C("#9aa0a8"), [bx + 0.32, 0.98, bz - 0.25], [bx + 0.32, 0.98, bz + 0.3], 0.014); rb.box(C("#c8ccd0"), bx + 0.38, 0.72, bz - 0.15, bx + 0.66, 0.92, bz + 0.18);
      this.contactAt([bx, 0, bz], 1.4, 0.5, 0.4); }
    this.plant([1.7, 0.2, 0.45], 0.9, "#8a8e94", "#3a7a4a", 0.18);
    // a concrete utility pole at the kerb (the soft foreground framer of the wide), a transformer, sagging wires
    { const px = -1.6, pz = 4.35, pole = C("#9a968e");
      rb.geo(cylY(0.13, 9.6, 14, false, 0.09), pole, px, 0, pz);
      for (let k = 0; k < 14; k++) rb.box(C("#e8d84a"), px - 0.135, 0.3 + k * 0.12, pz - 0.14, px + 0.135, 0.36 + k * 0.12, pz + 0.14);
      rb.box(C("#6a6e74"), px - 0.9, 8.3, pz - 0.05, px + 0.9, 8.38, pz + 0.05); rb.box(C("#6a6e74"), px - 0.7, 8.9, pz - 0.05, px + 0.7, 8.96, pz + 0.05);
      rb.geo(cylY(0.2, 0.55, 14), C("#8a9098"), px - 0.32, 7.2, pz - 0.15); rb.geo(cylY(0.21, 0.04, 14), C("#5a5e64"), px - 0.32, 7.75, pz - 0.15); rb.box(C("#6a6e74"), px - 0.32, 7.3, pz - 0.04, px, 7.36, pz + 0.04);
      for (const [x, y] of [[-0.85, 8.4], [-0.3, 8.4], [0.3, 8.4], [0.85, 8.4], [-0.6, 8.98], [0.6, 8.98]] as number[][]) {
        const a = new THREE.Vector3(...wp(px + x, y, pz)), b = new THREE.Vector3(...wp(px + x + 16, y + 0.4, pz - 3)), m = a.clone().lerp(b, 0.5); m.y -= 0.7;
        const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 30, 0.012, 4), C("#2a2a30")); w.castShadow = true; g.add(w);
        const a2 = new THREE.Vector3(...wp(px + x - 14, y + 0.3, pz + 2)), m2 = a2.clone().lerp(a, 0.5); m2.y -= 0.6;
        const w2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a2, m2, a), 30, 0.012, 4), C("#2a2a30")); g.add(w2); }
      this.contactAt([px, 0, pz], 0.7, 0.7, 0.4); }
  }

  // ================================================================================ POSE
  pose(ctx: SetCtx, L: Lighting) {
    const f = ctx.f, cam = ctx.cam;
    // BUY screens: the cursor glides onto the button (14 f), the press (7 f), a green ring flash, then the done badge
    for (const s of this.scr) {
      const dt = f - s.click, st = dt < 0 ? 0 : dt < 7 ? 1 : 2, m = s.mats[st];
      if (s.mesh.material !== m) s.mesh.material = m;
      m.color.setScalar(0.95 + 0.035 * vs(23 + s.ph, s.ph) * vs(3.1, s.ph * 2) + (dt >= 0 && dt < 8 ? 0.25 * (1 - dt / 8) : 0));
      const u = sm((f - (s.click - 16)) / 14), bx = 0.02 * s.sw, by = s.yc + this.btnY(s.sh);
      const rx = 0.3 * s.sw + 0.02 * s.sw * vs(0.7, s.ph), ry = s.yc + 0.18 * s.sh + 0.03 * s.sh * vs(0.5, s.ph + 1);
      const away = dt > 26 ? sm((dt - 26) / 18) : 0;
      s.cursor.position.set(lerp(lerp(rx, bx, u), bx + 0.25 * s.sw, away), lerp(lerp(ry, by, u), by - 0.12 * s.sh, away), s.zf + 0.006);
      const sq = dt >= 0 && dt < 7 ? 0.82 : 1; s.cursor.scale.set(sq, sq, 1);
      const rk = dt >= 0 && dt < 16 ? dt / 16 : -1, rm = s.ring.material as THREE.MeshBasicMaterial;
      s.ring.visible = rk >= 0; if (rk >= 0) { const sc = s.sw * (0.75 + 0.85 * Math.sqrt(rk)); s.ring.scale.set(sc, sc * 0.7, 1); rm.opacity = (1 - rk) ** 1.3; }
    }
    // the profit counter
    {
      const u = clamp01((f - COUNTER.spin0) / (COUNTER.land - COUNTER.spin0)), landed = clamp01((f - COUNTER.land) / 6);
      let v = 0;
      if (f >= COUNTER.land) v = 2e9;
      else if (u > 0) { const e = u * u * (3 - 2 * u); v = Math.floor(2e9 * Math.pow(e, 1.6)); v = Math.min(1999999999, v + Math.floor(hash(Math.floor(f)) * 1e6 * (1 - e))); }
      this.counter.draw("+¥" + v.toLocaleString("en-US"), landed, u > 0 && f < COUNTER.land ? 1 : 0);
      const gk = f - COUNTER.land, gm = this.glint.material as THREE.MeshBasicMaterial;
      this.glint.visible = gk >= 0 && gk < 22;
      if (this.glint.visible) { const a = gk / 22, sc = 0.2 * Math.sin(Math.PI * Math.min(1, a * 1.4)) + 0.04; this.glint.scale.set(sc, sc, 1); this.glint.rotation.z = a * 1.2; this.glint.position.x = lerp(0.2, 0.38, sm(a * 1.3)); gm.opacity = 1; }
      this.counterMat.color.setScalar(1 + 0.1 * (gk >= 0 && gk < 10 ? 1 - gk / 10 : 0));
    }
    for (const [i, t] of this.charts.entries()) t.offset.x = frac(vph(0.08 + i * 0.03) / TAU);
    // steam wisps (whole cycles on the video clock), facing the lens
    for (const s of this.steams) s.ms.forEach((m, i) => {
      const a = frac(vph(2.2) / TAU + i / s.ms.length + s.ph);
      m.position.set(o[0] + s.p[0] + 0.015 * Math.sin(vph(1.3) + i * 2), o[1] + s.p[1] + s.h * 0.45 + s.h * 0.8 * a, o[2] + s.p[2]);
      m.scale.set(s.s * (1 + a), s.h * (0.8 + 0.6 * a), 1); (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * a) * 1.0;
      m.quaternion.copy(cam.quaternion);
    });
    for (const w of this.swingers) w.m.rotation[w.ax] = w.base + w.a * (0.7 * vs(w.w, w.ph) + 0.3 * vs(w.w * 2.3, w.ph * 1.7));
    for (const s of this.spinners) s.m.rotation.z = vph(s.w);
    this.fanHead.rotation.y = 0.6 * vs(0.55) - 0.2;
    this.tail.forEach((s, k) => { s.rotation.y = 0.18 * vs(1.6, -k * 0.6) + (k === 0 ? 0.2 : 0); s.rotation.z = 0.08 * vs(1.1, -k * 0.5) + (k === 0 ? 0.25 : 0.05); });
    { const sec = VF / 30, tk = Math.floor(sec) + Math.min(1, (sec - Math.floor(sec)) * 6);
      for (const h of this.hands) { const mins = h.m0 + sec / 60; h.m.rotation.z = -(h.kind === 2 ? (tk / 60) * TAU : h.kind === 1 ? (mins / 60) * TAU : ((h.h0 + mins / 60) / 12) * TAU); } }
    { const fl = hash(Math.floor(VF / 2)) < 0.04 ? 0.55 : 1; this.neon[0].color.setRGB(2.4 * fl, 0.5 * fl, 1.9 * fl); this.neon[1].color.setRGB(0.5, 2.0, 2.4).multiplyScalar(0.92 + 0.08 * vs(9)); }
    this.led.color.setRGB(0.3, (Math.floor(VF / 12) % 3 ? 1.3 : 0.3), 0.5);
    this.fluo.color.setScalar(1.7 + 0.03 * vs(31));
    this.motes.forEach((m) => m.m.pose(VF / 30, m.seed));
    // light pools: each room's practical + the screens' glow on the faces
    const P = (p: P3, col: [number, number, number], r: number) => L.pool(wp(...p), col, r);
    const RO = ROOMS, land = clamp01((f - COUNTER.land) / 4) * (1 - clamp01((f - COUNTER.land - 10) / 20));
    P([RO.office.x + 0.2, RO.office.y + 2.2, -1.7], [0.42, 0.46, 0.5], 2.6);
    P([RO.office.x + 0.35, RO.office.y + 1.05, -1.75], [0.12, 0.3, 0.16], 1.0);
    P([RO.grandma.x - 0.55, RO.grandma.y + 1.7, -1.7], [0.95, 0.6, 0.26], 2.2);
    P([RO.grandma.x - 0.2, RO.grandma.y + 0.75, -1.5], [0.12, 0.28, 0.15], 0.9);
    P([RO.cafe.x - 0.4, RO.cafe.y + 2.1, -2.4], [0.6, 0.14, 0.55], 2.0);
    P([RO.cafe.x + 0.3, RO.cafe.y + 1.05, -1.7], [0.12, 0.34, 0.4], 1.2);
    P([RO.cafe.x + 0.2, RO.cafe.y + 2.0, -1.0], [0.4, 0.3, 0.2], 1.8);
    P([RO.apartment.x + 0.2, RO.apartment.y + 2.0, -1.9], [0.85, 0.66, 0.42], 2.6);
    P([RO.apartment.x + 0.45, RO.apartment.y + 1.2, -2.7], [0.16 + 0.2 * land, 0.3 + 0.5 * land, 0.4 + 0.15 * land], 1.4);
    P([RO.apartment.x + 0.1, RO.apartment.y + 1.0, -3.05], [0.55, 0.38, 0.18], 0.7);
    P([RO.apartment.x - 1.1, RO.apartment.y + 1.3, -3.0], [0.3, 0.32, 0.36], 1.6);
    P([-3.4, 1.0, 1.3], [0.35, 0.4, 0.45], 1.8);
    P([-2.3, 1.7, 0.6], [0.4, 0.12, 0.38], 1.3);
  }
}
void shadeHex; void cylY;
