# Helpers: build a MakeHuman (CC0 data) human in Blender without MPFB code,
# rig it on the Quaternius UAL skeleton (CC0) so UAL clips play unchanged.
import bpy, bmesh, gzip, json, os, math, random
from mathutils import Vector, Matrix, Quaternion

WORK = os.environ.get('CHARS_WORK') or os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/work'
MPFB = WORK + '/dl_mpfb/x/mpfb/data'
MHA = WORK + '/dl_mh/x'
UAL1 = WORK + '/dl_ual/UAL1_Standard.glb'
UAL2 = WORK + '/dl_ual/UAL2_Standard.glb'

def mh2b(x, y, z):  # MakeHuman (dm, Y-up, +Z front) -> Blender (m, Z-up, -Y front)
    return Vector((x * 0.1, -z * 0.1, y * 0.1))

_base = None
def load_base():
    global _base
    if _base: return _base
    V, VT, F = [], [], []
    for ln in open(MPFB + '/3dobjs/base.obj'):
        if ln.startswith('v '):
            V.append([float(a) for a in ln.split()[1:4]])
        elif ln.startswith('vt '):
            VT.append([float(a) for a in ln.split()[1:3]])
        elif ln.startswith('f '):
            parts = [p.split('/') for p in ln.split()[1:]]
            F.append(([int(p[0]) - 1 for p in parts], [int(p[1]) - 1 for p in parts]))
    _base = (V, VT, F)
    return _base

def read_target(path):
    out = []
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as f:
        for ln in f:
            ln = ln.strip()
            if not ln or ln[0] == '#': continue
            a = ln.split()
            out.append((int(a[0]), float(a[1]), float(a[2]), float(a[3])))
    return out

def apply_targets(V, targets):
    V = [list(v) for v in V]
    for rel, w in targets:
        if abs(w) < 1e-6: continue
        p = MPFB + '/targets/' + rel
        if not p.endswith('.gz'): p += '.target.gz'
        for i, dx, dy, dz in read_target(p):
            V[i][0] += dx * w; V[i][1] += dy * w; V[i][2] += dz * w
    return V

def macro_targets(height=0.6, muscle=0.6, weight=0.5, prop=0.7, race='caucasian'):
    t = []
    # muscle blend between average and max (0.5..1)
    mm = max(0.0, (muscle - 0.5) * 2)
    ww = (weight - 0.5) * 2
    wnames = [('averageweight', 1 - abs(ww)), ('maxweight' if ww > 0 else 'minweight', abs(ww))]
    for mname, mw in [('averagemuscle', 1 - mm), ('maxmuscle', mm)]:
        for wname, wgt in wnames:
            if mw * wgt > 0:
                t.append(('macrodetails/universal-male-young-%s-%s' % (mname, wname), mw * wgt))
                h = (height - 0.5) * 2
                if h:
                    t.append(('macrodetails/height/male-young-%s-%s-%s' % (mname, wname, 'maxheight' if h > 0 else 'minheight'), mw * wgt * abs(h)))
                pp = (prop - 0.5) * 2
                if pp:
                    t.append(('macrodetails/proportions/male-young-%s-%s-idealproportions' % (mname, wname), mw * wgt * pp))
    t.append(('macrodetails/%s-male-young' % race, 1.0))
    return t

_groups = None
def vgroups():
    global _groups
    if not _groups:
        _groups = json.load(open(MPFB + '/mesh_metadata/basemesh_vertex_groups.json'))
    return _groups

def group_verts(name):
    out = []
    for a, b in vgroups()[name]:
        out.extend(range(a, b + 1))
    return out

def joint_pos(V, cube):
    idx = group_verts(cube)
    s = Vector()
    for i in idx: s += mh2b(*V[i])
    return s / len(idx)

def make_body_mesh(name, V):
    """Body (no helpers) as a Blender mesh with MH UVs. Returns obj and map newidx->baseidx."""
    _, VT, F = load_base()
    body = set(group_verts('body'))
    used = sorted(body)
    remap = {b: i for i, b in enumerate(used)}
    faces, fuv = [], []
    for fv, ft in F:
        if all(v in body for v in fv):
            faces.append([remap[v] for v in fv]); fuv.append(ft)
    me = bpy.data.meshes.new(name)
    me.from_pydata([mh2b(*V[b]) for b in used], [], faces)
    uv = me.uv_layers.new(name='UVMap')
    k = 0
    for p, ft in zip(me.polygons, fuv):
        for li, t in zip(p.loop_indices, ft):
            uv.data[li].uv = VT[t]
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob, used

