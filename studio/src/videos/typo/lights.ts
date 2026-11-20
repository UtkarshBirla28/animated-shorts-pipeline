// Light states of the typo short: the per-owner look files (look_trading / look_tokyo / look_homes / look_hall) merged
// into LIGHTS / LOOK for every plan.ts LightName, plus the in-shot relight blend. Exterior suns are CAMERA-RELATIVE and
// frozen per shot (world.ts; story.ts SUN_WORLD pins one world heading per place); interiors set `key` instead (a
// WORLD-space direction toward the window / lamp), so a turning camera never swings the light through the room.
import type { LightName } from "./plan";
import type { LightPreset, WorldLook, C3 } from "./lightbase";
import * as LT from "./look_trading";
import * as LK from "./look_tokyo";
import * as LH from "./look_homes";
import * as LL from "./look_hall";
export type { LightPreset, WorldLook } from "./lightbase";

const NAMES: LightName[] = ["desk_am", "desk_dim", "alarm_red", "desk_eve", "street_day", "lobby", "lobby_red", "museum", "homes", "hall", "court"];
const pick = <T,>(parts: Record<string, T>[], what: string): Record<LightName, T> => {
  const all: Record<string, T> = Object.assign({}, ...parts);
  for (const n of NAMES) if (!all[n]) throw new Error(`lights: no ${what} for ${n}`);
  return all as Record<LightName, T>;
};
export const LIGHTS: Record<LightName, LightPreset> = pick([LT.LIGHTS, LK.LIGHTS, LH.LIGHTS, LL.LIGHTS], "light");
export const LOOK: Record<LightName, WorldLook> = pick([LT.LOOK, LK.LOOK, LH.LOOK, LL.LOOK], "look");

// ---------------- blending (in-shot relights) ----------------
export type LightState = LightPreset & { look: WorldLook; name: LightName };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const l3 = (a: C3, b: C3, k: number): C3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lhex = (a: string, b: string, k: number) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, "0")).join("");
};
export const blendLight = (a: LightName, b: LightName, k: number): LightState => {
  const A = LIGHTS[a], B = LIGHTS[b], LA = LOOK[a], LB = LOOK[b];
  if (k <= 0 || a === b) return { ...A, look: LA, name: a };
  if (k >= 1) return { ...B, look: LB, name: b };
  const out = { ...A } as LightPreset;
  for (const key of new Set([...Object.keys(A), ...Object.keys(B)]) as Set<keyof LightPreset>) {
    const va = A[key], vb = B[key];
    if (typeof va === "number" && typeof vb === "number") (out as Record<string, unknown>)[key] = lerp(va, vb, k);
    else if (Array.isArray(va) && Array.isArray(vb)) (out as Record<string, unknown>)[key] = l3(va as C3, vb as C3, k);
    else if (typeof va === "string" && typeof vb === "string" && va.startsWith("#")) (out as Record<string, unknown>)[key] = lhex(va, vb, k);
    else (out as Record<string, unknown>)[key] = k < 0.5 ? va : vb;
  }
  const look: WorldLook = {
    sky: { c: LA.sky.c.map((c, i) => lhex(c, LB.sky.c[i], k)), e: LA.sky.e.map((e, i) => lerp(e, LB.sky.e[i], k)) },
    bounce: l3(LA.bounce, LB.bounce, k), sat: lerp(LA.sat, LB.sat, k),
    cloud: { lit: lhex(LA.cloud.lit, LB.cloud.lit, k), mid: lhex(LA.cloud.mid, LB.cloud.mid, k), shade: lhex(LA.cloud.shade, LB.cloud.shade, k) },
  };
  return { ...out, look, name: k < 0.5 ? a : b };
};
