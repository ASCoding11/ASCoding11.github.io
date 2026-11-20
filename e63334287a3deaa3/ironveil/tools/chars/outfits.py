# Outfits: build cloth body + gear for each character kind.
import bpy, math
import numpy as np
from mathutils import Vector, Matrix
import mhlib as L, geo as G, mats as MT, pipe as PP

J = PP.J

# ---------- shared bits ----------
def envelope_rings(P, mask, center_xy, zs, offsets, n=28, name='env', yscale=1.0, phase=0.0, mins=None):
    """Rings around a vertical axis using the max radial extent of masked verts in each z slice/sector."""
    cx, cy = center_xy
    pts = P[mask]
    rings = []
    for z, off in zip(zs, offsets):
        sl = pts[np.abs(pts[:, 2] - z) < 0.018]
        ring = []
        for k in range(n):
            th = phase + 2 * math.pi * k / n
            d = np.array([math.sin(th), -math.cos(th)])  # k=0 -> front (-Y)
            if len(sl):
                rel = sl[:, :2] - np.array([cx, cy])
                proj = rel @ d
                perp = np.abs(rel @ np.array([-d[1], d[0]]))
                cand = proj[perp < 0.03]
                r = cand.max() if len(cand) else (proj.max() if len(proj) else 0.12)
            else:
                r = 0.12
            if mins: r = max(r, mins)
            o = off(th) if callable(off) else off
            ring.append(Vector((cx + d[0] * (r + o), cy + d[1] * (r + o), z)))
        rings.append(ring)
    # smooth each ring radially a bit (removes leg gaps)
    for ring in rings:
        c = Vector((cx, cy, ring[0].z))
        rad = [((p - c).length) for p in ring]
        rad2 = [max(rad[i], 0.5 * (rad[i - 1] + rad[(i + 1) % n])) for i in range(n)]
        for i in range(n):
            dvec = (ring[i] - c); dvec.z = 0
            if dvec.length > 0: ring[i] = c + dvec.normalized() * rad2[i]
    verts = [p for r in rings for p in r]
    faces = []
    for i in range(len(rings) - 1):
        for k in range(n):
            a = i * n + k; b = i * n + (k + 1) % n
            faces.append([a, a + n, b + n, b])
    return G.mesh_obj(name, verts, faces)

def limb_ring(bvh, a, b, ts, offsets, n=16, name='limbring', ref=Vector((0, -1, 0))):
    st = []
    for t, o in zip(ts, offsets):
        c = a.lerp(b, t)
        st.append((c, (b - a), o, ref))
    return G.ring_loft(bvh, st, n=n, name=name)

def pouch(bvh, origin, direction, w, h, d, name, flap=True, up=Vector((0, 0, 1)), push=0.0):
    M = G.surface_frame(bvh, origin, direction, up)
    if M is None: return []
    Mc = M @ Matrix.Translation((0, 0, d / 2 + push))
    obs = [G.box(name, (w, h, d), Mc, bev=min(w, h, d) * 0.22, seg=1)]
    if flap:
        Mf = M @ Matrix.Translation((0, h * 0.28, d + push + 0.002)) @ Matrix.Rotation(-0.10, 4, 'X')
        f = G.box(name + 'F', (w * 1.03, h * 0.42, 0.005), Mf, bev=0.0015, seg=1)
        f['hi_only'] = True
        obs.append(f)
    return obs

def button(bvh, origin, direction, name, r=0.0075, up=Vector((0, 0, 1))):
    """A flat sewn button (high-poly only: it is baked into the normal and colour maps)."""
    M = G.surface_frame(bvh, origin, direction, up)
    if M is None: return []
    b = G.box(name, (r * 2, r * 2, 0.0035), M @ Matrix.Translation((0, 0, 0.0025)), bev=r * 0.8, seg=3)
    b['hi_only'] = True
    return [b]

