# Ironwing ground models: airfield and base structures (each with a wrecked version), trees, and munitions.
# Blender frame as lib.py (forward -Y, up +Z). Footprints match the gameplay boxes in js/units.js (BOX).
# Node layout (glTF, game frame):
#   <kind>            root, origin on the ground at the centre
#     <kind>_live     intact (materials: paint, dark, concrete, corrugated, wood, canvas, glass)
#     <kind>_dead     wrecked, hidden until destroyed
#     <kind>_lod1, <kind>_deadlod1   decimated copies of the two, which the game merges into one far mesh each
#     aa/flak: <kind>_turret0 (yaw pivot) > <kind>_gun0 (pitch pivot, barrels along -Y = game +Z)
#     radar: <kind>_antenna (spins about the vertical)
#   palm0, palm1, tree0..2, bush0     vegetation (bark, leaf)      mun_bomb, mun_rocket, mun_torpedo     munitions
import math, random
from mathutils import Vector, Matrix
import lib
from lib import loft_y, lathe, cyl, box, sphere, torus, sweep, plate, move, rot, scale, mirror_x, join, part, empty, subsurf, dup, decimate

SAND, OLIVE, GREY, DARK, CONC, WOOD = '#b6a57c', '#6b6f52', '#8d9094', '#33363a', '#a7a397', '#7d6b52'

def sandbags(name, R, h=1.1, n=20, rows=2):
    """A ring of stacked sandbags (each a rounded pillow)."""
    out = []
    for r in range(rows):
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * (r % 2)) / n
            b = box(name, (0, 0, 0), (0.75, 2 * math.pi * R / n * 1.05, h / rows * 0.95), bev=0.14, seg=1)
            rot(b, math.degrees(a), 'Z'); move(b, (R * math.cos(a), R * math.sin(a), (r + 0.5) * h / rows * 0.95))
            out.append(b)
    o = join(out, name); part(o, (lambda c, n_: '#b9a77a' if (int(c.x * 7) + int(c.y * 5)) % 3 else '#a8976b'), 'canvas')
    return o

def rubble(name, hx, hy, h, seed=1, charred=True):
    rnd = random.Random(seed); out = []
    for i in range(int(10 + hx * hy * 0.08)):
        s = (0.6 + rnd.random() * 2.4) * min(1.6, max(hx, hy) / 6)
        b = box(name, (0, 0, 0), (s, s * (0.5 + rnd.random()), s * (0.25 + rnd.random() * 0.5)), bev=0.05, seg=1)
        rot(b, rnd.uniform(-25, 25), 'X'); rot(b, rnd.uniform(0, 360), 'Z')
        move(b, ((rnd.random() - 0.5) * hx * 1.6, (rnd.random() - 0.5) * hy * 1.6, s * 0.15)); out.append(b)
    for i in range(4):   # charred beams
        b = box(name, (0, 0, 0), (0.3, rnd.uniform(3, max(4, hy * 0.8)), 0.3), bev=0.02, seg=1)
        rot(b, rnd.uniform(5, 35), 'X'); rot(b, rnd.uniform(0, 360), 'Z'); move(b, ((rnd.random() - 0.5) * hx, (rnd.random() - 0.5) * hy, 0.8)); out.append(b)
    scorch = cyl(name + '_scorch', max(hx, hy) * 1.15, 0.02, 0.06, axis='Z', n=20); out.append(scorch)
    o = join(out, name); part(o, (lambda c, n_: '#1d1b19' if c.z < 0.08 else ('#2a2725' if (int(c.x) + int(c.y)) % 2 else '#4a4641')), 'concrete')
    return o

