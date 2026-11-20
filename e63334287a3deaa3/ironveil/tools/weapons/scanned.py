# The hero's rifle and pistol from Poly Haven scans (CC0, see CREDITS-weapons.md), turned into the node layout the
# game reads (same names and frames as assemble.py), with our sling, the box magazine cut out as a moving part, the
# bolt split into a sliding body and a turning handle, reduced triangle counts and a small third-person LOD.
# usage: python scanned.py <poly haven folder> <cleaned texture folder (demark.py)> <out folder>
# Blender weapon frame as in models.py: barrel -Y, up +Z, right side -X, origin at the right-hand grip, metres.
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geo as G
import assemble as A

SRC, TEX, OUT = sys.argv[-3], sys.argv[-2], sys.argv[-1]
os.makedirs(OUT, exist_ok=True)

def log(*a): print('[scanned]', *a, flush=True)

class W:   # what assemble.assemble() reads
    def __init__(self, kind):
        self.kind = kind; self.pivots = {}; self.empties = {}
        self.gripL = (0, -0.3, 0); self.gripRoff = (0, 0, 0); self.gripLoff = (0, 0, 0)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def import_set(name):
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name, name + '.gltf'))
    obs = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
    for o in obs.values():   # bake every transform into the mesh, drop the hierarchy
        M = o.matrix_world.copy(); o.parent = None; o.matrix_world = Matrix(); o.data.transform(M)
    for o in [o for o in bpy.data.objects if o.type != 'MESH']:
        bpy.data.objects.remove(o)
    return obs

def img(path, data):
    for suf, px in (('_1k.png', 1024), ('_512.png', 512)):   # smaller maps: downscale the cleaned 2k maps
        if not os.path.exists(path) and path.endswith(suf):
            from PIL import Image
            Image.open(path[:-len(suf)] + '_2k.png').resize((px, px), Image.LANCZOS).save(path)
    im = bpy.data.images.load(path, check_existing=True)
    if data: im.colorspace_settings.name = 'Non-Color'
    return im

def material(name, prefix, size, glass=False, arm=None):
    """Principled material from the cleaned maps (ARM: R occlusion, G roughness, B metal)."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree; N = nt.nodes; Lk = nt.links
    bs = N['Principled BSDF']
    if glass:
        bs.inputs['Base Color'].default_value = (0.02, 0.025, 0.03, 1)
        bs.inputs['Roughness'].default_value = 0.05; bs.inputs['Metallic'].default_value = 0.0
        bs.inputs['Alpha'].default_value = 0.35
        return m
    d = N.new('ShaderNodeTexImage'); d.image = img(os.path.join(TEX, '%s_diff_%s.png' % (prefix, size)), False)
    a = N.new('ShaderNodeTexImage'); a.image = img(os.path.join(TEX, '%s_arm_%s.png' % (prefix, arm or size)), True)
    n = N.new('ShaderNodeTexImage'); n.image = img(os.path.join(TEX, '%s_nor_gl_%s.png' % (prefix, size)), True)
    sp = N.new('ShaderNodeSeparateColor'); nm = N.new('ShaderNodeNormalMap')
    Lk.new(d.outputs['Color'], bs.inputs['Base Color'])
    Lk.new(a.outputs['Color'], sp.inputs['Color'])
    Lk.new(sp.outputs['Green'], bs.inputs['Roughness']); Lk.new(sp.outputs['Blue'], bs.inputs['Metallic'])
    Lk.new(n.outputs['Color'], nm.inputs['Color']); Lk.new(nm.outputs['Normal'], bs.inputs['Normal'])
    # the exporter writes an ORM texture when occlusion is wired through a glTF Material Output group
    grp = bpy.data.node_groups.get('glTF Material Output')
    if grp is None:
        grp = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        grp.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g = N.new('ShaderNodeGroup'); g.node_tree = grp
    Lk.new(sp.outputs['Red'], g.inputs['Occlusion'])
    return m

def set_mats(o, mats):
    """Replace the imported materials by ours, matched by the imported material name."""
    for i, slot in enumerate(o.material_slots):
        nm = slot.material.name if slot.material else ''
        for key, m in mats:
            if key in nm:
                o.material_slots[i].material = m; break

def to_frame(obs, origin):
    """Imported frame (X = muzzle, Z up, -Y = right side) -> weapon frame (barrel -Y, right side -X), origin moved."""
    R = Matrix.Rotation(-math.pi / 2, 4, 'Z')
    M = R @ Matrix.Translation(-Vector(origin))
    for o in obs: o.data.transform(M)
    return M

def decimate(o, ratio):
    if ratio >= 1: return
    m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio; m.use_collapse_triangulate = True
    G.apply_mods(o)

def split_loose_in_box(o, lo, hi, name):
    """Move the loose parts of o whose bounds lie inside the box [lo, hi] into a new object."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    seen = set(); take = []
    for v in bm.verts:
        if v.index in seen: continue
        stack = [v]; comp = []
        seen.add(v.index)
        while stack:
            x = stack.pop(); comp.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen: seen.add(y.index); stack.append(y)
        ok = all(lo[i] <= x.co[i] <= hi[i] for x in comp for i in range(3))
        if ok: take += comp
    ids = {v.index for v in take}
    bm.free()
    new = o.copy(); new.data = o.data.copy(); new.name = name; G.link(new)
    for ob, keep in ((o, False), (new, True)):
        bm = bmesh.new(); bm.from_mesh(ob.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.index in ids) != keep], context='VERTS')
        bm.to_mesh(ob.data); bm.free()
    return new