def load_obj_simple(path):
    V, VT, F = [], [], []
    for ln in open(path):
        if ln.startswith('v '): V.append([float(a) for a in ln.split()[1:4]])
        elif ln.startswith('vt '): VT.append([float(a) for a in ln.split()[1:3]])
        elif ln.startswith('f '):
            parts = [p.split('/') for p in ln.split()[1:]]
            F.append(([int(p[0]) - 1 for p in parts], [int(p[1]) - 1 if len(p) > 1 and p[1] else 0 for p in parts]))
    return V, VT, F

def fit_mhclo(path, V, name):
    """Fit a MakeHuman proxy (eyes, brows, lashes, hair) to morphed base verts V. Returns obj and refs."""
    d = os.path.dirname(path)
    refs, scales = [], {}
    objf = None
    inverts = False
    for ln in open(path):
        s = ln.strip()
        if not s or s.startswith('#'): continue
        a = s.split()
        if a[0] in ('x_scale', 'y_scale', 'z_scale'):
            scales[a[0][0]] = (int(a[1]), int(a[2]), float(a[3]))
        elif a[0] == 'obj_file':
            objf = a[1]
        elif a[0] == 'verts':
            inverts = True
        elif inverts and a[0][0].isdigit():
            if len(a) == 1:
                refs.append(([int(a[0])], [1.0], (0, 0, 0)))
            else:
                refs.append(([int(a[0]), int(a[1]), int(a[2])], [float(a[3]), float(a[4]), float(a[5])], (float(a[6]), float(a[7]), float(a[8]))))
        elif inverts and not a[0][0].isdigit() and a[0] not in ('verts',):
            if a[0] in ('weights', 'delete_verts'): inverts = False
    def sc(ax):
        if ax not in scales: return 1.0
        i, j, den = scales[ax]
        k = 'xyz'.index(ax)
        return abs(V[i][k] - V[j][k]) / den
    sx, sy, sz = sc('x'), sc('y'), sc('z')
    OV, OVT, OF = load_obj_simple(d + '/' + objf)
    pts = []
    for vi, ws, off in refs:
        p = [0.0, 0.0, 0.0]
        for v, w in zip(vi, ws):
            for k in range(3): p[k] += V[v][k] * w
        p[0] += off[0] * sx; p[1] += off[1] * sy; p[2] += off[2] * sz
        pts.append(mh2b(*p))
    me = bpy.data.meshes.new(name)
    me.from_pydata(pts, [], [f for f, _ in OF])
    uv = me.uv_layers.new(name='UVMap')
    for p, (_, ft) in zip(me.polygons, OF):
        for li, t in zip(p.loop_indices, ft):
            uv.data[li].uv = OVT[t] if OVT else (0, 0)
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob, refs

def set_active(ob):
    for o in bpy.context.scene.objects:
        if o is not None: o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)

