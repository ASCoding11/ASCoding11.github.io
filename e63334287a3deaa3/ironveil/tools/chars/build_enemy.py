import bpy, sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import mhlib as L, geo as G, mats as MT, pipe as PP, outfits as O
from mathutils import Vector

KINDS = (os.environ.get('KINDS') or 'rifleman,officer,sniper,gunner').split(',')
SIZE = int(os.environ.get('SIZE') or 1024)
T0 = time.time()
def log(*a): print('[%5.1fs]' % (time.time() - T0), *a, flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
import humans as HU
H = L.build_human(**HU.ENEMY)
log('human', max(v.co.z for v in H['body'].data.vertices))
body = H['body']; P = G.coords(body.data)
mats = O.materials_enemy(knee=PP.J(H, 'calf_l').z)
import wear as WR
import glob
# a different skin per kind (with the three face morphs that gives twelve combinations)
SKIN = {'rifleman': 'young_caucasian_male2', 'officer': 'middleage_caucasian_male', 'sniper': 'young_caucasian_male', 'gunner': 'old_caucasian_male'}
SKINMAT = {k: WR.skin('e_skin_' + k, glob.glob(L.MHA + '/skins/%s/*.png' % v)[0], grime=0.3) for k, v in SKIN.items()}
# the hair under a helmet or cap crown is never seen: trim it (inside a shell a little smaller than the helmet)
_hel, _hc, _hr = O.helmet_stahl(H)
PP.trim_hair(H['hair'], _hc + Vector((0, 0, 0.02)), (_hr[0] - 0.02, _hr[1] - 0.02))
bpy.data.objects.remove(_hel)
log('hair tris after trim', G.tris(H['hair']))
UPPER = {'rifleman': 'tunic', 'gunner': 'tunic', 'officer': 'coat', 'sniper': 'smock'}
lows = []
for kind in KINDS:
    up = UPPER[kind]
    labels = O.label_enemy(H, P, up)
    disp = {up: 0.009, 'trousers': 0.006, 'boot': 0.004, 'skin': 0.0}
    smooth = {up: 1.0, 'trousers': 0.8, 'boot': 1.0, 'skin': 0.0}
    alpha = {up: 0.4, 'trousers': 0.35, 'boot': 0.85}
    slack = {up: 0.008 if kind != 'sniper' else 0.014, 'trousers': 0.007, 'boot': 0.005}
    if kind == 'officer': slack[up] = 0.01
    cloth = PP.cloth_body(H, labels, disp, smooth, alpha=alpha, slack=slack, name='Cloth_' + kind)
    gear = O.gear_enemy(H, cloth, kind)
    if kind == 'officer':
        capparts, hc, hr = O.peaked_cap(H)
        gear += capparts
    else:
        hel, hc, hr = O.helmet_stahl(H)
        gear.append((hel, 'helmetcamo' if kind == 'sniper' else 'helmet'))
    for ob, mn in gear:
        if ob.name.startswith(('Helmet', 'Cap')): continue
        G.transfer_weights(ob, cloth)
    mats['skin'] = SKINMAT[kind]
    PP.assign_mats(cloth, mats)
    for ob, mn in gear:
        ob.data.materials.clear(); ob.data.materials.append(mats[mn])
        if 'UVMap' not in ob.data.uv_layers: ob.data.uv_layers.new(name='UVMap')
    log(kind, 'geometry, gear', len(gear))
    name = kind.capitalize()
    lf = (lambda up_: (lambda H_, P_: O.label_enemy(H_, P_, up_)))(up)
    low = PP.finish(H, name, cloth, gear, labels, {up: 0.0065, 'trousers': 0.0075, 'boot': 0.002}, size=SIZE,
                    out_dir=L.WORK + '/tex_' + kind, low_ratio=0.24, log=log, label_fn=lf)
    # LOD at ~40%
    lod = low.copy(); lod.data = low.data.copy(); lod.name = name + 'LOD'; G.link(lod)
    PP.decimate(lod, 0.4)
    log(kind, 'tris', G.tris(low), 'lod', G.tris(lod))
    # tidy: remove the build pieces
    for ob, mn in gear: bpy.data.objects.remove(ob)
    bpy.data.objects.remove(cloth)
    lows.append(low)
bpy.ops.wm.save_as_mainfile(filepath=L.WORK + '/enemy_baked.blend')
log('saved')