def ring_center(o, axis, pick):
    """Centre of the vertices selected by pick(co) in the two other axes."""
    P = [v.co for v in o.data.vertices if pick(v.co)]
    c = sum(P, Vector()) / max(1, len(P))
    return c, len(P)

def sling(name, p0, p1, sag, width=0.032, thick=0.004, uv_rect=(0.02, 0.36, 0.78, 0.44), side=1.0):
    """A canvas sling between two attachment points, hanging on the weapon's left side in a shallow curve,
    with rolled edges (thickness) and two leather keeper loops. UVs map onto a canvas strip of the accessory set."""
    p0, p1 = Vector(p0), Vector(p1)
    n = 36; ring = []
    verts, faces, uvs = [], [], []
    L = (p1 - p0).length
    for i in range(n + 1):
        t = i / n
        p = p0.lerp(p1, t) + Vector((0, 0, -sag * 4 * t * (1 - t)))
        # tangent and a normal that keeps the strap flat against the weapon side
        tn = (p1 - p0).normalized()
        nside = Vector((side, 0, 0))
        up = nside.cross(tn).normalized()
        row = []
        for j, (u, o) in enumerate(((-0.5, 0.35), (-0.5, -0.35), (0.5, -0.35), (0.5, 0.35))):
            q = p + up * (u * width) + nside * (o * thick)
            row.append(len(verts)); verts.append(q)
        ring.append(row)
    for i in range(n):
        a, b = ring[i], ring[i + 1]
        for j in range(4):
            faces.append((a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]))
    o = G.mesh_obj(name, verts, faces, smooth=False)
    me = o.data; uvl = me.uv_layers.new(name='UVMap')
    u0, v0, u1, v1 = uv_rect
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            i, j = vi // 4, vi % 4
            uvl.data[li].uv = (u0 + (u1 - u0) * i / n, v0 + (v1 - v0) * (0 if j in (0, 1) else 1))
    return o

def lod_copy(objs, name, ratio, mats_small):
    cs = []
    for o in objs:
        c = o.copy(); c.data = o.data.copy(); G.link(c)
        c.matrix_world = o.matrix_world.copy()
        cs.append(c)
    for c in cs:
        M = c.matrix_world.copy(); c.parent = None; c.matrix_world = Matrix(); c.data.transform(M)
    j = G.join(cs, name)
    decimate(j, ratio)
    for i, s in enumerate(j.material_slots):
        for key, m in mats_small:
            if s.material and key in s.material.name: j.material_slots[i].material = m; break
    return j

def tris(objs):
    return sum(G.tris(o) for o in objs)

