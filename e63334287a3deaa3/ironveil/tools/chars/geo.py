# Geometry helpers for outfits: smoothing, displacement, ring lofts, straps, boxes.
import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

def link(ob):
    bpy.context.scene.collection.objects.link(ob); return ob

def mesh_obj(name, verts, faces, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    for p in me.polygons: p.use_smooth = smooth
    return link(bpy.data.objects.new(name, me))

def coords(me):
    a = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', a); return a.reshape(-1, 3)

def set_coords(me, a):
    me.vertices.foreach_set('co', a.reshape(-1)); me.update()

def normals(me):
    me.update()
    a = np.zeros(len(me.vertices) * 3)
    try:
        me.vertices.foreach_get('normal', a)
    except Exception:
        a = np.array([v.normal for v in me.vertices]).reshape(-1)
    return a.reshape(-1, 3)

def adjacency(me):
    nb = [[] for _ in me.vertices]
    for e in me.edges:
        a, b = e.vertices
        nb[a].append(b); nb[b].append(a)
    return nb

def taubin(me, mask, iters=10, lam=0.5, mu=-0.53):
    """Smooth only masked verts (mask: float 0..1 per vertex)."""
    P = coords(me)
    nb = adjacency(me)
    idx = [i for i in range(len(P)) if mask[i] > 0]
    for it in range(iters * 2):
        f = lam if it % 2 == 0 else mu
        Q = P.copy()
        avg = np.array([P[n].mean(axis=0) if n else P[i] for i, n in enumerate(nb)])
        Q = P + f * np.asarray(mask)[:, None] * (avg - P)
        P = Q
    set_coords(me, P)

def diffuse_scalar(me, s, iters=3, fixed=None):
    nb = adjacency(me)
    s = np.array(s, dtype=float)
    for _ in range(iters):
        t = s.copy()
        for i, n in enumerate(nb):
            if fixed is not None and fixed[i]: continue
            if n: t[i] = 0.5 * s[i] + 0.5 * s[n].mean()
        s = t
    return s

def displace(me, amount):
    P = coords(me); N = normals(me)
    set_coords(me, P + N * np.asarray(amount)[:, None])

def bvh_of(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(ob, dg)

def ring_loft(bvh, stations, n=24, close_top=False, close_bottom=False, name='ring', phase=0.0):
    """stations: list of (center Vector, axis Vector, offset float or fn(theta), up Vector ref).
    Casts rays from center perpendicular to axis; builds a tube."""
    rings = []
    for st in stations:
        c, ax, off = st[0], st[1].normalized(), st[2]
        ref = st[3] if len(st) > 3 else Vector((0, -1, 0))
        u = (ref - ax * ref.dot(ax)).normalized(); v = ax.cross(u)
        ring = []
        for k in range(n):
            th = phase + 2 * math.pi * k / n
            d = (u * math.cos(th) + v * math.sin(th))
            hit = bvh.ray_cast(c, d, 1.0)
            r = (hit[0] - c).length if hit[0] is not None else 0.1
            o = off(th) if callable(off) else off
            ring.append(c + d * (r + o))
        rings.append(ring)
    verts = [p for r in rings for p in r]
    faces = []
    for i in range(len(rings) - 1):
        for k in range(n):
            a = i * n + k; b = i * n + (k + 1) % n
            faces.append([a, b, b + n, a + n])
    if close_bottom: faces.append(list(range(n))[::-1])
    if close_top: faces.append([len(rings) * n - n + k for k in range(n)])
    return mesh_obj(name, verts, faces)

def solidify(ob, t, offset=-1.0):
    m = ob.modifiers.new('sol', 'SOLIDIFY'); m.thickness = t; m.offset = offset; m.use_even_offset = True
    apply_mods(ob)

def bevel(ob, w, seg=1, limit='ANGLE'):
    m = ob.modifiers.new('bev', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = limit
    if limit == 'ANGLE': m.angle_limit = math.radians(40)
    apply_mods(ob)

def subsurf(ob, lv=1, simple=False):
    m = ob.modifiers.new('ss', 'SUBSURF'); m.levels = lv; m.render_levels = lv
    if simple: m.subdivision_type = 'SIMPLE'
    apply_mods(ob)

def apply_mods(ob):
    from mhlib import set_active
    set_active(ob)
    for m in list(ob.modifiers):
        if m.type == 'ARMATURE': continue
        bpy.ops.object.modifier_apply(modifier=m.name)

def box(name, size, M, bev=0.004, seg=2):
    """Box of size (sx,sy,sz) placed by matrix M (local z = outward normal)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    if bev > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=seg, affect='EDGES', profile=0.5)
    for v in bm.verts: v.co = M @ v.co
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    ob.data.shade_smooth() if hasattr(ob.data, 'shade_smooth') else None
    return ob

def surface_frame(bvh, origin, direction, up=Vector((0, 0, 1)), push=0.0):
    """Ray from origin along direction to the surface; returns matrix with z = normal at hit, y ~ up."""
    hit = bvh.ray_cast(origin, direction.normalized(), 2.0)
    if hit[0] is None: return None
    p, n = hit[0], hit[1]
    if n.dot(direction) > 0: n = -n
    n = -direction.normalized() * 0.5 + n * 0.5; n.normalize()
    x = up.cross(n).normalized(); y = n.cross(x)
    M = Matrix((x, y, n)).transposed().to_4x4()
    M.translation = p + n * push
    return M

def strap(bvh, pts, width, offset, name='strap', thick=0.004, steps=40):
    """Ribbon following a polyline projected on the body surface."""
    # resample
    P = [Vector(p) for p in pts]
    L = [0]
    for i in range(1, len(P)): L.append(L[-1] + (P[i] - P[i - 1]).length)
    tot = L[-1]
    samples = []
    for s in range(steps + 1):
        d = tot * s / steps
        i = max(1, min(len(P) - 1, next((k for k in range(1, len(P)) if L[k] >= d), len(P) - 1)))
        t = (d - L[i - 1]) / max(1e-6, (L[i] - L[i - 1]))
        samples.append(P[i - 1].lerp(P[i], t))
    proj = []
    for q in samples:
        loc, nor, _, _ = bvh.find_nearest(q)
        proj.append((loc, nor))
    verts, faces = [], []
    for i, (loc, nor) in enumerate(proj):
        a = proj[max(0, i - 1)][0]; b = proj[min(len(proj) - 1, i + 1)][0]
        tan = (b - a).normalized()
        side = tan.cross(nor).normalized()
        base = loc + nor * offset
        verts += [base - side * width / 2, base + side * width / 2]
    for i in range(len(proj) - 1):
        a = 2 * i
        faces.append([a, a + 1, a + 3, a + 2])
    ob = mesh_obj(name, verts, faces)
    solidify(ob, thick, offset=1.0)
    return ob

def lathe(name, profile, n=32, sx=1.0, sy=1.0, M=None, cap_top=True):
    """profile: list of (r, z) from top/inside; revolved around z, scaled in x/y."""
    verts, faces = [], []
    for k in range(n):
        th = 2 * math.pi * k / n
        for r, z in profile:
            verts.append(Vector((r * math.cos(th) * sx, r * math.sin(th) * sy, z)))
    m = len(profile)
    for k in range(n):
        k2 = (k + 1) % n
        for j in range(m - 1):
            faces.append([k * m + j, k * m + j + 1, k2 * m + j + 1, k2 * m + j])
    if M is not None: verts = [M @ v for v in verts]
    return mesh_obj(name, verts, faces)

def join(obs, name):
    from mhlib import set_active
    obs = [o for o in obs if o is not None]
    set_active(obs[0])
    for o in obs: o.select_set(True)
    bpy.ops.object.join()
    obs[0].name = name; obs[0].data.name = name
    return obs[0]

def transfer_weights(dst, src):
    from mhlib import set_active
    for vg in src.vertex_groups:
        if vg.name not in dst.vertex_groups: dst.vertex_groups.new(name=vg.name)
    m = dst.modifiers.new('dt', 'DATA_TRANSFER')
    m.object = src; m.use_vert_data = True
    m.data_types_verts = {'VGROUP_WEIGHTS'}
    m.vert_mapping = 'POLYINTERP_NEAREST'
    m.layers_vgroup_select_src = 'ALL'; m.layers_vgroup_select_dst = 'NAME'
    set_active(dst)
    bpy.ops.object.modifier_apply(modifier=m.name)

def rigid_weights(ob, bone):
    for vg in list(ob.vertex_groups): ob.vertex_groups.remove(vg)
    vg = ob.vertex_groups.new(name=bone)
    vg.add(list(range(len(ob.data.vertices))), 1.0, 'REPLACE')

def set_mat(ob, mat):
    ob.data.materials.clear(); ob.data.materials.append(mat)

def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)
