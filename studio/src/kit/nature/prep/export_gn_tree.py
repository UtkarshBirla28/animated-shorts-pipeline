# ASSET PREP ONLY (never renders shots). Turn a Poly Haven geometry-nodes tree (.blend, CC0) into a web tree:
#   <out>/<name>.glb      nodes: trunk, trunk_lo, branches, branches_lo, leaves_<k> (one leaf-cluster mesh per kind)
#   <out>/<name>.inst.bin Float32 x 13 per leaf-cluster instance: kind, then the 3x4 affine (column-major, three.js Y-up)
#   <out>/<name>.json     manifest (kinds, counts, bbox, crown centre / radii, material -> texture files)
# usage: blender -b --factory-startup -P export_gn_tree.py -- <in.blend> <out dir> <name> [branch ratio hi] [branch ratio lo]
import bpy, bmesh, sys, os, json, struct, re
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, name = argv[0], argv[1], argv[2]
r_hi = float(argv[3]) if len(argv) > 3 else 0.45
r_lo = float(argv[4]) if len(argv) > 4 else 0.08
os.makedirs(out, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=src)

gn = [o for o in bpy.data.objects if o.type in ("MESH", "CURVE", "CURVES") and any(m.type == "NODES" for m in o.modifiers) and "geometry_nodes" in o.name]
if not gn:
    gn = [o for o in bpy.data.objects if any(m.type == "NODES" and "leav" in m.name.lower() for m in o.modifiers)]
gn = gn[0]
print("GN object", gn.name)
for ng in bpy.data.node_groups:
    for n in ng.nodes:
        if n.bl_idname == "GeometryNodeRealizeInstances": n.mute = True
        # leaf clusters: use the LOD1 cluster collection when the tree ships one (3x fewer faces per cluster)
        if n.bl_idname == "GeometryNodeCollectionInfo" and n.inputs[0].default_value is not None:
            nm = n.inputs[0].default_value.name
            if nm.endswith("LOD0") and nm[:-1] + "1" in bpy.data.collections: n.inputs[0].default_value = bpy.data.collections[nm[:-1] + "1"]
gn.update_tag(); bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
inv = gn.matrix_world.inverted()
C = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))   # Blender Z-up -> glTF / three Y-up
Ci = C.inverted()
base = lambda s: re.sub(r"_LOD\d+$", "", s)
# group the instances by their mesh (object instances: the object name; geometry instances: mesh name + face count)
groups = {}; gmesh = {}
for inst in dg.object_instances:
    if inst.is_instance and inst.parent and inst.parent.original.name == gn.name:
        o = inst.object
        if o.type != "MESH": continue
        orig = o.original if o.original and o.original.name != gn.name else None
        key = orig.name if orig else f"{o.data.name}#{len(o.data.polygons)}"
        if key not in groups:
            groups[key] = []
            gmesh[key] = orig.data if orig else bpy.data.meshes.new_from_object(o)
        groups[key].append(inv @ inst.matrix_world.copy())
print({k: (len(v), len(gmesh[k].polygons)) for k, v in groups.items()})
# the trunk / body: a group whose name says trunk, or a single huge instance; everything else = leaf clusters
body = [k for k in groups if "trunk" in k.lower() or (len(groups[k]) <= 2 and len(gmesh[k].polygons) > 4000)]
leaf_keys = sorted((k for k in groups if k not in body), key=lambda k: -len(groups[k]))
def kind_name(k, i):
    m = re.search(r"leaves_([a-z])", k)
    if m: return m.group(1)
    mats = [mm.name for mm in gmesh[k].materials if mm]
    return ("twig" if any("branch" in x for x in mats) and not any("leav" in x for x in mats) else "k") + str(i)
kinds = [kind_name(k, i) for i, k in enumerate(leaf_keys)]
# ---- build the export scene ----
scn = bpy.context.scene
col = bpy.data.collections.new("export"); scn.collection.children.link(col)
def add_obj(nm, me, mat=Matrix.Identity(4)):
    ob = bpy.data.objects.new(nm, me); col.objects.link(ob); ob.matrix_world = mat; return ob
