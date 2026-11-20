// SET 'autumn_street' of 'award': BLOCKOUT written by tools/v3/new_short_v3.py (enough for the DRAFT storyboard: the ground
// in its real PBR surface, a back wall and grey placeholders at the props). The set builder replaces it with the kit
// (SURFACES ground / room / facade kits, NATURE props + vegetation + fx, CARDS cast) EXACTLY as the bible says, keeps the
// export name, and reports the set's build time + GPU cost. Rules: kit/KIT_CONTRACT.md (DETAIL STANDARD), pure function of t.
/* THE BIBLE'S SPEC FOR THIS SET (briefs/v3/award/bible.json; the source of truth, do not edit here):
 * {
 *  "place": "a tree-lined street to school in autumn, low gold sun, leaves falling",
 *  "kind": "exterior",
 *  "kit_base": "surfaces/facade",
 *  "ground": {
 *   "surface": "concrete_sidewalk",
 *   "meso": "slab joints + bevelled kerb",
 *   "wear": [
 *    "damp patches",
 *    "moss in joints"
 *   ],
 *   "scatter": [
 *    "leaf_litter (instanced)",
 *    "conkers",
 *    "a lost glove"
 *   ]
 *  },
 *  "surfaces": [
 *   {
 *    "where": "road",
 *    "surface": "asphalt",
 *    "meso": "kerb bevel, a drain grate",
 *    "wear": [
 *     "puddles",
 *     "tyre marks"
 *    ]
 *   },
 *   {
 *    "where": "house fronts",
 *    "surface": "brick_wall",
 *    "meso": "window insets, sills, gutters",
 *    "wear": [
 *     "dirt at the wall bottoms"
 *    ]
 *   },
 *   {
 *    "where": "verges",
 *    "surface": "lawn_soil",
 *    "meso": "grass blades near the lens",
 *    "wear": [
 *     "leaf drifts"
 *    ]
 *   }
 *  ],
 *  "props": [
 *   {
 *    "id": "school_gate",
 *    "kit": "props/iron_gate",
 *    "where": "end of the street",
 *    "new": true
 *   },
 *   {
 *    "id": "tally_board",
 *    "kit": "local/tally_board",
 *    "hero": true,
 *    "where": "on the school fence: 'DAYS: 20 / 20'",
 *    "local": true
 *   },
 *   {
 *    "id": "bins",
 *    "kit": "props/wheelie_bin",
 *    "where": "kerb",
 *    "new": true
 *   },
 *   {
 *    "id": "lamp_posts",
 *    "kit": "props/street_lamp_01",
 *    "where": "every 12 m"
 *   }
 *  ],
 *  "vegetation": [
 *   {
 *    "kit": "nature/tree_small_02",
 *    "count": 6,
 *    "where": "both kerbs, autumn tint"
 *   },
 *   {
 *    "kit": "nature/hedge",
 *    "count": 3,
 *    "where": "front gardens"
 *   },
 *   {
 *    "kit": "nature/grass",
 *    "count": 1,
 *    "where": "verges near the lens"
 *   }
 *  ],
 *  "practicals": [],
 *  "ambience": "street autumn: wind in leaves, distant traffic, kids far off"
 * }
 */
import * as THREE from "three";
import type { Built, KitCtx } from "../../../kit/core/ctx";

export const build_autumn_street = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group();
  g.name = "set:autumn_street";
  // ground: the bible's surface through the kit loader (CORE assets.ts), 30 x 30 m
  const pbr = await ctx.assets.pbr("concrete_sidewalk", ctx.quality === "draft" ? "1k" : "2k");
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
  
  const props = 4;
  for (let i = 0; i < props; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), grey);
    b.position.set(-2.4 + (i % 5) * 1.2, 0.45, -2.6 + Math.floor(i / 5) * 1.2);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  }
  return { object: g, hints: { groundAlbedo: [0.35, 0.32, 0.3] } };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_autumn_street, MARKS_autumn_street } from "./autumn_street.cams";
