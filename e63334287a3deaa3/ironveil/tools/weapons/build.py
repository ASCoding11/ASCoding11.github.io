# Build the weapons in small, resumable steps (one Blender process at a time, one weapon per bake):
#   python build.py prep   SET OUT            model + unwrap one texture set, save OUT/SET.blend and OUT/SET.json
#   python build.py bake   SET OUT SIZE KIND  bake one weapon's masks, colour, metal, roughness, normal (skips done maps)
#   python build.py finish SET OUT SIZE       composite the weapons' maps into the set's textures, export OUT/SET.glb
# Sets: rifle (player rifle, 2048), smg (player SMG, 2048), atlas (everything else + the reduced rifle and SMG).
# Then: node pack.mjs OUT/rifle.glb OUT/smg.glb OUT/atlas.glb weapons.glb
# Env: THREADS (default 2) limits Cycles threads.
import bpy, sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from types import SimpleNamespace
from PIL import Image, ImageDraw
import geo as G, models as MD, mats as MT, assemble as AS

SETS = {
    'rifle': [('rifleScoped', True, 1.0)],
    'smg': [('smg', True, 1.0)],
    'atlas': [('pistol', True, 2.4), ('enemyRifle', True, 1.0), ('enemySmg', True, 1.15), ('mg', True, 1.0),
              ('knife', True, 1.9), ('binoculars', True, 1.6), ('grenade', True, 1.8), ('stickGrenade', True, 1.4),
              ('rifleScoped', False, 0.55), ('smg', False, 0.6)],
}
STEP, SET, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
SIZE = int(sys.argv[4]) if len(sys.argv) > 4 else 2048
KIND = sys.argv[5] if len(sys.argv) > 5 else None
TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
BLEND = os.path.join(OUT, SET + '.blend'); META = os.path.join(OUT, SET + '.json')
T0 = time.time()
def log(*a):
    print('[%6.1fs]' % (time.time() - T0), *a, flush=True)

def setup_scene():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ.get('THREADS', '2'))
    sc.render.bake.margin = 6
    if sc.world is None:
        sc.world = bpy.data.worlds.new('W')
    sc.world.color = (0, 0, 0)
    return sc

def placeholder(name):
    return bpy.data.materials.get(name) or bpy.data.materials.new(name)

# ======================================================================================== prep
def prep():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene()
    objs, meta, scales = [], {}, {}
    for wi, (kind, hi, s_) in enumerate(SETS[SET]):
        W = MD.BUILDERS[kind](hi)
        if kind == 'rifleScoped' and hi:
            W.zones['checkY'] = 0.3515
        if kind == 'pistol':
            W.zones['serr'] = (0.0085, 0.0335, 0.0095)
        parts = {}
        for part, lst in W.parts.items():
            ps = []
            for ob, t in lst:
                G.set_mat(ob, placeholder('PH|%s|%s' % (W.kind, t))); ps.append(ob)
            j = G.join(ps, '%s|%s' % (W.kind, part)) if len(ps) > 1 else ps[0]
            j.name = '%s|%s' % (W.kind, part)
            G.smooth_by_angle(j, 33)
            j['wkind'] = W.kind
            j.location.x = wi * 0.6          # weapons apart so occlusion rays never meet another weapon
            parts[part] = j.name; objs.append(j)
            scales[j.name] = s_ * W.uvscale.get(part, 1.0)
        meta[W.kind] = dict(kind=W.kind, hi=W.hi, zones=W.zones, empties=W.empties, pivots=W.pivots, gripL=W.gripL,
                            gripRoff=W.gripRoff, gripLoff=W.gripLoff, uvscale=W.uvscale, parts=parts,
                            tris={p: G.tris(bpy.data.objects[n]) for p, n in parts.items()})
        log(W.kind, sum(meta[W.kind]['tris'].values()))
    unwrap(objs, scales)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    json.dump(meta, open(META, 'w'), indent=1)
    log('saved', BLEND)

def unwrap(objs, scales):
    for o in objs:
        uv = o.data.uv_layers.new(name='atlas'); o.data.uv_layers.active = uv
        for l in list(o.data.uv_layers):
            if l.name != 'atlas':
                o.data.uv_layers.remove(l)
    G.set_active(objs[0])
    for o in objs: o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(58), island_margin=0.002, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in objs:
        s = scales.get(o.name, 1.0)
        if abs(s - 1.0) > 1e-3:
            uvd = o.data.uv_layers['atlas'].data
            a = np.zeros(len(uvd) * 2); uvd.foreach_get('uv', a); a = a.reshape(-1, 2)
            c = a.mean(axis=0); a = c + (a - c) * s
            uvd.foreach_set('uv', a.reshape(-1))
    G.set_active(objs[0])
    for o in objs: o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    try:
        bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=0.0025, shape_method='CONCAVE', margin_method='FRACTION')
    except TypeError:
        bpy.ops.uv.pack_islands(rotate=True, margin=0.0025)
    bpy.ops.object.mode_set(mode='OBJECT')

