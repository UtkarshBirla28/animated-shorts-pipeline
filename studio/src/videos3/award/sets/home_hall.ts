// SET 'home_hall' of 'award': BLOCKOUT written by tools/v3/new_short_v3.py (enough for the DRAFT storyboard: the ground
// in its real PBR surface, walls and grey placeholders at the props). The set builder replaces it with the kit
// (SURFACES ground / room / facade kits, NATURE props + vegetation + fx, CARDS cast) EXACTLY as the bible says, keeps the
// export name, and reports the set's build time + GPU cost. Rules: kit/KIT_CONTRACT.md (DETAIL STANDARD), pure function of t.
/* THE BIBLE'S SPEC FOR THIS SET (briefs/v3/award/bible.json; the source of truth, do not edit here):
 * {
 *  "place": "the front hall in January: a door with a brass letterbox, a doormat, wet boots, snow outside the door glass",
 *  "kind": "interior",
 *  "kit_base": "surfaces/interior",
 *  "ground": {
 *   "surface": "wood_floor",
 *   "meso": "boards with gaps",
 *   "wear": [
 *    "wet footprints",
 *    "grit by the mat"
 *   ],
 *   "scatter": [
 *    "melting snow crumbs",
 *    "a flyer"
 *   ]
 *  },
 *  "surfaces": [
 *   {
 *    "where": "walls",
 *    "surface": "plaster",
 *    "meso": "dado rail + door frame",
 *    "wear": [
 *     "scuffed skirting"
 *    ]
 *   }
 *  ],
 *  "props": [
 *   {
 *    "id": "front_door",
 *    "kit": "props/front_door_letterbox",
 *    "hero": true,
 *    "where": "end wall",
 *    "new": true
 *   },
 *   {
 *    "id": "doormat",
 *    "kit": "props/doormat",
 *    "where": "inside the door",
 *    "new": true
 *   },
 *   {
 *    "id": "boots",
 *    "kit": "props/boots_pair",
 *    "where": "beside the mat",
 *    "new": true
 *   },
 *   {
 *    "id": "coat_hooks",
 *    "kit": "props/coat_hooks",
 *    "where": "left wall",
 *    "new": true
 *   }
 *  ],
 *  "vegetation": [],
 *  "practicals": [
 *   {
 *    "kind": "point",
 *    "what": "hall ceiling lamp",
 *    "kelvin": 2900,
 *    "shadow": false
 *   }
 *  ],
 *  "ambience": "hall: muffled street outside, a radiator tick"
 * }
 */
import * as THREE from "three";
import type { Built, KitCtx } from "../../../kit/core/ctx";

export const build_home_hall = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group();
  g.name = "set:home_hall";
  // ground: the bible's surface through the kit loader (CORE assets.ts), 30 x 30 m
  const pbr = await ctx.assets.pbr("wood_floor", ctx.quality === "draft" ? "1k" : "2k");
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
export { CAMS_home_hall, MARKS_home_hall } from "./home_hall.cams";
