# Ironwing texture sets for the two hero models (the player's fighter and the carrier), the Midnight Ops weapons way
# (ironveil/tools/weapons/build.py): unwrap everything into one atlas, bake what the surface IS with Cycles (paint colour,
# position, normal, edges, occlusion, which material), then paint what happened TO it in numpy (panel lines, rivets,
# chipped paint, exhaust and gun soot, oil, rust streaks, waterline grime, funnel soot) and write albedo, normal and
# ORM (occlusion, roughness, metal) maps. The carrier's flight deck gets its own tiling plank set (deck_set), made
# without a bake. Blender frame as lib.py: forward -Y, up +Z, the model's right side is -X, metres.
#
#   bake(kind, objs, size, outdir, hide=[...])  -> the textured material (name 'tex_<kind>'), assigned to objs
#   deck_set(size, outdir)                      -> the material 'tex_deck'
#
# Cycles runs on the CPU with THREADS threads (default 2). A 2048 set takes a few minutes.
import bpy, bmesh, math, os, time
import numpy as np
from mathutils import Vector
from bpy_extras import bmesh_utils
from PIL import Image
import lib

T0 = time.time()
def log(*a):
    print('[%6.1fs]' % (time.time() - T0), *a, flush=True)

# ------------------------------------------------------------------ noise (numpy, vectorised)
def _hash(ix, iy, iz, seed):
    h = (ix.astype(np.int64) * 73856093) ^ (iy.astype(np.int64) * 19349663) ^ (iz.astype(np.int64) * 83492791) ^ (int(seed) * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF).astype(np.float32) / float(0xFFFFFF)

def vnoise(x, y, z, seed=0, py=None):
    """Trilinear value noise in [0, 1]. py: lattice period along y (for tiling textures)."""
    xi, yi, zi = np.floor(x), np.floor(y), np.floor(z)
    fx, fy, fz = x - xi, y - yi, z - zi
    ux, uy, uz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    xi, yi, zi = xi.astype(np.int64), yi.astype(np.int64), zi.astype(np.int64)
    Y = (lambda v: np.mod(v, py)) if py else (lambda v: v)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (ux if dx else 1 - ux) * (uy if dy else 1 - uy) * (uz if dz else 1 - uz)
                out = out + w * _hash(xi + dx, Y(yi + dy), zi + dz, seed)
    return out

def fbm(x, y, z, oct=4, seed=0, py=None):
    s, a, t = 0.0, 0.5, 0.0
    for o in range(oct):
        f = 2 ** o
        s = s + a * vnoise(x * f, y * f, z * f, seed + o * 17, py * f if py else None); t += a; a *= 0.5
    return s / t

def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def lin(h):
    return np.array(lib.lin(h), np.float32)

def mixc(a, b, t):
    t = np.asarray(t, np.float32)[..., None] if np.ndim(t) else t
    return a * (1 - t) + b * t

# ------------------------------------------------------------------ scene, unwrap and bakes
def setup():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ.get('THREADS', '2'))
    sc.render.bake.margin = 8
    if sc.world is None:
        sc.world = bpy.data.worlds.new('W')
    sc.world.color = (0, 0, 0)
    return sc

def unwrap(objs, scales=None, island_fn=None, angle=55, margin=0.003, cut_fn=None):
    """One shared atlas: smart projection, islands scaled by object (scales) and by place (island_fn(centre, normal)),
    long islands cut into pieces (cut_fn(face centre) -> a key; faces with different keys go to different islands, so a
    236 m hull side packs as several pieces instead of one diagonal strip), then packed. The UV layer is 'atlas'."""
    scales = scales or {}
    for o in objs:
        me = o.data
        uv = me.uv_layers.get('atlas') or me.uv_layers.new(name='atlas')
        me.uv_layers.active = uv
    lib.set_active(objs[0])
    for o in objs:
        o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.002, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in objs:
        s0 = scales.get(o.name, 1.0)
        if abs(s0 - 1) < 1e-3 and not island_fn and not cut_fn:
            continue
        bm = bmesh.new(); bm.from_mesh(o.data); uvl = bm.loops.layers.uv['atlas']; bm.faces.ensure_lookup_table()
        M = o.matrix_world; R = M.to_3x3()
        if cut_fn:
            for f in bm.faces:
                k = cut_fn(M @ f.calc_center_median())
                for l in f.loops:
                    l[uvl].uv.x += k * 3.0
        for isl in bmesh_utils.bmesh_linked_uv_islands(bm, uvl):
            s = s0
            if island_fn:
                c = Vector(); n = Vector()
                for f in isl:
                    c += M @ f.calc_center_median(); n += (R @ f.normal) * f.calc_area()
                s *= island_fn(c / len(isl), n.normalized() if n.length > 1e-9 else Vector((0, 0, 1)))
            if os.environ.get('UVDEBUG'):
                ar = sum(f.calc_area() for f in isl)
                if ar > 50: log('island area %.0f m2 centre (%.1f %.1f %.1f) normal (%.2f %.2f %.2f) scale %.2f' % (ar, *(c / len(isl) if island_fn else Vector()), *(n.normalized() if island_fn else Vector()), s))
            if abs(s - 1) < 1e-3:
                continue
            uvs = [l[uvl] for f in isl for l in f.loops]
            cu = Vector((sum(u.uv.x for u in uvs) / len(uvs), sum(u.uv.y for u in uvs) / len(uvs)))
            for u in uvs:
                u.uv = cu + (u.uv - cu) * s
        bm.to_mesh(o.data); bm.free()
    lib.set_active(objs[0])
    for o in objs:
        o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
    try:
        bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=margin, shape_method='CONVEX', margin_method='FRACTION')
    except TypeError:
        bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')