# ======================================================================================== bake
def wmeta(m):
    d = dict(m)
    d['zones'] = {k: (tuple(tuple(x) if isinstance(x, list) else x for x in v) if isinstance(v, list) else v) for k, v in m['zones'].items()}
    return SimpleNamespace(**d)

def new_img(name, data):
    img = bpy.data.images.new(name, SIZE, SIZE, alpha=True, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    img.generated_color = (0, 0, 0, 0)
    return img

def save(img, path):
    img.filepath_raw = path; img.file_format = 'PNG'; img.save()

def bake_pass(sc, objs, img, kind, samples):
    sc.cycles.samples = samples
    mats = set(s.material for o in objs for s in o.material_slots if s.material)
    for m in mats:
        nt = m.node_tree
        n = nt.nodes.get('_bake') or nt.nodes.new('ShaderNodeTexImage')
        n.name = '_bake'; n.image = img; nt.nodes.active = n
    for o in sc.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kw = dict(type=kind, margin=6, use_clear=True)
    if kind == 'NORMAL': kw['normal_space'] = 'TANGENT'
    bpy.ops.object.bake(**kw)
    for m in mats:
        n = m.node_tree.nodes.get('_bake')
        if n: m.node_tree.nodes.remove(n)

def emit_route(mats, what):
    sv = []
    for m in mats:
        nt = m.node_tree
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        old = [l.from_socket for l in out.inputs[0].links]
        em = nt.nodes.new('ShaderNodeEmission')
        b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        src = None
        if what == 'metal':
            mv = nt.nodes.get('METAL'); src = mv.outputs[0] if mv else None
            if src is None: em.inputs['Color'].default_value = (0, 0, 0, 1)
        else:
            sock = b.inputs['Base Color' if what == 'color' else 'Roughness']
            src = sock.links[0].from_socket if sock.links else None
            if src is None:
                v = sock.default_value
                em.inputs['Color'].default_value = tuple(v) if what == 'color' else (v, v, v, 1)
        if src is not None: nt.links.new(src, em.inputs['Color'])
        nt.links.new(em.outputs[0], out.inputs[0]); sv.append((m, old, em, out))
    return sv

def emit_restore(sv):
    for m, old, em, out in sv:
        m.node_tree.nodes.remove(em)
        if old: m.node_tree.links.new(old[0], out.inputs[0])

def bake():
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    sc = setup_scene()
    meta = json.load(open(META))
    W = wmeta(meta[KIND])
    objs = [o for o in sc.objects if o.get('wkind') == KIND and o.type == 'MESH']
    for o in sc.objects:
        o.hide_render = o.get('wkind') != KIND
    pre = os.path.join(TEX, '%s__%s_' % (SET, KIND))
    # masks
    mpath = pre + 'mask.png'
    if not os.path.exists(mpath):
        saved = {o.name: [s.material for s in o.material_slots] for o in objs}
        mm = MT.mask_material('MASK')
        for o in objs:
            for s in o.material_slots: s.material = mm
        img = new_img('mask', True)
        bake_pass(sc, objs, img, 'EMIT', 16); save(img, mpath)
        for o in objs:
            for s, m in zip(o.material_slots, saved[o.name]): s.material = m
        log('mask')
    mimg = bpy.data.images.load(mpath); mimg.colorspace_settings.name = 'Non-Color'
    real = {}
    for o in objs:
        for s in o.material_slots:
            _, k, t = s.material.name.split('|')
            if t not in real:
                if t == 'glass':
                    gm = bpy.data.materials.new('glassbake'); gm.use_nodes = True
                    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.02, 0.02, 1)
                    real[t] = gm
                else:
                    real[t] = MT.make(t, '%s_%s' % (k, t), W, mimg, seed=len(real) * 1.7 + (sum(map(ord, k)) % 7))
            s.material = real[t]
    mats = list(real.values())
    for what, key, samples in (('color', 'color', 4), ('metal', 'metal', 2), ('rough', 'rough', 4)):
        p = pre + key + '.png'
        if os.path.exists(p): continue
        sv = emit_route(mats, what)
        img = new_img(key, key != 'color')
        bake_pass(sc, objs, img, 'EMIT', samples); save(img, p)
        emit_restore(sv); log(key)
    p = pre + 'normal.png'
    if not os.path.exists(p):
        img = new_img('normal', True)
        bake_pass(sc, objs, img, 'NORMAL', 4); save(img, p); log('normal')
    log('baked', KIND)

