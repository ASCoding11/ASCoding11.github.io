import bpy, sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import mhlib as L, geo as G, mats as MT, pipe as PP, outfits as O
from mathutils import Vector

MODE = sys.argv[-1]  # 'preview' or 'bake'
KIND = os.environ.get('KIND', 'hero')
NAME = KIND.capitalize()
SIZE = 2048 if KIND == 'hero' else 1024
T0 = time.time()
def log(*a): print('[%5.1fs]' % (time.time() - T0), *a, flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
import humans as HU
H = L.build_human(**HU.PARAMS[KIND])
log('human built', max(v.co.z for v in H['body'].data.vertices))
body = H['body']
P = G.coords(body.data)
labels = O.label_hero(H, P)
cloth = PP.cloth_body(H, labels,
                      disp={'jacket': 0.008, 'trousers': 0.005, 'boot': 0.004, 'glove': 0.002, 'skin': 0.0},
                      smooth={'jacket': 1.0, 'trousers': 0.8, 'boot': 1.0, 'glove': 0.3, 'skin': 0.0},
                      alpha={'jacket': 0.4, 'trousers': 0.35, 'boot': 0.9}, slack={'jacket': 0.003, 'trousers': 0.005, 'boot': 0.006},
                      torso_dilate=0.04)
log('cloth body')
gear = O.gear_hero(H, cloth)
if KIND == 'hero':
    helmet, hc, hr = O.cap_comforter(H)
    gear += [(helmet, 'wool')]
else:
    helmet, hc, hr = O.helmet_m1(H)
    gear += [(helmet, 'helmet')] + [(x, 'canvas') for x in O.scrim_bits(hc, hr)]
if H.get('hair'): PP.trim_hair(H['hair'], hc, hr)
for ob, mn in gear:
    if ob.name.startswith(('Helmet', 'Straps', 'Scrim', 'Cap')): continue
    G.transfer_weights(ob, cloth)
log('gear', len(gear))
mats = O.materials_hero(knee=PP.J(H, 'calf_l').z)
import wear as WR
mats['skin'] = WR.skin('skin', H['skin_png'], grime=0.4, beard=1.0 if KIND == 'hero' else 0.45, scars=(KIND == 'hero'), tan=0.45)
PP.assign_mats(cloth, mats)
for ob, mn in gear:
    ob.data.materials.clear(); ob.data.materials.append(mats[mn])
    if 'UVMap' not in ob.data.uv_layers: ob.data.uv_layers.new(name='UVMap')

# trim hair that sits inside the helmet
hair = H.get('hair')
bpy.ops.wm.save_as_mainfile(filepath=L.WORK + '/%s_geo.blend' % KIND)
log('saved geo')

# ---------- low ----------
low = cloth.copy(); low.data = cloth.data.copy(); low.name = NAME + 'Low'; G.link(low)
protect = [i for i, l in enumerate(labels) if l == 'skin']
PP.decimate(low, 0.42, protect=protect)
log('low body tris', G.tris(low))
gl = []
for ob, mn in gear:
    if ob.get('hi_only'): continue
    c = ob.copy(); c.data = ob.data.copy(); G.link(c); gl.append(c)
low = G.join([low] + gl, NAME)
log('low total tris', G.tris(low))
bpy.ops.wm.save_as_mainfile(filepath=L.WORK + '/%s_low.blend' % KIND)

if MODE == 'bake':
    # reload clean geo stage
    bpy.ops.wm.open_mainfile(filepath=L.WORK + '/%s_geo.blend' % KIND)
    import importlib
    cloth = bpy.data.objects['Cloth']
    labels = list(cloth['vlabels'])
    gear = []
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name not in ('Cloth', 'Body', 'Eyes', 'Brows', 'Lashes', 'Hair') and not o.name.startswith(NAME + 'Low'):
            gear.append((o, o.data.materials[0].name))
    H = {'J': {}, 'body': bpy.data.objects['Body']}
    rig = bpy.data.objects['Armature']
    for b in rig.data.bones: H['J'][b.name] = (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local)
    TD = L.WORK + '/tex_' + KIND
    low = PP.finish(H, NAME, cloth, gear, labels, {'jacket': 0.0065, 'trousers': 0.0075, 'boot': 0.002}, size=SIZE, out_dir=TD, log=log, label_fn=O.label_hero, low_ratio=0.42)
    bpy.ops.wm.save_as_mainfile(filepath=L.WORK + '/%s_baked.blend' % KIND)
