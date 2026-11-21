// LOOKDEV v4 (LOOK): the REAL v4 film (its sets, shots, clock, cameras, people) with LOOK-only TEST overrides, so a look
// idea is proved on the owners' real sets WITHOUT touching their files:
//   - `TRY_RIG`: extra rigOpts over the lab shots (a shot's rigOpts win over the set's); empty = LAB's own rig;
//   - `WIDE`: diagnostic lenses on some shots;
//   - nyTry: the parts of nyLook / nyTrainLook that need the set's root (idempotent once STATION calls them itself);
//   - labTry: the HALL RED v2 (look.ts HALL_RED + redRoomDim) on LAB's hall: white light out while the red is on;
//   - kitchenTry: KITCHEN v2 (KITCHEN_PAL, cerealLook, fridgePool) on LAB's kitchen, + KITCHEN_RIG on its shot.
// Stills only:
//   node scripts/kit_render.mjs --entry src/videos3/pointing/lookdev/v4/index.ts --comp PointingV4Look --quality draft --stills 490,620 --out out/pointing_v4/look_try/
import * as THREE from "three";
import type { Built, CamState, Film, KitCtx, Practical, PracticalSpec, RigSpec, V3 } from "../../../../kit/core/ctx";
import { FILM } from "../../v4/film";
import { HOOK, OPENING_END, lampAt } from "../../v4/sets/lab_plan";
import { HALL_RED, LAB4_KEY, LAB4_LENS, labPanelK, KITCHEN_PAL, KITCHEN_RIG, KITCHEN_LIGHT, NY_RIG, SHOT_RIG, withLook, cerealLook, fridgePool, nyLook, nyTrainLook, redRoomDim } from "../../v4/look";

const lens = (pos: V3, look: V3, fov: number): ((t: number) => CamState) => { const c: CamState = { pos, look, fov, fnum: 11, focus: Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) }; return () => c; };
/** test overrides for the lab shots (empty = LAB's own rig, which is LAB4_RIG since 18:43) */
export const TRY_RIG: Partial<RigSpec> = {};
/** FRAME 0 v5 trial on/off (LAB4_KEY) */
const F0_TRY = false;   // 03:00: LAB wired every booth line itself (lab.ts 24, 77, 102, 216, 218)
/** KITCHEN v2 trial (KITCHEN_PAL / cerealLook / fridgePool / KITCHEN_RIG) on/off */
const KITCHEN_TRY = false;   // 00:05: the white fridge glare made v17 worse (C 24 / 15 % / 22 %) than LAB's own KPAL (C 35 / 10 % / 35 %)
/** HALL RED v2 emulation: OFF since LAB wired HALL_RED + redRoomDim in lab_hall.ts itself (22:50) */
const HALL_TRY = false;
const WIDE: Record<string, (t: number) => CamState> = {};
void lens;

type Rec = { p: Practical; spec: PracticalSpec; last: number };
/** build a set with ctx.practical recorded (each practical, its spec and the last dimmer value the set gave it) */
const recorded = async (build: (ctx: KitCtx) => Promise<Built>, ctx: KitCtx) => {
  const recs: Rec[] = [];
  const ctx2 = Object.create(ctx) as KitCtx;
  if (ctx.practical) ctx2.practical = (spec: PracticalSpec) => {
    const p = ctx.practical!(spec), r: Rec = { p, spec, last: 0 }, orig = p.set;
    p.set = (k: number) => { r.last = k; orig(k); };
    recs.push(r); return p;
  };
  return { b: await build(ctx2), recs };
};

/** NY TRY: the root-only parts of nyLook / nyTrainLook */
export const nyTry = (build: (ctx: KitCtx) => Promise<Built>) => async (ctx: KitCtx): Promise<Built> => { const b = await build(ctx); nyLook({}, b.object); nyTrainLook(b.object); return b; };

/** HALL RED v2 TRY: while LAB's hall washes (point practicals of >= 20000 lm in the hall, x > 30) are on, the IBL + sun
 *  drop (redRoomDim), the hall's ceiling panels go to HALL_RED.panelK and the washes run at HALL_RED.washGain */
