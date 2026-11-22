# Ironwing vehicles: shared pipeline helpers (Blender as a Python module, bpy 5.x).
# Geometry primitives come from Midnight Ops' weapons pipeline (ironveil/tools/weapons/geo.py), imported, not copied.
# Blender frame (as there): forward is -Y, up is +Z, the model's right side is -X, metres. The glTF exporter turns this
# into forward +Z, up +Y, which is the game's frame.
#
# Every model is painted with a per-face colour attribute (the paint scheme, sRGB authored, stored linear) multiplied by
# ambient occlusion computed here by ray casts against the whole assembly, so creases, wing roots, gun tubs and
# superstructures darken where they should. Fine detail (panel lines, planks, concrete) comes from the game's tiling
# textures on box-projected UVs in metres.
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'ironveil', 'tools', 'weapons'))
import geo   # noqa: E402
from geo import (link, set_active, mesh_obj, apply_mods, tris, loft_y, sweep, lathe, cyl, box, plate, torus, sphere,   # noqa: E402,F401
                 fix_normals, boolean, bevel, transform, move, rot, scale, mirror_x, join, smooth_by_angle, bezier, path_arc)

MATS = {}

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

# ------------------------------------------------------------------ colour
def lin(h):
    h = h.lstrip('#'); h = ''.join(ch * 2 for ch in h) if len(h) == 3 else h; c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def mat(name):
    """Named material slots; the game swaps each for its own material by name (paint, glass, dark, wood, ...)."""
    if name not in MATS:
        m = bpy.data.materials.new(name); MATS[name] = m
    return MATS[name]

def paint(ob, col, material='paint'):
    """col: a hex string, or fn(center: Vector, normal: Vector) -> hex. Writes the 'Col' attribute per face corner."""
    me = ob.data
    if not me.materials:
        me.materials.append(mat(material))
    a = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    cache = {}; cols = [1.0] * (len(me.loops) * 4)
    for p in me.polygons:
        h = col if isinstance(col, str) else col(p.center, p.normal)
        if h not in cache:
            cache[h] = lin(h) + (1.0,)
        c = cache[h]
        for li in p.loop_indices:
            cols[li * 4:li * 4 + 4] = c
    a.data.foreach_set('color', cols)
    me.color_attributes.active_color = a
    return ob

def part(ob, col, material='paint', smooth=None):
    paint(ob, col, material)
    if smooth:
        smooth_by_angle(ob, smooth)
    return ob

def flat(ob):
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob

# ------------------------------------------------------------------ modifiers
def subsurf(ob, levels=1):
    m = ob.modifiers.new('ss', 'SUBSURF'); m.levels = levels; m.render_levels = levels
    apply_mods(ob)
    return ob

def solidify(ob, t):
    m = ob.modifiers.new('sol', 'SOLIDIFY'); m.thickness = t; m.offset = 0
    apply_mods(ob)
    return ob

def decimate(ob, ratio):
    m = ob.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio
    apply_mods(ob)
    return ob

def dup(ob, name):
    c = ob.copy(); c.data = ob.data.copy(); c.name = name; c.data.name = name
    link(c)
    return c

def triangulate(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()
    return ob

# ------------------------------------------------------------------ ambient occlusion by ray casting
def _bvh(objs):
    verts, polys = [], []
    for o in objs:
        M = o.matrix_world; off = len(verts)
        verts.extend(M @ v.co for v in o.data.vertices)
        polys.extend([off + i for i in p.vertices] for p in o.data.polygons)
    return BVHTree.FromPolygons(verts, polys, epsilon=0.0)

def _dirs(n, seed=7):
    """Cosine-weighted hemisphere directions around +Z."""
    rnd = random.Random(seed); out = []
    for i in range(n):
        u, v = (i + rnd.random()) / n, rnd.random()
        r, a = math.sqrt(u), 2 * math.pi * v
        out.append(Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0.0, 1 - u)))))
    return out

def ao(targets, occluders, dist=2.0, rays=24, strength=0.85, ground=None):
    """Multiply each target's 'Col' by occlusion from all occluders (and an optional ground plane height, Blender Z)."""
    tree = _bvh(occluders); D = _dirs(rays)
    for o in targets:
        me = o.data; M = o.matrix_world; N3 = M.to_3x3().inverted().transposed()
        occ = [0.0] * len(me.vertices)
        for vi, v in enumerate(me.vertices):
            p = M @ v.co; n = (N3 @ v.normal).normalized()
            t = n.orthogonal().normalized(); b = n.cross(t)
            s = 0.0
            o0 = p + n * (dist * 0.004 + 0.002)
            for d in D:
                w = t * d.x + b * d.y + n * d.z
                hit = tree.ray_cast(o0, w, dist)
                if hit[0] is not None:
                    s += 1.0 - (hit[3] / dist) ** 0.7
                elif ground is not None and w.z < -0.05:
                    h = (o0.z - ground) / -w.z
                    if 0 < h < dist:
                        s += 1.0 - (h / dist) ** 0.7
            occ[vi] = s / len(D)
        # two smoothing passes over the mesh edges: fewer rays, no speckle
        nb = [[] for _ in me.vertices]
        for e in me.edges:
            a_, b_ = e.vertices; nb[a_].append(b_); nb[b_].append(a_)
        for _ in range(2):
            occ = [(occ[i] * 2 + sum(occ[j] for j in nb[i])) / (2 + len(nb[i])) for i in range(len(occ))]
        a = me.color_attributes.get('Col')
        if a is None:
            continue
        nl = len(me.loops); lv = [0] * nl; me.loops.foreach_get('vertex_index', lv)
        cols = [0.0] * (nl * 4); a.data.foreach_get('color', cols)
        for li in range(nl):
            k = 1.0 - strength * occ[lv[li]]
            cols[li * 4] *= k; cols[li * 4 + 1] *= k; cols[li * 4 + 2] *= k
        a.data.foreach_set('color', cols)

# ------------------------------------------------------------------ UVs: box projection in metres (for the game's tiling detail textures)
def uv_box(ob, size=2.0):
    me = ob.data
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        n = p.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for li in p.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            if ax == 0: u, v = c.y, c.z
            elif ax == 1: u, v = c.x, c.z
            else: u, v = c.x, c.y
            uv.data[li].uv = (u / size, v / size)
    return ob

# ------------------------------------------------------------------ hierarchy and export
def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc; link(e)
    if parent:
        e.parent = parent
    return e

def pivot(ob, p, parent):
    """Move ob's origin to p (Blender frame) and parent it, so it turns about that point in the game."""
    p = Vector(p)
    ob.data.transform(Matrix.Translation(-p)); ob.location = p
    ob.parent = parent
    return ob

def attach(ob, parent, name=None):
    if name:
        ob.name = name; ob.data.name = name
    ob.parent = parent
    return ob

def finish(objs, uv=2.0):
    for o in objs:
        if o.type != 'MESH':
            continue
        uv_box(o, uv)

def export(roots, path):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    def sel(o):
        o.select_set(True)
        for c in o.children:
            sel(c)
    for r in roots:
        sel(r)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_normals=True,
                              export_texcoords=True, export_materials='EXPORT', export_animations=False, export_extras=False)

def stats(roots):
    out = {}
    def walk(o, acc):
        if o.type == 'MESH':
            acc[0] += tris(o)
        for c in o.children:
            walk(c, acc)
    for r in roots:
        acc = [0]; walk(r, acc); out[r.name] = acc[0]
    return out
