import bpy, sys, collections
path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.open_mainfile(filepath=path)
gn = [o for o in bpy.data.objects if any(m.type == "NODES" for m in o.modifiers) and "geometry_nodes" in o.name][0]
for ng in bpy.data.node_groups:
    for n in ng.nodes:
        if n.bl_idname == "GeometryNodeRealizeInstances": n.mute = True
        if n.bl_idname in ("GeometryNodeCollectionInfo", "GeometryNodeObjectInfo"): print("NODE", ng.name, n.name, n.inputs[0].default_value)
gn.update_tag(); bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
c = collections.Counter()
for inst in dg.object_instances:
    if inst.is_instance and inst.parent and inst.parent.original.name == gn.name:
        d = inst.object.data
        c[(inst.object.type, d.name if d else None, len(d.polygons) if d is not None and hasattr(d, "polygons") else -1, tuple(m.name for m in d.materials) if d is not None and hasattr(d, 'materials') else ())] += 1
for k, v in c.most_common(12): print(k, v)
