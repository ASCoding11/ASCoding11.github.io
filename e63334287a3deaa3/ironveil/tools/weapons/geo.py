# Geometry helpers for the Midnight Ops weapons (Blender as a Python module, bpy 4.x/5.x).
# Blender frame for every weapon: barrel along -Y, up +Z, the weapon's right side is -X, metres,
# origin at the right-hand grip. (glTF export turns this into barrel +Z, up +Y.)
import bpy, bmesh, math
from mathutils import Vector, Matrix

def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob

def set_active(ob):
    for o in list(bpy.context.scene.objects):
        if o is not None:
            o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)

def mesh_obj(name, verts, faces, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    for p in me.polygons:
        p.use_smooth = smooth
    return link(bpy.data.objects.new(name, me))

def apply_mods(ob):
    set_active(ob)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)

# ------------------------------------------------------------------ primitives
def superellipse(t, e):
    c, s = math.cos(t), math.sin(t)
    return (math.copysign(abs(c) ** (2.0 / e), c), math.copysign(abs(s) ** (2.0 / e), s))

def section_pts(st, n):
    """Cross-section of a loft station: dict with zt, zb (top/bottom), wt, wb (widths at top/bottom),
    e (exponent, 2 = ellipse, higher = squarer), et/eb optional per half, x (centre offset)."""
    zt, zb = st['zt'], st['zb']
    wt, wb = st.get('wt', st.get('w')), st.get('wb', st.get('w'))
    mid = (zt + zb) / 2.0
    ht, hb = zt - mid, mid - zb
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        e = st.get('et', st.get('e', 2.6)) if math.sin(t) >= 0 else st.get('eb', st.get('e', 2.6))
        u, v = superellipse(t, e)
        z = mid + (ht if v >= 0 else hb) * v
        f = (z - zb) / max(1e-6, zt - zb)
        hw = (wb + (wt - wb) * f) / 2.0
        pts.append((st.get('x', 0.0) + hw * u, z))
    return pts

def loft_y(name, stations, n=24, cap0=True, cap1=True):
    """Loft along Y through stations (each has 'y' plus the section_pts keys). Stations ordered by y."""
    verts, faces = [], []
    for st in stations:
        for x, z in section_pts(st, n):
            verts.append((x, st['y'], z))
    m = len(stations)
    for i in range(m - 1):
        for k in range(n):
            a = i * n + k; b = i * n + (k + 1) % n
            faces.append([a, b, b + n, a + n])
    if cap0:
        c = len(verts); st = stations[0]
        verts.append((st.get('x', 0.0), st['y'], (st['zt'] + st['zb']) / 2))
        for k in range(n):
            faces.append([c, (k + 1) % n, k])
    if cap1:
        c = len(verts); st = stations[-1]; o = (m - 1) * n
        verts.append((st.get('x', 0.0), st['y'], (st['zt'] + st['zb']) / 2))
        for k in range(n):
            faces.append([c, o + k, o + (k + 1) % n])
    ob = mesh_obj(name, verts, faces)
    fix_normals(ob)
    return ob

def sweep(name, path, secs, n=12, up=Vector((0, 0, 1)), cap=True, closed=False):
    """Sweep a section along a 3D polyline. secs: one dict per path point (w, h, e) or a single dict.
    The section's width runs along 'side' (up x tangent), height along the in-plane normal."""
    P = [Vector(p) for p in path]
    if isinstance(secs, dict):
        secs = [secs] * len(P)
    verts, faces = [], []
    m = len(P)
    for i, p in enumerate(P):
        if closed:
            t = (P[(i + 1) % m] - P[i - 1]).normalized()
        else:
            t = (P[min(i + 1, m - 1)] - P[max(i - 1, 0)]).normalized()
        u = up if abs(t.dot(up)) < 0.98 else Vector((1, 0, 0))
        side = u.cross(t).normalized()
        nrm = t.cross(side).normalized()
        s = secs[i]
        for k in range(n):
            a = 2 * math.pi * k / n + s.get('rot', 0.0)
            cu, sv = superellipse(a, s.get('e', 2.0))
            verts.append(p + side * (cu * s['w'] / 2) + nrm * (sv * s['h'] / 2))
    rng = m if closed else m - 1
    for i in range(rng):
        i2 = (i + 1) % m
        for k in range(n):
            a = i * n + k; b = i * n + (k + 1) % n
            faces.append([a, b, i2 * n + (k + 1) % n, i2 * n + k])
    if cap and not closed:
        faces.append(list(range(n))[::-1])
        faces.append([(m - 1) * n + k for k in range(n)])
    ob = mesh_obj(name, verts, faces)
    fix_normals(ob)
    return ob