def gun_head(kind, big):
    """The moving part of an AA or flak gun: (turret yaw mesh, gun pitch mesh, pitch pivot height)."""
    if big:
        cr = []
        for a in (0, 90):
            arm = box('fl_arm', (0, 0, 0.25), (6.0, 0.5, 0.35), bev=0.05); rot(arm, a, 'Z'); cr.append(arm)
        cradle = box('fl_cradle', (0, 0, 1.3), (1.4, 2.2, 1.2), bev=0.08)
        shield = plate('fl_shield', [(-1.4, 0.5), (1.4, 0.5), (1.6, 2.4), (-1.6, 2.4)], -1.4, -1.3, bev=0.03, axis='Y')
        seat = box('fl_seat', (0.9, 0.6, 1.2), (0.4, 0.5, 0.5), bev=0.05)
        tur = join([part(o, OLIVE, 'paint') for o in cr + [cradle, shield, seat]], kind + '_turret0_mesh')
        brl = cyl('fl_barrel', 0.13, 0.0, -6.2, axis='Y', n=12, r1=0.1)
        brake = cyl('fl_brake', 0.2, -6.0, -6.5, axis='Y', n=12)
        rec = cyl('fl_rec', 0.22, 1.0, -1.6, axis='Y', n=12)
        gun = join([part(brl, DARK, 'dark'), part(brake, DARK, 'dark'), part(rec, OLIVE, 'paint')], kind + '_gun0_mesh')
        return tur, gun, 1.55
    ped = cyl('aa_ped', 0.35, 0, 0.9, axis='Z', n=12)
    yoke = box('aa_yoke', (0, 0, 1.05), (1.1, 0.6, 0.4), bev=0.05)
    seat = box('aa_seat', (0.7, 0.45, 0.9), (0.35, 0.4, 0.4), bev=0.05)
    shield = plate('aa_shield', [(-0.9, 0.7), (0.9, 0.7), (1.0, 1.7), (-1.0, 1.7)], -0.75, -0.7, bev=0.02, axis='Y')
    tur = join([part(o, OLIVE, 'paint') for o in (ped, yoke, seat, shield)], kind + '_turret0_mesh')
    parts = []
    for x in (-0.25, 0.25):
        b = cyl('aa_b', 0.06, 0, -2.6, axis='Y', n=8, r1=0.05); move(b, (x, 0, 0)); parts.append(part(b, DARK, 'dark'))
        fh = cyl('aa_fh', 0.09, -2.4, -2.75, axis='Y', n=8); move(fh, (x, 0, 0)); parts.append(part(fh, DARK, 'dark'))
    mag = box('aa_mag', (0, 0.2, 0.25), (0.7, 0.5, 0.35), bev=0.04); parts.append(part(mag, OLIVE, 'paint'))
    return tur, join(parts, kind + '_gun0_mesh'), 1.25

