# First-person arms: UV atlas and the 2048 texture set (base colour, normal, occlusion-roughness-metal).
# usage: CHARS_WORK=... bvenv/bin/python fp_tex.py      reads $FP_WORK/fp_geo.blend, writes fp_tex.blend + tex/*.png
#
# Cycles bakes only what it is good at: the rest-pose position and normal of every texel (float), the material region
# and ambient occlusion. Everything else is computed per texel in numpy from the 3D position on the arm: skin tone and
# mottling, forearm hair, knuckle wrinkles, palm and finger creases, nails with cuticles and dirt, back-of-hand
# tendons, veins, a healed scar, grime in the creases; the smock's invented brush-stroke camouflage, twill weave,
# fold creases and roll seam; the leather strap with stitching; the steel watch case and its dial. Heights become a
# tangent-space normal map using the texel's own position derivatives, so the bumps keep their real size in metres.
import bpy, sys, os, math, time
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as ML

T0 = time.time()
def log(*a): print('[tex %5.1fs]' % (time.time() - T0), *a, flush=True)
FPW = os.environ.get('FP_WORK') or (ML.WORK + '/fp')
SIZE = int(os.environ.get('SIZE', '2048'))
TD = FPW + '/tex'; os.makedirs(TD, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=FPW + '/fp_geo.blend')
arm = bpy.data.objects['FPRig']; ob = bpy.data.objects['FPArms']
me = ob.data
meta = eval(ob['meta'])

# ---------------------------------------------------------------- UVs: smart projection, hands and forearms larger
def set_active(o):
    for x in bpy.context.view_layer.objects: x.select_set(False)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
set_active(ob)
for uv in list(me.uv_layers): me.uv_layers.remove(uv)
me.uv_layers.new(name='atlas')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(58), island_margin=0.0, area_weight=0.0, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')
# texel density: hands and the bare forearm x1.5, the upper sleeve (rarely seen up close) x0.6
reg = np.zeros(len(me.polygons), int); me.attributes['region'].data.foreach_get('value', reg)
names = {g.index: g.name for g in ob.vertex_groups}
dom = []
for v in me.vertices:
    g = max(v.groups, key=lambda x: x.weight) if v.groups else None
    dom.append(names[g.group] if g else '')
uvd = me.uv_layers['atlas'].data
import bmesh
bm = bmesh.new(); bm.from_mesh(me)
uvl = bm.loops.layers.uv['atlas']
bm.faces.ensure_lookup_table()
# islands by uv connectivity
from collections import defaultdict
parent = list(range(len(bm.faces)))
def find(a):
    while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
    return a
for e in bm.edges:
    lf = e.link_faces
    if len(lf) == 2:
        f0, f1 = lf
        ok = True
        for v in e.verts:
            u0 = [l[uvl].uv for l in f0.loops if l.vert == v][0]; u1 = [l[uvl].uv for l in f1.loops if l.vert == v][0]
            if (u0 - u1).length > 1e-6: ok = False
        if ok: parent[find(f0.index)] = find(f1.index)
isl = defaultdict(list)
for f in bm.faces: isl[find(f.index)].append(f)
for fs in isl.values():
    hand = sum(1 for f in fs for v in f.verts if dom[v.index].startswith(('hand', 'index', 'middle', 'ring', 'pinky', 'thumb', 'lowerarm')))
    tot = sum(len(f.verts) for f in fs)
    r = reg[fs[0].index]
    sc = 1.5 if (r == 0 and hand > tot * 0.5) else (1.4 if r in (3, 4, 5) else (0.6 if r == 1 and sum(f.calc_center_median().y for f in fs) / len(fs) < -0.02 else 1.0))
    if sc == 1.0: continue
    c = sum((l[uvl].uv for f in fs for l in f.loops), Vector((0, 0))) / sum(len(f.loops) for f in fs)
    for f in fs:
        for l in f.loops: l[uvl].uv = c + (l[uvl].uv - c) * sc
bm.to_mesh(me); bm.free()
set_active(ob)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
log('uv packed, islands', len(isl))

# ---------------------------------------------------------------- bakes
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ.get('BAKE_THREADS', '2'))
mat = bpy.data.materials.new('fp_arms'); me.materials.clear(); me.materials.append(mat)
nt = mat.node_tree; N = nt.nodes; Lk = nt.links
for n in list(N): N.remove(n)
out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); Lk.new(em.outputs[0], out.inputs['Surface'])
geo = N.new('ShaderNodeNewGeometry'); att = N.new('ShaderNodeAttribute'); att.attribute_name = 'region'; att.attribute_type = 'GEOMETRY'
tex = N.new('ShaderNodeTexImage'); nt.nodes.active = tex