def lathe(name, prof, n=24, axis='Y', center=(0, 0, 0), cap0=False, cap1=False, phase=0.0, sx=1.0, sz=1.0, closed=False):
    """Revolve a (radius, position-along-axis) profile. axis 'Y': along -Y forward; 'Z' vertical; 'X' sideways."""
    cx, cy, cz = center
    verts, faces = [], []
    for k in range(n):
        a = 2 * math.pi * k / n + phase
        c, s = math.cos(a), math.sin(a)
        for r, t in prof:
            if axis == 'Y':
                verts.append((cx + c * r * sx, cy + t, cz + s * r * sz))
            elif axis == 'Z':
                verts.append((cx + c * r * sx, cy + s * r * sz, cz + t))
            else:
                verts.append((cx + t, cy + c * r * sx, cz + s * r * sz))
    m = len(prof)
    for k in range(n):
        k2 = (k + 1) % n
        for j in range(m - 1 + (1 if closed else 0)):
            j2 = (j + 1) % m
            faces.append([k * m + j, k * m + j2, k2 * m + j2, k2 * m + j])
    if cap0:
        faces.append([k * m for k in range(n)])
    if cap1:
        faces.append([k * m + m - 1 for k in range(n)][::-1])
    ob = mesh_obj(name, verts, faces)
    fix_normals(ob)
    return ob

def cyl(name, r, a, b, axis='Y', c=(0, 0, 0), n=16, r1=None, caps=True, phase=0.0):
    """Cylinder of radius r from a to b along axis (positions relative to c)."""
    r1 = r if r1 is None else r1
    return lathe(name, [(r, a), (r1, b)], n=n, axis=axis, center=c, cap0=caps, cap1=caps, phase=phase)

def box(name, c, s, bev=0.0015, seg=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * s[0] + c[0], v.co.y * s[1] + c[1], v.co.z * s[2] + c[2]))
    if bev > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=seg, affect='EDGES', profile=0.5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    return ob

def plate(name, pts, x0, x1, bev=0.0008, seg=1, axis='X'):
    """Flat part: side profile pts (y, z) extruded across X from x0 to x1 (axis 'X'),
    or top-view pts (x, y) extruded along Z from x0 to x1 (axis 'Z'), or front-view (x, z) along Y (axis 'Y')."""
    bm = bmesh.new()
    if axis == 'X':
        vs = [bm.verts.new((x0, a, b)) for a, b in pts]
    elif axis == 'Z':
        vs = [bm.verts.new((a, b, x0)) for a, b in pts]
    else:
        vs = [bm.verts.new((a, x0, b)) for a, b in pts]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    d = x1 - x0
    vec = (d, 0, 0) if axis == 'X' else ((0, 0, d) if axis == 'Z' else (0, d, 0))
    bmesh.ops.translate(bm, verts=nv, vec=vec)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=seg, affect='EDGES', profile=0.5, clamp_overlap=True)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return link(bpy.data.objects.new(name, me))

def torus(name, R, r, c=(0, 0, 0), axis='X', n=16, m=8, sx=1.0, sy=1.0):
    """Ring with major radius R (scaled sx, sy in the ring plane) around the given axis."""
    verts, faces = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        for j in range(m):
            b = 2 * math.pi * j / m
            rr = R + r * math.cos(b)
            p = (rr * math.cos(a) * sx, rr * math.sin(a) * sy, r * math.sin(b))
            if axis == 'X':
                p = (p[2], p[0], p[1])
            elif axis == 'Y':
                p = (p[0], p[2], p[1])
            verts.append((p[0] + c[0], p[1] + c[1], p[2] + c[2]))
    for i in range(n):
        for j in range(m):
            a = i * m + j; b = i * m + (j + 1) % m
            a2 = ((i + 1) % n) * m + j; b2 = ((i + 1) % n) * m + (j + 1) % m
            faces.append([a, a2, b2, b])
    ob = mesh_obj(name, verts, faces)
    fix_normals(ob)
    return ob