def bake_emit(sc, objs, size, name, build, per_mat=None, samples=1):
    """Bake an emission network (build(nt, emission_node, key)) of every slot into one float image; returns (H, W, 4)
    bottom-up. per_mat(material_name) -> key gives each original material its own network (e.g. a material id)."""
    img = bpy.data.images.new(name, size, size, alpha=True, float_buffer=True)
    img.colorspace_settings.name = 'Non-Color'
    saved = {o.name: [s.material for s in o.material_slots] for o in objs}
    cache = {}
    for o in objs:
        for s in o.material_slots:
            key = per_mat(s.material.name if s.material else '') if per_mat else 0
            if key not in cache:
                m = bpy.data.materials.new('%s_%s' % (name, key)); m.use_nodes = True
                nt = m.node_tree; nt.nodes.clear()
                out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
                nt.links.new(em.outputs[0], out.inputs[0]); em.inputs['Strength'].default_value = 1.0
                build(nt, em, key)
                tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn
                cache[key] = m
            s.material = cache[key]
    sc.cycles.samples = samples
    for o in sc.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type='EMIT', margin=8, use_clear=True)
    for o in objs:
        for s, m in zip(o.material_slots, saved[o.name]):
            s.material = m
    a = np.empty(size * size * 4, np.float32); img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    for m in cache.values():
        bpy.data.materials.remove(m)
    return a.reshape(size, size, 4)

def _attr(nt, em, name):
    a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_name = name; a.attribute_type = 'GEOMETRY'
    nt.links.new(a.outputs['Color'], em.inputs['Color'])

def _vec(nt, em, socket, lo, inv):
    g = nt.nodes.new('ShaderNodeNewGeometry')
    sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = lo
    mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = inv
    nt.links.new(g.outputs[socket], sub.inputs[0]); nt.links.new(sub.outputs[0], mul.inputs[0]); nt.links.new(mul.outputs[0], em.inputs['Color'])

def _edges(nt, em, radius, ao_near):
    """R: convex edges (bevel normal vs true normal, kept where the near occlusion says convex), G: near occlusion."""
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    bv = nt.nodes.new('ShaderNodeBevel'); bv.samples = 8; bv.inputs['Radius'].default_value = radius
    dp = nt.nodes.new('ShaderNodeVectorMath'); dp.operation = 'DOT_PRODUCT'
    nt.links.new(bv.outputs[0], dp.inputs[0]); nt.links.new(geo.outputs['Normal'], dp.inputs[1])
    e = nt.nodes.new('ShaderNodeMath'); e.operation = 'SUBTRACT'; e.inputs[0].default_value = 1.0
    nt.links.new(dp.outputs['Value'], e.inputs[1])
    er = nt.nodes.new('ShaderNodeMapRange'); er.inputs['From Min'].default_value = 0.003; er.inputs['From Max'].default_value = 0.08
    nt.links.new(e.outputs[0], er.inputs['Value'])
    a1 = nt.nodes.new('ShaderNodeAmbientOcclusion'); a1.samples = 12; a1.inputs['Distance'].default_value = ao_near
    conv = nt.nodes.new('ShaderNodeMapRange'); conv.inputs['From Min'].default_value = 0.7; conv.inputs['From Max'].default_value = 0.95
    nt.links.new(a1.outputs['AO'], conv.inputs['Value'])
    ed = nt.nodes.new('ShaderNodeMath'); ed.operation = 'MULTIPLY'
    nt.links.new(er.outputs[0], ed.inputs[0]); nt.links.new(conv.outputs[0], ed.inputs[1])
    cc = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(ed.outputs[0], cc.inputs[0]); nt.links.new(a1.outputs['AO'], cc.inputs[1])
    nt.links.new(cc.outputs[0], em.inputs['Color'])

