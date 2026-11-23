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
ROLL = (0.80, 0.86)      # (kept for fp_tex) the sleeve's hem band, fractions of the forearm
SLEEVE_END = 0.86        # the smock sleeve ends here, over the glove's gauntlet cuff
CUT = 0.42               # keep the upper arm from this fraction of its length (shoulder = 0)
GLOVE_CUFF = (0.78, 1.04)   # leather gauntlet cuff of the glove, from under the sleeve to the wrist crease
GLOVE_STRAP = 0.955      # wrist strap of the glove (both hands), buckle on the outer side
WATCH = 0.885            # wristwatch over the left glove cuff, between the sleeve hem and the strap
WRIST_RATIO = 0.62       # wrist width / widest forearm width after the taper (real forearms: about 0.6)

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
    # a real wrist: MakeHuman's forearm stays thick to the wrist. Taper the last half of each forearm toward the bone
    # line until the wrist is WRIST_RATIO of the forearm's widest width (the cross-section flattens: width more than
    # depth). Done before the sleeves and the glove cuff are fitted, so they follow it.
    for s, sg in (('l', 1.0), ('r', -1.0)):
        E_, W2 = J['lowerarm_' + s][0], J['hand_' + s][0]
        ax_ = np.array((W2 - E_).normalized()[:]); lf_ = (W2 - E_).length; e_ = np.array(E_[:])
        ids = np.array([i for i in range(n) if top[i].endswith('_' + s) and top[i].startswith(ARM)])
        Q = P[ids] - e_; f = Q @ ax_ / lf_
        rad = Q - np.outer(f * lf_, ax_)
        def width(f0, f1):
            m = (f > f0) & (f < f1)
            return rad[m, 1].max() - rad[m, 1].min()
        wmax = max(width(a, a + 0.08) for a in np.arange(0.05, 0.6, 0.05))
        ww = width(0.92, 0.98)
        need = min(1.0, WRIST_RATIO * wmax / ww)
        rise = np.clip((f - 0.42) / 0.50, 0, 1); rise = rise * rise * (3 - 2 * rise)
        fall = 1 - np.clip((f - 0.98) / 0.16, 0, 1); fall = fall * fall * (3 - 2 * fall)
        kw = 1 - (1 - need) * rise * fall; kd = 1 - (1 - need) * 0.55 * rise * fall
        newP = e_ + np.outer(f * lf_, ax_) + rad * np.stack([np.ones_like(kw), kw, kd], 1)
        for j, i in enumerate(ids): me.vertices[i].co = Vector(newP[j])
        P[ids] = newP
        rad2 = newP - e_ - np.outer(f * lf_, ax_)
        m2 = (f > 0.92) & (f < 0.98)
        log('forearm', s, 'widest %.3f wrist %.3f -> %.3f (ratio %.2f -> %.2f)' % (wmax, ww, rad2[m2, 1].max() - rad2[m2, 1].min(), ww / wmax, (rad2[m2, 1].max() - rad2[m2, 1].min()) / wmax))
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

    # full leather gloves: the whole hand and every finger stand 1.4 mm proud of the skin, with knuckle bulges over
    # the knuckles and the middle finger joints (leather bunches there), and slightly fuller fingertips
    gnames = {vg.index: vg.name for vg in skin.vertex_groups}
    heads = {}
    for s_ in ('l', 'r'):
        for f_ in ('index', 'middle', 'ring', 'pinky', 'thumb'):
            for k_ in (1, 2, 3):
                bn = '%s_0%d_%s' % (f_, k_, s_)
                if bn in J: heads[bn] = J[bn][0]
    for v in skin.data.vertices:
        g_ = max(v.groups, key=lambda x: x.weight) if v.groups else None
        nm_ = gnames[g_.group] if g_ else ''
        if not nm_.startswith(('hand_', 'index_', 'middle_', 'ring_', 'pinky_', 'thumb_')): continue
        s_ = nm_[-1]; d_ = 0.0014
        dors_ = v.normal.z      # T-pose, palms down: +Z is the back of the hand
        for f_ in ('index', 'middle', 'ring', 'pinky'):
            for k_, amp, rr in ((1, 0.0013, 0.0085), (2, 0.0008, 0.0065)):
                h_ = heads.get('%s_0%d_%s' % (f_, k_, s_))
                if h_ is None: continue
                dd = (v.co - h_).length
                if dd < 2.5 * rr: d_ += amp * math.exp(-(dd / rr) ** 2) * max(0.0, min(1.0, (dors_ + 0.1) / 0.5))
        if nm_.endswith(('_03_' + s_,)) or '_04_leaf' in nm_: d_ += 0.0004
        v.co = v.co + v.normal * d_
    bvh = bvh_full
    parts = [skin]
    # ---------------- sleeves, glove cuffs, wrist straps
    def cuff_off(fr):
        """Gauntlet cuff stand-off from the skin: snug at the wrist, a little flare toward the sleeve."""
        u = max(0.0, min(1.0, (0.96 - fr) / (0.96 - GLOVE_CUFF[0])))
        return 0.0022 + 0.0026 * u * u
    hits = {}
    for s, sg in (('l', 1.0), ('r', -1.0)):
        S, E, W_ = J['upperarm_' + s][0], J['lowerarm_' + s][0], J['hand_' + s][0]
        lu, lf = (E - S).length, (W_ - E).length
        st = []
        # the sleeve tube: from the cut to the hem over the glove cuff, ~8 mm stations. Heavy cloth: slack that grows
        # toward the elbow, compression folds that bunch up toward the wrist and change the silhouette (6-7 mm deep),
        # a few long diagonal twist folds along the forearm, and room at the hem for the glove cuff underneath
        a0 = CUT * lu
        total = lu - a0 + SLEEVE_END * lf
        ns = max(8, int(total / 0.010))
        for k in range(ns + 1):
            d = a0 + total * k / ns
            if d <= lu:
                c = S.lerp(E, d / lu); ax = (E - S).normalized()
            else:
                c = E.lerp(W_, (d - lu) / lf); ax = (W_ - E).normalized()
            fr = (d - lu) / lf   # forearm fraction (negative on the upper arm)
            hem = max(0.0, min(1.0, (fr - 0.70) / 0.16))
            slack = 0.010 + 0.006 * math.exp(-((d - lu) / 0.05) ** 2) - 0.002 * max(0.0, min(1.0, fr / 0.6)) + 0.0045 * hem
            def off(th, d=d, slack=slack, fr=fr, hem=hem):
                bunch = max(0.0, min(1.0, (fr - 0.35) / 0.4))       # folds crowd toward the wrist
                ph = 2 * math.pi * (d / (0.030 - 0.010 * bunch)) + 1.9 * math.sin(th * 2 + d * 30) + 0.9 * math.sin(th * 3.0 - d * 55)
                env = 0.35 + 0.65 * max(0.0, min(1.0, (fr + 0.35) / 0.6))
                inner = 0.5 + 0.5 * max(0.0, math.cos(th + math.pi / 2 * sg))
                ring = (0.0040 + 0.0028 * bunch) * env * (0.55 + 0.6 * inner) * (0.5 + 0.5 * math.sin(ph)) ** 1.5
                twist = 0.0018 * max(0.0, math.sin(th * 2 - d * 18 + 0.7)) ** 3 * max(0.0, min(1.0, (fr + 0.1) / 0.4))
                lip = 0.0015 * math.exp(-((fr - SLEEVE_END) / 0.012) ** 2)     # the turned hem stands a little proud
                return slack + ring + twist + lip
            st.append((c, ax, off, Vector((0, 0, 1))))
        sl = G.ring_loft(bvh, st, n=24, name='Sleeve_' + s)
        # cuff tab with a button on the outer side of the hem (pinky side, +Y in the T-pose)
        ax = (W_ - E).normalized(); c = E.lerp(W_, SLEEVE_END - 0.035)
        dvec = Vector((0, 0.75, 0.66)).normalized()
        hit = bvh.ray_cast(c + dvec * 0.1, -dvec, 0.2)
        if hit[0] is not None:
            zt = dvec; xt = ax; yt = zt.cross(xt).normalized(); xt = yt.cross(zt).normalized()
            Mt = Matrix((xt, yt, zt)).transposed().to_4x4(); Mt.translation = hit[0] + zt * 0.0168
            tab = G.box('Tab_' + s, (0.040, 0.016, 0.0028), Mt, bev=0.0011, seg=1)
            btn = G.lathe('Button_' + s, [(0.0, 0.0), (0.0058, 0.0), (0.0062, 0.0012), (0.0055, 0.0024), (0.0, 0.0028)], n=16,
                          M=Mt @ Matrix.Translation((0.010, 0, 0.0014)))
            parts += [tab, btn]
        # leather gauntlet cuff of the glove: from under the sleeve hem to the wrist, small creases round it
        cs = []
        nc = 10
        for k in range(nc + 1):
            fr = GLOVE_CUFF[0] + (GLOVE_CUFF[1] - GLOVE_CUFF[0]) * k / nc
            c = E.lerp(W_, fr)
            def off(th, fr=fr):
                return cuff_off(fr) + 0.0006 * math.sin(th * 4 + fr * 60) * math.exp(-((fr - 0.92) / 0.05) ** 2)
            cs.append((c, ax, off, Vector((0, 0, 1))))
        gc = G.ring_loft(bvh, cs, n=24, name='GloveCuff_' + s)
        # wrist strap over the cuff, and a buckle on the pinky side
        ss_ = []
        for k in range(5):
            fr = GLOVE_STRAP - 0.026 + 0.052 * k / 4
            edge = 1.0 if k in (0, 4) else 0.0
            ss_.append((E.lerp(W_, fr), ax, cuff_off(fr) + 0.0008 + 0.0008 * (1 - edge), Vector((0, 0, 1))))
        gs = G.ring_loft(bvh, ss_, n=32, name='GloveStrap_' + s)
        G.solidify(gs, 0.0016, offset=1.0)
        c = E.lerp(W_, GLOVE_STRAP); dvec = Vector((0, 1.0, 0.25)).normalized()
        hit = bvh.ray_cast(c + dvec * 0.1, -dvec, 0.2)
        if hit[0] is not None:
            zt = dvec; xt = ax; yt = zt.cross(xt).normalized(); xt = yt.cross(zt).normalized()
            Mb = Matrix((xt, yt, zt)).transposed().to_4x4(); Mb.translation = hit[0] + zt * (cuff_off(GLOVE_STRAP) + 0.0036)
            fr_ = [G.box('Buckle', (0.0022, 0.017, 0.0022), Mb @ Matrix.Translation((sx * 0.0075, 0, 0)), bev=0.0007, seg=1) for sx in (-1, 1)]
            fr_ += [G.box('Buckle', (0.017, 0.0022, 0.0022), Mb @ Matrix.Translation((0, sy * 0.0075, 0)), bev=0.0007, seg=1) for sy in (-1, 1)]
            fr_ += [G.box('Buckle', (0.0016, 0.015, 0.0016), Mb @ Matrix.Translation((0.001, 0, 0.0008)), bev=0.0005, seg=1)]
            buckle = G.join(fr_, 'Buckle_' + s)
            parts += [buckle]
        parts += [sl, gc, gs]
        log('sleeve', s, G.tris(sl), 'glove cuff', G.tris(gc), 'strap', G.tris(gs))
    # ---------------- wristwatch on the left wrist (dorsal side, +Z in the T-pose with palms down)
    E, W_ = J['lowerarm_l'][0], J['hand_l'][0]
    lf = (W_ - E).length; ax = (W_ - E).normalized()
    ws = []
    for k in range(7):
        fr = WATCH - 0.035 + 0.07 * k / 6
        c = E.lerp(W_, fr)
        edge = 1.0 if k in (0, 6) else 0.0
        ws.append((c, ax, cuff_off(fr) + 0.0016 + 0.0012 * (1 - edge), Vector((0, 0, 1))))
    strap = G.ring_loft(bvh, ws, n=28, name='Strap')
    G.solidify(strap, 0.0022, offset=1.0)
    c = E.lerp(W_, WATCH)
    hit = bvh.ray_cast(c + Vector((0, 0, 0.08)), Vector((0, 0, -1)), 0.2)
    top = hit[0] + Vector((0, 0, 0.0035 + cuff_off(WATCH)))
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
    # material regions (face attribute 'region'): 0 glove leather (the hand), 1 sleeve cloth, 2 glove cuff leather,
    # 3 watch strap, 4 watch case, 5 crystal, 6 glove wrist strap, 7 buckle and button
    def region_of(nm):
        for pre, r in (('Sleeve', 1), ('Tab', 1), ('GloveCuff', 2), ('Strap', 3), ('Watch', 4), ('GloveStrap', 6), ('Buckle', 7), ('Button', 7)):
            if nm.startswith(pre): return r
        return 0
    for o in parts:
        r = 0 if o is parts[0] else region_of(o.name)
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