# =====================================================================================================
def build_rifle():
    reset()
    obs = import_set('bolt_action_rifle_7_62')
    name = 'bolt_action_rifle_7_62'
    main = obs[name]; scope = obs[name + '_scope']; wrap = obs[name + '_wrap']
    bolt_a = obs[name + '_bolt_a']; bolt_b = obs[name + '_bolt_b']; trig = obs[name + '_trigger']
    bpy.data.objects.remove(obs[name + '_bullet_54mm'])   # display cartridge lying under the gun
    # bore axis from the muzzle ring, trigger blade top, scope tube rear
    mx = max(v.co.x for v in main.data.vertices)
    bore, nb = ring_center(main, 'x', lambda c: c.x > mx - 0.004)
    bore_z = bore.z
    tz = max(v.co.z for v in trig.data.vertices); tx = sum(v.co.x for v in trig.data.vertices) / len(trig.data.vertices)
    sx = min(v.co.x for v in scope.data.vertices)
    sc, ns = ring_center(scope, 'x', lambda c: c.x < sx + 0.004)
    log('rifle bore z %.4f (n %d), trigger x %.4f top %.4f, scope rear x %.4f centre %s (n %d)' % (bore_z, nb, tx, tz, sx, tuple(round(x, 4) for x in sc), ns))
    # the box magazine is part of the main mesh: cut its loose parts out
    mag = split_loose_in_box(main, Vector((tx + 0.06, -0.03, -0.12)), Vector((tx + 0.15, 0.03, bore_z - 0.035)), 'mag')
    log('magazine tris', G.tris(mag), 'bounds x', min(v.co.x for v in mag.data.vertices), max(v.co.x for v in mag.data.vertices))
    origin = (tx, 0.0, bore_z - 0.020)
    allo = [main, scope, wrap, bolt_a, bolt_b, trig, mag]
    to_frame(allo, origin)
    BORE = 0.020
    # reduce: the scope and bolt carry far more triangles than they show at arm's length
    decimate(scope, 0.55); decimate(bolt_a, 0.65); decimate(bolt_b, 0.65); decimate(mag, 0.7)
    mats = [('glass', material('wpn_rifle_glass', None, None, glass=True)),
            ('accesories', material('wpn_rifle_acc', name + '_accesories', '1k')),
            (name, material('wpn_rifle_main', name, '2k', arm='1k'))]
    for o in allo: set_mats(o, mats)
    # muzzle end in the weapon frame
    muz_y = -(mx - origin[0])
    # front and rear sling points: barrel band and the rear stock slot, on the left side (+X)
    sl = sling('sling', (0.022, muz_y + 0.47, BORE - 0.030), (0.024, 0.36, -0.050), sag=0.035)
    sl.data.materials.append(mats[1][1])
    # weapon description for assemble.py
    w = W('rifleScoped')
    body = G.join([main, scope, wrap], 'body')
    w.pivots = {'bolt': (0, 0, BORE), 'boltHandle': (0, 0, BORE), 'trigger': (0, 0.0, tz - origin[2]),
                'mag': (0, -0.10, -0.045), 'sling': (0, 0, 0)}
    eye_y = -(sx - origin[0]) + 0.078
    w.empties = {'muzzle': ((0, muz_y, BORE), (0, -1, 0)),
                 'ejection': ((-0.006, -0.06, BORE + 0.016), (-0.6, 0.15, 0.78)),
                 'scopeEye': ((0, eye_y, sc.z - origin[2]), (0, -1, 0)),
                 # the sight line for the ADS offset runs through the scope: rear and front lens centres
                 'sightRear': ((0, eye_y - 0.078, sc.z - origin[2]), (0, -1, 0)),
                 'sightFront': ((0, eye_y - 0.078 - 0.108, sc.z - origin[2]), (0, -1, 0))}
    w.gripL = (0, -0.265, -0.012)
    meshes = {'body': body, 'bolt': bolt_b, 'boltHandle': bolt_a, 'trigger': trig, 'mag': mag, 'sling': sl}
    root = A.assemble(w, meshes)
    # the turning handle rides on the sliding bolt: re-parent its empty under the bolt empty
    bh = bpy.data.objects['rifleScoped_boltHandle']; bo = bpy.data.objects['rifleScoped_bolt']
    M = bh.matrix_world.copy(); bh.parent = bo; bh.matrix_parent_inverse = Matrix(); bh.matrix_world = M
    hi = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('rifleScoped')]
    log('rifleScoped tris', tris(hi), {o.name: G.tris(o) for o in hi})
    # third-person LOD: one mesh, 512 maps
    small = [('wpn_rifle_glass', mats[0][1]), ('wpn_rifle_acc', material('wpn_rifle_acc_lod', name + '_accesories', '512')),
             ('wpn_rifle_main', material('wpn_rifle_main_lod', name, '512'))]
    lw = W('rifleScopedLod')
    lb = lod_copy([o for o in hi if 'sling' not in o.name and 'trigger' not in o.name], 'lodbody', 0.16, small)
    lw.pivots = {}; lw.empties = dict(w.empties); lw.gripL = w.gripL
    lroot = A.assemble(lw, {'body': lb})
    log('rifleScopedLod tris', G.tris(lb))
    A.export(os.path.join(OUT, 'rifle_scan.glb'), [root, lroot])
    meta = {'muzzle_y': muz_y, 'eye_y': eye_y, 'eye_z': sc.z - origin[2], 'tris': tris(hi), 'lod': G.tris(lb)}
    log('META', meta)