def bake_emit(src, name, margin=24, samples=1):
    img = bpy.data.images.new(name, SIZE, SIZE, alpha=True, float_buffer=True); img.colorspace_settings.name = 'Non-Color'
    tex.image = img; nt.nodes.active = tex
    for l in list(em.inputs[0].links): Lk.remove(l)
    if src is not None: Lk.new(src, em.inputs[0])
    else: em.inputs[0].default_value = (1, 1, 1, 1)
    sc.cycles.samples = samples
    set_active(ob)
    bpy.ops.object.bake(type='EMIT', margin=margin, use_clear=True)
    a = np.array(img.pixels[:], dtype=np.float32).reshape(SIZE, SIZE, 4)
    return a

POS = bake_emit(geo.outputs['Position'], 'pos')[..., :3]
NRM = bake_emit(geo.outputs['Normal'], 'nrm')[..., :3]
REG = bake_emit(att.outputs['Fac'], 'reg', margin=24)[..., 0]
MASK = bake_emit(None, 'mask', margin=0)[..., 0] > 0.5
log('baked attributes, coverage %.1f%%' % (MASK.mean() * 100))
# ambient occlusion (rest pose; arms only)
img = bpy.data.images.new('ao', SIZE, SIZE, alpha=False, float_buffer=True); img.colorspace_settings.name = 'Non-Color'
tex.image = img; nt.nodes.active = tex
sc.cycles.samples = int(os.environ.get('AO_SAMPLES', '48'))
sc.world = bpy.data.worlds.new('w') if sc.world is None else sc.world
bpy.ops.object.bake(type='AO', margin=24, use_clear=True)
AO = np.array(img.pixels[:], dtype=np.float32).reshape(SIZE, SIZE, 4)[..., 0]
log('baked AO')

# ---------------------------------------------------------------- procedural fields in numpy
H, Wd = SIZE, SIZE
P = POS.reshape(-1, 3).astype(np.float64); Nn = NRM.reshape(-1, 3).astype(np.float64)
Nn /= np.maximum(1e-6, np.linalg.norm(Nn, axis=1, keepdims=True))
R = np.rint(REG.reshape(-1)).astype(int)
npx = len(P)
rng = np.random.default_rng(7)

def hash3(ix, iy, iz, seed=0):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0xFFFFFF)

def vnoise(X, scale, seed=0):
    """Smooth 3D value noise in [-1, 1] at the given feature size (m)."""
    Q = X / scale
    i = np.floor(Q).astype(np.int64); f = Q - i
    u = f * f * (3 - 2 * f)
    out = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[:, 0] if dx else 1 - u[:, 0]) * (u[:, 1] if dy else 1 - u[:, 1]) * (u[:, 2] if dz else 1 - u[:, 2])
                out = out + w * hash3(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, seed)
    return out * 2 - 1

def fbm(X, scale, oct=4, seed=0, gain=0.5):
    s, a, t = scale, 1.0, 0.0
    tot = 0.0
    for o in range(oct):
        t = t + a * vnoise(X, s, seed + o * 17); tot += a
        s *= 0.5; a *= gain
    return t / tot

def seg_dist(X, a, b):
    ab = b - a; L2 = max(1e-12, ab.dot(ab))
    t = np.clip(((X - a) @ ab) / L2, 0, 1)
    Q = a + t[:, None] * ab
    return np.linalg.norm(X - Q, axis=1), t