def boot_details(P, bvh, out, laces=True, mat='boot', lace_mat='glove'):
    """Heel block (real geometry), tread lugs under the sole and, for lace-up boots, crossed laces up the front
    (lugs and laces are high-poly only)."""
    feet = np.array([p[2] < 0.05 for p in P])
    for s in (-1, 1):
        fm = feet & np.array([p[0] * s > 0 for p in P])
        F = P[fm]
        fx = float(np.mean(F[:, 0])); y0, y1 = float(F[:, 1].min()), float(F[:, 1].max())
        w = float(F[:, 0].max() - F[:, 0].min())
        Fh = F[F[:, 1] > y1 - 0.07]                     # the heel end only (the toes are wider)
        hx = float(np.mean(Fh[:, 0])); hw = float(Fh[:, 0].max() - Fh[:, 0].min())
        # heel: a block just proud of the sole at the back, so the step between heel and sole reads
        hb = G.box('Heel%d' % s, (hw + 0.004, 0.068, 0.03), Matrix.Translation((hx, y1 - 0.036, 0.015)), bev=0.005, seg=2)
        out.append((hb, mat))
        # tread: bars across the sole and the heel
        for k in range(9):
            yy = y0 + 0.02 + k * (y1 - y0 - 0.04) / 8
            t = G.box('Tread%d%d' % (s, k), (w * 0.85, 0.008, 0.006), Matrix.Translation((fx, yy, -0.001)), bev=0.0015, seg=1)
            t['hi_only'] = True; out.append((t, mat))
        if laces:
            for k in range(7):
                z = 0.075 + k * 0.014
                o = Vector((fx, y0 - 0.2 + 0.05, z)); o.y = -0.4
                for a in (-0.45, 0.45):
                    M = G.surface_frame(bvh, Vector((fx, -0.4, z)), Vector((0, 1, 0)))
                    if M is None: continue
                    l = G.box('Lace%d%d%s' % (s, k, a > 0), (0.034, 0.0035, 0.003), M @ Matrix.Translation((0, 0, 0.0025)) @ Matrix.Rotation(a, 4, 'Z'), bev=0.001, seg=1)
                    l['hi_only'] = True; out.append((l, lace_mat))

