# Period-plausible weapon models built from code (no markings). Blender frame: barrel along -Y, up +Z,
# origin = right-hand grip point. Each weapon gets empties: muzzle, gripL (left-hand support point).
import bpy, bmesh, math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix
import mhlib as L, geo as G, mats as MT

def prof(name, pts, width, bev=0.003, x=0.0, seg=1):
    """Side profile (y,z) list (counter-clockwise or not), extruded across X."""
    bm = bmesh.new()
    vs = [bm.verts.new((x - width / 2, y, z)) for y, z in pts]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(width, 0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = G.link(bpy.data.objects.new(name, me))
    if bev > 0:
        m = ob.modifiers.new('b', 'BEVEL'); m.width = bev; m.segments = seg; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(30)
        G.apply_mods(ob)
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.set_sharp_from_angle(angle=math.radians(40)) if hasattr(ob.data, 'set_sharp_from_angle') else None
    return ob

def cyl(name, r, y0, y1, z=0.0, x=0.0, n=12, r1=None, axis='Y', caps=True):
    """Cylinder along -Y from y0 to y1 (y1 < y0 is forward)."""
    r1 = r if r1 is None else r1
    verts, faces = [], []
    for k in range(n):
        a = 2 * math.pi * k / n
        c, s = math.cos(a), math.sin(a)
        if axis == 'Y':
            verts += [(x + c * r, y0, z + s * r), (x + c * r1, y1, z + s * r1)]
        elif axis == 'Z':
            verts += [(x + c * r, z + s * r, y0), (x + c * r1, z + s * r1, y1)]
        else:
            verts += [(y0, x + c * r, z + s * r), (y1, x + c * r1, z + s * r1)]
    for k in range(n):
        a, b = 2 * k, 2 * ((k + 1) % n)
        faces.append([a, b, b + 1, a + 1])
    if caps:
        faces.append([2 * k for k in range(n)][::-1]); faces.append([2 * k + 1 for k in range(n)])
    ob = G.mesh_obj(name, verts, faces)
    return ob

def bx(name, cx, cy, cz, sx, sy, sz, bev=0.002):
    return G.box(name, (sx, sy, sz), Matrix.Translation((cx, cy, cz)), bev=bev, seg=1)

def empty(name, loc, parent, rot=None):
    e = bpy.data.objects.new(name, None); G.link(e)
    e.location = loc
    if rot is not None: e.rotation_mode = 'QUATERNION'; e.rotation_quaternion = rot
    e.parent = parent
    return e

def finish(name, parts, muzzle, gripL):
    for ob, mat in parts:
        ob.data.materials.clear(); ob.data.materials.append(mat)
    ob = G.join([p for p, _ in parts], name)
    G.link  # noqa
    empty(name + '_muzzle', muzzle, ob)
    empty(name + '_gripL', gripL, ob)
    return ob

def materials():
    import wear as WR
    return {
        'wood': WR.wood('w_wood'),
        'steel': WR.blued('w_steel'),
        'park': WR.blued('w_park', '#4c4e47', '#41433d', bright='#a8a8a0', park=True),
        'od': WR.painted_metal('w_od', '#45472f', '#383a27', chip=0.6),
        'black': WR.blued('w_black', '#262523', '#2e2c2a', bright='#6a6864', wear=0.6, park=True),
        'brass': WR.blued('w_brass', '#9a8048', '#80683a', bright='#c8b070', wear=0.5),
        'leather': WR.leather('w_leather', '#3a281b', '#24180f', polish=0.5),
        'glass': WR.flat('w_glass', '#0e1216', rough=0.08),
    }

def rifle_scoped(M):
    """Bolt-action service rifle with a side-mounted-looking scope (generic). Length ~1.10 m."""
    p = []
    # stock: butt at +y 0.42, wrist at 0, fore-end to -0.46
    stock = [(0.345, -0.075), (0.345, 0.035), (0.24, 0.02), (0.09, 0.012), (0.04, 0.0), (0.0, 0.002),
             (-0.06, 0.012), (-0.46, 0.014), (-0.47, -0.012), (-0.06, -0.02), (0.0, -0.045), (0.05, -0.06),
             (0.11, -0.045), (0.24, -0.06)]
    p.append((prof('stock', stock, 0.042, bev=0.006, seg=2), M['wood']))
    p.append((prof('handguard', [(-0.08, 0.026), (-0.40, 0.024), (-0.40, 0.012), (-0.08, 0.012)], 0.03, bev=0.004), M['wood']))
    p.append((cyl('barrel', 0.0085, -0.40, -0.68, z=0.020, n=10, r1=0.0075), M['steel']))
    p.append((cyl('receiver', 0.016, 0.03, -0.12, z=0.022, n=12), M['steel']))
    p.append((cyl('bolt', 0.004, 0.0, 0.0, z=0.03, n=6), M['steel']))
    bh = cyl('boltH', 0.004, 0.0, 0.0, n=6)
    bm = bh.data
    for v in bm.vertices: v.co = Vector((v.co.x * 1, v.co.y, v.co.z))
    p.append((cyl('boltArm', 0.0045, 0.02, 0.02, n=6, axis='X', z=0.03, x=0.0) if False else bx('boltArm', -0.035, 0.02, 0.022, 0.05, 0.008, 0.008), M['steel']))
    p.append((G.box('boltKnob', (0.014, 0.014, 0.014), Matrix.Translation((-0.062, 0.025, 0.012)), bev=0.005, seg=2), M['steel']))
    p.append((bx('guard', 0, -0.005, -0.035, 0.012, 0.07, 0.006), M['steel']))
    p.append((bx('mag', 0, -0.05, -0.02, 0.026, 0.07, 0.012), M['steel']))
    p.append((bx('band1', 0, -0.36, 0.02, 0.034, 0.012, 0.042), M['steel']))
    p.append((bx('fsight', 0, -0.665, 0.034, 0.004, 0.012, 0.016), M['steel']))
    p.append((bx('butt', 0, 0.347, -0.02, 0.044, 0.006, 0.11), M['steel']))
    # scope: tube with objective bell, eyepiece, two rings
    sz = 0.072
    p.append((cyl('scope', 0.011, 0.11, -0.13, z=sz, n=14), M['steel']))
    p.append((cyl('scopeObj', 0.011, -0.13, -0.19, z=sz, n=14, r1=0.017), M['steel']))
    p.append((cyl('scopeEye', 0.015, 0.16, 0.11, z=sz, n=14, r1=0.011), M['steel']))
    p.append((cyl('lensO', 0.0165, -0.19, -0.192, z=sz, n=14), M['glass']))
    p.append((bx('ring1', 0, 0.06, 0.052, 0.012, 0.012, 0.036), M['steel']))
    p.append((bx('ring2', 0, -0.10, 0.052, 0.012, 0.012, 0.036), M['steel']))
    p.append((bx('turretT', 0, -0.01, sz + 0.016, 0.014, 0.014, 0.012), M['steel']))
    p.append((bx('turretS', 0.016, -0.01, sz, 0.012, 0.014, 0.014), M['steel']))
    for o, _ in p:
        if o.name.startswith('boltH'): pass
    bpy.data.objects.remove(bh)
    return finish('rifleScoped', p, (0, -0.685, 0.02), (0, -0.30, 0.0))

def enemy_rifle(M):
    p = []
    stock = [(0.35, -0.08), (0.35, 0.03), (0.24, 0.018), (0.09, 0.012), (0.04, 0.0), (0.0, 0.002),
             (-0.06, 0.012), (-0.50, 0.014), (-0.52, -0.008), (-0.06, -0.022), (0.0, -0.05), (0.06, -0.062),
             (0.12, -0.05), (0.24, -0.065)]
    p.append((prof('stock', stock, 0.044, bev=0.006, seg=2), M['wood']))
    p.append((prof('handguard', [(-0.10, 0.026), (-0.36, 0.024), (-0.36, 0.012), (-0.10, 0.012)], 0.03, bev=0.004), M['wood']))
    p.append((cyl('barrel', 0.0085, -0.48, -0.72, z=0.018, n=10, r1=0.0075), M['steel']))
    p.append((cyl('receiver', 0.015, 0.03, -0.12, z=0.022, n=12), M['steel']))
    p.append((bx('boltArm', -0.03, 0.02, 0.012, 0.04, 0.008, 0.008), M['steel']))
    p.append((G.box('boltKnob', (0.016, 0.016, 0.016), Matrix.Translation((-0.052, 0.024, -0.002)), bev=0.006, seg=2), M['steel']))
    p.append((bx('guard', 0, -0.005, -0.035, 0.012, 0.07, 0.006), M['steel']))
    p.append((bx('band1', 0, -0.30, 0.02, 0.034, 0.012, 0.042), M['steel']))
    p.append((bx('band2', 0, -0.47, 0.016, 0.03, 0.025, 0.036), M['steel']))
    p.append((bx('rsight', 0, -0.14, 0.04, 0.02, 0.05, 0.008), M['steel']))
    p.append((bx('fsight', 0, -0.705, 0.034, 0.012, 0.012, 0.016), M['steel']))
    p.append((bx('butt', 0, 0.352, -0.025, 0.046, 0.006, 0.11), M['steel']))
    return finish('enemyRifle', p, (0, -0.725, 0.018), (0, -0.28, 0.0))

def smg(M):
    """Allied-style SMG: wooden butt and fore-grip, finned barrel, stick magazine."""
    p = []
    p.append((prof('butt', [(0.36, -0.07), (0.36, 0.02), (0.12, 0.018), (0.07, 0.0), (0.07, -0.03), (0.16, -0.035)], 0.04, bev=0.006, seg=2), M['wood']))
    p.append((prof('grip', [(0.02, -0.0), (0.06, -0.0), (0.05, -0.10), (0.015, -0.10)], 0.03, bev=0.006, seg=2), M['wood']))
    p.append((prof('receiver', [(0.10, 0.04), (-0.17, 0.04), (-0.17, 0.0), (0.10, 0.0)], 0.036, bev=0.004), M['park']))
    p.append((prof('fgrip', [(-0.22, 0.0), (-0.18, 0.0), (-0.20, -0.10), (-0.235, -0.10)], 0.03, bev=0.006, seg=2), M['wood']))
    p.append((cyl('barrel', 0.012, -0.17, -0.34, z=0.022, n=10), M['park']))
    for i in range(5):
        p.append((cyl('fin%d' % i, 0.017, -0.18 - i * 0.012, -0.185 - i * 0.012, z=0.022, n=10), M['park']))
    p.append((bx('mag', 0, -0.07, -0.08, 0.024, 0.04, 0.16), M['park']))
    p.append((bx('guard', 0, 0.0, -0.02, 0.01, 0.06, 0.006), M['park']))
    p.append((bx('rsight', 0, 0.06, 0.05, 0.012, 0.02, 0.016), M['park']))
    return finish('smg', p, (0, -0.345, 0.022), (0, -0.21, -0.08))

def enemy_smg(M):
    p = []
    p.append((prof('receiver', [(0.08, 0.035), (-0.22, 0.035), (-0.22, 0.005), (0.08, 0.005)], 0.032, bev=0.004), M['steel']))
    p.append((cyl('barrel', 0.010, -0.22, -0.37, z=0.02, n=10), M['steel']))
    p.append((prof('grip', [(0.02, 0.005), (0.06, 0.005), (0.06, -0.09), (0.02, -0.09)], 0.03, bev=0.006, seg=2), M['black']))
    p.append((bx('mag', 0, -0.13, -0.10, 0.022, 0.032, 0.20), M['steel']))
    p.append((bx('magwell', 0, -0.13, -0.01, 0.028, 0.04, 0.04), M['steel']))
    # folding stock (skeletal)
    p.append((bx('stockA', 0.012, 0.22, 0.0, 0.006, 0.28, 0.008), M['steel']))
    p.append((bx('stockB', -0.012, 0.22, 0.0, 0.006, 0.28, 0.008), M['steel']))
    p.append((bx('stockC', 0, 0.36, -0.03, 0.032, 0.012, 0.08), M['steel']))
    p.append((bx('fsight', 0, -0.36, 0.034, 0.008, 0.01, 0.014), M['steel']))
    return finish('enemySmg', p, (0, -0.375, 0.02), (0, -0.13, -0.04))

def pistol(M):
    p = []
    p.append((prof('slide', [(0.03, 0.03), (-0.17, 0.03), (-0.17, 0.0), (0.03, 0.0)], 0.024, bev=0.003), M['park']))
    p.append((prof('frame', [(0.03, 0.0), (-0.12, 0.0), (-0.12, -0.012), (-0.01, -0.012), (0.0, -0.012)], 0.022, bev=0.002), M['park']))
    p.append((prof('grip', [(0.035, 0.0), (0.0, 0.0), (0.012, -0.11), (0.05, -0.11)], 0.028, bev=0.004, seg=2), M['wood']))
    p.append((bx('guard', 0, -0.03, -0.025, 0.008, 0.045, 0.004), M['park']))
    return finish('pistol', p, (0, -0.172, 0.018), (0, 0.005, -0.06))

def mg(M):
    p = []
    p.append((cyl('shroud', 0.022, -0.05, -0.55, z=0.03, n=12), M['steel']))
    p.append((cyl('muzzleB', 0.016, -0.55, -0.62, z=0.03, n=10, r1=0.02), M['steel']))
    p.append((prof('receiver', [(0.15, 0.06), (-0.06, 0.06), (-0.06, 0.0), (0.15, 0.0)], 0.05, bev=0.004), M['steel']))
    p.append((prof('stock', [(0.50, -0.06), (0.50, 0.04), (0.15, 0.05), (0.15, 0.005), (0.30, -0.02)], 0.04, bev=0.006, seg=2), M['black']))
    p.append((prof('grip', [(0.06, 0.0), (0.10, 0.0), (0.09, -0.10), (0.055, -0.10)], 0.03, bev=0.006, seg=2), M['black']))
    p.append((bx('cover', 0, 0.04, 0.075, 0.052, 0.18, 0.03), M['steel']))
    p.append((bx('belt', -0.05, 0.0, 0.03, 0.06, 0.03, 0.01), M['brass']))
    # bipod legs folded forward under the shroud, spread slightly
    for s in (-1, 1):
        leg = cyl('bip%d' % s, 0.005, -0.48, -0.20, z=0.0, x=s * 0.03, n=6)
        p.append((leg, M['steel']))
    p.append((bx('fsight', 0, -0.54, 0.06, 0.008, 0.01, 0.03), M['steel']))
    return finish('mg', p, (0, -0.625, 0.03), (0, 0.09, 0.0))

def knife(M):
    p = []
    p.append((prof('blade', [(0.0, 0.006), (-0.17, 0.006), (-0.19, -0.004), (-0.17, -0.014), (0.0, -0.014)], 0.004, bev=0.001), M['park']))
    p.append((bx('guard', 0, 0.004, -0.004, 0.012, 0.008, 0.04), M['park']))
    p.append((cyl('handle', 0.012, 0.11, 0.008, z=-0.004, n=8, r1=0.013), M['leather']))
    p.append((cyl('pommel', 0.013, 0.12, 0.11, z=-0.004, n=8), M['park']))
    return finish('knife', p, (0, -0.19, 0.0), (0, 0.0, 0.0))

def binoculars(M):
    p = []
    for s in (-1, 1):
        p.append((cyl('tube%d' % s, 0.022, 0.06, -0.07, x=s * 0.035, n=12), M['black']))
        p.append((cyl('obj%d' % s, 0.026, -0.07, -0.10, x=s * 0.038, n=12), M['black']))
        p.append((cyl('eye%d' % s, 0.013, 0.09, 0.06, x=s * 0.03, n=10), M['black']))
        p.append((cyl('lens%d' % s, 0.024, -0.10, -0.101, x=s * 0.038, n=12), M['glass']))
    p.append((bx('bridge', 0, 0.0, 0.0, 0.03, 0.1, 0.02), M['black']))
    return finish('binoculars', p, (0, -0.10, 0.0), (0.035, 0.0, 0.0))

def grenade(M):
    prof_ = [(0.0, 0.06), (0.012, 0.059), (0.02, 0.05), (0.028, 0.035), (0.03, 0.0), (0.028, -0.03), (0.02, -0.045), (0.0, -0.048)]
    gr = G.lathe('body', [(r, z) for r, z in prof_], n=16, sx=1.0, sy=1.0)
    for v in gr.data.vertices:
        rr = math.hypot(v.co.x, v.co.y)
        if rr < 1e-4: continue
        th = math.atan2(v.co.y, v.co.x)
        bump = 1.0 + 0.09 * max(0.0, math.cos(8 * th)) * max(0.0, math.cos(v.co.z * 95.0))
        v.co.x *= bump; v.co.y *= bump
    p = [(gr, M['od'])]
    p.append((cyl('fuse', 0.009, 0.075, 0.055, axis='Z', n=8), M['park']))
    p.append((bx('spoon', 0.012, 0.0, 0.045, 0.004, 0.012, 0.05), M['park']))
    ring = G.lathe('ring', [(0.011, 0.0), (0.013, 0.002), (0.011, 0.004)], n=8, M=Matrix.Translation((-0.014, 0, 0.07)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    p.append((ring, M['park']))
    return finish('grenade', p, (0, 0, 0.07), (0, 0, 0))

BUILDERS = [rifle_scoped, smg, pistol, enemy_rifle, enemy_smg, mg, knife, binoculars, grenade]