const labTry = (build: (ctx: KitCtx) => Promise<Built>) => async (ctx: KitCtx): Promise<Built> => {
  const { b, recs } = await recorded(build, ctx);
  const washes = recs.filter((r) => r.spec.kind === "point" && (r.spec.lumens ?? 0) >= 20000 && r.spec.pos[0] > 30);
  const panels = recs.filter((r) => r.spec.kind === "rect" && r.spec.pos[0] > 30);
  const dim = redRoomDim(ctx);
  let ceil: THREE.MeshStandardMaterial | null = null, floorV: THREE.Vector4 | null = null;
  // LENS TRY: the signal lenses mirror less of the room and are a touch rougher (LAB4_LENS.envK / rough)
  b.object.traverse((o) => { if (o.name === "lens") { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial; m.envMapIntensity = LAB4_LENS.envK; m.roughness = LAB4_LENS.rough; } });
  console.warn(`[lookdev v4] labTry: ${washes.length} hall washes, ${panels.length} hall panels`);
  // ---- v5 BOOTH TRY: what LAB would add in lab.ts (the key + the room dimmer are already live in look.ts labWash):
  // the booth panels at labPanelK(state) + their diffuser glow x the same; the idle lens + button glow at frame 0 / loop
  const F0 = F0_TRY ? LAB4_KEY : null;
  const booth = recs.filter((r) => r.spec.kind === "rect" && r.spec.pos[0] < 30 && r.spec.pos[2] > -3.7);
  const diff: { m: THREE.MeshBasicMaterial; c0: THREE.Color }[] = [];
  b.object.updateMatrixWorld(true);
  // the panels' diffuser glow (kit/home glow(): a MeshBasicMaterial whose colour carries the brightness, ~2.2)
  b.object.traverse((o) => { const me = o as THREE.Mesh, m = me.material as THREE.MeshBasicMaterial; if (!me.isMesh || Array.isArray(me.material) || !(m as THREE.Material & { isMeshBasicMaterial?: boolean }).isMeshBasicMaterial || Math.max(m.color.r, m.color.g, m.color.b) < 1.5) return;
    const w = new THREE.Vector3(); me.getWorldPosition(w); if (w.y > 2.7 && w.x < 20 && w.z > -3.7 && !diff.some((d) => d.m === m)) diff.push({ m, c0: m.color.clone() }); });
  const lensM: THREE.MeshPhysicalMaterial[] = []; let capM: THREE.MeshPhysicalMaterial | null = null;
  b.object.traverse((o) => { if (o.name === "signalHead") o.traverse((c) => { if (c.name === "lens" && lensM.length < 2) lensM.push((c as THREE.Mesh).material as THREE.MeshPhysicalMaterial); }); if (o.name === "buttonCap" && !capM) capM = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial; });
  if (F0) console.warn(`[lookdev v4] boothTry: ${booth.length} booth panels, ${diff.length} diffusers, ${lensM.length} lenses, cap ${capM ? "found" : "MISSING"}`);
  return { ...b, update: (t, cam) => {
    b.update?.(t, cam);
    if (F0) {
      const st = lampAt(t).state, k = labPanelK(st);
      for (const p of booth) p.p.set(k); for (const d of diff) d.m.color.copy(d.c0).multiplyScalar(Math.max(0.04, k));
      if (st === 1 && lensM[1]) { lensM[1].emissive.multiplyScalar(LAB4_LENS.redK); lensM[1].color.setRGB(...LAB4_LENS.redBody); }
      const idle = st === 0 && (t < HOOK.green || t >= OPENING_END());
      if (idle) { lensM.forEach((m, j) => m.emissive.setRGB(...LAB4_LENS.lit[j]).multiplyScalar(F0.idle));
        const cm = capM as THREE.MeshPhysicalMaterial | null; if (cm && cm.emissive.r < 0.9 * F0.capGlow) cm.emissive.setRGB(0.9, 0.05, 0.02).multiplyScalar(F0.capGlow); }
    }
    const red = HALL_TRY && washes.some((w) => w.last > 0.01);
    if (HALL_TRY) dim(red ? 1 : 0);
    if (red) { for (const w of washes) w.p.set(HALL_RED.washGain / 1.3); for (const p of panels) p.p.set(HALL_RED.panelK);
      // the hall ceiling + floor in their red-state colours (LAB sets warm neutral each frame; these run after it)
      if (!ceil) b.object.traverse((o) => { if (o.name === "hallCeiling") ceil = (o as THREE.Mesh).material as THREE.MeshStandardMaterial; });
      if (!floorV) b.object.traverse((o) => { const v = (((o as THREE.Mesh).material as THREE.Material & { userData?: { surf?: { U?: { sCol?: { value: THREE.Vector4 } } } } })?.userData?.surf?.U?.sCol?.value); if (v && !floorV && Math.abs(v.x - 0.42) < 0.01 && Math.abs(v.y - 0.36) < 0.01) floorV = v; });
      (ceil as THREE.MeshStandardMaterial | null)?.color.setRGB(...HALL_RED.ceiling);
      (floorV as THREE.Vector4 | null)?.set(HALL_RED.floor[0], HALL_RED.floor[1], HALL_RED.floor[2], (floorV as THREE.Vector4 | null)?.w ?? 0.25); }
  } };
};

