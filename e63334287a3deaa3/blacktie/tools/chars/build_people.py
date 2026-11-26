# Builds one character (KIND env: agent, suit, tac, civm1, civm2, civf1, civf2) into $CHARS_WORK/<kind>.blend:
# MakeHuman body (CC0 data) on the shared UAL skeleton, MakeHuman CC0 clothes fitted and re-textured in code.
#   CHARS_WORK=/path/to/work bvenv/bin/python build_people.py
import bpy, os, sys, math, glob, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import mhlib as L, geo as G, people as P
import outfits_people as O

KIND = os.environ.get('KIND', 'agent')
SPEC = O.SPECS[KIND]
L.UAL1 = L.WORK + '/hero_plain.glb'   # the shared skeleton (UAL bone names and rest orientations)
bpy.ops.wm.read_factory_settings(use_empty=True)

V0, VT, F = L.load_base()
V = L.apply_targets(V0, L.macro_targets(**SPEC['macro']) + list(SPEC.get('face', [])))
H = L.build_human(V=V, clothes=SPEC['clothes'], **SPEC['human'])
body = H['body']
dele = set(); worn = []
for item in SPEC['clothes']:
    worn.append((item, H['C_' + item])); dele |= P.read_delete_verts(P.CL + '/%s/%s.mhclo' % (item, item))
from mathutils.bvhtree import BVHTree
H['chest_bvh'] = G.bvh_of(body)
print('delete', len(dele), 'removed', P.delete_body_verts(body, H['used'], dele))
TD = L.WORK + '/tex_' + KIND; os.makedirs(TD, exist_ok=True)
O.dress(KIND, SPEC, H, worn, TD)
bpy.ops.wm.save_as_mainfile(filepath=L.WORK + '/%s.blend' % KIND)
print('saved', KIND)