def _ao(nt, em, dist, samples):
    a = nt.nodes.new('ShaderNodeAmbientOcclusion'); a.samples = samples; a.inputs['Distance'].default_value = dist
    nt.links.new(a.outputs['AO'], em.inputs['Color'])

def _const(nt, em, rgb):
    em.inputs['Color'].default_value = (rgb[0], rgb[1], rgb[2], 1)

def height_to_normal(h, strength, cov):
    """Tangent-space normal map from a height field in texel units (Blender's convention: +U right, +V up)."""
    hp = np.pad(h, 1, mode='edge')
    dx = (hp[1:-1, 2:] - hp[1:-1, :-2]) * 0.5
    dy = (hp[2:, 1:-1] - hp[:-2, 1:-1]) * 0.5
    n = np.stack([-dx * strength, -dy * strength, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    n[~cov] = (0, 0, 1)
    return n * 0.5 + 0.5

def dilate(img, cov, n=12):
    """Fill texels outside the islands from their neighbours, so mip levels never pull in black."""
    out = img.copy(); have = cov.copy()
    for _ in range(n):
        acc = np.zeros_like(out); cnt = np.zeros(have.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(out * have[..., None], dy, 0), dx, 1); sc_ = np.roll(np.roll(have, dy, 0), dx, 1)
            acc += sh; cnt += sc_
        new = (~have) & (cnt > 0)
        out[new] = acc[new] / cnt[new][..., None]; have |= new
    mean = img[cov].mean(axis=0) if cov.any() else 0
    out[~have] = mean
    return out

def save_png(a, path, mode='RGB'):
    """a: (H, W, C) floats 0..1, bottom-up (Blender's pixel order) -> PNG top-down."""
    Image.fromarray(np.clip(np.flipud(a) * 255 + 0.5, 0, 255).astype(np.uint8), mode).save(path)

def srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)

def material(name, alb, nrm, orm):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = bpy.data.images.load(alb)
    nt.links.new(ta.outputs[0], b.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(nrm); tn.image.colorspace_settings.name = 'Non-Color'
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = bpy.data.images.load(orm); to.image.colorspace_settings.name = 'Non-Color'
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(to.outputs[0], sp.inputs[0])
    nt.links.new(sp.outputs[1], b.inputs['Roughness']); nt.links.new(sp.outputs[2], b.inputs['Metallic'])
    return m

# ------------------------------------------------------------------ the bake driver
def bake(kind, objs, size, outdir, hide=(), keep=('glass',), edge_r=0.02, ao_near=0.08, ao_far=1.2, island_fn=None, scales=None, painter=None, strength=1.0, cut_fn=None):
    """objs: the meshes that share the set (each must carry a 'Base' colour attribute: the paint scheme without
    occlusion). Slots whose material is in keep stay as they are (glass); every other slot becomes 'tex_<kind>'."""
    sc = setup(); os.makedirs(outdir, exist_ok=True)
    for o in hide:
        o.hide_render = True
    unwrap(objs, scales, island_fn, cut_fn=cut_fn); log(kind, 'unwrapped')
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in objs:
        for v in o.data.vertices:
            p = o.matrix_world @ v.co; lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    ext = hi - lo; inv = Vector([1 / max(1e-6, e) for e in ext])
    mats = []
    def mid(name):
        n = name.split('.')[0]
        if n not in mats: mats.append(n)
        return mats.index(n)
    base = bake_emit(sc, objs, size, 'base', lambda nt, em, k: _attr(nt, em, 'Base')); log('base')
    pos = bake_emit(sc, objs, size, 'pos', lambda nt, em, k: _vec(nt, em, 'Position', lo, inv)); log('pos')
    nrm = bake_emit(sc, objs, size, 'nrm', lambda nt, em, k: _vec(nt, em, 'Normal', Vector((-1, -1, -1)), Vector((0.5, 0.5, 0.5)))); log('nrm')
    ids = bake_emit(sc, objs, size, 'id', lambda nt, em, k: _const(nt, em, (k / 16.0, 0, 0)), per_mat=mid); log('id', mats)
    edg = bake_emit(sc, objs, size, 'edge', lambda nt, em, k: _edges(nt, em, edge_r, ao_near), samples=4); log('edges')
    ao = bake_emit(sc, objs, size, 'ao', lambda nt, em, k: _ao(nt, em, ao_far, 16), samples=6); log('ao')
    cov = base[..., 3] > 0.5
    P = lo[:] + pos[..., :3] * np.array(ext, np.float32)
    N = nrm[..., :3] * 2 - 1; N /= np.maximum(1e-6, np.linalg.norm(N, axis=-1, keepdims=True))
    ID = np.rint(ids[..., 0] * 16).astype(np.int32); names = {i: n for i, n in enumerate(mats)}
    texel = float(np.sqrt(sum(sum(p.area for p in o.data.polygons) for o in objs) / max(1, cov.sum())))
    log('texel %.1f mm' % (texel * 1000))
    c = cov
    out = painter(P[c], N[c], base[c][:, :3], np.vectorize(lambda i: names.get(i, ''))(ID[c]) if ID[c].size else ID[c], ao[c][:, 0], edg[c][:, 0], edg[c][:, 1], texel)
    alb = np.zeros((size, size, 3), np.float32); rough = np.zeros((size, size), np.float32); metal = np.zeros_like(rough); h = np.zeros_like(rough); occ = np.ones_like(rough)
    alb[c] = out['alb']; rough[c] = out['rough']; metal[c] = out['metal']; h[c] = out['height']; occ[c] = out['ao']
    n = height_to_normal(h, strength, c)
    alb = dilate(srgb(alb), c); orm = dilate(np.stack([occ, rough, metal], -1), c); n = dilate(n, c)
    pa, pn, po = [os.path.join(outdir, '%s_%s.png' % (kind, s)) for s in ('albedo', 'normal', 'orm')]
    save_png(alb, pa); save_png(n, pn); save_png(orm, po); log('saved maps')
    tm = material('tex_' + kind, pa, pn, po)
    for o in objs:
        me = o.data
        ms = [s.material for s in o.material_slots]
        new = [m if (m and m.name.split('.')[0] in keep) else tm for m in ms]
        uniq = []
        for m in new:
            if m not in uniq: uniq.append(m)
        idx = np.zeros(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', idx)
        remap = np.array([uniq.index(m) for m in new] or [0], np.int32)
        me.materials.clear()
        for m in uniq: me.materials.append(m)
        if len(idx): me.polygons.foreach_set('material_index', remap[np.clip(idx, 0, len(remap) - 1)])
        for a in list(me.color_attributes):
            me.color_attributes.remove(a)
        for l in list(me.uv_layers):
            if l.name != 'atlas':
                me.uv_layers.remove(l)
        me.update()
    for o in hide:
        o.hide_render = False
    return tm

def keep_base(objs):
    """Copy each object's paint ('Col', before occlusion is multiplied in) to a 'Base' attribute for the bake."""
    for o in objs:
        me = o.data; a = me.color_attributes.get('Col')
        if a is None:
            continue
        b = me.color_attributes.get('Base') or me.color_attributes.new('Base', 'FLOAT_COLOR', 'CORNER')
        v = np.empty(len(me.loops) * 4, np.float32); a.data.foreach_get('color', v); b.data.foreach_set('color', v)
        me.color_attributes.active_color = a

# ------------------------------------------------------------------ painters: what happened to the surface
def _lines(coord, spacing, offset, grad):
    """Distance in metres along the surface to the nearest plane coord = offset + k * spacing; grad = |surface gradient|."""
    d = np.abs(np.mod(coord - offset + spacing / 2, spacing) - spacing / 2)
    return d / np.maximum(grad, 0.2)

def _rivets(d, along, pitch, off, r):
    """Rivet dots in a row beside a panel line: d = distance to the line, along = position along it (metres)."""
    band = 1 - np.clip(np.abs(d - off) / r, 0, 1)
    a = np.abs(np.mod(along, pitch) - pitch / 2) / (pitch / 2)
    return band * ss(1 - r * 2.2 / pitch, 1.0, a)

def fighter_painter(T):
    """T: the aircraft TYPES entry (wing and tail planforms, exhaust, guns)."""
    W, TL = T['wing'], T['tail']
    def paint(P, N, C, ID, AO, E, AOn, texel):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]; ax = np.abs(x); nx, ny, nz = N[:, 0], N[:, 1], N[:, 2]
        gx, gy, gz = np.sqrt(1 - nx ** 2), np.sqrt(1 - ny ** 2), np.sqrt(1 - nz ** 2)
        paint_ = (ID == 'paint'); dark = (ID == 'dark')
        w = max(0.006, texel * 1.4)
        # where things are: wing, tailplane, fin, fuselage
        u = np.clip((ax - W['x0']) / (W['x1'] - W['x0']), 0, 1)
        le, ch = W['le0'] + (W['le1'] - W['le0']) * u, W['c0'] + (W['c1'] - W['c0']) * u
        fw = (y - le) / ch
        wing = (ax > W['x0'] + 0.08) & (np.abs(z - (W['z'] + (ax - W['x0']) * math.tan(math.radians(W['di'])))) < 0.35) & (fw > -0.05) & (fw < 1.05)
        ut = np.clip((ax - 0.15) / (TL['x1'] - 0.15), 0, 1)
        tle, tch = TL['le0'] + (TL['le1'] - TL['le0']) * ut, TL['c0'] + (TL['c1'] - TL['c0']) * ut
        ft = (y - tle) / tch
        tail = (ax > 0.3) & (y > TL['le0'] - 0.2) & (np.abs(z - TL['z']) < 0.3)
        fin = (ax < 0.16) & (y > 3.3) & (z > 0.45) & (np.abs(nx) > 0.6)
        fus = ~(wing | tail | fin)
        cowl = fus & (y < -3.05)
        # panel lines (distance to the nearest seam, metres) and where along it the rivets go
        D = np.full(len(x), 9.0, np.float32); A = np.zeros(len(x), np.float32)
        def seam(mask, d, along):
            m = mask & (d < D); D[m] = d[m]; A[m] = along[m]
        ang = np.arctan2(z - 0.0, x) * 0.8
        seam(fus & ~cowl, _lines(y, 0.66, 0.21, gy), ang)
        side = fus & (np.abs(nx) > 0.55) & ~cowl
        seam(side, _lines(z, 0.42, 0.05, gz), y)
        topb = fus & (np.abs(nz) > 0.55) & (ax < 0.8) & ~cowl
        seam(topb, _lines(x, 0.38, 0.0, gx), y)
        for yy in (-3.08, -3.62, -4.1):
            seam(cowl, np.abs(y - yy) / np.maximum(gy, 0.2), ang)
        seam(cowl & (y > -3.6), _lines(np.arctan2(z, x) * 0.72, 0.42, 0.1, 1.0), y)
        seam(wing, _lines(ax, 0.52, W['x0'], gx), y)
        for f in (0.14, 0.34, 0.66):
            seam(wing, np.abs(fw - f) * ch / np.maximum(gy, 0.3), ax)
        seam(tail, _lines(ax, 0.4, 0.15, gx), y)
        for f in (0.2, 0.6):
            seam(tail, np.abs(ft - f) * tch / np.maximum(gy, 0.3), ax)
        seam(fin, _lines(z, 0.42, 0.45, gz), y); seam(fin, _lines(y, 0.55, 0.1, gy), z)
        # access hatches: small rectangles (centre y, z, half sizes) on both sides of the fuselage
        for (cy, cz, hy, hz) in ((1.55, 0.18, 0.28, 0.2), (-2.3, -0.05, 0.22, 0.16), (2.9, -0.25, 0.18, 0.13)):
            m = side & (np.abs(y - cy) < hy + 0.01) & (np.abs(z - cz) < hz + 0.01)
            dd = np.minimum(np.abs(np.abs(y - cy) - hy), np.abs(np.abs(z - cz) - hz))
            seam(m, dd, y + z)
        groove = 1 - np.clip(D / w, 0, 1)
        riv = _rivets(D, A, 0.042, 0.016, max(0.0035, texel * 0.75)) * (D < 0.03) * paint_
        # paint wear, soot, oil, grime
        nlo = fbm(x * 1.3, y * 1.3, z * 1.3, 3, 1)
        cells = vnoise(np.floor((y - 0.21) / 0.66) * 3.1, np.floor(z / 0.42) * 1.7 + np.floor(ax / 0.52) * 2.3, np.zeros_like(x), 5)
        chipn = fbm(x * 11, y * 11, z * 11, 3, 2)
        walk = wing & (nz > 0.5) & (ax < W['x0'] + 1.1) & (fw > 0.05) & (fw < 0.75) & (x > 0)
        lead = (wing | tail) & (ny < -0.55)
        chip = np.clip(ss(0.15, 0.55, E) * ss(0.42, 0.62, chipn) + walk * ss(0.6, 0.75, fbm(x * 16, y * 16, z * 16, 3, 3)) * 0.9 + lead * ss(0.55, 0.72, chipn) * 0.8, 0, 1) * paint_
        bare = ss(0.55, 0.85, chip)
        soot = np.zeros_like(x)
        ex = T.get('exhaust')
        if ex:
            t = (y - ex[0]) / 3.0
            cz_ = ex[2] + t * 0.12 - t * t * 0.08; hh = 0.12 + np.clip(t, 0, 1) * 0.38
            pl = np.clip(1 - np.abs(z - cz_) / hh, 0, 1) * (t > 0) * (t < 1) * (1 - np.clip(t, 0, 1)) ** 1.2 * (ax > 0.25)
            soot = np.maximum(soot, np.clip(pl * (0.65 + 0.8 * (fbm(x * 3, y * 0.9, z * 14, 3, 4) - 0.5)) * 2.0, 0, 1))
        for (gx_, gy_, gz_) in T['guns']:
            if gx_ > 0.5:
                t = (y - gy_ + 0.2) / 1.1
                g = np.clip(1 - np.abs(ax - gx_) / (0.07 + np.clip(t, 0, 1) * 0.12), 0, 1) * (t > 0) * (t < 1) * (1 - np.clip(t, 0, 1)) * wing
                soot = np.maximum(soot, g * 0.85)
        under = (nz < -0.35) & (y > -3.4) & (y < 2.0) & fus
        oil = under * ss(0.55, 0.78, fbm(x * 14, y * 0.7, z * 14, 3, 6)) * (1 - np.clip((y + 3.4) / 5.4, 0, 1)) * 0.8
        streak = fbm(x * 6, y * 0.6, z * 6, 3, 7)
        # colour
        col = C.copy()
        col *= (0.93 + 0.14 * nlo)[:, None] * (0.94 + 0.12 * cells)[:, None]
        top = np.clip(nz, 0, 1)[:, None] * paint_[:, None]
        grey = col.mean(axis=1, keepdims=True)
        col = col * (1 + 0.07 * top) * (1 - 0.15 * top) + grey * 0.15 * top
        col *= (1 - 0.18 * ss(0.45, 0.8, streak))[:, None]
        col = mixc(col, col * 0.55 + lin('#2b241c') * 0.05, ss(0.55, 0.95, 1 - AOn) * paint_)
        col = mixc(col, col * 0.45, groove * 0.9)
        col = mixc(col, lin('#7c8452'), chip * (1 - bare))
        col = mixc(col, lin('#a3a7ab'), bare)
        col = mixc(col, lin('#1d1a17'), soot * 0.9)
        col = mixc(col, lin('#2c2418'), oil * 0.6)
        col = mixc(col, col * 1.3, riv * 0.6)
        col *= (0.66 + 0.24 * AO)[:, None]   # a little darker overall: the old vertex-AO look, which players know
        rough = np.where(paint_, 0.5 + 0.1 * (nlo - 0.5) + 0.08 * top[:, 0] + 0.06 * ss(0.45, 0.8, streak), 0.45)
        lum = C.mean(axis=1)
        rubber = dark & (lum < 0.016)
        rough = np.where(rubber, 0.78, rough)
        rough = rough * (1 - bare) + 0.32 * bare
        rough = rough + soot * (0.85 - rough) + oil * (0.28 - rough) * 0.8
        metal = np.where(paint_, 0.18, np.where(rubber, 0.05, 0.55))
        metal = metal * (1 - bare) + 0.95 * bare
        height = -groove * 1.0 + riv * 0.55 - bare * 0.25 - chip * 0.08
        occ = np.clip(0.35 + 0.65 * AO, 0, 1) * (1 - 0.25 * groove)
        return dict(alb=np.clip(col, 0, 1), rough=np.clip(rough, 0.05, 1), metal=np.clip(metal, 0, 1), height=height, ao=occ)
    return paint

def carrier_painter(D=15.0, L=236.0, island=(-15.5, -16.0), funnel=(-15.8, -8.0)):
    def paint(P, N, C, ID, AO, E, AOn, texel):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]; nx, ny, nz = N[:, 0], N[:, 1], N[:, 2]
        gx, gy, gz = np.sqrt(1 - nx ** 2), np.sqrt(1 - ny ** 2), np.sqrt(1 - nz ** 2)
        paint_ = ID == 'paint'; dark = ID == 'dark'
        w = max(0.03, texel * 0.8)
        sidev = np.abs(nx) > 0.55
        hull = (np.abs(x) > 9) & (z < D - 1.5) & sidev
        isl = (x < -11.5) & (z > D + 1.0) & (np.abs(y - island[1]) < 22)
        under = z < -0.75
        boot = (z > -0.75) & (z < 0.95)
        # hull plating: strakes (constant height) and butts (constant length, staggered by strake)
        strake = np.floor((z - 0.4) / 2.3)
        dS = _lines(z, 2.3, 0.4, gz)
        dB = _lines(y + np.mod(strake, 2) * 3.6, 7.2, 1.0, gy)
        seamH = np.where(hull & ~under, np.minimum(dS, dB), 9.0)
        # superstructure panels: whatever axis the face is not facing
        dI = np.minimum(_lines(z, 1.6, 0.3, gz), np.where(np.abs(nx) > np.abs(ny), _lines(y, 2.4, 0.5, gy), _lines(x, 2.4, 0.5, gx)))
        seamI = np.where(isl & paint_, dI, 9.0)
        weld = 1 - np.clip(seamH / w, 0, 1)
        panel = 1 - np.clip(seamI / w, 0, 1)
        # portholes along the forward and after hull, a deck below the gallery
        pz = D - 3.2
        pk = np.round((y - 1.5) / 3.0)
        ph = hull & (np.abs(y) > 18) & (np.abs(y) < 100)
        pd = np.sqrt(((y - 1.5) - pk * 3.0) ** 2 + (z - pz) ** 2)
        port = ph * (1 - ss(0.16, 0.24, pd))
        # rust streaks: from the portholes, from scuppers under the gallery and from the hawse pipes at the bow
        rust = np.zeros_like(x)
        def streaks(mask, spacing, off, z0, lmin, lmax, wid, seed, amount):
            k = np.round((y - off) / spacing)
            yk = k * spacing + off + (_hash(k, k * 0 + 3, k * 0, seed) - 0.5) * spacing * 0.5
            ln = lmin + (lmax - lmin) * _hash(k, k * 0 + 7, k * 0, seed + 1)
            on = _hash(k, k * 0 + 11, k * 0, seed + 2) < amount
            dz = z0 - z
            s = mask * on * (dz > 0) * (dz < ln) * np.clip(1 - np.abs(y - yk) / (wid + 0.03 * dz), 0, 1) * (1 - np.clip(dz / ln, 0, 1)) ** 0.8
            return s * (0.55 + 0.9 * (vnoise(y * 4, z * 0.35, x * 0.1, seed + 9) - 0.5))
        rust = np.maximum(rust, streaks(ph, 3.0, 1.5, pz - 0.15, 1.5, 6.0, 0.09, 21, 0.45))
        rust = np.maximum(rust, streaks(hull, 6.4, 2.0, D - 1.2, 2.0, 9.0, 0.14, 31, 0.6))
        bow = hull & (y < -L * 0.36)
        rust = np.maximum(rust, streaks(bow, 9.0, -L * 0.43, D - 0.6, 6.0, 11.0, 0.35, 41, 1.0) * (np.abs(y + L * 0.43) < 2.5))
        specks = ss(0.3, 0.7, E) * ss(0.6, 0.78, fbm(x * 2, y * 2, z * 2, 3, 12)) * paint_
        rust = np.clip(np.maximum(rust, specks), 0, 1)
        # waterline grime, salt on the bow, funnel soot, general downward streaking
        wl = hull & (z > 0.9) & (z < 3.2)
        grime = wl * (1 - np.clip((z - 0.9) / 2.3, 0, 1)) ** 1.5 * (0.55 + 0.7 * (fbm(y * 0.35, z * 1.5, x * 0.1, 3, 13) - 0.5))
        salt = hull & (y < -L * 0.25)
        salt = salt * ss(0.55, 0.85, fbm(y * 0.5, z * 0.9, x * 0.2, 4, 14)) * (1 - np.clip((y + L / 2) / (L * 0.3), 0, 1)) * 0.6
        fd = np.sqrt((x - funnel[0]) ** 2 + ((y - funnel[1]) / 1.35) ** 2)
        soot = (fd < 4.5) * np.clip((z - (D + 15)) / 6, 0, 1) * (0.6 + 0.8 * (vnoise(np.arctan2(y - funnel[1], x - funnel[0]) * 5, z * 0.4, x * 0, 15) - 0.5))
        soot = np.maximum(soot, isl * (z > D + 14.5) * (np.abs(y - funnel[1]) < 9) * ss(0.4, 0.75, fbm(x * 0.6, y * 0.6, z * 0.6, 3, 16)) * 0.6)
        vert = ss(0.4, 0.85, fbm(y * 0.9 + x * 0.9, z * 0.05, x * 0.05, 3, 17)) * (np.abs(nz) < 0.5)
        flat_ = (nz > 0.6) & (z < D + 0.5) & (z > 1)
        nlo = fbm(x * 0.08, y * 0.08, z * 0.08, 3, 18)
        cells = vnoise(strake * 2.3, np.floor((y + np.mod(strake, 2) * 3.6 - 1.0) / 7.2) * 1.9, x * 0, 19)
        col = C.copy()
        col *= (0.93 + 0.14 * nlo)[:, None] * np.where(hull, 0.965 + 0.07 * cells, 1.0)[:, None]
        col *= (1 - 0.13 * vert)[:, None]
        col = mixc(col, col * 0.7, flat_ * 0.5 * ss(0.4, 0.7, fbm(x * 0.3, y * 0.3, z, 3, 20)))
        col = mixc(col, col * 0.6, ss(0.5, 0.95, 1 - AOn) * 0.6)
        col = mixc(col, col * 0.86, weld * 0.7)
        col = mixc(col, col * 0.82, panel * 0.7)
        col = mixc(col, lin('#3b4036'), grime * 0.55)
        col = mixc(col, lin('#c9cbc7'), salt)
        col = mixc(col, lin('#6a4329'), rust * 0.7)
        col = mixc(col, lin('#17191a'), port)
        col = mixc(col, lin('#1b1a19'), np.clip(soot, 0, 1) * 0.85)
        col *= (0.7 + 0.3 * AO)[:, None]
        rough = np.where(paint_, 0.66 + 0.12 * (nlo - 0.5), np.where(dark, 0.5, 0.6))
        rough = np.where(under, 0.75, np.where(boot, 0.58, rough))
        rough = rough + rust * (0.9 - rough) + np.clip(soot, 0, 1) * (0.85 - rough) + flat_ * 0.1 + grime * 0.1
        metal = np.where(paint_, 0.15, np.where(dark, 0.45, 0.1)) * (1 - rust * 0.7)
        height = weld * 0.6 - panel * 0.8 - port * 1.0 - rust * 0.1
        occ = np.clip(0.4 + 0.6 * AO, 0, 1)
        return dict(alb=np.clip(col, 0, 1), rough=np.clip(rough, 0.05, 1), metal=np.clip(metal, 0, 1), height=height, ao=occ)
    return paint

# ------------------------------------------------------------------ the flight deck: a tiling plank set (34 m square)
def deck_set(size, outdir):
    os.makedirs(outdir, exist_ok=True)
    S = size; M = 34.0
    v, u = np.mgrid[0:S, 0:S].astype(np.float32)     # rows = v (along the deck, bottom-up), cols = u (across)
    X = (u + 0.5) / S * M; Y = (v + 0.5) / S * M; px = M / S
    pw = 34.0 / 224                                   # planks run fore and aft, 224 across the deck
    i = np.floor(X / pw); fx = X - i * pw
    nseg = 4 + np.floor(_hash(i, i * 0, i * 0, 3) * 4)
    seg = M / nseg; off = _hash(i, i * 0 + 1, i * 0, 4) * seg
    fy = np.mod(Y + off, seg); k = np.floor(np.mod(Y + off, M) / seg)
    sideD = np.minimum(fx, pw - fx); endD = np.minimum(fy, seg - fy)
    caulk = np.maximum(1 - np.clip(sideD / (px * 0.55), 0, 1), 1 - np.clip(endD / (px * 0.7), 0, 1))
    tone = _hash(i, k, i * 0, 5)
    # every noise along the deck has a whole number of lattice cells per 34 m, so the tile repeats without a seam
    grain = vnoise(X * 60, Y * (54 / M), tone * 50, 6, py=54)
    big = fbm(X * 0.12, Y * (4 / M), np.zeros_like(X), 4, 7, py=4)
    stain = ss(0.6, 0.85, fbm(X * 0.5, Y * (17 / M), np.zeros_like(X) + 3, 4, 8, py=17))
    tyre = ss(0.62, 0.8, vnoise(X * 3.5, Y * (2 / M), np.zeros_like(X), 9, py=2)) * ss(0.25, 0.4, X / M) * ss(0.75, 0.6, X / M)
    wood = lin('#46423a') * (0.9 + 0.2 * tone[..., None]) * (0.95 + 0.1 * grain[..., None]) * (0.92 + 0.16 * big[..., None])
    col = mixc(wood, lin('#1d1a17'), caulk * 0.55)
    col = mixc(col, lin('#2a2622'), stain * 0.45)
    col = mixc(col, lin('#1e1c1a'), tyre * 0.35)
    # steel tie-down strips across the deck, with cups along them
    sp = M / 12; sd = np.abs(np.mod(Y, sp) - sp / 2)
    strip = 1 - ss(0.035, 0.035 + px, sd)
    cup = strip * (1 - ss(0.05, 0.08, np.abs(np.mod(X, 0.61) - 0.305)))
    col = mixc(col, lin('#3c3f40'), strip)
    col = mixc(col, lin('#141516'), cup * 0.8)
    # white edge lines and the dashed centre line (worn)
    wear = ss(0.35, 0.6, fbm(X * 2, Y * (68 / M), np.zeros_like(X) + 5, 3, 10, py=68))
    line = ((np.abs(X / M - 0.036) < 0.006) | (np.abs(X / M - 0.963) < 0.006)).astype(np.float32)
    line = np.maximum(line, ((np.abs(X / M - 0.5) < 0.006) & (np.mod(Y, M / 16) < M / 32)).astype(np.float32))
    col = mixc(col, lin('#e4e2d8'), line * (0.55 + 0.4 * wear) * (1 - caulk * 0.5))
    rough = 0.82 + 0.08 * (grain - 0.5) - stain * 0.15 - tyre * 0.1
    rough = rough * (1 - strip) + 0.5 * strip
    metal = 0.75 * strip
    h = -caulk * 1.0 + (grain - 0.5) * 0.25 + strip * 0.5 - cup * 1.2
    occ = 1 - caulk * 0.35 - cup * 0.4
    cov = np.ones((S, S), bool)
    n = height_to_normal(h * 0.7, 1.2, cov)
    pa, pn, po = [os.path.join(outdir, 'deck_%s.png' % s) for s in ('albedo', 'normal', 'orm')]
    save_png(srgb(col), pa); save_png(n, pn); save_png(np.stack([occ, np.clip(rough, 0.05, 1), metal], -1), po)
    log('deck set')
    return material('tex_deck', pa, pn, po)
