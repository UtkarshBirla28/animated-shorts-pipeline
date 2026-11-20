# probe a Poly Haven geometry-nodes tree: what the GN object instances and how many
import bpy, sys, collections
path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.open_mainfile(filepath=path)
gn = [o for o in bpy.data.objects if o.type == "MESH" and any(m.type == "NODES" for m in o.modifiers) and "leaves" not in o.name][0]
print("GN", gn.name)
for m in gn.modifiers:
    if m.type == "NODES":
        print(" mod", m.name, m.node_group.name)
        for it in m.node_group.interface.items_tree:
            if getattr(it, 'in_out', '') == 'INPUT': print('   input', it.name, it.identifier, getattr(it, 'socket_type', ''), getattr(it, 'default_value', '') if not hasattr(getattr(it, 'default_value', ''), '__len__') else '')
dg = bpy.context.evaluated_depsgraph_get()
cnt = collections.Counter(); ex = {}
for inst in dg.object_instances:
    if inst.is_instance and inst.parent and inst.parent.original.name == gn.name:
        nm = inst.object.original.name if inst.object.original else inst.object.name
        cnt[(inst.object.type, nm)] += 1
        if nm not in ex: ex[nm] = [round(x, 3) for x in inst.matrix_world.translation] + [round(inst.matrix_world.to_scale()[0], 3)]
print("instances", sum(cnt.values()))
for k, v in cnt.most_common(): print("  ", k, v, ex[k[1]])
ev = gn.evaluated_get(dg); me = ev.to_mesh()
print("evaluated realized mesh faces", len(me.polygons), "mats", [m.name for m in me.materials if m])
print("---- nodes")
for ng in bpy.data.node_groups:
    print("NG", ng.name, ng.bl_idname)
    for n in ng.nodes:
        extra = ""
        if n.bl_idname == "GeometryNodeObjectInfo": extra = str(n.inputs[0].default_value)
        if n.bl_idname == "GeometryNodeCollectionInfo": extra = str(n.inputs[0].default_value)
        print("   ", n.bl_idname, n.name, extra, "muted" if n.mute else "")
# mute realize nodes and re-evaluate
for ng in bpy.data.node_groups:
    for n in ng.nodes:
        if n.bl_idname == "GeometryNodeRealizeInstances": n.mute = True
gn.update_tag(); bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
cnt = collections.Counter()
for inst in dg.object_instances:
    if inst.is_instance and inst.parent and inst.parent.original.name == gn.name:
        cnt[(inst.object.type, inst.object.name, inst.object.original.name if inst.object.original else '')] += 1
print("instances after mute", sum(cnt.values()))
for k, v in cnt.most_common(20): print("  ", k, v)
ev = gn.evaluated_get(dg); me = ev.to_mesh()
print("evaluated realized mesh faces after mute", len(me.polygons), "mats", [m.name for m in me.materials if m])
