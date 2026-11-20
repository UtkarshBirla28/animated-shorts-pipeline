// THE SQUARE, p3 POLISH (owner LOOK): detail and life added on top of sets_square.ts (which builds and poses this).
//  1. FOLIAGE (foliage.ts): leaf-cluster cards + small flowers on the west hedge, leaf cards on the trees behind it,
//     blossom-cluster cards on the cherry trees, grass tufts and daisies along the lawn's edge; all sway in the gusts.
//  2. AIR: soft petals near the lens, pollen low in the sun, butterflies at the hedge's flowers, ground leaves and
//     petals that stir in the clown's wake, three more birds in the north-west sky (story shots only: in the quiz that
//     sky belongs to the bills).
//  3. THE FAR NORTH-WEST (S6's crane, every lens that sees over the low wall): hazy rolling hills in two layers, a far
//     campus skyline (halls, a bell tower, a water tower), and on the lawn itself paths, a pond with glints, a sports
//     pitch with goals, hedgerows, flower beds, rows of small trees, picnic blankets, a sprinkler, tiny walkers.
//     HEIGHT RULE: seen from the quiz's low lens (0.8 m) everything out there stays under ~2.2 deg of elevation
//     (h < 0.038 x distance), below the bills (their lowest edge sits at ~3.9 deg): the sky behind the bills is untouched.
//  4. SMALL MOTION: cloth waves on the lamp banners, fountain droplets and sparkle, a pinwheel on the coffee cart and
//     its urn's steam, a weather vane on the clock tower, a flag on the library roof.
//  5. GROUND: moss in the joints round the tree's foot, a chalk hopscotch in front of the sculpture, a puddle by the
//     fountain, a bench with a satchel and a flower tub against the hedge (S16's depth).
// Everything is a pure function of the frame: whole cycles over LOOP on the video clock (ctx.vf), the wake on the
// picture frame (ctx.f).
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import { SQ, loopPh, LOOP, type V3 } from "./plan";
import { SID } from "./beats";
import { Batch, C, TM, M, NOINK, TAU, hash, sm, clamp01, tx, rgba, speck, softDot, wispTex, contact, type G } from "./setkit";
import { rep, parkWood, birdTex, sparkleTex, cloudSoft } from "./paint";
import { NEAR_DRAWN } from "./near_props";
import * as SP from "./square_paint";
import { Foliage, LensAir, Wake, Butterflies, gustAt, tuftTex, flowerAtlas } from "./foliage";

const PZ = SQ.plaza, HX = PZ.x0 - 0.45;
const blot = (g: G, x: number, y: number, rad: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
};
// ---------------- painters ----------------
/** a band of hazy rolling hills (2048 x 256, alpha above the ridge): soft ridges, tree dabs, a paler far ridge behind */
const hillBandTex = (seed: number, near: string, far: string) => tx(`p3Hills_${seed}_${near}`, 2048, 256, (g, r) => {
  g.clearRect(0, 0, 2048, 256);
  const ridge = (base: number, amp: number, col: string, ph: number) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 256);
    for (let x = 0; x <= 2048; x += 16) g.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + ph)) - amp * 0.45 * Math.sin(x * 0.011 + ph * 2.3) - amp * 0.2 * Math.sin(x * 0.027 + ph));
    g.lineTo(2048, 256); g.closePath(); g.fill(); };
  ridge(120, 70, far, seed); ridge(170, 60, near, seed * 1.7 + 2);
  for (let i = 0; i < 520; i++) { const x = r() * 2048, y = 150 + r() * 100; g.fillStyle = r() < 0.5 ? "rgba(60,100,70,0.35)" : "rgba(200,220,170,0.25)"; g.beginPath(); g.ellipse(x, y, 9 + 9 * r(), 6 + 5 * r(), 0, 0, TAU); g.fill(); }
  const fd = g.createLinearGradient(0, 200, 0, 256); fd.addColorStop(0, rgba(near, 0)); fd.addColorStop(1, rgba("#a8be90", 0.9)); g.fillStyle = fd; g.fillRect(0, 200, 2048, 56);
}, true);
/** the far campus skyline (2048 x 256, alpha): brick halls with pale windows and slate roofs, a bell tower, a water
 *  tower on legs, round trees between; soft, hazed colours */