def structure(kind):
    root = empty(kind); live = []; dead = None
    if kind == 'hangar':
        L, R = 44, 13
        arch = lathe('h_arch', [(R, -L / 2), (R, L / 2)], n=24, axis='Y', sz=1.0); lib.transform(arch, Matrix.Identity(4))
        # keep only the upper half of the cylinder: squash the lower half to the ground
        for v in arch.data.vertices:
            if v.co.z < 0: v.co.z = 0
        for k in range(-5, 6):     # ribs
            rib = torus('h_rib', R + 0.08, 0.12, c=(0, k * L / 10.5, 0), axis='Y', n=24, m=4)
            for v in rib.data.vertices:
                if v.co.z < 0: v.co.z = 0
            live.append(part(rib, '#6d7066', 'dark'))
        part(arch, '#7b7d70', 'corrugated'); live.append(arch)
        for s in (1, -1):
            wall = lathe('h_wall', [(0.01, s * L / 2), (R - 0.05, s * L / 2)], n=24, axis='Y', cap0=False)
            for v in wall.data.vertices:
                if v.co.z < 0: v.co.z = 0
            part(wall, '#6e7062', 'paint'); live.append(wall)
            door = box('h_door', (0, s * (L / 2 + 0.15), 5.0), (16, 0.3, 10), bev=0.05); part(door, (lambda c, n_: '#3c3e38' if abs(c.x) < 0.3 else '#55584e'), 'corrugated'); live.append(door)
            for x in (-8.5, 8.5):
                rail = box('h_rail', (x, s * (L / 2 + 0.4), 5.0), (0.4, 0.4, 10.2), bev=0.03); part(rail, DARK, 'dark'); live.append(rail)
        pad = box('h_pad', (0, -L / 2 - 6, 0.05), (24, 12, 0.1), bev=0.0); part(pad, CONC, 'concrete'); live.append(pad)
        for k in range(-3, 4):
            w = box('h_win', (R * 0.92, k * 5.5, 5.5), (0.5, 1.6, 1.0), bev=0.02); rot(w, -20, 'Y', pivot=(R * 0.92, k * 5.5, 5.5)); part(w, '#1d252c', 'glass'); live.append(w); live.append(mirror_x(w))
        dead = join([rubble('hd', 13, 22, 4, 3)] + [part(torus('hd_rib', R, 0.12, c=(0, k * 8, -3), axis='Y', n=16, m=4), '#2b2826', 'dark') for k in (-1, 1)], kind + '_dead')
    elif kind == 'fuel':
        t = lathe('f_tank', [(7, 0), (7, 8), (6.2, 8.9), (4, 9.6), (0.01, 9.9)], n=32, axis='Z', cap0=True); part(t, (lambda c, n_: '#3e4146' if 4.6 < c.z < 5.3 else '#cfcdc4'), 'paint'); live.append(t)
        berm = lathe('f_berm', [(11, 0), (10.2, 1.3), (9.6, 1.4), (8.8, 0)], n=32, axis='Z'); part(berm, '#8f8466', 'concrete'); live.append(berm)
        lad = []
        for k in range(18):
            r_ = box('f_rung', (7.15, 0, 0.5 + k * 0.48), (0.08, 0.6, 0.06), bev=0.0); lad.append(r_)
        for s in (-0.3, 0.3):
            lad.append(box('f_rail', (7.15, s, 4.5), (0.08, 0.06, 9), bev=0.0))
        live.append(part(join(lad, 'f_ladder'), DARK, 'dark'))
        pipe = sweep('f_pipe', [(0, -6.8, 0.6), (0, -10, 0.6), (3, -13, 0.4)], dict(w=0.5, h=0.5, e=2), n=10); live.append(part(pipe, '#6d6f69', 'dark'))
        valve = cyl('f_valve', 0.5, 0.2, 1.2, axis='Z', c=(0, -9.5, 0), n=10); live.append(part(valve, '#a33a2a', 'paint'))
        stub = lathe('fd_stub', [(7, 0), (7.2, 2.8), (6.6, 3.6), (6.9, 4.2)], n=32, axis='Z'); lib.solidify(stub, 0.15); part(stub, '#24211f', 'dark')
        dead = join([stub, rubble('fd', 7, 7, 2, 5), dup(berm, 'fd_berm')], kind + '_dead')
    elif kind in ('aa', 'flak'):
        big = kind == 'flak'; R = 4.0 if big else 2.9
        live.append(sandbags(kind + '_bags', R, h=1.3 if big else 1.0, n=24 if big else 18))
        floor = cyl(kind + '_floor', R - 0.4, 0, 0.12, axis='Z', n=24); live.append(part(floor, '#8d8467', 'concrete'))
        for k in range(3 if big else 2):
            ab = box(kind + '_ammo', (R * 0.55, -R * 0.2 + k * 0.7, 0.35), (0.9, 0.5, 0.45), bev=0.04); live.append(part(ab, OLIVE, 'paint'))
        tur, gun, gh = gun_head(kind, big)
        tp = empty(kind + '_turret0', (0, 0, 0.12), root); tur.parent = tp
        gp = empty(kind + '_gun0', (0, 0, gh), tp); gun.parent = gp
        rot(gun, -0.0, 'X')
        dead = join([rubble(kind + 'd', R * 0.7, R * 0.7, 1, 7), part(sandbags(kind + '_bagsd', R, h=0.5, n=14, rows=1), '#7d6e50', 'canvas')], kind + '_dead')
    elif kind == 'radar':
        legs = []
        for (x, y) in [(-2.2, -2.2), (2.2, -2.2), (2.2, 2.2), (-2.2, 2.2)]:
            legs.append(sweep('r_leg', [(x, y, 0), (x * 0.35, y * 0.35, 26)], dict(w=0.25, h=0.25, e=2), n=6))
        for k in range(6):
            z0, z1 = k * 4.3, (k + 1) * 4.3
            f0, f1 = 1 - 0.65 * z0 / 26, 1 - 0.65 * z1 / 26
            for (a, b) in [((-1, -1), (1, -1)), ((1, -1), (1, 1)), ((1, 1), (-1, 1)), ((-1, 1), (-1, -1))]:
                legs.append(sweep('r_br', [(a[0] * 2.2 * f0, a[1] * 2.2 * f0, z0), (b[0] * 2.2 * f1, b[1] * 2.2 * f1, z1)], dict(w=0.1, h=0.1, e=2), n=4))
            legs.append(box('r_ring', (0, 0, z1), (4.4 * f1, 4.4 * f1, 0.15), bev=0.0))
        live.append(part(join(legs, 'r_tower'), '#4a4d50', 'dark'))
        cab = box('r_cab', (0, 0, 26.8), (3.4, 3.4, 2.2), bev=0.06); live.append(part(cab, OLIVE, 'paint'))
        ant = []
        for i in range(6):
            for j in range(3):
                d = cyl('r_dip', 0.04, -0.35, 0.35, axis='Y', c=(-3.8 + i * 1.5, -0.4, -0.9 + j * 0.9), n=4); ant.append(d)
        ant.append(box('r_frame', (0, 0, 0), (9.5, 0.2, 2.6), bev=0.02))
        ant.append(cyl('r_shaft', 0.2, -1.4, 0, axis='Z', n=8))
        am = join([part(o, '#5a5d60', 'dark') for o in ant], kind + '_antenna'); move(am, (0, 0, 29.4)); lib.pivot(am, (0, 0, 29.4), root)
        dead = join([rubble('rd', 4, 4, 3, 9)] + [part(sweep('rd_leg', [(x, y, 0), (x * 2.5 + 3, y * 1.2, 3)], dict(w=0.25, h=0.25, e=2), n=6), '#2b2826', 'dark') for (x, y) in [(-2.2, -2.2), (2.2, 2.2)]], kind + '_dead')
    elif kind == 'tower':
        b1 = box('t_b1', (0, 0, 4.5), (7, 7, 9), bev=0.1); live.append(part(b1, '#d4d1c6', 'concrete'))
        for z in (2.2, 6.0):
            for s in (1, -1):
                w = box('t_w', (0, s * 3.52, z), (4.5, 0.08, 1.2), bev=0.0); live.append(part(w, '#1d252c', 'glass'))
        cab = box('t_cab', (0, 0, 10.6), (8.2, 8.2, 3.0), bev=0.08); live.append(part(cab, (lambda c, n_: '#1d252c' if 9.6 < c.z < 11.6 and abs(n_.z) < 0.5 else '#d4d1c6'), 'paint'))
        roof = box('t_roof', (0, 0, 12.3), (9.4, 9.4, 0.4), bev=0.05); live.append(part(roof, '#4a4d50', 'dark'))
        bal = box('t_bal', (0, 0, 9.05), (9.6, 9.6, 0.2), bev=0.0); live.append(part(bal, '#d4d1c6', 'concrete'))
        mast = cyl('t_mast', 0.08, 12.5, 16, axis='Z', c=(2.5, 2.5, 0), n=6); live.append(part(mast, DARK, 'dark'))
        st_ = []
        for k in range(12):
            st_.append(box('t_step', (4.2, -3 + k * 0.5, 0.35 + k * 0.72), (1.2, 0.45, 0.12), bev=0.0))
        live.append(part(join(st_, 't_stairs'), '#5b5e60', 'dark'))
        dead = join([rubble('td', 6, 6, 3, 11), part(box('td_stub', (0, 0, 1.5), (7, 7, 3), bev=0.1), '#4a4641', 'concrete')], kind + '_dead')
    elif kind == 'barracks':
        hut = box('b_hut', (0, 0, 2.3), (9.6, 25.6, 3.6), bev=0.06); live.append(part(hut, '#8b7f66', 'wood'))
        roof = plate('b_roof', [(-5.6, 4.0), (0, 6.6), (5.6, 4.0), (5.6, 3.8), (0, 6.35), (-5.6, 3.8)], -13.4, 13.4, bev=0.0, axis='Y'); live.append(part(roof, '#59534a', 'corrugated'))
        for k in range(-5, 6):
            for s in (1, -1):
                w = box('b_win', (s * 4.82, k * 2.2, 2.6), (0.06, 1.0, 0.9), bev=0.0); live.append(part(w, '#1d252c', 'glass'))
        for (x, y) in [(-4.5, -12.5), (4.5, -12.5), (-4.5, 12.5), (4.5, 12.5), (0, 0)]:
            pier = box('b_pier', (x, y, 0.25), (0.5, 0.5, 0.5), bev=0.02); live.append(part(pier, CONC, 'concrete'))
        door = box('b_door', (0, -12.83, 1.6), (1.2, 0.06, 2.2), bev=0.0); live.append(part(door, '#4b3f30', 'wood'))
        dead = join([rubble('bd', 5, 13, 2, 13)], kind + '_dead')
    elif kind == 'bunker':
        b = box('k_b', (0, 0, 2.0), (12, 9, 4), bev=0.6, seg=3); live.append(part(b, CONC, 'concrete'))
        for x in (-3, 0, 3):
            e = box('k_emb', (x, -4.52, 2.6), (1.6, 0.1, 0.5), bev=0.0); live.append(part(e, '#151515', 'dark'))
        earth = lathe('k_earth', [(9, 0), (7, 1.8), (6.3, 2.2)], n=24, axis='Z'); scale(earth, (1, 0.85, 1)); live.append(part(earth, '#7d7457', 'concrete'))
        dead = join([rubble('kd', 6, 5, 2, 17), part(box('kd_b', (0, 0, 1.0), (11, 8, 2), bev=0.4, seg=2), '#55514a', 'concrete')], kind + '_dead')
    elif kind == 'depot':
        rnd = random.Random(4)
        for i in range(9):
            d = cyl('d_drum', 0.3, 0, 0.9, axis='Z', c=(-1.6 + (i % 3) * 0.66, -2.6 + (i // 3) * 0.66, 0), n=12); live.append(part(d, ['#4a5240', '#6b5a3c', '#3f4a52'][i % 3], 'paint'))
        for i in range(5):
            c = box('d_crate', (1.2 + (i % 2) * 1.3, -1 + (i // 2) * 1.2, 0.45 + (0.9 if i == 4 else 0)), (1.2, 1.1, 0.9), bev=0.03); live.append(part(c, '#7a6a4c', 'wood'))
        tarp = sphere('d_tarp', 1.6, c=(-1.2, 2.2, 0.0), n=12, m=8, sx=1.3, sy=1.1, sz=0.7)
        for v in tarp.data.vertices:
            if v.co.z < 0: v.co.z = 0
        live.append(part(tarp, '#5a5d44', 'canvas'))
        dead = join([rubble('dd', 3.5, 3.5, 1, 19)], kind + '_dead')
    elif kind == 'raft':
        fl = box('ra_float', (0, 0, 0.3), (26, 26, 0.8), bev=0.1); live.append(part(fl, '#6b5a44', 'wood'))
        for i in range(4):
            r = 12 - i * 3
            d = cyl('ra_ring', r, 0.7 + i * 0.03, 0.75 + i * 0.03, axis='Z', n=36); live.append(part(d, '#d8d6cc' if i % 2 else '#d0582a', 'paint'))
        for (x, y) in [(12, 12), (-12, 12), (12, -12), (-12, -12)]:
            b = cyl('ra_buoy', 1.2, -0.4, 2.0, axis='Z', c=(x, y, 0), n=12); live.append(part(b, '#d0582a', 'paint'))
        dead = join([rubble('rad', 8, 8, 1, 23)], kind + '_dead')
    lv = join(live, kind + '_live'); lv.parent = root
    dead.parent = root; dead.name = kind + '_dead'; dead.data.name = kind + '_dead'
    return root, lv, dead

# ------------------------------------------------------------------ vegetation
def palm(name, seed, H=11):
    rnd = random.Random(seed); out = []
    lean = rnd.uniform(0.6, 1.6); pts = []
    for i in range(9):
        u = i / 8; pts.append((lean * u * u * 1.6, 0, H * u))
    tr = sweep(name + '_trunk', pts, [dict(w=0.62 - 0.22 * (i / 8), h=0.62 - 0.22 * (i / 8), e=2) for i in range(9)], n=6)
    part(tr, (lambda c, n_: '#6d5d48' if int(c.z * 3) % 2 else '#5e503e'), 'bark'); out.append(tr)
    top = Vector(pts[-1])
    for k in range(9):
        a = 2 * math.pi * k / 9 + rnd.uniform(-0.2, 0.2); droop = rnd.uniform(0.5, 1.1); L = rnd.uniform(4.2, 5.6)
        spine = [top + Vector((math.cos(a) * L * u, math.sin(a) * L * u, 0.9 * u - droop * 2.2 * u * u)) for u in [0, 0.25, 0.5, 0.75, 1.0]]
        verts, faces = [], []
        for j, p in enumerate(spine):
            u = j / 4; w = 0.15 + 1.1 * math.sin(math.pi * min(1, u * 1.1)) * (1 - 0.6 * u)
            side = Vector((-math.sin(a), math.cos(a), 0))
            for s in (-1, 0, 1):
                verts.append(p + side * s * w + Vector((0, 0, -abs(s) * w * 0.35)))
        for j in range(4):
            b = j * 3
            faces += [[b, b + 1, b + 4, b + 3], [b + 1, b + 2, b + 5, b + 4]]
        fr = lib.mesh_obj(name + '_frond', verts, faces); part(fr, rnd.choice(['#3f6b2c', '#4b7a31', '#56833a']), 'leaf'); out.append(fr)
    for k in range(3):
        c_ = sphere(name + '_nut', 0.22, c=(top.x + math.cos(k * 2.1) * 0.35, top.y + math.sin(k * 2.1) * 0.35, top.z - 0.35), n=5, m=3); part(c_, '#5b4a2c', 'bark'); out.append(c_)
    return join(out, name)

def tree(name, seed, H=12):
    rnd = random.Random(seed); out = []
    tr = sweep(name + '_trunk', [(0, 0, 0), (rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), H * 0.55), (rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), H * 0.75)], [dict(w=0.9, h=0.9, e=2), dict(w=0.55, h=0.55, e=2), dict(w=0.35, h=0.35, e=2)], n=7)
    part(tr, '#5a4a3a', 'bark'); out.append(tr)
    for k in range(5 + rnd.randint(0, 2)):
        r = rnd.uniform(2.6, 4.2); a = rnd.uniform(0, 6.28); d = rnd.uniform(0.5, 2.6)
        b = sphere(name + '_crown', r, c=(math.cos(a) * d, math.sin(a) * d, H * 0.72 + rnd.uniform(-1, 2.2)), n=7, m=5, sz=0.72)
        for v in b.data.vertices:
            v.co += v.normal * rnd.uniform(-0.35, 0.35) * r * 0.3
        part(b, (lambda c, n_: rnd.choice(['#355e27', '#3e6a2d', '#2f5524']) if n_.z > -0.2 else '#26431d'), 'leaf'); out.append(b)
    return join(out, name)

def bush(name, seed):
    rnd = random.Random(seed); out = []
    for k in range(4):
        r = rnd.uniform(1.0, 1.8); a = rnd.uniform(0, 6.28)
        b = sphere(name + '_b', r, c=(math.cos(a) * 0.9, math.sin(a) * 0.9, r * 0.55), n=8, m=5, sz=0.7)
        for v in b.data.vertices:
            v.co += v.normal * rnd.uniform(-0.2, 0.2) * r * 0.3
        part(b, rnd.choice(['#3a6229', '#46702f']), 'leaf'); out.append(b)
    return join(out, name)

# ------------------------------------------------------------------ munitions (along -Y = game +Z)
def munitions():
    out = []
    b = lathe('bomb_b', [(0.02, -0.95), (0.14, -0.88), (0.21, -0.55), (0.21, 0.45), (0.09, 0.85), (0.05, 0.95)], n=16, axis='Y', cap0=True, cap1=True); part(b, '#3f4438', 'paint')
    fins = [part(plate('bomb_f', [(0.65, 0.0), (1.0, 0.0), (1.0, 0.36), (0.75, 0.2)], -0.012, 0.012, bev=0.0, axis='X'), '#3f4438', 'paint') for _ in range(4)]
    for k, f in enumerate(fins): rot(f, 45 + 90 * k, 'Y')
    band = cyl('bomb_band', 0.215, -0.3, -0.22, axis='Y', n=16); part(band, '#c8b04a', 'paint')
    out.append(attach_root('mun_bomb', join([b, band] + fins, 'bomb_mesh')))
    r = lathe('rocket_b', [(0.01, -0.85), (0.06, -0.75), (0.07, -0.55), (0.065, 0.75), (0.05, 0.8)], n=12, axis='Y', cap0=True, cap1=True); part(r, '#6a6e70', 'paint')
    rf = [part(plate('rocket_f', [(0.55, 0.06), (0.8, 0.06), (0.8, 0.24), (0.62, 0.24)], -0.008, 0.008, bev=0.0, axis='X'), '#55595b', 'paint') for _ in range(4)]
    for k, f in enumerate(rf): rot(f, 45 + 90 * k, 'Y')
    head = lathe('rocket_h', [(0.01, -0.85), (0.07, -0.72), (0.07, -0.55)], n=12, axis='Y'); part(head, '#9a5a2a', 'paint')
    out.append(attach_root('mun_rocket', join([r, head] + rf, 'rocket_mesh')))
    t = lathe('torp_b', [(0.02, -2.25), (0.16, -2.15), (0.26, -1.9), (0.27, 1.6), (0.18, 2.05), (0.08, 2.2)], n=16, axis='Y', cap0=True, cap1=True); part(t, '#3b3f40', 'paint')
    tf = [part(plate('torp_f', [(1.95, 0.0), (2.2, 0.0), (2.2, 0.32), (2.05, 0.3)], -0.01, 0.01, bev=0.0, axis='X'), '#2f3233', 'paint') for _ in range(4)]
    for k, f in enumerate(tf): rot(f, 90 * k, 'Y')
    pr = cyl('torp_p', 0.2, 2.2, 2.26, axis='Y', n=6); part(pr, '#8a7a52', 'dark')
    out.append(attach_root('mun_torpedo', join([t, pr] + tf, 'torpedo_mesh')))
    return out

def far_copy(kind, root, objs, suffix, ratio):
    """A reduced copy of the structure (turret and antenna included) as one mesh; the game merges it into one draw past 700 m."""
    cps = [dup(o, o.name + suffix + '_c') for o in objs]
    m = join(cps, kind + suffix); decimate(m, ratio)
    mw = m.matrix_world.copy(); m.parent = root; m.matrix_world = mw
    return m

def attach_root(name, mesh):
    r = empty(name); mesh.parent = r; return r

def build_all(out):
    import os, time
    lib.reset(); t = time.time(); roots = []
    kinds = ['hangar', 'fuel', 'aa', 'flak', 'radar', 'tower', 'barracks', 'bunker', 'depot', 'raft']
    for i, k in enumerate(kinds):
        root, lv, dead = structure(k)
        meshes = [o for o in [lv, dead] + [c for c in root.children_recursive if c.type == 'MESH'] if o]
        lib.ao([lv], [m for m in meshes if m is not dead], dist=4.0, rays=20, strength=0.7, ground=0.0)
        lib.ao([dead], [dead], dist=3.0, rays=16, strength=0.6, ground=0.0)
        far_copy(k, root, [m for m in meshes if m is not dead], '_lod1', 0.3); far_copy(k, root, [dead], '_deadlod1', 0.35)
        root.location = (i * 80, 0, 0); roots.append(root)
    for i, (nm, fn) in enumerate([('palm0', lambda: palm('palm0_mesh', 1)), ('palm1', lambda: palm('palm1_mesh', 2, 13)), ('tree0', lambda: tree('tree0_mesh', 3)), ('tree1', lambda: tree('tree1_mesh', 4, 14)), ('tree2', lambda: tree('tree2_mesh', 5, 10)), ('bush0', lambda: bush('bush0_mesh', 6))]):
        m = fn(); lib.ao([m], [m], dist=2.5, rays=16, strength=0.6, ground=0.0)
        r = empty(nm); m.parent = r; r.location = (i * 30, 120, 0); roots.append(r)
    for i, r in enumerate(munitions()):
        r.location = (i * 6, 200, 0); roots.append(r)
    lib.finish([o for o in __import__('bpy').context.scene.objects if o.type == 'MESH'], uv=2.0)
    for r in roots: r.location = (0, 0, 0)     # every root sits at the origin in the file; the game places them
    lib.export(roots, os.path.join(out, 'ground.glb'))
    print('built ground', lib.stats(roots), '%.1fs' % (time.time() - t))
