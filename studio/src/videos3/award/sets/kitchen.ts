// SET 'kitchen' of 'award': BLOCKOUT written by tools/v3/new_short_v3.py (enough for the DRAFT storyboard: the ground
// in its real PBR surface, walls and grey placeholders at the props). The set builder replaces it with the kit
// (SURFACES ground / room / facade kits, NATURE props + vegetation + fx, CARDS cast) EXACTLY as the bible says, keeps the
// export name, and reports the set's build time + GPU cost. Rules: kit/KIT_CONTRACT.md (DETAIL STANDARD), pure function of t.
/* THE BIBLE'S SPEC FOR THIS SET (briefs/v3/award/bible.json; the source of truth, do not edit here):
 * {
 *  "place": "a warm family kitchen, early morning, sun through the window over the sink",
 *  "kind": "interior",
 *  "kit_base": "surfaces/interior",
 *  "ground": {
 *   "surface": "floor_tiles",
 *   "meso": "tile joints with depth, slight bevel",
 *   "wear": [
 *    "scuffs by the fridge",
 *    "a crumb trail"
 *   ],
 *   "scatter": [
 *    "crumbs",
 *    "a dropped magnet letter"
 *   ]
 *  },
 *  "surfaces": [
 *   {
 *    "where": "walls",
 *    "surface": "painted_wall",
 *    "meso": "skirting board + window frame insets",
 *    "wear": [
 *     "grease mark above the hob"
 *    ]
 *   },
 *   {
 *    "where": "counter",
 *    "surface": "marble",
 *    "meso": "bevelled edge",
 *    "wear": [
 *     "a mug ring"
 *    ]
 *   }
 *  ],
 *  "props": [
 *   {
 *    "id": "fridge",
 *    "kit": "props/fridge_retro",
 *    "hero": true,
 *    "where": "back wall, right of the window",
 *    "new": true
 *   },
 *   {
 *    "id": "alarm_clock",
 *    "kit": "props/alarm_clock",
 *    "hero": true,
 *    "where": "counter, beside the fridge",
 *    "new": true
 *   },
 *   {
 *    "id": "certificate",
 *    "kit": "local/certificate",
 *    "hero": true,
 *    "where": "fridge door, eye height",
 *    "local": true
 *   },
 *   {
 *    "id": "kettle",
 *    "kit": "props/kettle",
 *    "where": "counter",
 *    "new": true
 *   },
 *   {
 *    "id": "fruit_bowl",
 *    "kit": "props/fruit_bowl",
 *    "where": "table",
 *    "new": true
 *   },
 *   {
 *    "id": "chairs",
 *    "kit": "props/wooden_chair",
 *    "where": "table",
 *    "new": true
 *   }
 *  ],
 *  "vegetation": [
 *   {
 *    "kit": "nature/potted_plant",
 *    "count": 2,
 *    "where": "window sill"
 *   }
 *  ],
 *  "practicals": [
 *   {
 *    "kind": "spot",
 *    "what": "pendant lamp over the table (warm, off at the start, on in s17)",
 *    "kelvin": 2700,
 *    "shadow": true
 *   }
 *  ],
 *  "ambience": "kitchen morning: fridge hum, distant birds outside, a clock tick"
 * }
 */
import * as THREE from "three";
import type { Built, KitCtx } from "../../../kit/core/ctx";

export const build_kitchen = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group();
  g.name = "set:kitchen";
  // ground: the bible's surface through the kit loader (CORE assets.ts), 30 x 30 m
  const pbr = await ctx.assets.pbr("floor_tiles", ctx.quality === "draft" ? "1k" : "2k");
  const rep = 30 / pbr.tileM;
  for (const t of [pbr.map, pbr.normalMap, pbr.arm]) if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({
    map: pbr.map, normalMap: pbr.normalMap, aoMap: pbr.arm ?? null, roughnessMap: pbr.arm ?? null, metalnessMap: pbr.arm ?? null }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);
  // TODO(set builder): walls / facades / room from the SURFACES kit; every prop, plant and practical in the spec above
  const grey = new THREE.MeshStandardMaterial({ color: 0x9a948c, roughness: 0.8 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.2, 0.2), grey);
  wall.position.set(0, 1.6, -4);
  wall.castShadow = wall.receiveShadow = true;
  g.add(wall);
  const side = wall.clone(); side.rotation.y = Math.PI / 2; side.position.set(-5, 1.6, 0); g.add(side);
  const props = 6;
  for (let i = 0; i < props; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), grey);
    b.position.set(-2.4 + (i % 5) * 1.2, 0.45, -2.6 + Math.floor(i / 5) * 1.2);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  }
  return { object: g, hints: { groundAlbedo: [0.35, 0.32, 0.3] } };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_kitchen, MARKS_kitchen } from "./kitchen.cams";
