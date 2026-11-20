# ASSET PREP ONLY. Pack downloaded Poly Haven glTF props (1k) into single .glb files + a catalog of real sizes.
# blender -b --factory-startup -P pack_props.py -- <raw props root> <out root (public/kit/props)>
# Writes <out>/<id>/<id>.glb and <out>/catalog.json: { id: { file, size [x, y, z] m (three.js Y-up), minY, parts: { name: { c, size } } } }
import bpy, sys, os, json
from mathutils import Vector
argv = sys.argv[sys.argv.index("--") + 1:]
raw, out = argv[0], argv[1]
cat = {}
for aid in sorted(os.listdir(raw)):
    d = os.path.join(raw, aid)
    if not os.path.isdir(d): continue
    g = [f for f in os.listdir(d) if f.endswith(".gltf")]
    if not g: continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.import_scene.gltf(filepath=os.path.join(d, g[0]))
    except Exception as e:
        print("FAIL import", aid, e); continue
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not objs: continue
    def bb(obs):
        pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        return lo, hi
    lo, hi = bb(objs)
    # Blender Z-up -> three Y-up: (x, y, z) -> (x, z, -y)
    T = lambda v: [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]
    size = [round(hi.x - lo.x, 3), round(hi.z - lo.z, 3), round(hi.y - lo.y, 3)]
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    parts = {}
    for r in roots:
        obs = [o for o in [r] + list(r.children_recursive) if o.type == "MESH"]
        if not obs: continue
        l2, h2 = bb(obs)
        parts[r.name] = {"c": T((l2 + h2) / 2), "min": T(Vector((l2.x, h2.y, l2.z))), "size": [round(h2.x - l2.x, 3), round(h2.z - l2.z, 3), round(h2.y - l2.y, 3)],
                         "tris": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs)}
    od = os.path.join(out, aid); os.makedirs(od, exist_ok=True)
    fp = os.path.join(od, aid + ".glb")
    bpy.ops.export_scene.gltf(filepath=fp, export_format="GLB", export_image_format="AUTO", export_yup=True, export_apply=True, export_animations=False)
    cat[aid] = {"file": f"kit/props/{aid}/{aid}.glb", "size": size, "minY": round(lo.z, 4), "parts": parts,
                "tris": sum(p["tris"] for p in parts.values()), "bytes": os.path.getsize(fp)}
    print("OK", aid, size, len(parts), "parts", cat[aid]["tris"], "tris", round(cat[aid]["bytes"] / 1e6, 2), "MB", flush=True)
json.dump(cat, open(os.path.join(out, "catalog.json"), "w"), indent=1)
print("CATALOG", len(cat))