def smooth01(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
def lin(c): c = np.asarray(c, float); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

# rest-pose bones (armature space = first-person space)
B = {b.name: (Vector(b.head_local), Vector(b.tail_local)) for b in arm.data.bones}
def bvec(n): h, t = B[n]; return np.array(h[:]), np.array(t[:])

ALB = np.zeros((npx, 3)); HGT = np.zeros(npx); RGH = np.full(npx, 0.6); MET = np.zeros(npx); AOM = np.ones(npx)

# ======================================================================= skin
sk = np.where(R == 0)[0]
X = P[sk]; Nk = Nn[sk]
side = np.where(X[:, 0] > 0, 'r', 'l')
# nearest bone among forearm, hand and fingers of the texel's side
bones = ['lowerarm', 'hand'] + ['%s_0%d' % (f, i) for f in ('index', 'middle', 'ring', 'pinky', 'thumb') for i in (1, 2, 3)]
best = np.full(len(X), 1e9); bid = np.zeros(len(X), int); btt = np.zeros(len(X))
for k, bn in enumerate(bones):
    for s in ('l', 'r'):
        m = side == s
        a, b = bvec(bn + '_' + s)
        if bn.startswith(('index', 'middle', 'ring', 'pinky')) and bn.endswith('03'):
            b = b + (b - a) * 0.15
        d, t = seg_dist(X[m], a, b)
        if bn == 'lowerarm': d = d * 0.6       # the forearm is thick: prefer it near its own surface
        upd = d < best[m]
        idx = np.where(m)[0][upd]
        best[idx] = d[upd]; bid[idx] = k; btt[idx] = t[upd]
bname = np.array(bones)[bid]
# dorsal direction per texel: the hand's back is +Z in the T-pose (palms down)
dors = Nk[:, 2]                       # +1 back of hand / top of fingers, -1 palm
is_hand = np.isin(bid, [1])
is_finger = bid >= 2
is_fore = bid == 0
fore_t = np.zeros(len(X))
for s, sg in (('l', -1.0), ('r', 1.0)):
    m = side == s
    a, b = bvec('lowerarm_' + s)
    _, t = seg_dist(X[m], a, b); fore_t[m] = t
log('skin texels', len(X))

# --- base tone: weathered, tanned forearms, paler palms, warm knuckles and fingertips
tan = lin([0.70, 0.51, 0.40]); pale = lin([0.84, 0.66, 0.56]); red = lin([0.70, 0.40, 0.33])
palm_w = smooth01((-dors - 0.1) / 0.6) * np.where(np.isin(bid, [0]), 0.35, 1.0)   # inner forearm only a little paler
alb = tan * (1 - palm_w[:, None]) + pale * palm_w[:, None]
mott = fbm(X, 0.02, 4, 1) * 0.07 + fbm(X, 0.004, 3, 2) * 0.04
alb *= (1 + mott)[:, None]
# redness: knuckles (finger joints, dorsal), fingertips, palm heel
rednessmask = np.zeros(len(X))
joint_d = np.full(len(X), 1.0)       # distance along the finger to the nearest finger joint (m)
joint_dist3 = np.full(len(X), 1.0)
for f in ('index', 'middle', 'ring', 'pinky', 'thumb'):
    for i in (1, 2, 3):
        for s in ('l', 'r'):
            a, b = bvec('%s_0%d_%s' % (f, i, s))
            m = (side == s)
            ax = (b - a) / np.linalg.norm(b - a)
            dj = (X[m] - a) @ ax
            r3 = np.linalg.norm(X[m] - a, axis=1)
            idx = np.where(m)[0]
            upd = r3 < joint_dist3[idx]
            joint_dist3[idx[upd]] = r3[upd]; joint_d[idx[upd]] = dj[upd]
knuck = np.exp(-(joint_dist3 / 0.011) ** 2) * smooth01(dors / 0.5 + 0.2)
tip = np.zeros(len(X))
for f in ('index', 'middle', 'ring', 'pinky', 'thumb'):
    for s in ('l', 'r'):
        a, b = bvec('%s_03_%s' % (f, s)); m = side == s
        tip[m] = np.maximum(tip[m], np.exp(-(np.linalg.norm(X[m] - b, axis=1) / 0.012) ** 2))
rednessmask = np.clip(knuck * 0.55 + tip * 0.5, 0, 1)
alb = alb * (1 - rednessmask[:, None] * 0.35) + red * rednessmask[:, None] * 0.35
# sun: the back of the forearm darker than its inner side
alb *= (1 - 0.12 * smooth01((dors + 0.2) / 0.8) * is_fore)[:, None]
hgt = np.zeros(len(X))
# --- pores / fine skin
hgt += fbm(X, 0.0011, 2, 5) * 0.00004 + fbm(X, 0.0035, 2, 6) * 0.00003
# --- knuckle wrinkles: bands across the finger on the back of each finger joint
fin_dors = smooth01((dors - 0.05) / 0.5)
for lam, amp, w in ((0.0017, 0.00011, 0.0052), (0.0011, 0.00005, 0.0035)):
    ph = joint_d / lam * 2 * math.pi + fbm(X, 0.003, 2, 9) * 2.5
    hgt -= amp * np.exp(-(joint_d / w) ** 2) * (0.5 + 0.5 * np.cos(ph)) * fin_dors * (joint_dist3 < 0.02)
# --- palmar flexion creases at the finger joints, and the three palm lines
palmar = smooth01((-dors - 0.15) / 0.5)
hgt -= 0.00028 * np.exp(-(joint_d / 0.0009) ** 2) * palmar * (joint_dist3 < 0.016)
for s in ('l', 'r'):
    m = (side == s) & is_hand
    if not m.any(): continue
    hh, ht = bvec('hand_' + s)
    ih, _ = bvec('index_01_' + s); ph_, _ = bvec('pinky_01_' + s)
    ax = (ht - hh) / np.linalg.norm(ht - hh)                       # wrist -> knuckles
    across = (ih - ph_) / np.linalg.norm(ih - ph_)                  # pinky -> index
    Lh = np.linalg.norm(ih - hh)
    u = ((X[m] - hh) @ across) / 0.045                              # -1 pinky side .. +1 index side
    v = ((X[m] - hh) @ ax) / Lh                                     # 0 wrist .. 1 knuckles
    lines = 0
    for v0, v1, sl, amp in ((0.72, 0.62, 1.0, 0.00032), (0.58, 0.45, 1.0, 0.00028), (0.25, 0.5, -1.0, 0.0003)):
        # each crease is a gentle curve v(u)
        cv = v0 + (v1 - v0) * (u * sl + 1) / 2 + 0.05 * np.sin(u * 2.2)
        d = (v - cv) * Lh
        lines = lines - amp * np.exp(-(d / 0.0008) ** 2) * (np.abs(u) < 1.0)
    hgt[np.where(m)[0]] += lines * palmar[m]
# --- nails: plate on the back of each distal phalanx, cuticle groove, free edge, dirt beneath
nail = np.zeros(len(X)); nail_edge = np.zeros(len(X)); lunula = np.zeros(len(X))
for f in ('index', 'middle', 'ring', 'pinky', 'thumb'):
    for s in ('l', 'r'):
        a, b = bvec('%s_03_%s' % (f, s)); m = (side == s)
        ax = (b - a); Lb = np.linalg.norm(ax); ax = ax / Lb
        q = X[m] - a
        t = (q @ ax) / Lb
        rad = q - np.outer(q @ ax, ax)
        lat = np.linalg.norm(rad - np.outer(rad @ np.array([0, 0, 1.0]), [0, 0, 1.0]), axis=1)
        top = Nk[m, 2]
        w = 0.0062 if f != 'thumb' else 0.0072
        inside = smooth01((top - 0.35) / 0.25) * smooth01((w - lat) / 0.0012) * smooth01((t - 0.30) / 0.06) * smooth01((1.22 - t) / 0.05)
        idx = np.where(m)[0]
        nail[idx] = np.maximum(nail[idx], inside)
        nail_edge[idx] = np.maximum(nail_edge[idx], inside * smooth01((t - 1.0) / 0.1))
        lunula[idx] = np.maximum(lunula[idx], inside * smooth01((0.42 - t) / 0.08))
hgt += nail * 0.00032 - 0.00012 * np.exp(-((nail - 0.5) / 0.25) ** 2) * (nail > 0.02)
nail_col = lin([0.80, 0.60, 0.55])
alb = alb * (1 - nail[:, None]) + nail_col * nail[:, None]
alb = alb + (lin([0.93, 0.88, 0.82]) - alb) * (nail_edge * 0.8)[:, None]
alb = alb + (lin([0.90, 0.80, 0.78]) - alb) * (lunula * 0.4)[:, None]
dirt_tip = nail_edge * 0.0 + tip * smooth01((-dors + 0.2) / 0.6) * 0.0
# --- tendons on the back of the hand: ridges from each knuckle to the wrist
for s in ('l', 'r'):
    m = (side == s) & (is_hand | (is_fore & (fore_t > 0.85)))
    if not m.any(): continue
    hh, _ = bvec('hand_' + s)
    ten = np.zeros(m.sum())
    for f in ('index', 'middle', 'ring', 'pinky'):
        k0, _ = bvec('%s_01_%s' % (f, s))
        d, t = seg_dist(X[m], hh + (k0 - hh) * 0.08, k0 - (k0 - hh) * 0.06)
        ten = np.maximum(ten, np.exp(-(d / 0.0028) ** 2) * smooth01(t / 0.2) * smooth01((1 - t) / 0.25))
    hgt[np.where(m)[0]] += 0.00055 * ten * smooth01((dors[m] - 0.3) / 0.4)
# --- veins: wandering raised lines from the back of the hand up the forearm (rest pose, along the arm axis X)
vein = np.zeros(len(X))
for s, sg in (('l', -1.0), ('r', 1.0)):
    m = side == s
    a, b = bvec('lowerarm_' + s); hh, _ = bvec('hand_' + s); k0, _ = bvec('middle_01_' + s)
    for vi in range(6):
        r2 = np.random.default_rng(31 + vi + (0 if s == 'l' else 50))
        # a vein path: from between the knuckles through the wrist, up the forearm, drifting around the arm
        pts = []
        start = hh + (k0 - hh) * (0.55 + 0.1 * r2.random()) + np.array([0, (r2.random() - 0.5) * 0.04, 0.0])
        n_ = 36
        ang0 = (r2.random() - 0.5) * 1.6 + (math.pi if vi >= 4 else 0.0)   # two on the inner forearm
        for i in range(n_):
            u = i / (n_ - 1)
            c = start + (a + (b - a) * 0.25 - start) * u
            ang = ang0 + 0.5 * math.sin(u * 7 + vi) + (r2.random() - 0.5) * 0.15
            rr = 0.0 if u < 0.15 else 1.0
            pts.append(c + np.array([0, math.sin(ang), math.cos(ang)]) * 0.06 * rr)
        pts = np.array(pts)
        # project each path point onto the skin: the nearest skin texel of this side
        Xm = X[m]
        for i in range(len(pts)):
            j = np.argmin(np.sum((Xm[::25] - pts[i]) ** 2, 1)) * 25
            pts[i] = Xm[j]
        for i in range(len(pts) - 1):
            d, t = seg_dist(Xm, pts[i], pts[i + 1])
            wv = 0.0018 + 0.0006 * math.sin(i * 0.7 + vi)
            vein[np.where(m)[0]] = np.maximum(vein[np.where(m)[0]], np.exp(-(d / wv) ** 2) * (0.6 + 0.4 * math.sin(i * 0.37 + vi * 2)))
vein *= np.where(is_fore, 0.75 + 0.25 * smooth01((dors + 0.2) / 0.6), smooth01((dors + 0.2) / 0.6) * is_hand)
hgt += vein * 0.00045
alb = alb * (1 - vein[:, None] * 0.10) + lin([0.42, 0.40, 0.45]) * (vein[:, None] * 0.10)
# --- forearm hair: fine dark strands along the arm on the back and outer side, thin on the back of the hand
hair = np.zeros(len(X))
for s in ('l', 'r'):
    m = (side == s) & (is_fore | is_hand)
    a, b = bvec('lowerarm_' + s)
    ax = (b - a) / np.linalg.norm(b - a)
    q = X[m] - a
    sl = q @ ax
    rad = q - np.outer(sl, ax)
    th = np.arctan2(rad[:, 1], rad[:, 2])
    arc = th * 0.035
    for layer in range(3):
        cu = sl / 0.0055 + layer * 0.37; cv = arc / 0.0011 + layer * 0.61
        iu = np.floor(cu).astype(np.int64); iv = np.floor(cv).astype(np.int64)
        fu = cu - iu; fv = cv - iv
        jit = hash3(iu, iv, np.full_like(iu, layer), 3)
        on = hash3(iu, iv, np.full_like(iu, layer), 4) < 0.55
        # strand: a thin line across the cell, slightly slanted
        dv = np.abs(fv - (0.2 + 0.6 * jit) - (fu - 0.5) * 0.35)
        strand = np.exp(-(dv / 0.12) ** 2) * smooth01(fu / 0.15) * smooth01((1 - fu) / 0.15) * on
        hair[np.where(m)[0]] = np.maximum(hair[np.where(m)[0]], strand)
hairmask = (0.35 + 0.65 * smooth01((dors + 0.35) / 0.5)) * is_fore * smooth01((fore_t - 0.35) / 0.15) + smooth01((dors + 0.35) / 0.5) * is_hand * 0.35
hair *= hairmask
alb = alb * (1 - hair[:, None] * 0.55) + lin([0.16, 0.11, 0.07]) * (hair[:, None] * 0.55)
hgt += hair * 0.00004
# --- healed scar: a pale raised line across the back of the right forearm, and a small nick on the left hand
scar = np.zeros(len(X))
for s, f0, f1, dz, w in (('r', 0.55, 0.78, 0.6, 0.0016), ('l', 0.0, 0.0, 0.0, 0.0)):
    if w == 0: continue
    a, b = bvec('lowerarm_' + s)
    p0 = a + (b - a) * f0 + np.array([0, -0.020, 0.030]); p1 = a + (b - a) * f1 + np.array([0, 0.012, 0.036])
    m = side == s
    d, t = seg_dist(X[m], p0, p1)
    ww = w * (0.5 + 0.5 * np.sin(np.pi * t))
    sc_ = np.exp(-(d / np.maximum(ww, 1e-4)) ** 2) * smooth01((dors[m] - 0.0) / 0.4)
    scar[np.where(m)[0]] = sc_
hh, _ = bvec('hand_l'); k0, _ = bvec('index_01_l')
d, t = seg_dist(X, hh + (k0 - hh) * 0.5 + np.array([0, 0.01, 0.02]), hh + (k0 - hh) * 0.75 + np.array([0, 0.016, 0.022]))
scar = np.maximum(scar, np.exp(-(d / 0.0011) ** 2) * (side == 'l') * smooth01(dors / 0.4) * 0.8)
hgt += scar * 0.00028
alb = alb * (1 - scar[:, None] * 0.45) + lin([0.80, 0.62, 0.58]) * (scar[:, None] * 0.45)
hair *= (1 - scar)
# --- grime: dirt in creases (cavities), on the knuckles, palm heel and under the nail tips; a few mud specks
cav = np.clip(-hgt / 0.00025, 0, 1)
grime = np.clip(0.35 * fbm(X, 0.03, 3, 21) + 0.25, 0, 1) * 0.35
grime += knuck * 0.25 + tip * smooth01((-dors) / 0.5) * 0.25
grime += nail_edge * 0.7
grime += cav * 0.55
specks = (fbm(X, 0.0016, 2, 33) > 0.62) * smooth01((dors + 0.2) / 0.5) * 0.6
grime = np.clip(grime + specks, 0, 1)
dirt = lin([0.20, 0.15, 0.10])
alb = alb * (1 - grime[:, None] * 0.55) + dirt * (grime[:, None] * 0.55)
rgh = 0.52 + 0.08 * fbm(X, 0.01, 3, 41) - 0.10 * palm_w * 0 - 0.08 * smooth01((dors - 0.2) / 0.5) * is_hand
rgh = rgh + grime * 0.15 - scar * 0.12
rgh = rgh * (1 - nail) + 0.28 * nail
ALB[sk] = alb; HGT[sk] = hgt; RGH[sk] = rgh
log('skin done')

# ======================================================================= smock sleeve and roll (regions 1, 2)
cl = np.where((R == 1) | (R == 2))[0]
X = P[cl]; Nc = Nn[cl]; rc = R[cl]
side = np.where(X[:, 0] > 0, 'r', 'l')
# cylinder coordinates along each arm (upper arm + forearm chained)
s_al = np.zeros(len(X)); arcp = np.zeros(len(X)); fore = np.zeros(len(X))
for s in ('l', 'r'):
    m = side == s
    ua, ub = bvec('upperarm_' + s); la, lb = bvec('lowerarm_' + s)
    d1, t1 = seg_dist(X[m], ua, ub); d2, t2 = seg_dist(X[m], la, lb)
    on_fore = d2 < d1
    Lu = np.linalg.norm(ub - ua)
    sl = np.where(on_fore, Lu + t2 * np.linalg.norm(lb - la), t1 * Lu)
    axs = np.where(on_fore[:, None], (lb - la) / np.linalg.norm(lb - la), (ub - ua) / Lu)
    q = X[m] - np.where(on_fore[:, None], la, ua)
    rad = q - np.sum(q * axs, 1)[:, None] * axs
    th = np.arctan2(rad[:, 1], rad[:, 2])
    s_al[m] = sl; arcp[m] = th * 0.045; fore[m] = np.where(on_fore, t2, -1)
U2 = np.stack([s_al, arcp, np.zeros(len(X))], 1)
# invented camouflage: soft brush strokes, elongated around the arm, three colours over a sand base
base = lin([0.55, 0.50, 0.37])
c_brown = lin([0.36, 0.27, 0.18]); c_green = lin([0.33, 0.36, 0.24]); c_dark = lin([0.20, 0.19, 0.15])
alb = np.tile(base, (len(X), 1))
for col, seed, thr, sx, sy in ((c_green, 51, 0.12, 0.05, 0.11), (c_brown, 52, 0.18, 0.04, 0.09), (c_dark, 53, 0.42, 0.03, 0.07)):
    Q = np.stack([s_al / sx, arcp / sy * 0.02 / 0.02, np.full(len(X), seed * 0.1)], 1) * 0.02
    nfield = fbm(Q, 0.02, 4, seed) + 0.25 * fbm(U2 * np.array([1, 3, 1]), 0.006, 2, seed + 7)
    edge = smooth01((nfield - thr) / 0.06)
    alb = alb * (1 - edge[:, None] * 0.85) + col * (edge[:, None] * 0.85)
# weave: a heavy twill, diagonal ribs about 1.4 mm apart, with thread-level noise
tw = (s_al + arcp * 0.9) / 0.0014 * 2 * math.pi
hgt = 0.00006 * np.sin(tw) + fbm(U2 * np.array([1, 1, 1]), 0.0007, 2, 61) * 0.00003
# folds: soft compression creases ringing the arm near the roll and in the elbow pit (normal-map scale)
fold = np.sin(s_al / 0.016 * 2 * math.pi + 2.0 * np.sin(arcp / 0.03) + 0.6 * fbm(U2, 0.02, 2, 63) * 6)
hgt += 0.0005 * fold * smooth01((fore + 0.4) / 0.5) * (rc == 1)
# roll: two turns of cloth with a stitched hem along the lower turn and worn, lighter crests
roll_u = np.zeros(len(X))
for s in ('l', 'r'):
    m = (side == s) & (rc == 2)
    la, lb = bvec('lowerarm_' + s)
    _, t = seg_dist(X[m], la, lb)
    roll_u[m] = (t - 0.30) / 0.20
crest = np.abs(np.sin(roll_u * 2 * math.pi)) * (rc == 2)
hgt += 0.0004 * crest
seam = (rc == 2) * np.exp(-((roll_u - 0.08) / 0.012) ** 2)
stitch = seam * (np.sin(arcp / 0.0032 * 2 * math.pi) > 0.2)
hgt -= 0.00012 * seam; hgt += 0.00008 * stitch
alb = alb * (1 + 0.12 * crest[:, None]) * (1 - 0.15 * seam[:, None])
alb = alb + (lin([0.62, 0.58, 0.46]) - alb) * (stitch[:, None] * 0.5)
# wear and grime: darker in creases and the inside of the roll, dust on the crests, sweat at the cuff
g = np.clip(0.4 * fbm(X, 0.04, 3, 71) + 0.2, 0, 1) * 0.4 + np.clip(-fold, 0, 1) * 0.15 * (rc == 1)
alb = alb * (1 - g[:, None] * 0.45) + lin([0.25, 0.20, 0.14]) * (g[:, None] * 0.45)
alb = alb * (1 + 0.05 * fbm(U2, 0.0025, 2, 73))[:, None]
ALB[cl] = alb; HGT[cl] = hgt; RGH[cl] = 0.86 + 0.06 * fbm(X, 0.02, 2, 75)
log('cloth done')

# ======================================================================= strap, watch case, dial (regions 3, 4, 5)
wc = Vector(meta['watch_centre']); wcn = np.array(wc[:])
st = np.where(R == 3)[0]
X = P[st]
q = X - wcn
along = q[:, 0] if False else None
# strap coordinates: across the strap = along the forearm (X in rest), around = angle about the forearm
la, lb = bvec('lowerarm_l')
ax = (lb - la) / np.linalg.norm(lb - la)
sl = (X - wcn) @ ax
rad = (X - wcn) - np.outer(sl, ax)
th = np.arctan2(rad[:, 1], rad[:, 2])
leather = lin([0.20, 0.12, 0.07])
edge = np.exp(-((np.abs(sl) - 0.0072) / 0.0007) ** 2)
stitch = edge * (np.sin(th * 0.024 / 0.0025 * 2 * math.pi) > 0.3)
holes = ((np.abs(sl) < 0.0012) & (np.abs(((th * 0.024) % 0.007) - 0.0035) < 0.0011) & (np.abs(th) > 1.2)).astype(float)
hgt = fbm(X, 0.0012, 2, 81) * 0.00004 - 0.00015 * holes + 0.00006 * stitch - 0.0001 * np.exp(-((np.abs(sl) - 0.0086) / 0.0005) ** 2)
alb = np.tile(leather, (len(X), 1)) * (1 + 0.15 * fbm(X, 0.004, 3, 83))[:, None]
alb = alb * (1 - holes[:, None] * 0.7) + lin([0.55, 0.47, 0.36]) * (stitch[:, None] * 0.6)
wear = smooth01((np.abs(sl) - 0.006) / 0.003) * 0.4
alb = alb + (lin([0.36, 0.26, 0.17]) - alb) * wear[:, None]
ALB[st] = alb; HGT[st] = hgt; RGH[st] = 0.55 - 0.15 * wear + 0.05 * fbm(X, 0.005, 2, 85)
cs = np.where(R == 4)[0]
X = P[cs]
steel = lin([0.62, 0.62, 0.60])
scr = np.clip(fbm(X, 0.0008, 2, 91) * 2 - 0.6, 0, 1)
ALB[cs] = steel * (0.85 + 0.15 * fbm(X, 0.003, 2, 93))[:, None]
RGH[cs] = 0.32 + 0.25 * scr + 0.1 * fbm(X, 0.004, 2, 95); MET[cs] = 1.0
HGT[cs] = scr * 0.00002
dl = np.where(R == 5)[0]
X = P[dl]
q = X - wcn
q[:, :2] = -q[:, :2]                          # 12 o'clock toward -Y, so the crown (3 o'clock) points at the hand
r = np.linalg.norm(q[:, :2], axis=1)
ang = np.arctan2(q[:, 0], q[:, 1])
dialc = lin([0.05, 0.05, 0.05])
lum = lin([0.85, 0.82, 0.70])
mark = np.zeros(len(X))
for h in range(12):
    a0 = h / 12 * 2 * math.pi
    da = np.abs((ang - a0 + math.pi) % (2 * math.pi) - math.pi) * r
    big = h % 3 == 0
    mark = np.maximum(mark, (da < (0.0009 if big else 0.0005)) * (r > 0.0085) * (r < (0.0118 if big else 0.0112)))
def hand_(a0, length, width):
    dirv = np.array([math.sin(a0), math.cos(a0)])
    t = q[:, :2] @ dirv
    perp = np.abs(q[:, 0] * dirv[1] - q[:, 1] * dirv[0])
    return ((t > -0.001) & (t < length) & (perp < width * (1 - 0.6 * np.clip(t / length, 0, 1)))).astype(float)
hands = np.maximum(hand_(2 * math.pi * 10.2 / 12, 0.0072, 0.0009), hand_(2 * math.pi * 0.35, 0.0102, 0.0007))
alb = np.tile(dialc, (len(X), 1))
alb = alb * (1 - np.maximum(mark, hands)[:, None]) + lum * np.maximum(mark, hands)[:, None]
ALB[dl] = alb * 0.85; RGH[dl] = 0.06; MET[dl] = 0.0; HGT[dl] = 0.0
log('watch done')

# ======================================================================= normal map from heights
HGTi = HGT.reshape(H, Wd); Pimg = P.reshape(H, Wd, 3); Nimg = Nn.reshape(H, Wd, 3)
def grad(a, axis):
    return (np.roll(a, -1, axis) - np.roll(a, 1, axis)) * 0.5
dPu = grad(Pimg, 1); dPv = grad(Pimg, 0)          # pixel rows run up the image (Blender pixel order)
dHu = grad(HGTi, 1); dHv = grad(HGTi, 0)
lu = np.linalg.norm(dPu, axis=2); lv = np.linalg.norm(dPv, axis=2)
ok = (lu > 1e-7) & (lv > 1e-7) & (lu < 0.01) & (lv < 0.01)
Tn = dPu / np.maximum(lu, 1e-9)[..., None]; Bn = dPv / np.maximum(lv, 1e-9)[..., None]
Tn = Tn - Nimg * np.sum(Tn * Nimg, 2)[..., None]; Tn /= np.maximum(1e-9, np.linalg.norm(Tn, axis=2))[..., None]
Bn = Bn - Nimg * np.sum(Bn * Nimg, 2)[..., None] - Tn * np.sum(Bn * Tn, 2)[..., None]; Bn /= np.maximum(1e-9, np.linalg.norm(Bn, axis=2))[..., None]
gu = np.where(ok, dHu / np.maximum(lu, 1e-9), 0); gv = np.where(ok, dHv / np.maximum(lv, 1e-9), 0)
gu = np.clip(gu, -1.5, 1.5); gv = np.clip(gv, -1.5, 1.5)
# handedness: B must be N x T for a right-handed tangent frame; if the island is mirrored, flip the v slope sign
hand_sign = np.sign(np.sum(np.cross(Nimg, Tn) * Bn, 2)); hand_sign[hand_sign == 0] = 1
nx = -gu; ny = -gv * hand_sign; nz_ = np.ones_like(nx)
ln = np.sqrt(nx * nx + ny * ny + nz_ * nz_)
NOR = np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz_ / ln * 0.5 + 0.5], 2)