# ======================================================================================== finish
def coverage(objs):
    """Rasterise the UV islands of objs into a boolean mask (where these objects own the texture)."""
    im = Image.new('L', (SIZE, SIZE), 0); d = ImageDraw.Draw(im)
    for o in objs:
        me = o.data; uv = me.uv_layers['atlas'].data
        for p in me.polygons:
            pts = [(uv[li].uv[0] * SIZE, (1 - uv[li].uv[1]) * SIZE) for li in p.loop_indices]
            d.polygon(pts, fill=255, outline=255)
    return np.asarray(im) > 0

def load(path, mode):
    im = Image.open(path).convert(mode)
    return np.asarray(im).astype(np.float32) / 255.0

def finish():
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    sc = setup_scene()
    meta = json.load(open(META))
    kinds = list(meta)
    maps = {}
    for key, mode in (('mask', 'RGBA'), ('color', 'RGBA'), ('metal', 'RGBA'), ('rough', 'RGBA'), ('normal', 'RGBA')):
        acc = np.zeros((SIZE, SIZE, 4), np.float32)
        own = np.zeros((SIZE, SIZE), bool)
        # first the texels each weapon owns, then fill the bleed margins from whichever weapon baked them
        imgs = {k: load(os.path.join(TEX, '%s__%s_%s.png' % (SET, k, key)), 'RGBA') for k in kinds}
        for k in kinds:
            cov = coverage([o for o in sc.objects if o.get('wkind') == k and o.type == 'MESH'])
            acc[cov] = imgs[k][cov]; own |= cov
        for k in kinds:
            m = (~own) & (imgs[k][..., 3] > 0.5)
            acc[m] = imgs[k][m]; own |= m
        if key == 'normal':
            acc[~own] = (0.5, 0.5, 1.0, 1.0)
        maps[key] = acc[..., :3]
        log('composited', key)
    cav, occ = maps['mask'][..., 1], maps['mask'][..., 2]
    alb = maps['color'] * (1.0 - 0.30 * cav)[..., None]
    ao = np.clip(0.25 + 0.75 * occ, 0, 1) * (1.0 - 0.25 * cav)
    orm = np.stack([ao, maps['rough'][..., 0], maps['metal'][..., 0]], -1)
    def wr(a, name):
        Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(TEX, name))
    wr(alb, SET + '_albedo.png'); wr(orm, SET + '_orm.png'); wr(maps['normal'], SET + '_normal.png')
    # final material
    fm = bpy.data.materials.new('wpn_' + SET); fm.use_nodes = True
    nt = fm.node_tree; b = nt.nodes['Principled BSDF']
    ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = bpy.data.images.load(os.path.join(TEX, SET + '_albedo.png'))
    nt.links.new(ta.outputs[0], b.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(os.path.join(TEX, SET + '_normal.png'))
    tn.image.colorspace_settings.name = 'Non-Color'
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.uv_map = 'atlas'
    nt.links.new(tn.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = bpy.data.images.load(os.path.join(TEX, SET + '_orm.png'))
    to.image.colorspace_settings.name = 'Non-Color'
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(to.outputs[0], sp.inputs[0])
    nt.links.new(sp.outputs[1], b.inputs['Roughness']); nt.links.new(sp.outputs[2], b.inputs['Metallic'])
    glass = bpy.data.materials.new('wpn_glass'); glass.use_nodes = True
    gb = glass.node_tree.nodes['Principled BSDF']
    gb.inputs['Base Color'].default_value = (0.045, 0.060, 0.050, 1)
    gb.inputs['Roughness'].default_value = 0.04; gb.inputs['Metallic'].default_value = 0.0; gb.inputs['Alpha'].default_value = 0.45
    try: glass.surface_render_method = 'BLENDED'
    except Exception: pass
    roots = []
    for k in kinds:
        m = meta[k]
        meshes = {}
        for part, oname in m['parts'].items():
            o = bpy.data.objects[oname]; o.location.x = 0
            mats_ = [glass if s.material and 'glass' in s.material.name else fm for s in o.material_slots]
            uniq = []
            for x in mats_:
                if x not in uniq: uniq.append(x)
            remap = [uniq.index(x) for x in mats_]
            idx = np.zeros(len(o.data.polygons), dtype=np.int32); o.data.polygons.foreach_get('material_index', idx)
            idx = np.array([remap[i] for i in idx], dtype=np.int32)
            o.data.materials.clear()
            for x in uniq: o.data.materials.append(x)
            o.data.polygons.foreach_set('material_index', idx); o.data.update()
            meshes[part] = o
        W = SimpleNamespace(kind=k, empties={s: (tuple(v[0]), tuple(v[1]) if v[1] else None) for s, v in m['empties'].items()},
                            pivots={p: tuple(v) for p, v in m['pivots'].items()}, gripL=tuple(m['gripL']),
                            gripRoff=tuple(m['gripRoff']), gripLoff=tuple(m['gripLoff']))
        roots.append(AS.assemble(W, meshes))
    AS.export(os.path.join(OUT, SET + '.glb'), roots)
    log('exported', SET)

{'prep': prep, 'bake': bake, 'finish': finish}[STEP]()
