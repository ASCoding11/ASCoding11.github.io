# Who each character is (MakeHuman build parameters, clothes) and how their clothes are re-textured.
# All clothes are MakeHuman system assets (CC0); every texture here is recomputed in code from their UV layouts.
import bpy, os, math
import numpy as np
from mathutils import Vector
import mhlib as L, geo as G, people as P

ATHLETIC = [('hip/hip-scale-horiz-decr', 0.25), ('buttocks/buttocks-volume-decr', 0.5), ('stomach/stomach-pregnant-decr', 0.4),
            ('torso/torso-vshape-incr', 0.25), ('torso/measure-waist-circ-decr', 0.15), ('neck/neck-scale-horiz-incr', 0.25)]
SPECS = {
    # the agent: tall, lean and athletic, an even, composed face (no real person); black tuxedo
    'agent': dict(macro=dict(height=0.62, muscle=0.66, weight=0.44, prop=0.9),
                  face=ATHLETIC + [('head/head-square', 0.3), ('chin/chin-prominent-incr', 0.3), ('chin/chin-width-incr', 0.12),
                        ('cheek/l-cheek-bones-incr', 0.4), ('cheek/r-cheek-bones-incr', 0.4), ('cheek/l-cheek-volume-decr', 0.35),
                        ('cheek/r-cheek-volume-decr', 0.35), ('nose/nose-scale-vert-incr', 0.12), ('eyebrows/eyebrows-trans-down', 0.3),
                        ('mouth/mouth-scale-horiz-decr', 0.05)],
                  human=dict(skin='young_caucasian_male', brows='eyebrow001', hair='short02', eyes='grey'),
                  clothes=['male_elegantsuit01', 'shoes04'], tex=2048, hair_col='#2a1f19', bow=True,
                  layout=[('male_elegantsuit01', (0, 0, 1, 1)), ('shoes04', (1515 / 2048, 960 / 2048, 515 / 2048, 480 / 2048))]),
}

def dress(kind, spec, H, worn, td):
    size = spec.get('tex', 1024)
    mats = {}
    # skin
    alb, nrm, orm = skin_set(H['skin_png'], td + '/skin', size)
    P.set_mat(H['body'], P.material(kind + '_skin', alb, nrm, orm))
    for item, ob in worn:
        fn = globals().get('tex_' + item)
        a, n, o = fn(td + '/' + item, size, spec)
        P.set_mat(ob, P.material(kind + '_' + item, a, n, o))
        if item == 'male_elegantsuit01':
            masks = np.load(td + '/' + item + '_masks.npy').astype(np.float32)
            print('tie flattened', flatten_tie(ob, masks[2] > 0.5, H))
            if spec.get('bow'): bow_tie(ob, H, mats.setdefault('satin', satin_mat(kind)))
    if H.get('hair'):
        P.set_mat(H['hair'], P.material(kind + '_hair', tint_hair(H['hair_png'], td + '/hair.png', spec.get('hair_col')), alpha=True, rough=0.45))
    P.set_mat(H['brows'], P.material(kind + '_brows', H['brows_png'], alpha=True))
    P.set_mat(H['lashes'], P.material(kind + '_lashes', H['lashes_png'], alpha=True))
    P.set_mat(H['eyes'], P.material(kind + '_eyes', H['eye_png'], rough=0.1))

def skin_set(png, base, size):
    src = P.img_np(png, size)
    src = np.clip(src * np.array([1.0, 0.93, 0.85], np.float32) ** 0.6 * 0.97, 0, 1)   # a Mediterranean summer tan
    lum = src.mean(-1)
    hp = lum - P.blur(lum, 3)
    pores = P.fbm(size, 6, seed=3, oct=2)
    h = hp * 0.8 + (pores - 0.5) * 0.04
    n = P.normal_from_height(h, 6.0 * size / 2048)
    rough = np.clip(0.5 + (pores - 0.5) * 0.25 - hp * 1.5, 0.35, 0.7)
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1)
    return P.save(src, base + '_albedo.jpg', 92), P.save(n, base + '_normal.jpg', 92), P.save(orm, base + '_orm.jpg', 88)

