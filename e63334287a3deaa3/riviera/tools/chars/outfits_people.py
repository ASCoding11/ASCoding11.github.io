# Who each character is (MakeHuman build parameters, clothes) and how their clothes are re-textured.
# All clothes are MakeHuman system assets (CC0); every texture here is recomputed in code from their UV layouts.
import bpy, os, math
import numpy as np
from mathutils import Vector
import mhlib as L, geo as G, people as P

ATHLETIC = [('hip/hip-scale-horiz-decr', 0.25), ('buttocks/buttocks-volume-decr', 0.5), ('stomach/stomach-pregnant-decr', 0.4),
            ('torso/torso-vshape-incr', 0.25), ('torso/measure-waist-circ-decr', 0.15), ('neck/neck-scale-horiz-incr', 0.25)]
HEAVY = [('torso/torso-vshape-incr', 0.15), ('neck/neck-scale-horiz-incr', 0.5), ('arms/l-upperarm-muscle-incr', 0.3), ('arms/r-upperarm-muscle-incr', 0.3)]
def man(height, muscle, weight, prop=0.8, race='caucasian'): return dict(height=height, muscle=muscle, weight=weight, prop=prop, race=race)
def woman(height, muscle, weight, prop=0.8, race='caucasian'): return dict(height=height, muscle=muscle, weight=weight, prop=prop, race=race, g='female')
SPECS = {
    # the agent: tall, lean and athletic, an even, composed face (no real person); black tuxedo
    'agent': dict(macro=man(0.62, 0.66, 0.44, 0.9),
                  face=ATHLETIC + [('head/head-square', 0.3), ('chin/chin-prominent-incr', 0.3), ('chin/chin-width-incr', 0.12),
                        ('cheek/l-cheek-bones-incr', 0.4), ('cheek/r-cheek-bones-incr', 0.4), ('cheek/l-cheek-volume-decr', 0.35),
                        ('cheek/r-cheek-volume-decr', 0.35), ('nose/nose-scale-vert-incr', 0.12), ('eyebrows/eyebrows-trans-down', 0.3),
                        ('mouth/mouth-scale-horiz-decr', 0.05)],
                  human=dict(skin='young_caucasian_male', brows='eyebrow001', hair='short02', eyes='grey'),
                  clothes=['male_elegantsuit01', 'shoes04'], tex=2048, hair_col='#2a1f19', bow=True,
                  suit=dict(wool='#17171b', lapel='satin', tie='front'), shoe=('#0a0a0b', 0.14),
                  layout=[('male_elegantsuit01', (0, 0, 1, 1)), ('shoes04', (1515 / 2048, 960 / 2048, 515 / 2048, 480 / 2048))]),
    # Halcyon's suited security: charcoal suit, white shirt, narrow black tie, heavier build
    'suit': dict(name='Suit', macro=man(0.6, 0.72, 0.62, 0.75), face=HEAVY + [('head/head-square', 0.5), ('nose/nose-scale-horiz-incr', 0.3),
                  ('chin/chin-width-incr', 0.35), ('eyebrows/eyebrows-angle-down', 0.3), ('mouth/mouth-scale-horiz-incr', 0.1)],
                 human=dict(skin='middleage_caucasian_male', brows='eyebrow005', hair='short04', eyes='brown'),
                 clothes=['male_elegantsuit01', 'shoes04'], tex=1024, hair_col='#1b1512',
                 suit=dict(wool='#23252b', lapel=None, tie='#0e0f12'), shoe=('#0d0d0e', 0.35),
                 layout=[('male_elegantsuit01', (0, 0, 1, 1)), ('shoes04', (1515 / 2048, 960 / 2048, 515 / 2048, 480 / 2048))]),
    # Halcyon's tactical guards: black tee, plate carrier, grey cargo trousers, boots
    'tac': dict(name='Tac', macro=man(0.58, 0.8, 0.55, 0.8), face=HEAVY + [('head/head-oval', 0.3), ('nose/nose-hump-incr', 0.4),
                 ('cheek/l-cheek-volume-decr', 0.3), ('cheek/r-cheek-volume-decr', 0.3), ('chin/chin-prominent-incr', 0.3)],
                human=dict(skin='young_caucasian_male2', brows='eyebrow009', hair='short01', eyes='brownlight'),
                clothes=['male_casualsuit06', 'shoes03'], tex=1024, hair_col='#1e1915',
                cols=dict(top='#1a1b1e', bottom='#4a4c4f'), vest='#2b2c28', shoe=('#141414', 0.55),
                layout=[('male_casualsuit06', (0, 0, 1, 0.75)), ('shoes03', (0, 0.75, 0.5, 0.25)), ('vest', (0.5, 0.75, 0.5, 0.25))]),
    # summer visitors and townspeople
    'civm1': dict(name='CivM1', macro=man(0.5, 0.5, 0.55, 0.75, 'caucasian'), face=[('head/head-round', 0.3), ('nose/nose-scale-vert-incr', 0.2),
                   ('eyebrows/eyebrows-trans-up', 0.2), ('mouth/mouth-scale-horiz-incr', 0.15)],
                  human=dict(skin='middleage_caucasian_male', brows='eyebrow002', hair='short03', eyes='blue'),
                  clothes=['male_casualsuit01', 'shoes01'], tex=1024, hair_col='#6b4e36',
                  cols=dict(top='#eceae2', bottom='#c9b897'), weave='linen', shoe=('#5a3a22', 0.45),
                  layout=[('male_casualsuit01', (0, 0, 1, 0.75)), ('shoes01', (0, 0.75, 0.5, 0.25))]),
    'civm2': dict(name='CivM2', macro=man(0.45, 0.55, 0.45, 0.8, 'african'), face=[('head/head-oval', 0.3), ('chin/chin-width-incr', 0.2)],
                  human=dict(skin='young_african_male', brows='eyebrow003', hair='short01', eyes='brown'),
                  clothes=['male_casualsuit06', 'shoes05'], tex=1024, hair_col='#0f0c0b',
                  cols=dict(top='#f3f1ea', bottom='#2f3d55'), stripes=('top', '#22345c', 0.018), shoe=('#efefea', 0.6),
                  layout=[('male_casualsuit06', (0, 0, 1, 0.75)), ('shoes05', (0, 0.75, 0.5, 0.25))]),
    'civf1': dict(name='CivF1', macro=woman(0.5, 0.45, 0.45, 0.85), face=[('nose/nose-scale-horiz-decr', 0.2), ('mouth/mouth-scale-horiz-decr', 0.1)],
                  human=dict(skin='young_caucasian_female', brows='eyebrow011', hair='ponytail01', eyes='green', lashes='eyelashes02'),
                  clothes=['female_elegantsuit01', 'shoes05'], tex=1024, hair_col='#4a2f1e', female=True,
                  cols=dict(top='#f6f3ec', bottom='#d9674e'), weave='linen', shoe=('#e9e2d4', 0.6),
                  layout=[('female_elegantsuit01', (0, 0, 1, 0.75)), ('shoes05', (0, 0.75, 0.5, 0.25))]),
    'civf2': dict(name='CivF2', macro=woman(0.45, 0.45, 0.5, 0.8, 'asian'), face=[('head/head-round', 0.2)],
                  human=dict(skin='young_asian_female', brows='eyebrow010', hair='bob02', eyes='brown', lashes='eyelashes02'),
                  clothes=['female_casualsuit01', 'shoes06'], tex=1024, hair_col='#14100e', female=True,
                  cols=dict(top='#e8c55a', bottom='#f2efe6'), shoe=('#b88a5a', 0.55),
                  layout=[('female_casualsuit01', (0, 0, 1, 0.75)), ('shoes06', (0, 0.75, 0.5, 0.25))]),
}

