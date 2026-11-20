// THE SET HUB (clown): builds the set modules (sets_square.ts: the campus square; office.ts: Hyman's office, LOOK v2) and poses them per frame.
// It also owns this World's share of the SHARED light uniforms (shade.ts TONE_X extras + the POOL / ZONE practicals + the
// drifting CLOUD SHADOW band): a zero-area hook mesh drawn first in every pass of this World's scene writes them, so the
// two layers of a dissolve each light with their own shot's values (the saladoil crossfade fix).
import * as THREE from "three";
import { TONE_X, POOL, POOL_N, ZONE_N } from "./shade";
import type { SetCtx } from "./ctx";
import type { SetName, V3 } from "./plan";
import type { Kit } from "./build";
import { setVF } from "./setkit";
import { SquareSet } from "./sets_square";
import { OfficeSet } from "./office";

/** what a module may write for the current frame: warm / cool light POOLS (world position, linear rgb, radius m) and
 *  key-light ZONES (the key exists only inside a lamp's spot; see shade.ts), plus a pool dominance (0 = additive,
 *  3 = lamp pools read amber on night-blue walls) */
export type Lighting = {
  /** add a pool; returns false when all POOL_N slots are taken */
  pool(p: V3, col: [number, number, number], r: number): boolean;
  /** zone j (0..ZONE_N-1): lamp position, [full-strength dist, zero dist, cos inner, range], [dir xyz, cos outer] */
  zone(j: number, p: V3, z: [number, number, number, number], dir: [number, number, number, number]): void;
  /** a soft cloud-shadow band in world xz: covered where trail < dot(p.xz, dir) < lead; w = edge width (m); tint = the
   *  multiply colour (1 = off) */
  cloud(dir: [number, number], lead: number, trail: number, w: number, tint: [number, number, number]): void;
  poolDom: number;
};
/** a set module: its root group (added to the world root by the hub), the sets it belongs to, and a pure per-frame pose */
export interface SetModule {
  readonly sets: SetName[];
  readonly group: THREE.Group;
  pose(ctx: SetCtx, L: Lighting): void;
}

export class Sets {
  private mods: SetModule[];
  private hook: THREE.Mesh;
  private pp = Array.from({ length: POOL_N }, () => ({ p: new THREE.Vector3(), c: new THREE.Vector3(), r: 0 }));
  private zp = Array.from({ length: ZONE_N }, () => ({ p: new THREE.Vector3(), z: new THREE.Vector4(0, 0, 1, 0), d: new THREE.Vector4(0, -1, 0, -2) }));
  private np = 0; private dom = 0;
  private cl = new THREE.Vector4(1, 0, -1e5, -1e5); private clW = 1; private clT = new THREE.Vector3(1, 1, 1);
  private rim = new THREE.Vector3(); private ws = new THREE.Vector3(1, 1, 1); private wl = new THREE.Vector3(); private wk = 0; private fill = new THREE.Vector3();

  constructor(root: THREE.Object3D, kit: Kit) {
    this.mods = [new SquareSet(kit), new OfficeSet(kit)];
    for (const m of this.mods) root.add(m.group);
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    this.hook = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    this.hook.frustumCulled = false; this.hook.renderOrder = -1e9;
    this.hook.onBeforeRender = () => this.write();
    root.add(this.hook);
  }
  private write() {
    const X = TONE_X;
    X.uRimCol.value.copy(this.rim); X.uFill.value.copy(this.fill); X.uWoodShade.value.copy(this.ws); X.uWoodLift.value.copy(this.wl); X.uWoodK.value = this.wk;
    X.uCloud.value.copy(this.cl); X.uCloudW.value = this.clW; X.uCloudTint.value.copy(this.clT); X.uPoolDom.value = this.dom;
    for (let i = 0; i < POOL_N; i++) { const p = this.pp[i]; POOL.uPoolPos.value[i].copy(p.p); POOL.uPoolCol.value[i].copy(p.c); POOL.uPoolRad.value[i] = p.r; }
    for (let j = 0; j < ZONE_N; j++) { const z = this.zp[j]; POOL.uZonePos.value[j].copy(z.p); POOL.uZone.value[j].copy(z.z); POOL.uZoneDir.value[j].copy(z.d); }
  }
  pose(ctx: SetCtx) {
    setVF(ctx.vf);
    const L = ctx.light, set = ctx.shot.set;
    this.rim.set(...(L.rim ?? [0, 0, 0])); this.ws.set(...(L.woodShade ?? [1, 1, 1])); this.wl.set(...(L.woodLift ?? [0, 0, 0])); this.wk = L.woodK ?? 0;
    this.fill.set(...(L.fill ?? [0, 0, 0]));
    this.np = 0; this.dom = 0; this.cl.set(1, 0, -1e5, -1e5); this.clW = 1; this.clT.set(1, 1, 1);
    for (const p of this.pp) { p.r = 0; p.c.set(0, 0, 0); }
    for (const z of this.zp) { z.z.set(0, 0, 1, 0); z.d.set(0, -1, 0, -2); }
    const self = this;
    const lighting: Lighting = {
      pool(p, col, r) { if (self.np >= POOL_N) return false; const s = self.pp[self.np++]; s.p.set(...p); s.c.set(...col); s.r = r; return true; },
      zone(j, p, z, d) { if (j < 0 || j >= ZONE_N) return; self.zp[j].p.set(...p); self.zp[j].z.set(...z); self.zp[j].d.set(...d); },
      cloud(dir, lead, trail, w, tint) { self.cl.set(dir[0], dir[1], lead, trail); self.clW = w; self.clT.set(...tint); },
      get poolDom() { return self.dom; }, set poolDom(v: number) { self.dom = v; },
    };
    for (const m of this.mods) {
      const on = m.sets.includes(set);
      m.group.visible = on;
      if (on) m.pose(ctx, lighting);
    }
    this.write();
  }
}