def build_mh_armature(V, name='MHRig'):
    rig = json.load(open(MPFB + '/rigs/standard/rig.game_engine.json'))
    arm = bpy.data.armatures.new(name)
    ob = bpy.data.objects.new(name, arm)
    bpy.context.scene.collection.objects.link(ob)
    set_active(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    for bn, d in rig.items():
        eb = arm.edit_bones.new(bn)
        eb.head = joint_pos(V, d['head']['cube_name'])
        if d['tail']['strategy'] == 'CUBE':
            eb.tail = joint_pos(V, d['tail']['cube_name'])
        else:
            s = Vector()
            for i in d['tail']['vertex_indices']: s += mh2b(*V[i])
            eb.tail = s / len(d['tail']['vertex_indices'])
        if (eb.tail - eb.head).length < 1e-4: eb.tail = eb.head + Vector((0, 0, 0.05))
        eb.roll = d['roll']
    for bn, d in rig.items():
        if d['parent']:
            arm.edit_bones[bn].parent = arm.edit_bones[d['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob

_w = None
def mh_weights():
    global _w
    if not _w:
        _w = json.load(open(MPFB + '/rigs/standard/weights.game_engine.json'))['weights']
    return _w

def add_body_weights(ob, used):
    W = mh_weights()
    remap = {b: i for i, b in enumerate(used)}
    for bn, lst in W.items():
        vg = ob.vertex_groups.get(bn) or ob.vertex_groups.new(name=bn)
        for vi, w in lst:
            if vi in remap: vg.add([remap[vi]], w, 'REPLACE')

def add_proxy_weights(ob, refs):
    W = mh_weights()
    per = {}
    for bn, lst in W.items():
        for vi, w in lst:
            per.setdefault(vi, {})[bn] = w
    for pi, (vi, ws, _) in enumerate(refs):
        acc = {}
        for v, w in zip(vi, ws):
            for bn, bw in per.get(v, {}).items():
                acc[bn] = acc.get(bn, 0) + bw * w
        for bn, w in acc.items():
            if w < 1e-4: continue
            vg = ob.vertex_groups.get(bn) or ob.vertex_groups.new(name=bn)
            vg.add([pi], w, 'REPLACE')

def import_ual(path=UAL1):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    for o in new:
        if o.type == 'MESH': bpy.data.objects.remove(o)
    return arm

NAME_MAP = {'Root': 'root', 'head': 'Head'}
def ual_name(mh):
    return NAME_MAP.get(mh, mh)

def repose_to(mhrig, ual, meshes):
    """Pose MH rig so each bone points like the UAL rest bone, then bake into meshes and make it rest."""
    set_active(mhrig)
    bpy.ops.object.mode_set(mode='POSE')
    ub = ual.data.bones
    uw = ual.matrix_world
    order = []
    def walk(b):
        order.append(b.name)
        for c in b.children: walk(c)
    for b in mhrig.data.bones:
        if b.parent is None: walk(b)
    for bn in order:
        un = ual_name(bn)
        if un not in ub or bn == 'Root': continue
        pb = mhrig.pose.bones[bn]
        bpy.context.view_layer.update()
        cur = (pb.tail - pb.head).normalized()
        u = ub[un]
        want = ((uw @ u.tail_local) - (uw @ u.head_local)).normalized()
        q = cur.rotation_difference(want)
        M = pb.matrix.copy()
        h = M.to_translation()
        R = q.to_matrix().to_4x4() @ Matrix(M.to_3x3()).to_4x4()
        R.translation = h
        pb.matrix = R
    bpy.context.view_layer.update()
    # twist forearms so the knuckle line matches UAL (palms down)
    for side in 'lr':
        pb = mhrig.pose.bones['lowerarm_' + side]
        bpy.context.view_layer.update()
        P = mhrig.pose.bones
        cur = (P['pinky_01_' + side].head - P['index_01_' + side].head)
        axis = (pb.tail - pb.head).normalized()
        want = (uw @ ub['pinky_01_' + side].head_local) - (uw @ ub['index_01_' + side].head_local)
        c = (cur - axis * cur.dot(axis)).normalized(); w2 = (want - axis * want.dot(axis)).normalized()
        ang = math.atan2(axis.dot(c.cross(w2)), c.dot(w2))
        M = pb.matrix.copy(); h = M.to_translation()
        R = Quaternion(axis, ang).to_matrix().to_4x4() @ Matrix(M.to_3x3()).to_4x4(); R.translation = h
        pb.matrix = R
        bpy.context.view_layer.update()
        # re-aim hand and fingers after twist
        for bn in ['hand_' + side] + [f + '_0%d_' % i + side for f in ('index', 'middle', 'ring', 'pinky', 'thumb') for i in (1, 2, 3)]:
            pb2 = P[bn]; bpy.context.view_layer.update()
            cur = (pb2.tail - pb2.head).normalized(); u = ub[ual_name(bn)]
            want = ((uw @ u.tail_local) - (uw @ u.head_local)).normalized()
            q = cur.rotation_difference(want)
            M = pb2.matrix.copy(); h = M.to_translation()
            R = q.to_matrix().to_4x4() @ Matrix(M.to_3x3()).to_4x4(); R.translation = h
            pb2.matrix = R
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode='OBJECT')
    for m in meshes:
        mod = m.modifiers.new('arm', 'ARMATURE'); mod.object = mhrig
        set_active(m)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    # posed joint positions
    J = {}
    for pb in mhrig.pose.bones:
        J[pb.name] = (mhrig.matrix_world @ pb.head, mhrig.matrix_world @ pb.tail)
    return J

def make_final_rig(ual, J, name='Armature'):
    """Copy the UAL armature and move its joints to the MH joint positions (orientations unchanged)."""
    ob = ual.copy(); ob.data = ual.data.copy(); ob.name = name; ob.data.name = name
    ob.animation_data_clear()
    bpy.context.scene.collection.objects.link(ob)
    set_active(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ob.data.edit_bones
    inv = ob.matrix_world.inverted()
    info = {}
    for b in eb:
        info[b.name] = (b.head.copy(), b.tail.copy(), b.roll, b.parent.name if b.parent else None, b.use_connect)
    for b in eb: b.use_connect = False
    mh_of = {ual_name(k): k for k in J}
    newhead = {}
    for b in eb:
        if b.name in mh_of:
            newhead[b.name] = inv @ J[mh_of[b.name]][0]
    for b in eb:
        if b.name not in newhead:
            # leaf bones: put at the parent's MH tail
            p = b.parent
            if p is not None and p.name in mh_of:
                newhead[b.name] = inv @ J[mh_of[p.name]][1]
            else:
                newhead[b.name] = b.head.copy()
    for b in eb:
        h0, t0, roll, par, con = info[b.name]
        d = (t0 - h0)
        L0 = d.length
        # new length = distance to a child joint if there is one, else scale old
        kids = [c for c in b.children]
        if kids:
            L = (newhead[kids[0].name] - newhead[b.name]).length
            if b.name == 'root' or L < 1e-3: L = L0
        elif b.name in mh_of:
            L = (J[mh_of[b.name]][1] - J[mh_of[b.name]][0]).length
        else:
            L = L0 * 0.9
        b.head = newhead[b.name]
        b.tail = newhead[b.name] + d.normalized() * max(L, 0.01)
        b.roll = roll
    hr = eb['hand_r']
    w = eb.new('weapon_r')
    w.head = hr.head.copy(); w.tail = hr.tail.copy(); w.roll = hr.roll; w.parent = hr
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob

def bind(meshes, rig):
    for m in meshes:
        for v in list(m.vertex_groups):
            if v.name in NAME_MAP: v.name = NAME_MAP[v.name]
        m.parent = rig
        mod = m.modifiers.new('Armature', 'ARMATURE'); mod.object = rig

def build_human(height=0.5, muscle=0.72, weight=0.45, prop=0.8, face=(), skin='young_caucasian_male',
                brows='eyebrow001', hair='short02', seed=1):
    """Returns dict(rig, body, eyes, brows, lashes, hair, J, skin_png). Body is in UAL T-pose, feet at z=0."""
    import glob
    ual = import_ual(UAL1); ual.name = 'UAL'
    V0, VT, F = load_base()
    V = apply_targets(V0, macro_targets(height, muscle, weight, prop) + list(face))
    body, used = make_body_mesh('Body', V)
    add_body_weights(body, used)
    parts = {'body': body}
    for path, nm in [(MHA + '/eyes/low-poly/low-poly.mhclo', 'eyes'),
                     (MHA + '/eyebrows/%s/%s.mhclo' % (brows, brows), 'brows'),
                     (MHA + '/eyelashes/eyelashes01/eyelashes01.mhclo', 'lashes')] + \
                    ([(MHA + '/hair/%s/%s.mhclo' % (hair, hair), 'hair')] if hair else []):
        ob, refs = fit_mhclo(path, V, nm.capitalize())
        add_proxy_weights(ob, refs)
        parts[nm] = ob
    mh = build_mh_armature(V)
    J = repose_to(mh, ual, list(parts.values()))
    minz = min(v.co.z for v in body.data.vertices)
    for p in parts.values():
        for v in p.data.vertices: v.co.z -= minz
    J = {k: (h - Vector((0, 0, minz)), t - Vector((0, 0, minz))) for k, (h, t) in J.items()}
    rig = make_final_rig(ual, J)
    bpy.data.objects.remove(mh)
    for p in parts.values():
        for v in list(p.vertex_groups):
            if v.name in NAME_MAP: v.name = NAME_MAP[v.name]
    parts['rig'] = rig; parts['ual'] = ual
    parts['J'] = {ual_name(k): v for k, v in J.items()}
    parts['skin_png'] = glob.glob(MHA + '/skins/%s/*.png' % skin)[0]
    parts['brows_png'] = MHA + '/eyebrows/%s/%s.png' % (brows, brows)
    parts['lashes_png'] = MHA + '/eyelashes/eyelashes01/eyelashes01.png'
    parts['hair_png'] = glob.glob(MHA + '/hair/%s/*diffuse*.png' % hair)[0] if hair else None
    parts['eye_png'] = MHA + '/eyes/materials/brown_eye.png'
    return parts
