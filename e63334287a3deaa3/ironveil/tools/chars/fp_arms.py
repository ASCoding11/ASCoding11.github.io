# First-person arms (IVChars.viewmodel): the hero's forearms and hands cut from the same MakeHuman body as hero.glb,
# with the raider smock's sleeves rolled to mid-forearm and a leather-strap wristwatch on the left wrist.
# Stage 'geo' (this file): mesh, sleeves, watch, the first-person skeleton and skin weights -> fp_geo.blend.
# fp_tex.py bakes the 2048 texture set, fp_clips.py authors the clips and exports fp.glb.
#
# First-person space (Blender): the eye at the origin, looking along +Y, up +Z, the player's right is +X.
# (glTF / three.js: the eye at the origin looking down -Z, up +Y, right +X: the camera's own frame.)
import bpy, bmesh, sys, os, math, time
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as L, geo as G, humans as HU

T0 = time.time()
def log(*a): print('[fp %5.1fs]' % (time.time() - T0), *a, flush=True)
OUT = os.environ.get('FP_WORK') or (L.WORK + '/fp')
os.makedirs(OUT, exist_ok=True)

ARM = ('clavicle', 'upperarm', 'lowerarm', 'hand', 'index', 'middle', 'ring', 'pinky', 'thumb')
ROLL = (0.30, 0.50)      # rolled cuff, as fractions of the forearm from the elbow
SLEEVE_END = 0.40        # the sleeve tube runs under the roll to here
CUT = 0.42               # keep the upper arm from this fraction of its length (shoulder = 0)
WATCH = 0.90             # watch strap centre, fraction of the forearm (left arm)

# first-person bones that carry the weapon and props; their rest frame equals the glTF identity frame
WBONES = ['w_root', 'w_bolt', 'w_boltHandle', 'w_mag', 'w_trigger', 'w_hammer', 'w_charging', 'w_prop']
WPARENT = {'w_root': 'fp_root', 'w_bolt': 'w_root', 'w_boltHandle': 'w_bolt', 'w_mag': 'w_root', 'w_trigger': 'w_root',
           'w_hammer': 'w_root', 'w_charging': 'w_root', 'w_prop': 'fp_root'}

