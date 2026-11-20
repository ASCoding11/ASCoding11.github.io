# Face morph targets (glTF morphs) for the characters, added at assembly time:
#   enemies: 'faceB', 'faceC' - two more face shapes on the shared enemy head (the base face is 'faceA')
#   hero and ally: 'blink' - both upper lids down
# Each morph is the difference between the character's own MakeHuman build and the same build with other face
# targets, taken after the re-pose to the game skeleton. `python morphs.py kind` (in Blender's Python) writes
# work/morph_<kind>.npz; assemble.py then maps it onto the final meshes by vertex position.
import bpy, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as L, humans as HU

EYELIDS = [(s + '-eye-' + t, w) for s in ('l', 'r') for t, w in (('height1-decr', 1.0), ('height2-decr', 1.0), ('height3-decr', 0.6),
                                                                 ('eyefold-down', 0.6))]
ALT = {
    'enemy': {
        'faceB': [('head/head-square', 0.55), ('chin/chin-prominent-incr', 0.5), ('chin/chin-width-incr', 0.35), ('nose/nose-scale-horiz-incr', 0.4),
                  ('nose/nose-hump-incr', 0.5), ('eyebrows/eyebrows-trans-down', 0.5), ('cheek/l-cheek-bones-incr', 0.4), ('cheek/r-cheek-bones-incr', 0.4),
                  ('mouth/mouth-scale-horiz-decr', 0.25)],
        'faceC': [('head/head-round', 0.45), ('head/head-fat-incr', 0.35), ('nose/nose-trans-down', 0.3), ('nose/nose-scale-vert-incr', 0.35),
                  ('nose/nose-point-width-incr', 0.4), ('chin/chin-height-decr', 0.3), ('cheek/l-cheek-volume-incr', 0.4),
                  ('cheek/r-cheek-volume-incr', 0.4), ('mouth/mouth-lowerlip-volume-incr', 0.3), ('eyebrows/eyebrows-angle-down', 0.4)],
    },
    'hero': {'blink': 'EYELIDS'},
    'ally': {'blink': 'EYELIDS'},
}
PARTS = ('body', 'eyes', 'brows', 'lashes', 'hair')

def positions(H):
    return {k: np.array([tuple(v.co) for v in H[k].data.vertices]) for k in PARTS if H.get(k)}

def build(params, face):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    p = dict(params); p['face'] = face
    return positions(L.build_human(**p))

if __name__ == '__main__':
    kind = sys.argv[-1]
    params = HU.PARAMS[kind]
    base = build(params, params['face'])
    out = {}
    for k, v in base.items(): out['base_' + k] = v
    for name, face in ALT['enemy' if kind == 'enemy' else kind].items():
        if face == 'EYELIDS': face = list(params['face']) + [('eyes/' + t, w) for t, w in EYELIDS]
        alt = build(params, face)
        for k, v in alt.items(): out[name + '_' + k] = v
        print('morph', name, {k: float(np.abs(alt[k] - base[k]).max()) for k in alt})
    np.savez(L.WORK + '/morph_%s.npz' % kind, **out)
    print('wrote', L.WORK + '/morph_%s.npz' % kind)

GAIN = {'blink': 2.4, 'faceB': 1.8, 'faceC': 1.8}   # MakeHuman targets are linear: the eyelid targets only half-close the eye

def apply(obj, part, npz, names, tol=0.004):
    """Add shape keys `names` to obj: each vertex takes the delta of the source part near its position
    (inverse-distance mix of the 3 nearest source vertices within `tol`; nothing further away moves)."""
    from mathutils import kdtree, Vector
    base = npz['base_' + part]
    kd = kdtree.KDTree(len(base))
    for i, p in enumerate(base): kd.insert(p, i)
    kd.balance()
    me = obj.data
    if not me.shape_keys: obj.shape_key_add(name='Basis', from_mix=False)
    near = []
    for v in me.vertices:
        hits = [(i, d) for (_, i, d) in kd.find_n(v.co, 3) if d <= tol]
        near.append(hits)
    hit = 0
    for nm in names:
        key = me.shape_keys.key_blocks.get(nm) or obj.shape_key_add(name=nm, from_mix=False)
        key.value = 0.0
        if nm + '_' + part not in npz: continue
        dl = (npz[nm + '_' + part] - base) * GAIN.get(nm, 1.0)
        for v, hits in zip(me.vertices, near):
            if not hits: continue
            ws = [1.0 / max(d, 1e-5) for _, d in hits]
            dd = sum((dl[i] * w for (i, _), w in zip(hits, ws)), np.zeros(3)) / sum(ws)
            if np.any(np.abs(dd) > 1e-6):
                key.data[v.index].co = v.co + Vector(dd); hit += 1
    return hit