def dress(kind, spec, H, worn, td):
    size = spec.get('tex', 1024)
    mats = {}
    alb, nrm, orm = skin_set(H['skin_png'], td + '/skin', size)
    P.set_mat(H['body'], P.material(kind + '_skin', alb, nrm, orm))
    for item, ob in worn:
        if item == 'male_elegantsuit01': a, n, o = tex_male_elegantsuit01(td + '/' + item, size, spec)
        elif item.startswith('shoes'): a, n, o = tex_shoes(item, td + '/' + item, size, spec)
        else: a, n, o = tex_generic(item, td + '/' + item, size, spec, ob, H)
        P.set_mat(ob, P.material(kind + '_' + item, a, n, o))
        if item == 'male_elegantsuit01' and spec['suit'].get('tie') == 'front':
            masks = np.load(td + '/' + item + '_masks.npy').astype(np.float32)
            print('tie flattened', flatten_tie(ob, masks[2] > 0.5, H))
            if spec.get('bow'): bow_tie(ob, H, mats.setdefault('satin', satin_mat(kind)))
    if spec.get('vest'):
        top = [ob for item, ob in worn if not item.startswith('shoes')][0]
        v = plate_carrier(top, H, td, spec)
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
    SU = spec['suit']
    if SU.get('lapel') != 'satin': lapel = lapel * 0
    if SU.get('tie') != 'front': tie_keep = tie.copy()
    wool = P.hex3(SU['wool']) * (detail ** 0.9 * (0.75 + 0.25 * fold) * (0.93 + 0.14 * weave))[..., None]
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
    if SU.get('tie') == 'front': out = out * (1 - tie[..., None]) + front * tie[..., None]
    else:
        tk = np.clip(P.blur(tie_keep, 1.5) * 2, 0, 1)
        tiec = P.hex3(SU['tie']) * (0.7 + 0.3 * detail ** 2)[..., None]
        out = out * (1 - tk[..., None]) + tiec * tk[..., None]; tie = tk * 0
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