def side_bones(s):
    return ['clavicle_' + s, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s] + \
           [('%s_0%d_%s' % (f, i, s)) if i < 4 else ('%s_04_leaf_%s' % (f, s)) for f in ('index', 'middle', 'ring', 'pinky', 'thumb') for i in (1, 2, 3, 4)]

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    H = L.build_human(**HU.HERO)
    body, rig, J = H['body'], H['rig'], H['J']
    eye = sum((v.co for v in H['eyes'].data.vertices), Vector()) / len(H['eyes'].data.vertices)
    log('human built, eye', tuple(round(x, 3) for x in eye))
    names = {vg.index: vg.name for vg in body.vertex_groups}
    me = body.data
    P = np.array([v.co[:] for v in me.vertices])
    n = len(P)
    top = []
    for v in me.vertices:
        g = max(v.groups, key=lambda x: x.weight) if v.groups else None
        top.append(names[g.group] if g else '')
    # per-vertex arm parameters (T-pose: the arms lie along X; left arm +X)
    keep = np.zeros(n, bool); fpar = np.full(n, -1.0); upar = np.full(n, -1.0); side = np.zeros(n)
    for s, sg in (('l', 1.0), ('r', -1.0)):
        S, E, W_ = J['upperarm_' + s][0], J['lowerarm_' + s][0], J['hand_' + s][0]
        lu, lf = abs(E.x - S.x), abs(W_.x - E.x)
        for i in range(n):
            t = top[i]
            if not t.endswith('_' + s) or not t.startswith(ARM): continue
            a = sg * P[i, 0]
            u = (a - sg * S.x) / lu
            f = (a - sg * E.x) / lf
            upar[i], fpar[i] = u, f
            side[i] = sg
            if u >= CUT: keep[i] = True
    # the whole body's surface, for placing the sleeves (their rays must hit skin that is about to be removed)
    full = body.copy(); full.data = body.data.copy(); G.link(full)
    bvh_full = G.bvh_of(full)
    # skin faces: drop those wholly covered by the sleeve (upper arm, elbow and forearm up to the roll's lower part)
    covered = (upar >= 0) & (fpar < ROLL[0] + 0.02)
    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    dead = [f for f in bm.faces if not all(keep[v.index] for v in f.verts) or all(covered[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(me); bm.free()
    # remove now-unused vertices of the rest of the body
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me); bm.free()
    for k in ('eyes', 'brows', 'lashes', 'hair'):
        if H.get(k): bpy.data.objects.remove(H[k])
    skin = body; skin.name = 'Skin'
    log('skin tris', G.tris(skin), 'verts', len(skin.data.vertices))
    # smooth the forearm silhouette: one level of subdivision on the forearm and wrist only (hands keep MakeHuman
    # density, about 3k triangles each, which already models knuckles and finger pads)
    P2 = np.array([v.co[:] for v in skin.data.vertices])
    sub = np.zeros(len(P2), bool)
    for s, sg in (('l', 1.0), ('r', -1.0)):
        E, W_ = J['lowerarm_' + s][0], J['hand_' + s][0]
        a = sg * P2[:, 0]
        sub |= (a > sg * E.x - 0.02) & (a < sg * W_.x + 0.012) & (np.sign(P2[:, 0]) == sg)
    bm = bmesh.new(); bm.from_mesh(skin.data)
    bm.verts.ensure_lookup_table()
    edges = [e for e in bm.edges if all(sub[v.index] for v in e.verts)]
    bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True, smooth=0.5)
    bm.to_mesh(skin.data); bm.free()
    log('skin after forearm subdivision', G.tris(skin))

    bvh = bvh_full
    parts = [skin]
    # ---------------- sleeves and rolls
    for s, sg in (('l', 1.0), ('r', -1.0)):
        S, E, W_ = J['upperarm_' + s][0], J['lowerarm_' + s][0], J['hand_' + s][0]
        lu, lf = (E - S).length, (W_ - E).length
        st = []
        # the sleeve tube: from the cut to under the roll, ~1 cm stations, slack growing toward the elbow
        a0 = CUT * lu
        total = lu - a0 + SLEEVE_END * lf
        ns = max(8, int(total / 0.009))
        for k in range(ns + 1):
            d = a0 + total * k / ns
            if d <= lu:
                c = S.lerp(E, d / lu); ax = (E - S).normalized()
            else:
                c = E.lerp(W_, (d - lu) / lf); ax = (W_ - E).normalized()
            fr = (d - lu) / lf   # forearm fraction (negative on the upper arm)
            slack = 0.010 + 0.006 * math.exp(-((d - lu) / 0.05) ** 2) - 0.003 * max(0.0, fr / SLEEVE_END)
            def off(th, d=d, slack=slack, fr=fr):
                # compression folds above the roll: rings that wander around the arm, deeper on the inside of the elbow
                ph = 2 * math.pi * (d / 0.034) + 1.7 * math.sin(th * 2 + d * 30) + 0.8 * math.sin(th * 3.0 - d * 55)
                env = 0.35 + 0.65 * max(0.0, min(1.0, (fr + 0.35) / 0.6))
                inner = 0.5 + 0.5 * max(0.0, math.cos(th + math.pi / 2 * sg))
                return slack + 0.0042 * env * (0.6 + 0.6 * inner) * (0.5 + 0.5 * math.sin(ph))
            st.append((c, ax, off, Vector((0, 0, 1))))
        sl = G.ring_loft(bvh, st, n=24, name='Sleeve_' + s)
        # the rolled cuff: two visible turns of cloth, tucked to the skin at both ends
        rs = []
        nr = 12
        for k in range(nr + 1):
            u = k / nr
            fr = ROLL[0] + (ROLL[1] - ROLL[0]) * u
            c = E.lerp(W_, fr); ax = (W_ - E).normalized()
            lobes = 0.55 * math.sin(math.pi * u) ** 0.6 + 0.45 * abs(math.sin(2 * math.pi * u)) ** 0.8
            def off(th, u=u, lobes=lobes):
                wob = 0.0012 * math.sin(th * 3 + u * 9) + 0.0008 * math.sin(th * 5 - 2.0)
                return 0.0022 + 0.0105 * lobes + wob
            rs.append((c, ax, off, Vector((0, 0, 1))))
        roll = G.ring_loft(bvh, rs, n=30, name='Roll_' + s)
        parts += [sl, roll]
        log('sleeve', s, G.tris(sl), 'roll', G.tris(roll))
    # ---------------- wristwatch on the left wrist (dorsal side, +Z in the T-pose with palms down)
    E, W_ = J['lowerarm_l'][0], J['hand_l'][0]
    lf = (W_ - E).length; ax = (W_ - E).normalized()
    ws = []
    for k in range(7):
        fr = WATCH - 0.035 + 0.07 * k / 6
        c = E.lerp(W_, fr)
        edge = 1.0 if k in (0, 6) else 0.0
        ws.append((c, ax, 0.0016 + 0.0012 * (1 - edge), Vector((0, 0, 1))))
    strap = G.ring_loft(bvh, ws, n=28, name='Strap')
    G.solidify(strap, 0.0022, offset=1.0)
    c = E.lerp(W_, WATCH)
    hit = bvh.ray_cast(c + Vector((0, 0, 0.08)), Vector((0, 0, -1)), 0.2)
    top = hit[0] + Vector((0, 0, 0.0035))
    # case, bezel, domed crystal: one lathe profile (r, z) from the back up, then the crown
    prof = [(0.0, 0.0), (0.0145, 0.0), (0.0158, 0.0012), (0.0162, 0.0040), (0.0160, 0.0062), (0.0150, 0.0074),
            (0.0146, 0.0080), (0.0140, 0.0086), (0.0128, 0.0088), (0.0125, 0.0089), (0.0100, 0.0094), (0.0060, 0.0098), (0.0, 0.0099)]
    Mc = Matrix.Translation(top)
    case = G.lathe('Case', [(r, z) for r, z in prof], n=28, M=Mc)
    crown = G.lathe('Crown', [(0.0, 0.0), (0.0024, 0.0), (0.0026, 0.0008), (0.0026, 0.0034), (0.0022, 0.0040), (0.0, 0.0041)], n=12,
                    M=Matrix.Translation(top + Vector((0.0158, 0, 0.0042))) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    # lugs: four short bars that hold the strap ends, bevelled
    lugs = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            lg = G.box('Lug', (0.004, 0.0034, 0.003), Matrix.Translation(top + Vector((sx * 0.0145, sy * 0.0068, 0.0018))), bev=0.0009, seg=1)
            lugs.append(lg)
    watch = G.join([case, crown] + lugs, 'Watch')
    parts += [strap, watch]
    log('watch', G.tris(watch), 'strap', G.tris(strap))
    meta = {'watch_centre': list(top), 'watch_axis': [0, 0, 1]}

    # ---------------- weights for everything that is not skin
    for o in parts[1:]:
        G.transfer_weights(o, skin)
    bpy.data.objects.remove(full)
    # forearm twist: move part of each forearm vertex's lowerarm weight to a twist bone, growing toward the wrist
    for o in parts:
        for s, sg in (('l', 1.0), ('r', -1.0)):
            E, W_ = J['lowerarm_' + s][0], J['hand_' + s][0]
            lf = (W_ - E).length
            src = o.vertex_groups.get('lowerarm_' + s)
            if src is None: continue
            dst = o.vertex_groups.get('lowerarm_twist_' + s) or o.vertex_groups.new(name='lowerarm_twist_' + s)
            for v in o.data.vertices:
                for g in v.groups:
                    if g.group == src.index and g.weight > 0:
                        f = (sg * v.co.x - sg * E.x) / lf
                        t = max(0.0, min(1.0, (f - 0.15) / 0.8)) ** 1.2
                        w = g.weight
                        src.add([v.index], w * (1 - t), 'REPLACE'); dst.add([v.index], w * t, 'REPLACE')
    # material regions (face attribute 'region'): 0 skin, 1 sleeve, 2 roll, 3 strap, 4 watch case, 5 crystal
    for o, r in [(parts[0], 0)] + [(o, 1 if o.name.startswith('Sleeve') else 2 if o.name.startswith('Roll') else 3 if o.name == 'Strap' else 4) for o in parts[1:]]:
        at = o.data.attributes.new('region', 'INT', 'FACE')
        vals = [r] * len(o.data.polygons)
        if o.name == 'Watch':
            for p in o.data.polygons:
                cz = sum((o.data.vertices[i].co.z for i in p.vertices), 0.0) / len(p.vertices)
                cxy = sum(((o.data.vertices[i].co - top).xy.length for i in p.vertices), 0.0) / len(p.vertices)
                if cz > top.z + 0.0088 and cxy < 0.0127: vals[p.index] = 5
        at.data.foreach_set('value', vals)
    arms = G.join(parts, 'FPArms')
    # sleeve cloth is seen from the inside when the camera looks down the arm: keep it closed by solidify
    log('arms tris', G.tris(arms))

    # ---------------- first-person skeleton: clavicles to fingertips, forearm twist, weapon and prop bones
    fpa = bpy.data.armatures.new('FPRig'); fpo = bpy.data.objects.new('FPRig', fpa); G.link(fpo)
    L.set_active(fpo); bpy.ops.object.mode_set(mode='EDIT')
    eb = fpa.edit_bones
    root = eb.new('fp_root'); root.head = eye; root.tail = eye + Vector((0, 0, 0.05))
    src = {b.name: b for b in rig.data.bones}
    for s in ('l', 'r'):
        for bn in side_bones(s):
            b = src[bn]; e = eb.new(bn)
            e.head = rig.matrix_world @ b.head_local; e.tail = rig.matrix_world @ b.tail_local
            e.matrix = rig.matrix_world @ b.matrix_local; e.length = b.length
        for bn in side_bones(s):
            p = src[bn].parent
            eb[bn].parent = eb[p.name] if p and p.name in eb else root
        lo = eb['lowerarm_' + s]
        tw = eb.new('lowerarm_twist_' + s)
        tw.matrix = lo.matrix.copy()
        tw.head = lo.head.lerp(lo.tail, 0.5); tw.tail = lo.head.lerp(lo.tail, 0.95); tw.roll = lo.roll
        tw.parent = lo
    for wb in WBONES:
        e = eb.new(wb)
        e.matrix = Matrix(((1, 0, 0, eye.x), (0, 0, -1, eye.y), (0, 1, 0, eye.z), (0, 0, 0, 1)))
        e.length = 0.03
    for wb in WBONES: eb[wb].parent = eb[WPARENT[wb]]
    bpy.ops.object.mode_set(mode='OBJECT')
    # move everything into first-person space: eye at the origin, facing +Y
    M = Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Translation(-eye)
    arms.data.transform(M)
    fpo.matrix_world = M
    L.set_active(fpo); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # the weapon bones were built with glTF-identity frames in the old space; rebuild them after the turn
    bpy.ops.object.mode_set(mode='EDIT')
    for wb in WBONES:
        e = fpa.edit_bones[wb]
        e.matrix = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))); e.length = 0.03
    bpy.ops.object.mode_set(mode='OBJECT')
    meta['watch_centre'] = list(M @ Vector(meta['watch_centre']))
    meta['watch_axis'] = [0, 0, 1]
    # bind
    for vg in list(arms.vertex_groups):
        if vg.name not in fpa.bones: arms.vertex_groups.remove(vg)
    arms.parent = fpo; arms.matrix_parent_inverse = Matrix()
    arms.modifiers.new('Armature', 'ARMATURE').object = fpo
    # tidy: drop the third-person rig and the UAL import
    for o in list(bpy.data.objects):
        if o not in (arms, fpo): bpy.data.objects.remove(o)
    arms['meta'] = str(meta)
    bpy.ops.wm.save_as_mainfile(filepath=OUT + '/fp_geo.blend')
    log('saved', OUT + '/fp_geo.blend', 'tris', G.tris(arms), 'verts', len(arms.data.vertices), 'bones', len(fpa.bones))

if __name__ == '__main__':
    main()
