# list objects / meshes / face counts / materials / dimensions of a .blend (asset prep helper)
import bpy, sys
path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.open_mainfile(filepath=path)
for o in bpy.data.objects:
    me = o.data if o.type == "MESH" else None
    info = ""
    if me:
        mats = [m.name if m else None for m in me.materials]
        info = f"faces={len(me.polygons)} verts={len(me.vertices)} mats={mats}"
    print("OBJ", o.name, o.type, tuple(round(x, 2) for x in o.dimensions), tuple(round(x,2) for x in o.location), [m.type for m in o.modifiers], info, "coll=", [c.name for c in o.users_collection])
for c in bpy.data.collections: print("COLL", c.name, len(c.objects))
for im in bpy.data.images: print("IMG", im.name, im.filepath, tuple(im.size))
