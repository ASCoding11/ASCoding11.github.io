# Quick geometry check: build weapons with flat colours and export a GLB (no baking).
# usage: python preview.py out.glb kind[,kind...] [lo]
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geo as G, models as MD, assemble as AS

out, kinds = sys.argv[1], sys.argv[2].split(',')
hi = not (len(sys.argv) > 3 and sys.argv[3] == 'lo')
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = {'wood': (0.16, 0.07, 0.03), 'blued': (0.25, 0.26, 0.28), 'steel': (0.5, 0.5, 0.5), 'park': (0.08, 0.08, 0.075),
       'leather': (0.12, 0.06, 0.03), 'brass': (0.7, 0.5, 0.2), 'glass': (0.05, 0.07, 0.08), 'bakelite': (0.05, 0.03, 0.02),
       'canvas': (0.25, 0.22, 0.14), 'paint_od': (0.1, 0.11, 0.06), 'paint_grey': (0.12, 0.12, 0.11), 'paint_black': (0.03, 0.03, 0.03)}
MET = {'blued': 1, 'steel': 1, 'brass': 1}
mats = {}
def mat(t):
    if t not in mats:
        m = bpy.data.materials.new(t); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = COL.get(t, (0.5, 0.5, 0.5)) + (1,)
        b.inputs['Metallic'].default_value = MET.get(t, 0); b.inputs['Roughness'].default_value = 0.45
        mats[t] = m
    return mats[t]
roots = []
for k in kinds:
    W = MD.BUILDERS[k](hi)
    meshes = {}
    tot = 0
    for part, lst in W.parts.items():
        obs = []
        for ob, t in lst:
            G.set_mat(ob, mat(t)); obs.append(ob)
        j = G.join(obs, part) if len(obs) > 1 else obs[0]
        G.smooth_by_angle(j, 35)
        meshes[part] = j; tot += G.tris(j)
        print(W.kind, part, G.tris(j))
    print('TOTAL', W.kind, tot)
    roots.append(AS.assemble(W, meshes))
AS.export(out, roots)