def helmet_m1(H, name='Helmet', net=True):
    """US M1-style helmet shell: rounded dome, slight brim flare at the rim."""
    head = J(H, 'Head'); top = J(H, 'Head', 1)
    body = H['body']
    P = G.coords(body.data)
    W = PP.vweights(body)
    hv = np.array([P[i] for i in range(len(P)) if W[i].get('Head', 0) > 0.6])
    mn, mx = hv.min(0), hv.max(0)
    c = Vector(((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2 + 0.012, mx[2] - 0.088))
    prof = []
    rx, ry, hz = (mx[0] - mn[0]) / 2 + 0.026, (mx[1] - mn[1]) / 2 + 0.026, 0.118
    # dome from top (r=0) down to the rim, then rolled rim edge
    for i in range(10):
        a = (i / 9) * (math.pi / 2)
        prof.append((math.sin(a), math.cos(a) * hz + 0.012))
    prof += [(1.02, 0.0), (1.06, -0.012), (1.065, -0.020), (1.03, -0.020), (0.97, -0.005)]
    verts, faces = [], []
    n = 24
    for k in range(n):
        th = 2 * math.pi * k / n
        # brim lower at the back/sides, higher at the front (M1 profile)
        dz = -0.022 * (0.5 + 0.5 * math.cos(th)) + 0.012 * max(0.0, -math.cos(th))  # th=0 back(+y)
        for r, z in prof:
            zz = z + (dz if z <= 0.02 else dz * max(0.0, 1 - (z - 0.02) / 0.06))
            verts.append(Vector((c.x + r * rx * math.sin(th), c.y + r * ry * math.cos(th), c.z + zz)))
    m = len(prof)
    for k in range(n):
        k2 = (k + 1) % n
        for j in range(m - 1):
            faces.append([k * m + j, k2 * m + j, k2 * m + j + 1, k * m + j + 1])
    ob = G.mesh_obj(name, verts, faces)
    G.rigid_weights(ob, 'Head')
    return ob, c, (rx, ry)

def chin_straps(H, c, rr, name='Straps'):
    body = H['body']; P = G.coords(body.data); W = PP.vweights(body)
    hv = np.array([P[i] for i in range(len(P)) if W[i].get('Head', 0) > 0.8])
    chin = Vector((0.0, hv[:, 1].min() + 0.045, hv[:, 2].min() + 0.03))
    obs = []
    for s in (-1, 1):
        a = Vector((c.x + s * rr[0] * 0.93, c.y - 0.01, c.z - 0.012))
        b = Vector((s * 0.035, chin.y + 0.02, chin.z - 0.005))
        mid = a.lerp(b, 0.45) + Vector((s * 0.018, -0.01, 0))
        verts, faces = [], []
        steps = 6
        for i in range(steps + 1):
            t = i / steps
            p = (a * (1 - t) ** 2 + mid * 2 * t * (1 - t) + b * t * t)
            tan = ((b - a) * (1 - t) + (mid - a) * 0 + (b - mid) * t).normalized()
            side = tan.cross(Vector((s, 0, 0))).normalized() * 0.008
            verts += [p - side, p + side]
        for i in range(steps):
            faces.append([2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1])
        o = G.mesh_obj(name + str(s), verts, faces)
        G.solidify(o, 0.003, 0)
        G.rigid_weights(o, 'Head')
        obs.append(o)
    return obs

# ---------- hero ----------
HERO_COL = dict(jacket='#67664a', jacket2='#57573c', trousers='#626145', boot='#3e2618', glove='#4c3624',
                web='#8c805b', canvas='#7b7354', helmet='#4f4f37', metal='#3a3a36')

def label_hero(H, P):
    wx = J(H, 'hand_l').x - 0.012
    boot_top = J(H, 'foot_l').z + 0.15
    waist = J(H, 'pelvis').z + 0.015
    lab = []
    for p in P:
        x, y, z = p
        if abs(x) > wx and z > J(H, 'upperarm_l').z - 0.25:
            lab.append('glove')
        elif z > J(H, 'neck_01').z + 0.03 or (z > PP.neck_threshold(H, p) and abs(x) < 0.085):
            lab.append('skin')
        elif z < boot_top:
            lab.append('boot')
        elif z >= waist:
            lab.append('jacket')
        else:
            lab.append('trousers')
    return lab

def materials_hero(knee=0.54):
    import wear as WR
    return {
        'skin': None,
        'jacket': WR.cloth('jacket', '#5a5e43', '#4a4e36', fade=0.14),
        'trousers': WR.cloth('trousers', '#58503d', '#463f30', knee_z=knee, mud_amt=0.8),
        'boot': WR.leather('boot', '#3a2618', '#1e140c', mud_low=0.22, polish=0.5),
        'glove': WR.leather('glove', '#3e2c1e', '#2a1d14', polish=0.6),
        'web': WR.webbing('web', '#857a5a', '#6e6548'),
        'canvas': WR.webbing('canvas', '#736a4d', '#5e573f'),
        'helmet': WR.painted_metal('helmet', '#454634', '#393a2b'),
        'net': WR.webbing('net', '#3d3a28', '#2e2c1e'),
        'metal': WR.blued('metal', '#4a4b45', '#3e3f3a', park=True),
    }

def gear_hero(H, cloth):
    """Webbing and kit for the paratrooper. Returns list of (obj, matname)."""
    bvh = G.bvh_of(cloth)
    P = G.coords(cloth.data)
    out = []
    pz = J(H, 'pelvis').z
    torso = np.array([abs(p[0]) < 0.24 for p in P])
    # collar (turned-down)
    nk = J(H, 'neck_01')
    zc = nk.z
    col = envelope_rings(P, np.array([abs(p[0]) < 0.10 for p in P]), (0, nk.y + 0.01), [zc - 0.045, zc - 0.02, zc + 0.005, zc + 0.016],
                         [-0.004, 0.006, 0.008, 0.01], n=24, name='Collar')
    G.solidify(col, 0.006, 1.0); out.append((col, 'jacket'))
    # jacket skirt below the waist
    hips = np.array([abs(p[0]) < 0.25 and p[2] < pz + 0.1 for p in P])
    skirt = envelope_rings(P, hips, (0, J(H, 'pelvis').y + 0.01), [pz + 0.04, pz - 0.03, pz - 0.10, pz - 0.17],
                           [0.006, 0.012, 0.022, 0.03], n=32, name='Skirt')
    G.solidify(skirt, 0.004, 1.0); out.append((skirt, 'jacket'))
    # cartridge belt
    belt = envelope_rings(P, torso, (0, J(H, 'pelvis').y + 0.01), [pz + 0.075, pz + 0.01], [0.012, 0.014], n=32, name='Belt')
    G.solidify(belt, 0.006, 1.0); out.append((belt, 'web'))
    bvh2 = G.bvh_of(belt)
    # pouches on belt (5 a side, front to hip)
    cy = J(H, 'pelvis').y
    for s in (-1, 1):
        for k, ang in enumerate((22, 40, 58, 76)):
            a = math.radians(ang) * s
            d = Vector((math.sin(a), -math.cos(a), 0))
            o = Vector((0, cy, pz + 0.045)) - d * 0.0
            out += [(x, 'canvas') for x in pouch(bvh2, o + d * 0.4, -d, 0.058, 0.07, 0.032, 'Pouch%d%d' % (s, k), push=0.004)]
    # canteen right-back hip, entrenching tool left-back
    for s, nm, wh in ((-1, 'Canteen', (0.11, 0.15, 0.06)), (1, 'Etool', (0.13, 0.2, 0.04))):
        a = math.radians(140) * s
        d = Vector((math.sin(a), -math.cos(a), 0))
        out += [(x, 'canvas') for x in pouch(bvh2, Vector((0, cy, pz + 0.0)) + d * 0.4, -d, wh[0], wh[1], wh[2], nm, push=0.004)]
    # suspenders
    sh = J(H, 'clavicle_l', 1)
    for s in (-1, 1):
        pts = [Vector((s * 0.085, cy - 0.3, pz + 0.07)), Vector((s * 0.10, cy - 0.3, pz + 0.3)),
               Vector((s * 0.115, -0.25, sh.z + 0.02)), Vector((s * 0.125, sh.y, sh.z + 0.07)),
               Vector((s * 0.12, 0.25, sh.z + 0.0)), Vector((s * 0.08, 0.3, pz + 0.30)), Vector((s * 0.07, 0.3, pz + 0.08))]
        out.append((G.strap(bvh, pts, 0.034, 0.004, name='Susp%d' % s, thick=0.004, steps=22), 'web'))
    # first-aid pouch on left suspender, chest
    out += [(x, 'canvas') for x in pouch(bvh, Vector((0.10, -0.4, sh.z - 0.14)), Vector((0, 1, 0)), 0.07, 0.09, 0.03, 'Aid', push=0.006)]
    # slanted chest pockets
    for s in (-1, 1):
        o = Vector((s * 0.11, -0.4, sh.z - 0.20))
        M = G.surface_frame(bvh, o, Vector((0, 1, 0)), Vector((-s * 0.35, 0, 1)).normalized())
        if M:
            b_ = G.box('ChestPkt%d' % s, (0.14, 0.15, 0.007), M @ Matrix.Translation((0, 0, 0.0)), bev=0.003, seg=2); b_['hi_only'] = True
            out.append((b_, 'jacket'))
            f_ = G.box('ChestFlap%d' % s, (0.145, 0.05, 0.005), M @ Matrix.Translation((0, 0.055, 0.007)) @ Matrix.Rotation(-0.08, 4, 'X'), bev=0.002, seg=2)
            f_['hi_only'] = True; out.append((f_, 'jacket'))
            out += [(x, 'metal') for x in button(bvh, o + Vector((0, 0, 0.04)), Vector((0, 1, 0)), 'ChestBtn%d' % s, up=Vector((-s * 0.35, 0, 1)).normalized())]
    # front closure: four buttons down the placket
    for k in range(4):
        out += [(x, 'metal') for x in button(bvh, Vector((0.0, -0.4, sh.z - 0.12 - k * 0.1)), Vector((0, 1, 0)), 'FrontBtn%d' % k)]
    # lower jacket pockets on the skirt
    bvh3 = G.bvh_of(skirt)
    for s in (-1, 1):
        o = Vector((s * 0.11, -0.4, pz - 0.08))
        for x in pouch(bvh3, o, Vector((0, 1, 0)), 0.15, 0.14, 0.007, 'HipPkt%d' % s, push=0.0):
            out.append((x, 'jacket'))
        out += [(x, 'metal') for x in button(bvh3, o + Vector((0, 0, 0.035)), Vector((0, 1, 0)), 'HipBtn%d' % s)]
    # thigh cargo pockets (outer front)
    for s in (-1, 1):
        th = J(H, 'thigh_l' if s > 0 else 'thigh_r'); kn = J(H, 'calf_l' if s > 0 else 'calf_r')
        mid = th.lerp(kn, 0.52)
        d = Vector((s * 0.75, -0.66, 0)).normalized()
        out += [(x, 'trousers') for x in pouch(bvh, mid + d * 0.3, -d, 0.15, 0.19, 0.026, 'Cargo%d' % s, push=-0.004)]
    # trousers bloused over the boot tops
    for s in ('l', 'r'):
        kn = J(H, 'calf_' + s); an = J(H, 'foot_' + s)
        bl = limb_ring(bvh, kn, an, [0.58, 0.64, 0.71, 0.76], [-0.002, 0.014, 0.012, -0.004], n=16, name='Blouse' + s)
        out.append((bl, 'trousers'))
    # boot soles
    feet = np.array([p[2] < 0.05 for p in P])
    for s in (-1, 1):
        fm = feet & np.array([p[0] * s > 0 for p in P])
        fx = float(np.mean(P[fm][:, 0])); fy = float(np.mean(P[fm][:, 1]))
        sole = envelope_rings(P, fm, (fx, fy), [0.0, 0.0, 0.022, 0.032], [-0.03, 0.006, 0.007, 0.0], n=20, name='Sole%d' % s)
        out.append((sole, 'boot'))
    boot_details(P, bvh, out, laces=True)
    # musette bag on the back
    sp = J(H, 'spine_03')
    out += [(x, 'canvas') for x in pouch(bvh, Vector((0, 0.5, sp.z + 0.08)), Vector((0, -1, 0)), 0.28, 0.24, 0.09, 'Musette', push=0.012)]
    return out

# ---------- enemies (one shared body; four outfits). No national or political insignia: the only marking is an
# invented plain white chevron on the left sleeve.
ENEMY_COL = dict(tunic='#5c6150', tunic2='#4c5143', trousers='#565a4b', boot='#1d1b19', leather='#211f1b', canvas='#6b6550',
                 helmet='#4b5047', coat='#5a5f53', band='#2f3a30', visor='#121212', metal='#4a4f42', chevron='#d6d2c4')

def label_enemy(H, P, upper='tunic'):
    wx = J(H, 'hand_l').x - 0.012
    boot_top = J(H, 'calf_l').z - 0.06
    waist = J(H, 'pelvis').z + 0.015
    lab = []
    for p in P:
        x, y, z = p
        if abs(x) > wx and z > J(H, 'upperarm_l').z - 0.25:
            lab.append('skin')
        elif z > J(H, 'neck_01').z + 0.03 or (z > PP.neck_threshold(H, p) and abs(x) < 0.085):
            lab.append('skin')
        elif z < boot_top:
            lab.append('boot')
        elif z >= waist:
            lab.append(upper)
        else:
            lab.append('trousers')
    return lab

def materials_enemy(knee=0.54):
    import wear as WR
    camo = ['#3f4430', '#5c513a', '#2e3826', '#221f17']
    return {
        'tunic': WR.cloth('e_tunic', '#555a4c', '#464a3f', fade=0.12),
        'trousers': WR.cloth('e_trousers', '#4f5346', '#40443a', knee_z=knee, mud_amt=0.7),
        'coat': WR.cloth('e_coat', '#53574d', '#44483f', fade=0.1),
        'smock': WR.cloth('e_smock', '#4d4c36', '#424130', camo=camo, fade=0.1),
        'boot': WR.leather('e_boot', '#181614', '#0c0b0a', mud_low=0.3, polish=0.38),
        'leather': WR.leather('e_leather', '#1c1a17', '#100f0d', polish=0.5),
        'canvas': WR.webbing('e_canvas', '#5e5949', '#4d493c'),
        'helmet': WR.painted_metal('e_helmet', '#454a43', '#393d37'),
        'helmetcamo': WR.painted_metal('e_helmetcamo', '#4d4c36', '#424130', camo=camo[1:3]),
        'band': WR.cloth('e_band', '#2b342c', '#232a24', fade=0.05),
        'visor': WR.flat('e_visor', '#0d0d0d', rough=0.35),
        'metal': WR.painted_metal('e_metal', '#41463b', '#363a31', chip=0.7),
        'chevron': WR.cloth('e_chevron', '#c9c5b6', '#b5b1a2', fade=0.0, mud_amt=0.2),
    }

def helmet_stahl(H, name='Helmet'):
    """Coal-scuttle style shell: dome, a step, then a flared skirt low at the sides and back, short visor at the front."""
    body = H['body']; P = G.coords(body.data); W = PP.vweights(body)
    hv = np.array([P[i] for i in range(len(P)) if W[i].get('Head', 0) > 0.6])
    mn, mx = hv.min(0), hv.max(0)
    c = Vector(((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2 + 0.012, mx[2] - 0.085))
    rx, ry = (mx[0] - mn[0]) / 2 + 0.024, (mx[1] - mn[1]) / 2 + 0.024
    n = 24
    verts, faces = [], []
    prof_n = 0
    for k in range(n):
        th = 2 * math.pi * k / n          # th=0 -> back (+y)
        front = max(0.0, -math.cos(th))   # 1 at the front
        side = abs(math.sin(th))
        drop = 0.075 * (1 - front) + 0.022 * front + 0.012 * side
        flare = 1.18 - 0.08 * front
        prof = []
        for i in range(8):
            a = (i / 7) * (math.pi / 2)
            prof.append((math.sin(a) * 1.0, math.cos(a) * 0.125 + 0.02))
        prof += [(1.04, 0.0), (1.05, -0.012)]                 # the step
        prof += [(1.05 + (flare - 1.05) * 0.5, -drop * 0.6), (flare, -drop), (flare - 0.04, -drop - 0.004), (1.0, -0.01)]
        prof_n = len(prof)
        for r, z in prof:
            verts.append(Vector((c.x + r * rx * math.sin(th), c.y + r * ry * math.cos(th), c.z + z)))
    m = prof_n
    for k in range(n):
        k2 = (k + 1) % n
        for j in range(m - 1):
            faces.append([k * m + j, k2 * m + j, k2 * m + j + 1, k * m + j + 1])
    ob = G.mesh_obj(name, verts, faces)
    G.rigid_weights(ob, 'Head')
    return ob, c, (rx, ry)

def peaked_cap(H, name='Cap'):
    body = H['body']; P = G.coords(body.data); W = PP.vweights(body)
    hv = np.array([P[i] for i in range(len(P)) if W[i].get('Head', 0) > 0.6])
    mn, mx = hv.min(0), hv.max(0)
    c = Vector(((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2 + 0.012, mx[2] - 0.045))
    rx, ry = (mx[0] - mn[0]) / 2 + 0.008, (mx[1] - mn[1]) / 2 + 0.008
    out = []
    # band
    band = G.lathe(name + 'Band', [(1.0, 0.0), (1.0, 0.035)], n=24, sx=rx, sy=ry, M=Matrix.Translation(c))
    G.solidify(band, 0.004, 1.0); out.append((band, 'band'))
    # crown: wider than the band, raised at the front (saddle)
    n = 24; verts = []; faces = []
    prof = [(1.0, 0.035), (1.18, 0.07), (1.2, 0.085), (1.0, 0.095), (0.6, 0.1), (0.0, 0.1)]
    for k in range(n):
        th = 2 * math.pi * k / n
        front = max(0.0, -math.cos(th))
        for r, z in prof:
            zz = z + (0.035 * front * front if z > 0.05 else 0.0)
            verts.append(Vector((c.x + r * rx * math.sin(th), c.y + r * ry * math.cos(th), c.z + zz)))
    m = len(prof)
    for k in range(n):
        k2 = (k + 1) % n
        for j in range(m - 1):
            faces.append([k * m + j, k2 * m + j, k2 * m + j + 1, k * m + j + 1])
    crown = G.mesh_obj(name + 'Crown', verts, faces); out.append((crown, 'coat'))
    # visor: a curved plate at the front
    vv = []; vf = []
    for i in range(9):
        a = math.pi + (i - 4) / 4 * 0.9
        for rr, dz in ((1.0, 0.0), (1.45, -0.025)):
            vv.append(Vector((c.x + rr * rx * math.sin(a), c.y + rr * ry * math.cos(a), c.z + 0.004 + dz)))
    for i in range(8):
        vf.append([2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1])
    vis = G.mesh_obj(name + 'Visor', vv, vf); G.solidify(vis, 0.004, 0); out.append((vis, 'visor'))
    for o, _ in out: G.rigid_weights(o, 'Head')
    return out, c, (rx, ry)

def gear_enemy(H, cloth, kind):
    bvh = G.bvh_of(cloth)
    P = G.coords(cloth.data)
    out = []
    pz = J(H, 'pelvis').z; cy = J(H, 'pelvis').y
    torso = np.array([abs(p[0]) < 0.24 for p in P])
    nk = J(H, 'neck_01'); zc = nk.z
    # high stand collar
    col = envelope_rings(P, np.array([abs(p[0]) < 0.10 for p in P]), (0, nk.y + 0.01), [zc - 0.045, zc - 0.015, zc + 0.012, zc + 0.03],
                         [-0.004, 0.005, 0.007, 0.008], n=24, name='Collar')
    G.solidify(col, 0.006, 1.0); out.append((col, 'band' if kind != 'sniper' else 'smock'))
    long_ = kind in ('officer', 'sniper')
    hips = np.array([abs(p[0]) < 0.25 and p[2] < pz + 0.1 for p in P])
    up = 'coat' if kind == 'officer' else ('smock' if kind == 'sniper' else 'tunic')
    if kind == 'officer':
        kz = J(H, 'calf_l').z
        zs = [pz + 0.04, pz - 0.05, pz - 0.15, pz - 0.27, kz + 0.12, kz + 0.0]
        offs = [0.008, 0.016, 0.03, 0.045, 0.06, 0.07]
        legs = np.array([abs(p[0]) < 0.25 and p[2] < pz + 0.1 and p[2] > kz - 0.05 for p in P])
        skirt = envelope_rings(P, legs | hips, (0, cy + 0.01), zs, offs, n=32, name='Skirt')
    elif kind == 'sniper':
        zs = [pz + 0.04, pz - 0.05, pz - 0.14, pz - 0.24]
        skirt = envelope_rings(P, hips, (0, cy + 0.01), zs, [0.008, 0.016, 0.028, 0.036], n=32, name='Skirt')
    else:
        skirt = envelope_rings(P, hips, (0, cy + 0.01), [pz + 0.04, pz - 0.03, pz - 0.10, pz - 0.16], [0.006, 0.012, 0.02, 0.026], n=32, name='Skirt')
    G.solidify(skirt, 0.004, 1.0); out.append((skirt, up))
    # belt (black leather) with a plain buckle
    belt = envelope_rings(P, torso, (0, cy + 0.01), [pz + 0.065, pz + 0.015], [0.014 if not long_ else 0.02, 0.016 if not long_ else 0.022], n=32, name='Belt')
    G.solidify(belt, 0.005, 1.0); out.append((belt, 'leather'))
    bvh2 = G.bvh_of(belt)
    out += [(x, 'metal') for x in pouch(bvh2, Vector((0, cy - 0.4, pz + 0.04)), Vector((0, 1, 0)), 0.05, 0.042, 0.008, 'Buckle', flap=False)]
    if kind in ('rifleman', 'gunner'):
        if kind == 'rifleman':
            for s in (-1, 1):
                for k, ang in enumerate((20, 32, 44)):
                    a = math.radians(ang) * s; d = Vector((math.sin(a), -math.cos(a), 0))
                    out += [(x, 'leather') for x in pouch(bvh2, Vector((0, cy, pz + 0.035)) + d * 0.4, -d, 0.045, 0.075, 0.034, 'Amm%d%d' % (s, k), push=0.004)]
        else:
            a = math.radians(-60); d = Vector((math.sin(a), -math.cos(a), 0))
            out += [(x, 'leather') for x in pouch(bvh2, Vector((0, cy, pz + 0.02)) + d * 0.4, -d, 0.09, 0.12, 0.04, 'Holster', push=0.004)]
            out += [(x, 'leather') for x in pouch(bvh2, Vector((0, cy, pz + 0.035)) + Vector((0.55, -0.83, 0)) * 0.4, -Vector((0.55, -0.83, 0)), 0.08, 0.07, 0.03, 'ToolPouch', push=0.004)]
        # Y-straps
        sh = J(H, 'clavicle_l', 1)
        for s in (-1, 1):
            pts = [Vector((s * 0.10, cy - 0.3, pz + 0.07)), Vector((s * 0.11, cy - 0.3, pz + 0.3)), Vector((s * 0.12, -0.25, sh.z + 0.02)),
                   Vector((s * 0.125, sh.y, sh.z + 0.07)), Vector((s * 0.09, 0.25, sh.z - 0.02)), Vector((0.0, 0.3, sh.z - 0.2))]
            out.append((G.strap(bvh, pts, 0.03, 0.004, name='Y%d' % s, thick=0.004, steps=20), 'leather'))
        out.append((G.strap(bvh, [Vector((0, 0.3, sh.z - 0.2)), Vector((0, 0.3, pz + 0.07))], 0.03, 0.004, name='Yback', thick=0.004, steps=8), 'leather'))
        # bread bag, canteen, fluted canister on the back
        for s, nm, wh, mat in ((-1, 'Bread', (0.2, 0.17, 0.06), 'canvas'), (1, 'Etool', (0.12, 0.2, 0.04), 'leather')):
            a = math.radians(140) * s; d = Vector((math.sin(a), -math.cos(a), 0))
            out += [(x, mat) for x in pouch(bvh2, Vector((0, cy, pz - 0.03)) + d * 0.4, -d, wh[0], wh[1], wh[2], nm, push=0.004)]
        can = G.lathe('Canister', [(0.0, 0.135), (0.05, 0.135), (0.052, 0.12), (0.05, 0.10), (0.052, 0.07), (0.05, 0.04), (0.052, 0.01), (0.05, 0.0), (0.0, 0.0)], n=14,
                      M=Matrix.Translation((0.06, 0.2, pz - 0.18)) @ Matrix.Rotation(0.25, 4, 'Y'))
        out.append((can, 'metal'))
        if kind == 'gunner':
            out += [(x, 'leather') for x in pouch(bvh, Vector((-0.02, 0.5, J(H, 'spine_03').z + 0.06)), Vector((0, -1, 0)), 0.09, 0.5, 0.07, 'BarrelCase', flap=False, push=0.01)]
    elif kind == 'officer':
        a = math.radians(-70); d = Vector((math.sin(a), -math.cos(a), 0))
        out += [(x, 'leather') for x in pouch(bvh2, Vector((0, cy, pz + 0.02)) + d * 0.4, -d, 0.09, 0.12, 0.04, 'Holster', push=0.004)]
        # cross strap
        sh = J(H, 'clavicle_r', 1)
        out.append((G.strap(bvh, [Vector((0.12, -0.3, pz + 0.07)), Vector((0.0, -0.3, J(H, 'spine_03').z + 0.1)), Vector((-0.13, -0.2, sh.z + 0.03)),
                                  Vector((-0.13, 0.2, sh.z + 0.02)), Vector((0.05, 0.3, J(H, 'spine_03').z + 0.05)), Vector((0.12, 0.3, pz + 0.07))],
                           0.025, 0.004, name='Cross', thick=0.004, steps=24), 'leather'))
    elif kind == 'sniper':
        # binocular case and a small pouch
        out += [(x, 'leather') for x in pouch(bvh2, Vector((0, cy, pz + 0.04)) + Vector((-0.5, -0.86, 0)) * 0.4, -Vector((-0.5, -0.86, 0)), 0.08, 0.1, 0.06, 'BinoCase', push=0.004)]
        out += [(x, 'canvas') for x in pouch(bvh2, Vector((0, cy, pz - 0.02)) + Vector((0.77, 0.64, 0)) * 0.4, -Vector((0.77, 0.64, 0)), 0.2, 0.17, 0.06, 'Bread', push=0.004)]
    # silhouette at a distance: rifleman = rolled blanket across the top of the back, gunner = a big pack under
    # the barrel case, sniper = long smock and a scrim scarf, officer = cap and long coat
    sp3 = J(H, 'spine_03')
    if kind == 'rifleman':
        roll = G.lathe('BlanketRoll', [(0.0, 0.2), (0.05, 0.2), (0.058, 0.17), (0.06, 0.0), (0.06, -0.17), (0.052, -0.2), (0.0, -0.2)], n=12,
                       M=Matrix.Translation((0, 0.14, sp3.z + 0.17)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
        out.append((roll, 'canvas'))
    elif kind == 'gunner':
        out += [(x, 'canvas') for x in pouch(bvh, Vector((0.03, 0.5, sp3.z - 0.06)), Vector((0, -1, 0)), 0.3, 0.3, 0.13, 'Pack', push=0.02)]
    elif kind == 'sniper':
        nk2 = J(H, 'neck_01')
        sc = envelope_rings(P, np.array([abs(p[0]) < 0.12 for p in P]), (0, nk2.y + 0.01), [nk2.z - 0.07, nk2.z - 0.035, nk2.z - 0.005],
                            [0.014, 0.022, 0.018], n=20, name='Scarf')
        G.solidify(sc, 0.008, 1.0); out.append((sc, 'smock'))
    boot_details(P, bvh, out, laces=False)
    # chevron on the left upper sleeve (the only marking; invented)
    ua = J(H, 'upperarm_l'); el = J(H, 'lowerarm_l')
    mid = ua.lerp(el, 0.45)
    v = [mid + Vector((-0.03, -0.2, 0.025)), mid + Vector((0.0, -0.2, -0.01)), mid + Vector((0.03, -0.2, 0.025))]
    ch = G.strap(bvh, v, 0.012, 0.0015, name='Chevron', thick=0.001, steps=10)
    ch['hi_only'] = True
    out.append((ch, 'chevron'))
    # pocket shapes on the tunic front (high only)
    sh = J(H, 'clavicle_l', 1)
    for s in (-1, 1):
        for nm, o, wh in (('Breast', Vector((s * 0.1, -0.4, sh.z - 0.17)), (0.12, 0.13)), ('Lower', Vector((s * 0.12, -0.4, pz - 0.06)), (0.16, 0.16))):
            src = skirt if nm == 'Lower' else cloth
            for x in pouch(G.bvh_of(src), o, Vector((0, 1, 0)), wh[0], wh[1], 0.006, nm + str(s), push=0.0):
                x['hi_only'] = True; out.append((x, up))
    # boot soles
    feet = np.array([p[2] < 0.05 for p in P])
    for s in (-1, 1):
        fm = feet & np.array([p[0] * s > 0 for p in P])
        fx = float(np.mean(P[fm][:, 0])); fy = float(np.mean(P[fm][:, 1]))
        sole = envelope_rings(P, fm, (fx, fy), [0.0, 0.0, 0.02, 0.03], [-0.03, 0.006, 0.007, 0.0], n=20, name='Sole%d' % s)
        out.append((sole, 'boot'))
    return out