def decimated(me, ratio, nm):
    tmp = bpy.data.objects.new("tmp_" + nm, me.copy()); col.objects.link(tmp)
    d = tmp.modifiers.new("dec", "DECIMATE"); d.ratio = ratio; d.use_collapse_triangulate = True
    dg2 = bpy.context.evaluated_depsgraph_get(); ev = tmp.evaluated_get(dg2)
    m2 = bpy.data.meshes.new_from_object(ev); m2.name = nm
    col.objects.unlink(tmp); bpy.data.objects.remove(tmp)
    return m2
objs = []
# branches = the GN object's own mesh (before the leaf modifiers)
br = bpy.data.meshes.new_from_object(gn.evaluated_get(dg)); br.name = "branches"   # the non-instance part (realize muted)
if len(br.polygons) < 100 and body:   # curve-built trees: the realized body instance IS the branches
    bk = max(body, key=lambda k: len(gmesh[k].polygons)); br = gmesh[bk].copy(); br.transform(groups[bk][0]); body.remove(bk)
objs.append(add_obj("branches", decimated(br, r_hi, "branches_hi")))
objs.append(add_obj("branches_lo", decimated(br, r_lo, "branches_lo")))
trunk_name = body[0] if body else None
if trunk_name:
    tm = groups[trunk_name][0]
    t0 = gmesh[trunk_name]
    objs.append(add_obj("trunk", t0, tm))
    lo_name = trunk_name.replace("LOD0", "LOD1")
    t1 = bpy.data.objects[lo_name].data if lo_name in bpy.data.objects and lo_name != trunk_name else decimated(t0, 0.3, "trunk_lo")
    objs.append(add_obj("trunk_lo", t1, tm))
for k, key in zip(kinds, leaf_keys):
    objs.append(add_obj("leaves_" + k, gmesh[key]))
for ob in objs: print("export", ob.name, len(ob.data.polygons), "faces", [m.name for m in ob.data.materials if m])

# ---- glb (geometry + material names only; the kit binds its own textures) ----
for ob in bpy.context.view_layer.objects: ob.select_set(False)
for ob in objs: ob.select_set(True)
glb = os.path.join(out, name + ".glb")
kw = dict(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_normals=True, export_texcoords=True,
          export_tangents=False, export_materials="EXPORT", export_image_format="NONE", export_yup=True, export_animations=False)
try:
    bpy.ops.export_scene.gltf(**kw)
except TypeError as e:
    print("retry export without some args", e)
    kw.pop("export_image_format", None); bpy.ops.export_scene.gltf(**kw)

# ---- instances ----
buf = bytearray(); pts = []
for ki, key in enumerate(leaf_keys):
    for M in groups[key]:
        Mt = C @ M @ Ci
        vals = [float(ki)] + [Mt[r][c] for c in range(4) for r in range(3)]   # column-major 3x4
        buf += struct.pack("<13f", *vals); pts.append(Mt.translation.copy())
open(os.path.join(out, name + ".inst.bin"), "wb").write(bytes(buf))
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
cen = sum(pts, Vector()) / len(pts)
# whole-tree bbox from the branch mesh (three coords)
bv = [C @ v.co for v in br.vertices]
blo = [min(v[i] for v in bv) for i in range(3)]; bhi = [max(v[i] for v in bv) for i in range(3)]
man = {"name": name, "source": os.path.basename(src), "kinds": kinds, "count": len(pts),
       "counts": {k: len(groups[n]) for k, n in zip(kinds, leaf_keys)},
       "crownMin": list(lo), "crownMax": list(hi), "crownCenter": list(cen), "bboxMin": blo, "bboxMax": bhi,
       "faces": {ob.name: len(ob.data.polygons) for ob in objs},
       "materials": sorted({m.name for ob in objs for m in ob.data.materials if m})}
json.dump(man, open(os.path.join(out, name + ".json"), "w"), indent=1)
print("MANIFEST", json.dumps(man))
