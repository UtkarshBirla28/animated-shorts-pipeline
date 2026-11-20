// PROPS / catalog: ~50 CC0 Poly Haven props (packed by props/prep/pack_props.py into public/kit/props/<id>/<id>.glb,
// real-world scale in metres, sizes in public/kit/props/catalog.json) placed with `prop(ctx, name, { pos, rotY, scale })`:
// sits its lowest point on the ground (nothing floats), casts + receives shadows, and gets a soft CONTACT SHADOW decal
// under its footprint (+ the pipeline's N8AO). Names are friendly aliases onto an asset (+ which of its parts to keep).
import * as THREE from "three";
import { staticFile } from "remotion";
import type { KitCtx, Built, V3 } from "../core/ctx";

type Entry = { id: string; parts?: string[]; drop?: string[]; note: string; contact?: number };
/** friendly name -> asset id + parts (prefix match on node names; default = all) */
export const PROPS: Record<string, Entry> = {
  // street / park
  bench_slats: { id: "painted_wooden_bench", note: "painted wooden slat bench, 1.17 m" },
  bench_long: { id: "modular_street_seating", note: "modular concrete + wood street seating, 4.3 m run" },
  lamp_post: { id: "street_lamp_01", note: "cast-iron street lamp, 3.9 m", contact: 0.5 },
  lamp_garden: { id: "street_lamp_02", note: "short lantern lamp post, 1.7 m", contact: 0.5 },
  bin: { id: "metal_trash_can", parts: ["metal_trash_can", "metal_trash_can_lid", "metal_trash_can_handle"], drop: ["rust"], note: "galvanised bin with lid, 0.9 m" },
  bin_rusty: { id: "metal_trash_can", parts: ["metal_trash_can_rust"], note: "rusty bin, 0.9 m" },
  trash_bag: { id: "trashbag", note: "black bin bag" },
  hydrant: { id: "fire_hydrant", parts: ["fire_hydrant"], drop: ["aged", "cap_02", "cap_03"], note: "fire hydrant, 0.8 m" },
  hydrant_old: { id: "fire_hydrant", parts: ["fire_hydrant_aged"], note: "aged hydrant" },
  barrier: { id: "concrete_road_barrier", note: "concrete road barrier / bollard block, 1.5 m" },
  utility_box: { id: "utility_box_01", note: "street utility cabinet, 1.1 m" },
  manhole: { id: "water_manhole_cover", note: "manhole cover + frame (flush)", contact: 0 },
  fence_chainlink: { id: "modular_chainlink_fence", note: "chain-link fence modules + gate, 2.5 m" },
  payphone: { id: "korean_public_payphone_01", note: "public payphone box (small Korean labels)" },
  car_covered: { id: "covered_car", note: "car under a fitted cover, 4.4 m (only CC0 car on Poly Haven)" },
  barrier_stump: { id: "tree_stump_01", note: "tree stump, 1.4 m" },
  boulder: { id: "boulder_01", note: "boulder 1.3 x 1.8 m" },
  rocks_moss: { id: "rock_moss_set_01", parts: ["rock_moss_set_01_rock03"], note: "one mossy rock (set has 6)" },
  gnome: { id: "garden_gnome", note: "garden gnome, 0.6 m" },
  // cafe / market / yard
  picnic_table: { id: "wooden_picnic_table", note: "wooden picnic table with benches" },
  cafe_set: { id: "outdoor_table_chair_set_01", note: "bistro table + 2 chairs" },
  cafe_table: { id: "outdoor_table_chair_set_01", parts: ["outdoor_table_chair_set_01_table"], note: "bistro table" },
  cafe_chair: { id: "outdoor_table_chair_set_01", parts: ["outdoor_table_chair_set_01_chair_01"], note: "bistro chair" },
  chair_plastic: { id: "plastic_monobloc_chair_01", note: "white monobloc chair" },
  stool_folding: { id: "folding_wooden_stool", note: "folding wooden stool" },
  stool_wood: { id: "wooden_stool_01", note: "wooden stool" },
  coffee_cart: { id: "CoffeeCart_01", note: "coffee cart (market stall part) with props + mugs" },
  display_shelves: { id: "wooden_display_shelves_01", note: "wooden display shelves (stall)" },
  chalkboard: { id: "standing_chalkboard_01", note: "A-frame chalkboard sign (blank)" },
  crate_wood: { id: "wooden_crate_01", note: "wooden crate with lid" },
  crate_long: { id: "wooden_crate_02", note: "long wooden crate" },
  crate_plastic: { id: "plastic_crate_01", note: "plastic crate" },
  box_cardboard: { id: "cardboard_box_01", note: "cardboard box (no print)" },
  barrel_wine: { id: "wine_barrel_01", note: "oak barrel" },
  barrel_metal: { id: "Barrel_01", note: "steel drum" },
  basket_wicker: { id: "wicker_basket_01", note: "wicker basket" },
  bucket_wood: { id: "wooden_bucket_01", note: "wooden bucket" },
  watering_can: { id: "watering_can_metal_01", note: "metal watering can" },
  hand_truck: { id: "hand_truck", note: "sack trolley" },
  tyre: { id: "old_tyre", note: "old tyre" },
  lantern: { id: "Lantern_01", note: "hand lantern" },
  bananas: { id: "bananas", parts: ["bananas_bunch"], note: "banana bunch" },
  apple: { id: "food_apple_01", note: "apple" },
  // plants in pots
  planter_box: { id: "planter_box_01", note: "planter box 0.9 m (empty: fill with plants())" },
  planter_long: { id: "planter_box_02", note: "planter box 1.25 m" },
  potted_tall: { id: "potted_plant_01", note: "tall potted plant, 1.35 m" },
  potted: { id: "potted_plant_02", note: "potted plant, 0.84 m" },
  pot_clay: { id: "planter_pot_clay", note: "clay pot" },
  // small hand props
  tea_set: { id: "tea_set_01", note: "tea set (pot, cups, saucers, plates)" },
  teapot: { id: "tea_set_01", parts: ["tea_set_01_teapot_01"], note: "teapot" },
  cup: { id: "tea_set_01", parts: ["tea_set_01_cup_small_01"], note: "tea cup" },
  clipboard: { id: "clipboard", note: "clipboard" },
};