const campusTex = () => tx("p3Campus", 2048, 256, (g, r) => {
  g.clearRect(0, 0, 2048, 256);
  const hall = (x: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, 256 - h, w, h); g.fillStyle = "#7c8696"; g.beginPath(); g.moveTo(x - 8, 256 - h); g.lineTo(x + w / 2, 256 - h - 26); g.lineTo(x + w + 8, 256 - h); g.fill();
    for (let wx = x + 14; wx < x + w - 18; wx += 26) for (let wy = 256 - h + 14; wy < 240; wy += 30) { g.fillStyle = "rgba(236,238,228,0.8)"; g.fillRect(wx, wy, 12, 17); } };
  [[60, 230, 96, "#b48c80"], [420, 170, 76, "#bc9a8c"], [760, 260, 104, "#b08a7e"], [1180, 200, 82, "#ba968a"], [1500, 240, 96, "#b28c80"], [1830, 170, 72, "#bc9a8c"]].forEach(([x, w, h, c]) => hall(x as number, w as number, h as number, c as string));
  g.fillStyle = "#b08a7e"; g.fillRect(660, 70, 44, 186); g.fillStyle = "#7c8696"; g.beginPath(); g.moveTo(652, 70); g.lineTo(682, 26); g.lineTo(712, 70); g.fill(); g.fillStyle = "#f2ecd8"; g.beginPath(); g.arc(682, 104, 13, 0, TAU); g.fill();
  g.strokeStyle = "#8a8e98"; g.lineWidth = 5; for (const dx of [-22, 0, 22]) { g.beginPath(); g.moveTo(1420 + dx, 256); g.lineTo(1420 + dx * 0.6, 96); g.stroke(); } g.fillStyle = "#c8ccd2"; g.beginPath(); g.ellipse(1420, 76, 40, 30, 0, 0, TAU); g.fill(); g.fillStyle = "#9aa0aa"; g.fillRect(1380, 70, 80, 8);
  for (let i = 0; i < 60; i++) { const x = r() * 2048, s = 16 + 20 * r(); g.fillStyle = ["#7fa27e", "#8cae88", "#74987a"][i % 3]; g.beginPath(); g.arc(x, 256 - s * 0.7, s, 0, TAU); g.fill(); }
  const hz = g.createLinearGradient(0, 0, 0, 256); hz.addColorStop(0, "rgba(214,226,238,0.42)"); hz.addColorStop(1, "rgba(214,226,238,0.2)"); g.globalCompositeOperation = "source-atop"; g.fillStyle = hz; g.fillRect(0, 0, 2048, 256); g.globalCompositeOperation = "source-over";
}, true);
/** a sports pitch from above (512 x 768): mown stripes, white lines, a centre circle, two boxes */
const pitchTex = () => tx("p3Pitch", 512, 768, (g, r) => {
  for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? "#7ea060" : "#8cae6a"; g.fillRect(0, k * 64, 512, 64); }
  g.strokeStyle = "rgba(250,250,240,0.92)"; g.lineWidth = 9; g.strokeRect(22, 22, 468, 724); g.beginPath(); g.moveTo(22, 384); g.lineTo(490, 384); g.stroke(); g.beginPath(); g.arc(256, 384, 70, 0, TAU); g.stroke();
  g.strokeRect(146, 22, 220, 110); g.strokeRect(146, 636, 220, 110); speck(g, r, 512, 768, 2500, ["#5a7a48", "#b8d090"], 1, 2.4, 0.18);
});
/** a picnic blanket (128): a soft check */
const blanketTex = (col: string) => tx("p3Blanket" + col, 128, 128, (g) => { g.fillStyle = "#f6f0e2"; g.fillRect(0, 0, 128, 128); g.fillStyle = rgba(col, 0.75); for (let k = 0; k < 4; k++) { g.fillRect(k * 32, 0, 16, 128); g.fillRect(0, k * 32, 128, 16); } });
/** moss and damp in the brick joints round the tree's foot (alpha, 512 = 3.2 m) */
const mossTex = () => tx("p3Moss", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) { const a = r() * TAU, d = 30 + 190 * Math.sqrt(r()); blot(g, 256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 30 + 50 * r(), "#4c7a3c", 0.3); }
  for (let i = 0; i < 420; i++) { const a = r() * TAU, d = 20 + 210 * Math.sqrt(r()), x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d, v = r() < 0.5; g.fillStyle = `rgba(${r() < 0.5 ? "96,150,70" : "58,110,56"},${0.5 * (1 - d / 240)})`; g.fillRect(Math.round(x / 13) * 13, Math.round(y / 13) * 13, v ? 3 : 10 + 16 * r(), v ? 10 + 16 * r() : 3); }
}, true);
/** a chalk hopscotch (256 x 768, alpha): eight numbered squares, a chalk sun beside it */
const hopTex = () => tx("p3Hop", 256, 768, (g, r) => {
  g.clearRect(0, 0, 256, 768); g.lineCap = "round"; g.lineJoin = "round"; g.textAlign = "center";
  const sq = (x: number, y: number, n: number, col: string) => { g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(x, y, 84, 84); g.font = "bold 50px Arial"; g.fillStyle = col; g.fillText(String(n), x + 42, y + 60); };
  const cols = ["rgba(250,246,236,0.9)", "rgba(250,200,214,0.9)", "rgba(180,220,250,0.9)", "rgba(250,236,170,0.9)"];
  [[86, 660, 1], [86, 572, 2], [42, 484, 3], [130, 484, 4], [86, 396, 5], [42, 308, 6], [130, 308, 7], [86, 220, 8]].forEach(([x, y, n], i) => sq(x, y, n, cols[i % 4]));
  g.strokeStyle = cols[3]; g.lineWidth = 8; g.beginPath(); g.arc(128, 110, 46, 0, TAU); g.stroke(); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; g.beginPath(); g.moveTo(128 + Math.cos(a) * 60, 110 + Math.sin(a) * 60); g.lineTo(128 + Math.cos(a) * 84, 110 + Math.sin(a) * 84); g.stroke(); }
  g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${0.25 + 0.4 * r()})`; g.fillRect(r() * 256, r() * 768, 2 + 3 * r(), 2); } g.globalCompositeOperation = "source-over";
}, true);
/** a soft-edged puddle / pond face (256, alpha): pale sky with a cloud's smear and a darker rim */
const waterTex = () => tx("p3Water", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const u = (x - 128) / 122, v = (y - 128) / 122, d = Math.sqrt(u * u + v * v), a = clamp01((1 - d) * 7), cl = Math.exp(-(((u + 0.2) / 0.5) ** 2 + ((v - 0.1) / 0.22) ** 2));
    const i = (y * 256 + x) * 4; im.data[i] = 150 + 90 * cl - 40 * d; im.data[i + 1] = 196 + 50 * cl - 40 * d; im.data[i + 2] = 236 + 16 * cl - 30 * d; im.data[i + 3] = Math.round(255 * a * 0.92); }
  g.putImageData(im, 0, 0);
}, true);
/** diagonal window glare (256, tileable in u): two soft streaks; its u offset slides with the lens (pose) */
const glintTex = () => tx("p3Glint", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  for (const [x, w, a] of [[70, 30, 0.5], [150, 12, 0.32]] as number[][]) for (const ox of [-256, 0, 256]) { g.save(); g.translate(x + ox, 128); g.rotate(0.5);
    const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(-w, -300, 2 * w, 600); g.restore(); }
});
/** a far walker / sitter for the lawn (the square's own painted students) */
const person = (v: number, pose: number) => new THREE.SpriteMaterial({ map: SP.studentTex(v, pose), transparent: true, alphaTest: 0.3 });

type Drop = { s: THREE.Sprite; a: number; n: number; ph: number };
export class SquareP3 {
  private fol: Foliage; private air: LensAir; private wake: Wake; private flies: Butterflies;
  private far: THREE.MeshBasicMaterial[] = [];
  private walkers: { s: THREE.Sprite; a: V3; b: V3; n: number; ph: number }[] = [];
  private drops: Drop[] = []; private sparks: { s: THREE.Sprite; ph: number; n: number }[] = [];
  private cloth: { m: THREE.Mesh; base: Float32Array; x: number; z: number }[] = [];
  private pin!: THREE.Group; private vane!: THREE.Group; private flag!: { m: THREE.Mesh; base: Float32Array };
  private steam: THREE.Mesh[] = []; private sprink!: THREE.Group;
  private birds: THREE.Sprite[] = [];
  private glint!: THREE.Texture;
  private clouds: THREE.Mesh[] = [];

  constructor(S: THREE.Group, banners: THREE.Mesh[]) {
    const b = new Batch(), bd = new Batch();
    // ================= 1. FOLIAGE =================
    this.fol = new Foliage(S);
    /* the hedge: leaf cards on its plaza side + its top, small flowers on every other lobe */
    for (let z = -9.2, i = 0; z <= 23.5; z += 1.15, i++) { const k = Math.round(z * 10), r = 0.95 + 0.14 * hash(k), h = 1.02 + 0.1 * hash(k * 1.7);
      this.fol.dress([HX, h * 1.02, z], [0.62, h * 1.1, r], { n: 22, size: [0.5, 0.74], seed: 40 + i, groups: 1, amp: 0.022, hemi: [1, 0.35, 0], tone: -0.06, lift: [1.0, 1.14] });
      if (i % 2 === 0) this.fol.dress([HX, h * 1.02, z], [0.64, h * 1.12, r], { n: 16, size: [0.17, 0.25], seed: 90 + i, groups: 1, amp: 0.022, hemi: [1, 0.2, 0], atlas: "flower", plain: true, cast: false, lift: [1.1, 1.2], ink: 0.3 }); }
    /* the trees behind the hedge (the leafy wall of the money shots): cards on the plaza-facing side of each crown */
    for (let i = 0; i < 12; i++) { const z = -8.2 + i * 2.75 + 0.9 * (hash(i * 4.1) - 0.5), x = PZ.x0 - 2.6 - 1.8 * hash(i * 2.7), h = 4.4 + 1.9 * hash(i * 1.3);
      const fat = i % 4 === 1, rr = (fat ? 0.46 : 0.41) * h;
      this.fol.dress([x, h * (fat ? 0.6 : 0.65), z], [rr, h * 0.37, rr], { n: 46, size: [1.0, 1.5], seed: 140 + i, groups: 1, amp: 0.03, hemi: [1, 0.25, 0.15], tone: -0.12, lift: [0.98, 1.12], gm: 14, gr: 0.5 }); }
    for (let i = 0; i < 7; i++) { const x = PZ.x0 - 7.5 - 2.5 * hash(i * 6.1), z = -7 + i * 4.6, h = 5.8 + 2.4 * hash(i * 3.3);
      const fat = (i + 1) % 4 === 1, rr = (fat ? 0.46 : 0.41) * h;
      this.fol.dress([x, h * (fat ? 0.6 : 0.65), z], [rr, h * 0.37, rr], { n: 30, size: [1.3, 1.8], seed: 170 + i, groups: 1, amp: 0.026, hemi: [1, 0.3, 0.1], tone: -0.2, lift: [0.98, 1.1], gm: 14, gr: 0.5 }); }
    /* the cherry trees: blossom-cluster cards (their smooth pink lobes become the inner mass) */
    ([[9.2, -2.0, 4.6], [9.4, -9.6, 5.0], [9.2, -17.5, 4.4], [9.3, 12.4, 4.8], [9.4, 19.6, 4.6], [12.5, -35.2, 4.6], [17.5, -35.4, 5.0]] as V3[]).forEach(([x, z, h], i) =>
      this.fol.dress([x, 0.4 + h * 0.64, z], [h * 0.47, h * 0.36, h * 0.47], { n: 30, size: [0.8, 1.15], seed: 200 + i, groups: 1, amp: 0.03, atlas: "blossom", plain: true, lift: [0.88, 1.04], guard: false }));
    /* grass tufts + daisies along the lawn's edge behind the low walls, and round the far features */
    { const tm = TM("p3Tuft", tuftTex, { alphaTest: 0.4, side: THREE.DoubleSide }), fm = TM("p3Daisy", flowerAtlas, { alphaTest: 0.4, side: THREE.DoubleSide });
      for (let i = 0; i < 90; i++) { const west = i % 3 === 0, x = west ? PZ.x0 - 0.9 - 2.4 * hash(i * 2.1) : PZ.x0 + (1 - PZ.x0) * hash(i * 3.7) - 1.5 * hash(i), z = west ? -37 + 26 * hash(i * 5.3) : PZ.z0 - 0.8 - 4.5 * hash(i * 1.9), s = 0.42 + 0.3 * hash(i * 7.7);
        for (const ry of [0, Math.PI / 2]) b.add(new THREE.PlaneGeometry(s, s).translate(0, s / 2 - 0.05, 0), tm, M(x, -0.06, z, ry + hash(i) * 3));
        if (i % 2) { const g2 = new THREE.PlaneGeometry(0.2, 0.2).translate(0, 0.14, 0), uv = g2.attributes.uv as THREE.BufferAttribute; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * 0.5, 0.5 + uv.getY(q) * 0.5); b.add(g2, fm, M(x + 0.3, -0.06, z + 0.2, hash(i * 9) * 3)); } } }
    /* an UNSEEN tree behind the opening lens (south of every camera; its cards only cast): a long dappled shadow across
     * the near band of the square wides (audit p2 M5), a ~13 % cookie on the walkers who cross it; never near the bills */
    /* (follow-up: smaller, sparser and a little further in: a dappled band over ground z ~10-13 with thin, sun-flecked edges, not the whole bottom third) */
    this.fol.dress([-2.6, 7.0, 20.0], [3.2, 1.0, 1.25], { n: 46, size: [1.2, 1.8], seed: 260, groups: 2, amp: 0.045, guard: false, shadowOnly: true, lift: [0.15, 1.0] });
    /* THE COUNT'S FOREGROUND THINGS at EDIT's plan.ts Q1_NEAR marks: near_props.ts NEAR_DRAWN (each inside its mark's own w / h,
     * lower still close to the lens): a low flower tub, a kerb stone, a backpack, a paper cup among leaves, a leaf pile.
     * Checked by projection: out/clown/look_p3/near_check.mjs (the drawn boxes against every quiz walker, the clown, the bills) */
    NEAR_DRAWN.forEach((t, i) => { const [x, , z] = t.p, hw = t.hw, hd = t.hd, h = t.h;
      if (t.kind === "tub") { const bh = Math.min(0.22, h * 0.6); b.add(new THREE.BoxGeometry(2 * hw, bh, 2 * hd).translate(0, bh / 2, 0), C("#8f7256"), M(x, 0, z, 0.25)); b.add(new THREE.BoxGeometry(2 * hw + 0.04, 0.03, 2 * hd + 0.04), C("#e2d6bc"), M(x, bh, z, 0.25));
        for (let k = 0; k < 12; k++) b.add(new THREE.SphereGeometry(0.045 + 0.015 * hash(k + i), 7, 5), hash(k * 2.2 + i) < 0.4 ? C("#5a8050") : C(["#f0e8dc", "#eab0bc", "#f0e8dc"][k % 3]), M(x + (2 * hw - 0.14) * (hash(k * 3.1 + i) - 0.5), bh + 0.03 + (h - bh - 0.09) * hash(k * 7 + i), z + (2 * hd - 0.1) * (hash(k * 5.7 + i) - 0.5))); }
      else if (t.kind === "kerb") { b.add(new THREE.BoxGeometry(2 * hw, h, 2 * hd).translate(0, h / 2, 0), C("#cdc2ac"), M(x, 0, z, -0.3)); }
      else if (t.kind === "pack") { b.add(new THREE.CapsuleGeometry(hw * 0.78, Math.max(0.02, h - 2 * hw * 0.78), 4, 10).translate(0, h / 2, 0), C("#44567a"), M(x, 0, z, 0.5, [1, 1, hd / hw])); b.add(new THREE.BoxGeometry(hw * 1.1, h * 0.35, 0.04), C("#374866"), M(x + 0.02, h * 0.3, z + hd * 0.9, 0.5)); }
      else if (t.kind === "cup") { b.add(new THREE.CylinderGeometry(0.04, 0.032, 0.1, 12).rotateZ(Math.PI / 2).translate(0, 0.04, 0), C("#efe4cc"), M(x, 0, z, 0.8)); b.add(new THREE.SphereGeometry(1, 9, 6), C("#a89650"), M(x + 0.08, 0.0, z - 0.06, 0, [hw * 0.7, Math.min(0.05, h * 0.6), hd * 0.7])); }
      else { b.add(new THREE.SphereGeometry(1, 10, 7), C("#a48e4c"), M(x, 0, z, 0, [hw * 0.9, h * 0.9, hd * 0.9])); b.add(new THREE.SphereGeometry(1, 8, 6), C("#8a9a52"), M(x + hw * 0.4, 0, z + hd * 0.3, 0, [hw * 0.5, h * 0.7, hd * 0.5])); }
      contact(S, [x, 0.02, z], 2 * hw + 0.25, 2 * hd + 0.25, 0.35); });
    /* two soft clouds low in the north-west sky for the STORY shots only (S6's crane, S16): in the quiz that sky is the bills' */
    for (const [x, y, z, w, sd] of [[-150, 62, -420, 150, 1], [-40, 48, -470, 110, 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: cloudSoft(sd), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.08, 1.08, 1.08) }));
      m.position.set(x, y, z); m.layers.set(NOINK); m.renderOrder = -0.4; m.visible = false; S.add(m); this.clouds.push(m); }
    // ================= 2. AIR =================
    this.air = new LensAir(S); this.wake = new Wake(S);
    this.flies = new Butterflies(S, [[HX + 0.95, 1.5, -2.6], [HX + 1.0, 1.25, 1.6], [HX + 0.9, 1.6, -6.4]]);
    for (let k = 0; k < 3; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(0), transparent: true, depthWrite: false, fog: false })); s.layers.set(NOINK); s.scale.set(1.2, 0.6, 1); s.visible = false; S.add(s); this.birds.push(s); }
    // ================= 3. THE FAR NORTH-WEST =================
    { const card = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, order: number) => { const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.layers.set(NOINK); p.renderOrder = order; S.add(p); this.far.push(m); };
      card(hillBandTex(3, "#8fae8c", "#b4c8c0"), 1500, 34, -330, 17 - 15, -560, -0.28);        /* top ~19 m at 560+ m: < 2 deg */
      card(hillBandTex(7, "#86a878", "#a6bea4"), 760, 20, -190, 10 - 9, -300, -0.26);            /* top ~11 m at 300+ m */
      card(campusTex(), 330, 21, -118, 10.5 - 5.5, -345, -0.24);                                  /* halls ~8 m, towers ~14 m at 345+ m (2.2 deg) */
      /* on the lawn: paths, a pond, a pitch, hedgerows, flower beds, blankets (flat or low) */
      const path = C("#dcd2b8"), hedge = C("#5c8a50"), y0 = -0.045;
      const strip = (x0: number, z0: number, x1: number, z1: number, w: number) => { const L = Math.hypot(x1 - x0, z1 - z0); bd.add(new THREE.PlaneGeometry(w, L).rotateX(-Math.PI / 2), path, M((x0 + x1) / 2, y0, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0))); };
      strip(-78, -47, 1, -45.5, 2.4); strip(-10, -46, -34, -84, 2.2); strip(-34, -84, -70, -170, 2.2); strip(-34, -84, -8, -150, 2.0); strip(-56, -47, -62, -86, 1.8);
      { const w = new THREE.Mesh(new THREE.PlaneGeometry(19, 11).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: waterTex(), transparent: true, depthWrite: false })); w.position.set(-27, y0 + 0.01, -63); w.rotation.y = 0.3; w.layers.set(NOINK); w.renderOrder = 1; S.add(w);
        for (let k = 0; k < 7; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.6, 1.5) })); s.position.set(-27 + 7 * (hash(k * 3.1) - 0.5) * 2, 0.05, -63 + 3.4 * (hash(k * 5.7) - 0.5) * 2); s.layers.set(NOINK); S.add(s); this.sparks.push({ s, ph: hash(k) * TAU, n: 60 + 9 * k }); } }
      { const p = new THREE.Mesh(new THREE.PlaneGeometry(30, 44).rotateX(-Math.PI / 2), TM("p3PitchM", pitchTex)); p.position.set(-58, y0, -118); p.rotation.y = 0.12; p.receiveShadow = true; p.userData.ink = 0; S.add(p);
        for (const dz of [-21.5, 21.5]) { b.add(new THREE.BoxGeometry(5, 0.1, 0.1), C("#f4f2ea"), M(-58 + 0.12 * dz, 2.2, -118 + dz)); for (const sx of [-2.5, 2.5]) b.add(new THREE.BoxGeometry(0.1, 2.2, 0.1), C("#f4f2ea"), M(-58 + 0.12 * dz + sx, 1.1, -118 + dz)); } }
      for (const [x, z, L, ry] of [[-40, -52, 22, 1.5], [-20, -98, 26, 0.5], [-74, -92, 30, 0.1]]) b.add(new THREE.BoxGeometry(1.0, 1.0, L).translate(0, 0.5, 0), hedge, M(x, -0.06, z, ry));
      ["#f08a9a", "#f6f0e8", "#f2a04a", "#e86a7a", "#f6e08a", "#f08a9a"].forEach((c, i) => bd.add(new THREE.CircleGeometry(1.6 + 0.8 * hash(i), 14).rotateX(-Math.PI / 2), C(c), M(-6 - 11 * i - 3 * hash(i * 3), y0 + 0.012, -49.5 - 3 * (i % 2), 0, [1.6, 1, 1])));
      ["#d8503a", "#3a6aa8", "#e0a640"].forEach((c, i) => { const x = -16 - 13 * i, z = -57 - 7 * (i % 2); bd.add(new THREE.PlaneGeometry(2.2, 1.7).rotateX(-Math.PI / 2), TM("p3Blanket" + i, () => blanketTex(c)), M(x, y0 + 0.014, z, 0.4 * i));
        for (let k = 0; k < 2; k++) { const s = new THREE.Sprite(person(i * 2 + k, 2)); s.center.set(0.5, 0); s.position.set(x - 0.4 + 0.8 * k, -0.06, z); s.scale.set(0.75, 1.5, 1); s.layers.set(NOINK); S.add(s); } });
      /* small trees in rows: 4 m near (>= 95 m from the plaza's lenses), 7 m far; a few in blossom */
      const crown = new THREE.SphereGeometry(1, 9, 7), greens = ["#6c9e56", "#7aae60", "#5e9050", "#8ab868"];
      const tree = (x: number, z: number, h: number, i: number) => { b.add(new THREE.CylinderGeometry(0.1, 0.14, h * 0.5, 6).translate(0, h * 0.25, 0), C("#6a4e3c"), M(x, -0.06, z));
        const col = i % 7 === 3 ? C("#f0c2d0") : C(greens[i % 4]); b.add(crown, col, M(x, h * 0.66, z, i, [h * 0.36, h * 0.34, h * 0.36])); b.add(crown, col, M(x + h * 0.14, h * 0.82, z - h * 0.1, i * 2, [h * 0.24, h * 0.22, h * 0.24])); };
      for (let i = 0; i < 12; i++) tree(-36 - 3.1 * i + 2 * hash(i), -92 - 7.2 * i, 4 + 0.27 * i, i);               /* along the north-west path */
      for (let i = 0; i < 9; i++) tree(-8.5 + 2.2 * i * 0.3 - 1.5 * hash(i * 3), -100 - 6.5 * i, 4 + 0.3 * i, i + 3);   /* along the north path */
      for (let i = 0; i < 10; i++) tree(-86 - 14 * hash(i * 2.3), -108 - 9 * i, 4.2 + 0.3 * i, i + 5);                 /* behind the pitch */
      for (let i = 0; i < 12; i++) tree(-150 + 26 * i + 9 * hash(i * 5.1), -205 - 22 * hash(i * 1.3), 7.2, i + 1);      /* a far tree line */
      /* tiny walkers on the lawn's paths (painted figures, 1.6 m), back and forth, whole trips per loop */
      const lanes: [V3, V3][] = [[[-70, 0, -47], [-4, 0, -45.6]], [[-4, 0, -45.6], [-70, 0, -47]], [[-12, 0, -49], [-33, 0, -82]], [[-33, 0, -84], [-62, 0, -150]], [[-50, 0, -47.2], [-10, 0, -46]], [[-9, 0, -146], [-32, 0, -88]]];
      lanes.forEach(([a, c], i) => { const s = new THREE.Sprite(person(i, 1)); s.center.set(0.5, 0); s.layers.set(NOINK); S.add(s); this.walkers.push({ s, a, b: c, n: 1 + (i % 2), ph: hash(i * 4.3) }); });
      /* a lawn sprinkler: four thin arcs of spray turning (1.1 m high) */
      this.sprink = new THREE.Group(); this.sprink.position.set(-15, -0.04, -55);
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1).translate(1.3, 0.55, 0), new THREE.MeshBasicMaterial({ map: softDot(), transparent: true, depthWrite: false, opacity: 0.55, color: new THREE.Color(1.3, 1.4, 1.5), side: THREE.DoubleSide, fog: false })); m.rotation.y = (k / 4) * TAU; m.layers.set(NOINK); this.sprink.add(m); }
      S.add(this.sprink); }
    // ================= 4. SMALL MOTION =================
    banners.forEach((m) => this.cloth.push({ m, base: Float32Array.from((m.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array), x: m.position.x, z: m.position.z }));
    { const f = SQ.fountain.c;   /* droplets off the bowl's rim (parabolas into the pool) + glints on the water */
      for (let k = 0; k < 22; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false, color: new THREE.Color(1.25, 1.32, 1.4), fog: false })); s.layers.set(NOINK); s.renderOrder = 4; S.add(s); this.drops.push({ s, a: (k / 22) * TAU + hash(k) * 0.3, n: 44 + (k % 7) * 3, ph: hash(k * 3.9) }); }
      for (let k = 0; k < 8; k++) { const a = hash(k * 2.7) * TAU, d = 0.5 + 1.2 * hash(k * 4.9), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.5, 1.55, 1.6), fog: false })); s.position.set(f[0] + Math.cos(a) * d, 0.46, f[2] + Math.sin(a) * d); s.layers.set(NOINK); S.add(s); this.sparks.push({ s, ph: hash(k * 7) * TAU, n: 70 + 11 * k }); } }
    { /* the coffee cart: a pinwheel on its corner, steam off the urn */
      this.pin = new THREE.Group(); this.pin.position.set(8.2 - 0.33, 1.42, 8.6 - 0.6); this.pin.rotation.y = -Math.PI / 2;
      ["#e8483a", "#f6f0e2", "#3a8ad8", "#f29a3a"].forEach((c, k) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.2, 0.02); sh.lineTo(0.11, 0.13); sh.closePath(); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.rotation.z = (k / 4) * TAU; this.pin.add(m); });
      S.add(this.pin); b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), C("#dcd6c8"), M(8.2 - 0.3, 1.2, 8.6 - 0.6));
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.6), new THREE.MeshBasicMaterial({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(1.1, 1.08, 1.05), fog: false })); m.layers.set(NOINK); m.renderOrder = 6; S.add(m); this.steam.push(m); } }
    { /* a weather vane on the clock tower's cap, a flag on the library roof (both north-east: nowhere near the bills) */
      this.vane = new THREE.Group(); this.vane.position.set(4.5, 17.1, -39.2); const dk = new THREE.MeshBasicMaterial({ color: "#2a2c3c", side: THREE.DoubleSide });
      const ar = new THREE.Shape(); ar.moveTo(-0.7, -0.04); ar.lineTo(0.35, -0.04); ar.lineTo(0.35, -0.16); ar.lineTo(0.75, 0); ar.lineTo(0.35, 0.16); ar.lineTo(0.35, 0.04); ar.lineTo(-0.7, 0.04); ar.lineTo(-0.9, 0.2); ar.lineTo(-0.9, -0.2); ar.closePath();
      this.vane.add(new THREE.Mesh(new THREE.ShapeGeometry(ar), dk)); S.add(this.vane);
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6), C("#d8d4c8"), M(14, 12.7, -38.4));
      const fg = new THREE.PlaneGeometry(1.9, 1.1, 12, 4).translate(0.95, 0, 0), fm = new THREE.Mesh(fg, TM("p3Flag", () => SP.bannerTex("#2f4f86", 1), { side: THREE.DoubleSide })); fm.position.set(14.03, 13.6, -38.4); fm.castShadow = false; S.add(fm);
      this.flag = { m: fm, base: Float32Array.from(fg.attributes.position.array as Float32Array) }; }
    { /* window glints that slide with the lens: one additive sheet over every pane of the arts building and the library */
      this.glint = glintTex().clone(); this.glint.wrapS = THREE.RepeatWrapping; this.glint.needsUpdate = true;
      const gm = new THREE.MeshBasicMaterial({ map: this.glint, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, fog: false, color: new THREE.Color(1, 0.98, 0.92) }), gb = new Batch();
      for (let k = 0; k < 15; k++) { const cz = -38 + 2.2 + k * 4.0; if (k !== 3 && k !== 7 && k !== 11) gb.add(new THREE.PlaneGeometry(2.8, 2.7), gm, M(PZ.x1 - 0.14, 2.0, cz, -Math.PI / 2));
        for (const sd of [-1, 1]) gb.add(new THREE.PlaneGeometry(1.05, 2.3), gm, M(PZ.x1 - 0.12, 5.9, cz + sd * 0.95, -Math.PI / 2)); }
      for (let k = 0; k < 5; k++) gb.add(new THREE.PlaneGeometry(2.0, 6.3), gm, M(8.2 + k * 3.4, 4.75, PZ.z0 + 0.17));
      const gg = new THREE.Group(); gb.build(gg, false); for (const c of [...gg.children]) { c.layers.set(NOINK); (c as THREE.Mesh).receiveShadow = false; c.renderOrder = 2; S.add(c); } }
    // ================= 5. GROUND + S16's depth =================
    { const dec = (tex: () => THREE.Texture, key: string, w: number, d: number, x: number, z: number, ry: number, y = 0.021) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), TM(key, tex, { transparent: true, alphaTest: 0.08, depthWrite: false })); m.position.set(x, y, z); m.rotation.y = ry; m.layers.set(NOINK); m.renderOrder = 1; m.receiveShadow = true; S.add(m); };
      dec(mossTex, "p3MossM", 3.4, 3.4, SQ.tree.trunk[0] - 0.2, SQ.tree.trunk[2] + 0.1, 0.4); dec(mossTex, "p3MossM", 2.4, 2.4, HX + 1.3, -1.5, 1.9); dec(mossTex, "p3MossM", 2.6, 2.6, HX + 1.4, 8.6, 0.7);
      dec(hopTex, "p3HopM", 0.9, 2.7, 3.2, -1.3, 0.5);
      { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: waterTex(), transparent: true, depthWrite: false, opacity: 0.9 })); w.position.set(-0.6, 0.02, -19.6); w.rotation.y = 0.5; w.layers.set(NOINK); w.renderOrder = 1; S.add(w); }
      /* a park bench against the hedge with a satchel on it, a flower tub beside it */
      const bx = HX + 1.05, bz = -3.3, wood = TM("p3BenchWood", () => rep(parkWood("#b98654", false), 2, 1)), iron = C("#2c3a44");
      for (let k = 0; k < 4; k++) b.add(new THREE.BoxGeometry(0.09, 0.03, 1.7), wood, M(bx - 0.16 + 0.11 * k, 0.45, bz)); for (let k = 0; k < 3; k++) b.add(new THREE.BoxGeometry(0.03, 0.09, 1.7), wood, M(bx - 0.26, 0.6 + 0.12 * k, bz));
      for (const dz of [-0.7, 0.7]) { b.add(new THREE.BoxGeometry(0.5, 0.04, 0.05), iron, M(bx - 0.05, 0.42, bz + dz)); for (const dx of [-0.24, 0.16]) b.add(new THREE.BoxGeometry(0.04, 0.44, 0.05), iron, M(bx + dx, 0.22, bz + dz)); b.add(new THREE.BoxGeometry(0.04, 0.5, 0.05), iron, M(bx - 0.27, 0.68, bz + dz)); }
      b.add(new THREE.BoxGeometry(0.3, 0.24, 0.4), C("#8a5a34"), M(bx - 0.03, 0.59, bz + 0.35, 0.2)); b.add(new THREE.BoxGeometry(0.31, 0.08, 0.41), C("#6e4428"), M(bx - 0.03, 0.72, bz + 0.35, 0.2));
      contact(S, [bx, 0.02, bz], 1.0, 2.2, 0.4);
      b.add(new THREE.CylinderGeometry(0.34, 0.28, 0.42, 16).translate(0, 0.21, 0), C("#b88a64"), M(bx + 0.05, 0, bz - 1.5));
      for (let k = 0; k < 16; k++) b.add(new THREE.SphereGeometry(0.06 + 0.02 * hash(k), 7, 5), hash(k * 2.2) < 0.3 ? C("#4f7a44") : C(["#e85a6a", "#f6f0e8", "#f29a3a", "#e8789a"][k % 4]), M(bx + 0.05 + 0.5 * (hash(k * 3.1) - 0.5), 0.46 + 0.1 * hash(k * 7), bz - 1.5 + 0.5 * (hash(k * 5.7) - 0.5)));
      contact(S, [bx + 0.05, 0.02, bz - 1.5], 1.0, 1.0, 0.4); }
    { const g = new THREE.Group(); b.build(g, true); for (const c of [...g.children]) { c.userData.ink = 1; S.add(c); } const g2 = new THREE.Group(); bd.build(g2, false); for (const c of [...g2.children]) { c.userData.ink = 0; (c as THREE.Mesh).receiveShadow = true; S.add(c); } }
  }

  /** leaf cards built / culled by the bills guard (for the hand-off) */
  get stats() { return { cards: this.fol.cards, culled: this.fol.culled }; }

  pose(ctx: SetCtx) {
    const vf = ctx.vf, quiz = ctx.id <= SID.Q3;
    this.fol.pose(vf); this.air.pose(vf, ctx.cam); this.wake.pose(ctx.f); this.flies.pose(vf);
    this.clouds.forEach((m, i) => { m.visible = !quiz; if (!quiz) m.position.x = [-150, -40][i] + 12 * Math.sin(loopPh(vf, 1) + i * 2); });
    // the far cards take the fog colour a little (haze): hills most, the campus least
    this.far.forEach((m, i) => { m.color.set(ctx.light.fog).lerp(new THREE.Color(1, 1, 1), [0.5, 0.66, 0.74][i] ?? 0.7); });
    // lawn walkers: n whole trips (there and back) per loop
    for (const w of this.walkers) { const u = ((((w.n * vf) / LOOP + w.ph) % 1) + 1) % 1, t = u < 0.5 ? u * 2 : 2 - u * 2, st = Math.abs(Math.sin(loopPh(vf, 130) + w.ph * 9));
      w.s.position.set(w.a[0] + (w.b[0] - w.a[0]) * t, -0.06 + 0.03 * st, w.a[2] + (w.b[2] - w.a[2]) * t); w.s.scale.set((u < 0.5 ? 1 : -1) * Math.sign(w.b[0] - w.a[0] || 1) * 0.8, 1.6, 1); }
    this.sprink.rotation.y = loopPh(vf, 24);
    // glints: each twinkles on its own cycle
    for (const q of this.sparks) { const k = Math.max(0, Math.sin(loopPh(vf, q.n) + q.ph)) ** 6; q.s.scale.setScalar(0.12 + 0.5 * k); (q.s.material as THREE.SpriteMaterial).opacity = k; }
    // fountain droplets: off the bowl's rim (r 0.75, y 1.4), out and down into the pool
    { const f = SQ.fountain.c;
      for (const d of this.drops) { const u = ((((d.n * vf) / LOOP + d.ph) % 1) + 1) % 1, r = 0.76 + 0.75 * u, y = 1.42 + 0.5 * u - 1.5 * u * u;
        d.s.position.set(f[0] + Math.cos(d.a) * r, Math.max(0.45, y), f[2] + Math.sin(d.a) * r); d.s.scale.setScalar(0.07 + 0.03 * u); (d.s.material as THREE.SpriteMaterial).opacity = 0.9 * sm(u / 0.1) * (1 - sm((u - 0.85) / 0.15)); } }
    // the lamp banners: a cloth wave runs down each (stronger in a gust)
    for (const c of this.cloth) { const a = c.m.geometry.attributes.position as THREE.BufferAttribute, B0 = c.base, gq = gustAt(vf, c.x, c.z);
      for (let q = 0; q < a.count; q++) { const x = B0[q * 3], t = -B0[q * 3 + 1] / 1.7; a.setZ(q, B0[q * 3 + 2] + (0.02 + 0.06 * gq) * t * Math.sin(7.5 * t + 4 * x - loopPh(vf, 58) + c.x)); }
      a.needsUpdate = true; }
    { const a = this.flag.m.geometry.attributes.position as THREE.BufferAttribute, B0 = this.flag.base, gq = gustAt(vf, 14, -38);
      for (let q = 0; q < a.count; q++) { const x = B0[q * 3]; a.setZ(q, (0.05 + 0.1 * gq) * (x / 1.9) * Math.sin(5 * x - loopPh(vf, 71)) ); a.setY(q, B0[q * 3 + 1] - 0.08 * (x / 1.9) ** 2); }
      a.needsUpdate = true; }
    this.pin.rotation.z = loopPh(vf, 40) + 0.6 * Math.sin(loopPh(vf, 9));
    this.vane.rotation.y = 0.6 + 0.5 * Math.sin(loopPh(vf, 5)) + 0.12 * Math.sin(loopPh(vf, 31));
    this.steam.forEach((m, k) => { const u = ((((23 * vf) / LOOP + k / 3) % 1) + 1) % 1; m.position.set(8.2 + 0.03 * Math.sin(u * 6 + k), 1.42 + 0.55 * u, 8.6 - 0.4); m.lookAt(ctx.cam.position.x, m.position.y, ctx.cam.position.z);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.4 * sm(u / 0.2) * (1 - sm((u - 0.55) / 0.45)); m.scale.set(0.8 + 0.8 * u, 0.8 + 0.5 * u, 1); });
    this.glint.offset.x = 0.11 * (ctx.cam.position.x * 0.6 - ctx.cam.position.z) + 0.03 * ctx.cam.position.y;
    // three more birds in the north-west sky: never in the quiz (that sky is the bills')
    this.birds.forEach((s, k) => { s.visible = !quiz; if (quiz) return; const n = 4 + k, u = ((((n * vf) / LOOP + 0.19 + k * 0.31) % 1) + 1) % 1, fl = Math.floor(vf / 3 + k) % 3, t = birdTex(fl), m = s.material as THREE.SpriteMaterial;
      if (m.map !== t) { m.map = t; m.needsUpdate = true; } s.position.set(-70 + 90 * u, 13 + 3 * k + 1.0 * Math.sin(u * 12 + k), -60 - 9 * k); m.opacity = sm(u / 0.06) * (1 - sm((u - 0.9) / 0.1)); });
  }
}