def build_pistol():
    reset()
    obs = import_set('service_pistol')
    n = 'service_pistol'
    keep = {n + '_pistol_a': 'body', n + '_slide_a': 'bolt', n + '_hammer_a': 'hammer', n + '_trigger_a': 'trigger',
            n + '_magazine_loaded': 'mag'}
    for k, o in list(obs.items()):
        if k not in keep: bpy.data.objects.remove(o)
    P = {keep[k]: obs[k] for k in keep}
    # variant a (wooden grips; b has a taped grip) is at the origin, the magazine 0.1 m back beside the gun
    for k, o in P.items():
        o.data.transform(Matrix.Translation((0.1 if k == 'mag' else 0, 0, 0)))
    body, slide = P['body'], P['bolt']
    mx = max(v.co.x for v in body.data.vertices)
    bore, nb = ring_center(body, 'x', lambda c: c.x > mx - 0.003)
    tr = P['trigger']
    tx = sum(v.co.x for v in tr.data.vertices) / len(tr.data.vertices); tz = max(v.co.z for v in tr.data.vertices)
    log('pistol bore z %.4f (n %d) muzzle x %.4f trigger x %.4f top %.4f' % (bore.z, nb, mx, tx, tz))
    mzmin = min(v.co.z for v in P['mag'].data.vertices); bzmin = min(v.co.z for v in body.data.vertices)
    log('pistol mag bottom %.4f grip bottom %.4f' % (mzmin, bzmin))
    origin = (tx - 0.019, 0, bore.z - 0.0185)
    to_frame(list(P.values()), origin)
    decimate(P['mag'], 0.22)
    mats = [('', material('wpn_pistol', n, '2k', arm='1k'))]
    for o in P.values(): set_mats(o, mats)
    w = W('pistol')
    hx = min(v.co.y for v in P['hammer'].data.vertices)
    w.pivots = {'bolt': (0, 0, 0.0185), 'hammer': (0, 0.037, 0.002), 'trigger': (0, 0.0, tz - origin[2]),
                'mag': (0, 0.040, -0.060)}
    muz_y = -(mx - origin[0])
    w.empties = {'muzzle': ((0, muz_y, 0.0185), (0, -1, 0)),
                 'ejection': ((-0.006, -0.02, 0.028), (-0.6, 0.15, 0.78)),
                 'sightRear': ((0, 0.040, 0.0335), (0, -1, 0)), 'sightFront': ((0, -0.130, 0.0335), (0, -1, 0))}
    root = A.assemble(w, P)
    hi = [o for o in bpy.data.objects if o.type == 'MESH']
    log('pistol tris', tris(hi), {o.name: G.tris(o) for o in hi})
    A.export(os.path.join(OUT, 'pistol_scan.glb'), [root])

if __name__ == '__main__':
    which = os.environ.get('ONLY', 'rifle,pistol').split(',')
    if 'rifle' in which: build_rifle()
    if 'pistol' in which: build_pistol()