def tex_shoes(item, base, size, spec):
    """Shoes in the outfit's colour, keeping the source's light and shade (patent finish for the agent)."""
    s = size // 2
    src = P.img_np(L.MHA + '/clothes/%s/%s_diffuse.png' % (item, item), s)
    lum = src.mean(-1)
    col, r0 = spec.get('shoe', ('#0b0b0c', 0.3))
    rel = np.clip(lum / max(np.median(lum[lum > 0.02]), 1e-3), 0.3, 2.0)
    out = np.clip(P.hex3(col) * (0.55 + 0.45 * rel)[..., None], 0, 1)
    sole = (lum > np.percentile(lum, 97)).astype(np.float32)
    rough = np.full_like(lum, r0) + 0.3 * sole
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

def uv_islands(ob):
    """Per face: an island id (faces joined by edges whose UVs match)."""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(ob.data); uv = bm.loops.layers.uv['UVMap']; bm.faces.ensure_lookup_table()
    par = list(range(len(bm.faces)))
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for e in bm.edges:
        ls = e.link_loops
        if len(ls) != 2: continue
        a, b = ls
        ua = (a[uv].uv.copy(), a.link_loop_next[uv].uv.copy()); ub = (b.link_loop_next[uv].uv.copy(), b[uv].uv.copy())
        if (ua[0] - ub[0]).length < 1e-5 and (ua[1] - ub[1]).length < 1e-5:
            par[f(a.face.index)] = f(b.face.index)
    ids = [f(i) for i in range(len(bm.faces))]
    polys = [[(l[uv].uv.x, l[uv].uv.y) for l in fc.loops] for fc in bm.faces]
    zs = [fc.calc_center_median().z for fc in bm.faces]
    bm.free()
    return ids, polys, zs

def raster_labels(ob, size, H):
    """Texture-space label image: 1 where the UV island belongs to the top (shirt, blouse), 2 for the bottom."""
    from PIL import Image, ImageDraw
    ids, polys, zs = uv_islands(ob)
    import collections
    acc = collections.defaultdict(list)
    for i, z in zip(ids, zs): acc[i].append(z)
    cut = H['J']['pelvis'][0].z + 0.02
    lab = {i: (1 if np.mean(v) > cut else 2) for i, v in acc.items()}
    im = Image.new('L', (size, size), 0); d = ImageDraw.Draw(im)
    for i, p in zip(ids, polys):
        d.polygon([(u * size, (1 - v) * size) for u, v in p], fill=lab[i])
    lab_img = np.asarray(im.filter(__import__('PIL.ImageFilter', fromlist=['x']).MaxFilter(5)))
    return lab_img

def tex_generic(item, base, size, spec, ob, H):
    """Any MakeHuman outfit: each UV island takes the top or bottom colour of the spec, keeping the source's folds
    and seams (its light and shade relative to the island), with linen slub or stripes added in code. Logos and
    prints in the source (saturated texels) are flattened out."""
    src = P.img_np(L.MHA + '/clothes/%s/%s_diffuse.png' % (item, item), size, 'RGB')
    lum = src.mean(-1); mx, mn = src.max(-1), src.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-3)
    lab = raster_labels(ob, size, H)
    smooth = P.blur(lum, 14)
    logo = np.clip((sat - 0.3) * 5, 0, 1); logo = np.clip(P.blur(logo, 6) * 3, 0, 1)
    local = lum * (1 - logo) + smooth * logo
    rel = np.clip(local / np.maximum(P.blur(local, 40), 1e-3), 0.5, 1.4)
    out = np.zeros((size, size, 3), np.float32); rough = np.full((size, size), 0.8, np.float32)
    weave = P.fbm(size, 1.2, seed=11, oct=2)
    slub = P.fbm(size, 0.6, seed=5, oct=1) if spec.get('weave') == 'linen' else np.full_like(lum, 0.5)
    for k, name in ((1, 'top'), (2, 'bottom')):
        m = (lab == k)
        c = P.hex3(spec['cols'][name])
        shade = rel ** 1.1 * (0.94 + 0.12 * weave) * (0.95 + 0.1 * slub)
        out[m] = (c[None, :] * shade[m][:, None])
    if spec.get('stripes'):
        part, sc, w = spec['stripes']; k = 1 if part == 'top' else 2
        Y = np.arange(size)[:, None].repeat(size, 1) / size
        st = (np.sin(Y / w * math.pi) > 0.25) & (lab == k)
        out[st] = P.hex3(sc)[None, :] * (rel[st] ** 1.1)[:, None]
    h = (rel - 1) * 0.15 + (weave - 0.5) * 0.05 + (slub - 0.5) * 0.04
    nrm = P.normal_from_height(h, 8 * size / 2048)
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1)
    return P.save(np.clip(out, 0, 1), base + '_albedo.jpg', 92), P.save(nrm, base + '_normal.jpg', 92), P.save(orm, base + '_orm.jpg', 88)