/** KITCHEN v2 TRY: recolour LAB's stand-ins to KITCHEN_PAL (walls by their surface tint, the fridge by mesh name, the
 *  cupboard doors by colour), the box glow + the fridge pool */
const kitchenTry = (build: (ctx: KitCtx) => Promise<Built>) => async (ctx: KitCtx): Promise<Built> => {
  const { b, recs } = await recorded(build, ctx);
  const srgb = (c: number[]) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
  const cab0 = srgb([0.98, 0.84, 0.2]), fr0 = srgb([0.95, 0.3, 0.32]);
  const near = (a: THREE.Color, c: THREE.Color) => Math.abs(a.r - c.r) + Math.abs(a.g - c.g) + Math.abs(a.b - c.b) < 0.06;
  let box: THREE.Mesh | null = null, n = 0;
  b.object.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (Array.isArray(m.material) && m.material.length === 6 && (m.material[4] as THREE.MeshStandardMaterial).map && !box) { box = m; return; }
    for (const mt of mats) {
      const sm = mt as THREE.MeshStandardMaterial & { userData?: { surf?: { U?: { sCol?: { value: THREE.Vector4 } } } } };
      const v = sm.userData?.surf?.U?.sCol?.value;
      if (v && Math.abs(v.x - 0.36 * 1.45) < 0.01 && Math.abs(v.y - 0.72 * 1.45) < 0.01) { v.set(KITCHEN_PAL.wall[0] * 1.45, KITCHEN_PAL.wall[1] * 1.45, KITCHEN_PAL.wall[2] * 1.45, v.w); n++; continue; }
      if (sm.color && near(sm.color, cab0)) { sm.color.copy(srgb(KITCHEN_PAL.cabinets)); n++; continue; }
      if (sm.color && near(sm.color, fr0)) { sm.color.copy(srgb(KITCHEN_PAL.fridge)); n++; continue; }
    }
  });
  const fl = recs.find((r) => r.spec.kind === "point" && r.spec.color === 0xeaf4ff);
  if (fl) { const lm = fl.spec.lumens ?? 380; fl.p.set(KITCHEN_LIGHT.fridgeLumens / lm); }
  const bx = box as THREE.Mesh | null;
  if (bx) { const ms = bx.material as THREE.MeshStandardMaterial[]; cerealLook(ms[4], ms[0]); const w = new THREE.Vector3(); bx.getWorldPosition(w); const pool = fridgePool(ctx, [w.x, w.y, w.z]); b.object.add(pool.object); }
  console.warn(`[lookdev v4] kitchenTry: ${n} materials recoloured, box ${bx ? "found" : "MISSING"}, fridge light ${fl ? "found" : "MISSING"}`);
  return { ...b, update: (t, cam) => { b.update?.(t, cam); if (fl) fl.p.set(KITCHEN_LIGHT.fridgeLumens / (fl.spec.lumens ?? 380)); } };
};

/** v4/film.ts wires withLook + SHOT_RIG itself since 00:58: the lookdev only adds its TRIALS on top (no double wrap).
 *  DIAG (round 2, v23 face pop): "fire" = TRAIN's fire light back to its own distance / decay; "sun" = v23 sun 4 */
const DIAG = "fire" as "none" | "fire" | "sun";
const diagSteam = (build: (ctx: KitCtx) => Promise<Built>) => async (ctx: KitCtx): Promise<Built> => {
  const b = await build(ctx);
  if (DIAG === "fire") b.object.traverse((o) => { const l = o as THREE.PointLight; if (l.isPointLight && l.distance > 6) { l.distance = 4.6; l.decay = 1.3; } });
  return b;
};
const SETS0: Film["sets"] = { ...FILM.sets, lab: labTry(FILM.sets.lab), steam: diagSteam(FILM.sets.steam), kitchen: KITCHEN_TRY ? kitchenTry(FILM.sets.kitchen) : FILM.sets.kitchen };
export const LOOK_V4: Film = { ...FILM, slug: "pointing_v4_look",
  sets: SETS0,
  shots: FILM.shots.map((s) => {
    const extra: Partial<RigSpec> = { ...(s.set === "kitchen" && KITCHEN_TRY ? KITCHEN_RIG : {}), ...(s.set === "lab" ? TRY_RIG : {}), ...(DIAG === "sun" && s.id === "v23" ? { sunIntensity: 4 } : {}) };
    void NY_RIG; void SHOT_RIG; void withLook;
    return { ...s, ...(Object.keys(extra).length ? { rigOpts: { ...(s.rigOpts ?? {}), ...extra } } : {}), ...(WIDE[s.id] ? { cam: WIDE[s.id] } : {}) };
  }) };