def tex_male_elegantsuit01(base, size, spec):
    """Black tuxedo: wool jacket and trousers, satin-faced lapels, white dress shirt, studs, patent shoes."""
    src = P.img_np(L.MHA + '/clothes/male_elegantsuit01/male_elegantsuit01_diffuse.png', size, 'RGBA')
    rgb = src[..., :3]; lum = rgb.mean(-1)
    mx, mn = rgb.max(-1), rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-3)
    bg = np.median(rgb[: size // 64, size // 2: size // 2 + size // 16].reshape(-1, 3), 0)
    island = (np.abs(rgb - bg).max(-1) > 3 / 255).astype(np.float32)
    island = np.clip(P.blur(island, 2) * 3, 0, 1)
    shirt = ((lum > 0.5) & (sat < 0.3)).astype(np.float32)
    tie = ((sat > 0.22) & (rgb[..., 2] > rgb[..., 0] + 0.05)).astype(np.float32)
    tie = np.clip(P.blur(tie, 4) * 4, 0, 1)
    shoe = P.poly_mask(size, [[(1490, 956), (2010, 956), (2010, 1444), (1490, 1444)]])
    lapel = P.poly_mask(size, [[(1000, 185), (1005, 330), (1100, 565), (1132, 565), (1132, 185)],
                               [(1250, 185), (1245, 330), (1150, 565), (1118, 565), (1118, 185)]]) * (1 - shirt)
    lapel = P.blur(lapel, 1.2)
    detail = np.clip(lum / np.maximum(P.blur(lum, 10), 1e-3), 0.55, 1.5)
    fold = np.clip(P.blur(lum, 18) / np.maximum(np.median(P.blur(lum, 18)[island > 0.5]), 1e-3), 0.6, 1.35)
    weave = P.fbm(size, 1.5, seed=7, oct=2)
    wool = P.hex3('#17171b') * (detail ** 0.9 * (0.75 + 0.25 * fold) * (0.93 + 0.14 * weave))[..., None]
    satin = P.hex3('#0c0c0f') * (detail ** 0.25 * (0.8 + 0.2 * fold))[..., None]
    shirt_c = P.hex3('#f1f0ea') * np.clip(lum / 0.85, 0.55, 1.05)[..., None]
    # the tie becomes the shirt front: a pleated bib with a placket and three black studs, laid out along the tie's
    # own axis in the texture (the tie island is drawn at a slant)
    ys, xs = np.nonzero(tie > 0.5)
    front = shirt_c.copy()
    bib = np.clip(P.blur(tie, 10) * 3, 0, 1)
    if len(xs):
        k = size / 2048
        cx, cy = xs.mean(), ys.mean()
        cov = np.cov(np.stack([xs - cx, ys - cy]))
        w, vec = np.linalg.eigh(cov); ax = vec[:, 1]            # long axis (down the tie)
        if ax[1] < 0: ax = -ax
        X = np.arange(size)[None, :].repeat(size, 0) - cx; Y = np.arange(size)[:, None].repeat(size, 1) - cy
        along = X * ax[0] + Y * ax[1]; across = -X * ax[1] + Y * ax[0]
        a0, a1 = (xs - cx) * ax[0] + (ys - cy) * ax[1], None
        lo, hi = a0.min(), a0.max()
        pleat = 0.95 + 0.05 * np.cos(across / (9 * k) * math.pi) ** 2
        front = P.hex3('#f5f4ef') * pleat[..., None] * (1 - 0.05 * (np.abs(across) < 6 * k))[..., None]
        for i in range(3):
            t = lo + (hi - lo) * (0.28 + 0.24 * i)
            d = np.hypot(along - t, across)
            stud = np.clip(1 - d / (5.5 * k), 0, 1)
            front = np.where((stud > 0)[..., None], P.hex3('#0b0b0d') + 0.35 * (stud ** 6)[..., None], front)
        tie = bib
    shoes = P.hex3('#0a0a0b') * (0.6 + 0.4 * np.clip(lum / max(lum[shoe > 0.5].mean(), 1e-3), 0.5, 1.6))[..., None]
    out = wool
    out = out * (1 - lapel[..., None]) + satin * lapel[..., None]
    out = out * (1 - shirt[..., None]) + shirt_c * shirt[..., None]
    out = out * (1 - tie[..., None]) + front * tie[..., None]
    out = out * (1 - shoe[..., None]) + shoes * shoe[..., None]
    rough = 0.82 - 0.08 * weave
    rough = rough * (1 - lapel) + 0.3 * lapel
    rough = rough * (1 - shirt) + 0.62 * shirt
    rough = rough * (1 - tie) + 0.55 * tie
    rough = rough * (1 - shoe) + 0.16 * shoe
    h = (detail - 1) * 0.12 * (1 - lapel * 0.8) + (weave - 0.5) * 0.04 * (1 - lapel) * (1 - shoe)
    nrm = P.normal_from_height(h, 9 * size / 2048)
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1)
    np.save(base + '_masks.npy', np.stack([lapel, shirt, tie, shoe], 0).astype(np.float16))
    return P.save(out, base + '_albedo.jpg', 92), P.save(nrm, base + '_normal.jpg', 92), P.save(orm, base + '_orm.jpg', 88)

def tint_hair(png, out, col):
    from PIL import Image
    im = P.img_np(png, None, 'RGBA')
    if col:
        lum = im[..., :3].mean(-1, keepdims=True)
        lum = lum / max(np.percentile(lum[im[..., 3] > 0.5], 90), 1e-3)
        im[..., :3] = np.clip(P.hex3(col) * (0.55 + 0.75 * lum), 0, 1)
    Image.fromarray(np.clip(im * 255 + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(out)
    return out

def drop_faces_uv(ob, mask):
    """Delete faces whose UV centre lands inside mask (size x size, y down)."""
    import bmesh
    n = mask.shape[0]
    bm = bmesh.new(); bm.from_mesh(ob.data); uv = bm.loops.layers.uv['UVMap']
    kill = []
    for f in bm.faces:
        u = sum(l[uv].uv.x for l in f.loops) / len(f.loops); v = sum(l[uv].uv.y for l in f.loops) / len(f.loops)
        x, y = int(min(n - 1, max(0, u * n))), int(min(n - 1, max(0, (1 - v) * n)))
        if mask[y, x]: kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(ob.data); bm.free()
    return len(kill)

def satin_mat(kind):
    m = bpy.data.materials.new(kind + '_satin'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.006, 0.006, 0.007, 1); b.inputs['Roughness'].default_value = 0.38
    return m

def bow_tie(collar, H, mat):
    """A black satin bow tie at the front of the shirt collar: two pinched lobes, a knot and the band ends."""
    import bmesh
    me = collar.data
    # the collar front: the most forward (-Y) collar vertex near x=0 high on the neck
    neck = H['J']['neck_01'][0]
    best = None
    for v in me.vertices:
        p = v.co
        if abs(p.x) < 0.012 and neck.z - 0.07 < p.z < neck.z + 0.03:
            if best is None or p.y < best.y: best = p.copy()
    c = Vector((0, best.y - 0.012, best.z - 0.028))
    bm = bmesh.new()
    def lobe(side):
        r = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=1.0)
        for v in r['verts']:
            x, y, z = v.co
            ax = (x + 1) / 2                      # 0 at the knot, 1 at the outer end
            pinch = 0.32 + 0.68 * math.sin(min(1, ax * 1.15) * math.pi / 2) ** 0.8
            flare = 1 + 0.25 * max(0, ax - 0.6)
            v.co = Vector((side * (0.008 + ax * 0.05), y * 0.0055 * pinch, z * 0.022 * pinch * flare))
            # the outer edge dips in the middle, like a tied butterfly
            if ax > 0.85: v.co.x -= side * 0.004 * (1 - abs(z))
    lobe(1); lobe(-1)
    k = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0)
    for v in k['verts']: v.co = Vector((v.co.x * 0.0085, v.co.y * 0.0075 - 0.002, v.co.z * 0.012))
    for v in bm.verts: v.co += c
    ob = G.mesh_obj('BowTie', [], [])
    bm.to_mesh(ob.data); bm.free()
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(mat)
    ob.data.uv_layers.new(name='UVMap')
    G.transfer_weights(ob, collar)
    return ob

def tex_shoes04(base, size, spec):
    """Polished black dress shoes (patent finish for the agent)."""
    s = size // 2
    src = P.img_np(L.MHA + '/clothes/shoes04/shoes04_diffuse.png', s)
    lum = src.mean(-1)
    out = P.hex3('#0b0b0c') * np.clip(0.7 + 0.6 * lum / max(lum.mean(), 1e-3) * 0.5, 0.5, 1.3)[..., None]
    sole = (lum > np.percentile(lum, 97)).astype(np.float32)
    rough = np.full_like(lum, 0.14 if spec.get('bow') else 0.32) + 0.3 * sole
    nrm = P.normal_from_height((lum - P.blur(lum, 3)) * 0.2, 4)
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1)
    return P.save(out, base + '_albedo.jpg', 92), P.save(nrm, base + '_normal.jpg', 92), P.save(orm, base + '_orm.jpg', 88)

def flatten_tie(ob, mask, H):
    """The suit's long tie becomes a flat shirt front: its vertices are pressed back onto the chest (the body's
    surface measured before the covered body was removed), so the bib texture lies where the tie hung."""
    n = mask.shape[0]; me = ob.data; uv = me.uv_layers['UVMap'].data
    tie = set()
    for p in me.polygons:
        u = sum(uv[li].uv.x for li in p.loop_indices) / p.loop_total; v = sum(uv[li].uv.y for li in p.loop_indices) / p.loop_total
        if mask[int(min(n - 1, max(0, (1 - v) * n))), int(min(n - 1, max(0, u * n)))]: tie.update(p.vertices)
    bvh = H['chest_bvh']
    moved = 0
    for i in tie:
        co = me.vertices[i].co
        hit = bvh.ray_cast(Vector((co.x, co.y - 0.2, co.z)), Vector((0, 1, 0)), 0.5)
        if hit[0] is not None:
            me.vertices[i].co.y = hit[0].y - 0.007; moved += 1
    return moved