def plate_carrier(top, H, td, spec):
    """A plate carrier made from the shirt's torso: faces of the chest and back between the waist and the armpits are
    copied, pushed out 2.5 cm and given thickness; nylon texture with pouches and a name-tape panel drawn in code."""
    import bmesh
    J = H['J']; z0 = J['pelvis'][0].z + 0.17; z1 = J['clavicle_l'][0].z - 0.03
    sx = abs(J['upperarm_l'][0].x) - 0.035
    me = top.data
    bm = bmesh.new(); bm.from_mesh(me)
    z0 -= 0.05
    def wid(z): return sx * (0.55 if z > z1 - 0.11 else 1.0)
    keep = set()
    for f in bm.faces:
        if any(z0 - 0.03 < v.co.z < z1 + 0.03 and abs(v.co.x) < wid(v.co.z) + 0.03 for v in f.verts): keep.add(f.index)
    kill = [f for f in bm.faces if f.index not in keep]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.normal_update()
    # clamp onto a clean outline (straight hem and top, armholes) so the cut edges are not stair-stepped
    for v in bm.verts:
        v.co.z = min(max(v.co.z, z0), z1)
        w = wid(v.co.z)
        if abs(v.co.x) > w: v.co.x = math.copysign(w, v.co.x)
    for v in bm.verts: v.co += v.normal * 0.024
    vm = bpy.data.meshes.new('vest'); bm.to_mesh(vm); bm.free()
    ob = bpy.data.objects.new('C_vest', vm); bpy.context.scene.collection.objects.link(ob)
    # weights from the shirt
    for vg in top.vertex_groups: ob.vertex_groups.new(name=vg.name)
    G.transfer_weights(ob, top)
    sol = ob.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.018; sol.offset = 1
    L.set_active(ob); bpy.ops.object.modifier_apply(modifier=sol.name)
    # planar UVs: front and back projected (x, z) into the vest rect
    zs = [v.co.z for v in vm.vertices]; zmin, zmax = min(zs), max(zs)
    uvl = vm.uv_layers.new(name='UVMap') if 'UVMap' not in vm.uv_layers else vm.uv_layers['UVMap']
    for p in vm.polygons:
        back = p.normal.y > 0
        for li in p.loop_indices:
            co = vm.vertices[vm.loops[li].vertex_index].co
            u = (co.x / (2 * sx) + 0.5) * 0.5 + (0.5 if back else 0)
            uvl.data[li].uv = (u, (co.z - zmin) / (zmax - zmin))
    # texture: nylon weave, MOLLE rows, two front pouches, edge binding
    size = 512
    X = np.arange(size)[None, :].repeat(size, 0) / size; Y = 1 - np.arange(size)[:, None].repeat(size, 1) / size
    base = P.hex3(spec['vest']); weave = P.fbm(size, 1.0, seed=2, oct=2)
    lum = 0.9 + 0.12 * weave
    molle = ((np.sin(Y * 60) > 0.6) & (Y < 0.55)).astype(np.float32) * 0.18
    pouch = np.zeros_like(X)
    for cx in (0.13, 0.25, 0.37):
        pouch += ((np.abs(X - cx) < 0.05) & (Y > 0.08) & (Y < 0.42)).astype(np.float32)
    edge = ((Y < 0.03) | (Y > 0.97)).astype(np.float32)
    shade = lum - molle + pouch * 0.08 - edge * 0.15
    alb = np.clip(base[None, None, :] * shade[..., None], 0, 1)
    h = weave * 0.04 + pouch * 0.6 - molle * 0.3
    P.save(alb, td + '/vest_albedo.jpg'); P.save(P.normal_from_height(P.blur(h, 1), 6), td + '/vest_normal.jpg')
    rough = np.full((size, size), 0.85, np.float32)
    P.save(np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1), td + '/vest_orm.jpg')
    P.set_mat(ob, P.material('vest', td + '/vest_albedo.jpg', td + '/vest_normal.jpg', td + '/vest_orm.jpg'))
    return ob