type CatJson = Record<string, { file: string; size: [number, number, number]; minY: number; parts: Record<string, { c: V3; size: [number, number, number] }> }>;
let catP: Promise<CatJson> | null = null;
const catalog = () => (catP ??= fetch(staticFile("kit/props/catalog.json")).then((r) => r.json()));

let blobTex: THREE.Texture | null = null;
const contactTex = () => {
  if (blobTex) return blobTex;
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(0.5, "rgba(0,0,0,0.42)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  blobTex = new THREE.CanvasTexture(c); return blobTex;
};
/** a soft multiply blob on the ground (footprint w x d m), the contact shadow every prop / character foot gets */
export const contactShadow = (w: number, d: number, strength = 0.55) => {
  const m = new THREE.MeshBasicMaterial({ map: contactTex(), transparent: true, depthWrite: false, opacity: strength, polygonOffset: true, polygonOffsetFactor: -2,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor, color: 0x000000 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.003; mesh.renderOrder = 0.5; mesh.name = "contact";
  return mesh;
};

export type PropOpts = { pos: V3; rotY?: number; scale?: number; contact?: number; shadow?: boolean };
/** place a catalog prop on the ground (y = pos[1] is the ground height) */
export const prop = async (ctx: KitCtx, name: string, o: PropOpts): Promise<Built> => {
  const e = PROPS[name];
  if (!e) throw new Error(`kit props: unknown prop "${name}" (see PROPS in kit/props/catalog.ts)`);
  const [cat, scene] = await Promise.all([catalog(), ctx.assets.gltf(`kit/props/${e.id}/${e.id}.glb`)]);
  const c = cat[e.id];
  // keep the selected parts (prefix match; `drop` substrings removed)
  const keep = (n: string) => (!e.parts || e.parts.some((p) => n.startsWith(p))) && !(e.drop ?? []).some((d) => n.includes(d));
  for (const ch of [...scene.children]) if (!keep(ch.name)) scene.remove(ch);
  scene.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(scene);
  if (bb.isEmpty()) throw new Error(`kit props: "${name}" has no parts left (check PROPS.${name}.parts)`);
  const ctr = bb.getCenter(new THREE.Vector3());
  // centre the kept parts on their footprint, lowest point on the ground
  scene.position.set(-ctr.x, -bb.min.y, -ctr.z);
  scene.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.castShadow = o.shadow !== false; mm.receiveShadow = true; } });
  const g = new THREE.Group(); g.name = "prop-" + name; g.add(scene);
  const k = o.contact ?? e.contact ?? 0.55;
  if (k > 0) { const sz = bb.getSize(new THREE.Vector3()); const cs = contactShadow(Math.max(0.25, sz.x * 1.25), Math.max(0.25, sz.z * 1.25), k); g.add(cs); }
  g.position.set(...o.pos); g.rotation.y = o.rotY ?? 0; g.scale.setScalar(o.scale ?? 1);
  void c;
  return { object: g };
};
/** several props at once */
export const props = async (ctx: KitCtx, list: (PropOpts & { name: string })[]): Promise<Built> => {
  const root = new THREE.Group(); root.name = "kit-props";
  for (const b of await Promise.all(list.map((p) => prop(ctx, p.name, p)))) root.add(b.object);
  return { object: root };
};