def sphere(name, r, c=(0, 0, 0), n=12, m=8, sx=1, sy=1, sz=1):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=n, v_segments=m, radius=r)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx + c[0], v.co.y * sy + c[1], v.co.z * sz + c[2]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return link(bpy.data.objects.new(name, me))

# ------------------------------------------------------------------ operations
def fix_normals(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    closed = all(e.is_manifold for e in bm.edges)
    if closed and bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()

def boolean(ob, cutter, op='DIFFERENCE', keep=False):
    m = ob.modifiers.new('bool', 'BOOLEAN'); m.operation = op; m.object = cutter
    m.solver = 'EXACT' if 'EXACT' in [i.identifier for i in m.bl_rna.properties['solver'].enum_items] else m.solver
    apply_mods(ob)
    if not keep:
        bpy.data.objects.remove(cutter)
    return ob

def bevel(ob, w, seg=2, angle=35):
    m = ob.modifiers.new('bev', 'BEVEL'); m.width = w; m.segments = seg
    m.limit_method = 'ANGLE'; m.angle_limit = math.radians(angle)
    m.harden_normals = False
    apply_mods(ob)
    return ob

def transform(ob, M):
    ob.data.transform(M); ob.data.update()
    return ob

def move(ob, d):
    return transform(ob, Matrix.Translation(Vector(d)))

def rot(ob, deg, axis, pivot=(0, 0, 0)):
    p = Vector(pivot)
    return transform(ob, Matrix.Translation(p) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-p))

def scale(ob, s, pivot=(0, 0, 0)):
    p = Vector(pivot)
    S = Matrix.Diagonal((s[0], s[1], s[2], 1.0))
    return transform(ob, Matrix.Translation(p) @ S @ Matrix.Translation(-p))

def mirror_x(ob, name=None):
    c = ob.copy(); c.data = ob.data.copy(); link(c)
    if name:
        c.name = name
    transform(c, Matrix.Diagonal((-1, 1, 1, 1)))
    fix_normals(c)
    return c

def join(obs, name):
    obs = [o for o in obs if o is not None]
    set_active(obs[0])
    for o in obs:
        o.select_set(True)
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name; ob.data.name = name
    return ob

def smooth_by_angle(ob, deg=32):
    me = ob.data
    for p in me.polygons:
        p.use_smooth = True
    if hasattr(me, 'set_sharp_from_angle'):
        me.set_sharp_from_angle(angle=math.radians(deg))
    return ob

def weighted_normals(ob):
    m = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); m.keep_sharp = True; m.weight = 50
    apply_mods(ob)
    return ob

def set_mat(ob, mat):
    ob.data.materials.clear(); ob.data.materials.append(mat)
    return ob

def path_arc(c, r, a0, a1, n, plane='YZ'):
    """Points on an arc (degrees) around centre c in the given plane."""
    out = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        if plane == 'YZ':
            out.append((c[0], c[1] + r * math.cos(a), c[2] + r * math.sin(a)))
        elif plane == 'XY':
            out.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a), c[2]))
        else:
            out.append((c[0] + r * math.cos(a), c[1], c[2] + r * math.sin(a)))
    return out

def bezier(pts, n):
    """Quadratic/cubic Bezier through control points (list of 3 or 4 tuples)."""
    P = [Vector(p) for p in pts]
    out = []
    for i in range(n + 1):
        t = i / n
        if len(P) == 3:
            q = P[0] * (1 - t) ** 2 + P[1] * 2 * t * (1 - t) + P[2] * t * t
        else:
            q = P[0] * (1 - t) ** 3 + P[1] * 3 * t * (1 - t) ** 2 + P[2] * 3 * t * t * (1 - t) + P[3] * t ** 3
        out.append(tuple(q))
    return out