# ======================================================================= write
def to_srgb(c):
    c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
def save(arr, name, srgb):
    img = bpy.data.images.new(name, Wd, H, alpha=False)
    a = np.ones((H, Wd, 4), np.float32); a[..., :3] = arr
    img.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    img.pixels.foreach_set(a.ravel()); img.update()
    img.filepath_raw = TD + '/' + name + '.png'; img.file_format = 'PNG'; img.save()
    return img
ao = np.clip(AO.reshape(-1) * 0.7 + 0.3, 0, 1)
ALBi = to_srgb(ALB.reshape(H, Wd, 3))
ORM = np.stack([ao, np.clip(RGH, 0.04, 1), MET], 1).reshape(H, Wd, 3)
np.savez_compressed(TD + '/fields.npz', alb=ALBi.astype(np.float32), nor=NOR.astype(np.float32), orm=ORM.astype(np.float32))
i_alb = save(ALBi, 'fp_albedo', True); i_nor = save(NOR, 'fp_normal', False); i_orm = save(ORM, 'fp_orm', False)
log('textures written')

# ---------------------------------------------------------------- final material (glTF: base colour, normal, ORM)
for n in list(N): N.remove(n)
out = N.new('ShaderNodeOutputMaterial'); bs = N.new('ShaderNodeBsdfPrincipled'); Lk.new(bs.outputs[0], out.inputs['Surface'])
ta = N.new('ShaderNodeTexImage'); ta.image = i_alb
tn = N.new('ShaderNodeTexImage'); tn.image = i_nor; tn.image.colorspace_settings.name = 'Non-Color'
to = N.new('ShaderNodeTexImage'); to.image = i_orm; to.image.colorspace_settings.name = 'Non-Color'
nm = N.new('ShaderNodeNormalMap'); sp = N.new('ShaderNodeSeparateColor')
Lk.new(ta.outputs[0], bs.inputs['Base Color']); Lk.new(tn.outputs[0], nm.inputs['Color']); Lk.new(nm.outputs[0], bs.inputs['Normal'])
Lk.new(to.outputs[0], sp.inputs[0]); Lk.new(sp.outputs['Green'], bs.inputs['Roughness']); Lk.new(sp.outputs['Blue'], bs.inputs['Metallic'])
grp = bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
if 'Occlusion' not in [i.name for i in grp.interface.items_tree]:
    grp.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
g = N.new('ShaderNodeGroup'); g.node_tree = grp; Lk.new(sp.outputs['Red'], g.inputs['Occlusion'])
for img in list(bpy.data.images):
    if img.name in ('pos', 'nrm', 'reg', 'mask', 'ao'): bpy.data.images.remove(img)
bpy.ops.wm.save_as_mainfile(filepath=FPW + '/fp_tex.blend')
log('saved fp_tex.blend')
