# Field wear and dirt for the hero's scanned rifle and pistol (Poly Haven CC0, see CREDITS-weapons.md), baked into
# their own texture sets so the meshes, UVs, sockets and pivots stay exactly as they are.
# usage: python scanwear.py <unpack dir> <out dir> [rifle] [pistol]
#   <unpack dir> comes from unpack.mjs (plain.glb + img/*.png from the shipped weapons.glb); then retex.mjs writes the
#   new maps back into weapons.glb.
# Per texture set: bake the edge/cavity/occlusion mask (mats.mask_material) through the scan's own UVs, build a
# material that starts from the scan's colour, ARM and normal maps and adds what mats.py gives the code-built guns:
# bright worn edges on steel, lighter knocked edges and dents on wood, darker polished wood where hands hold, scratches,
# grime and old oil in recesses, dust on faces that look up, dried mud low on the stock, oily smudges round the action;
# then bake colour, roughness, metal and the combined normal back to the scan's map sizes.
import bpy, sys, os, math
import numpy as np
from types import SimpleNamespace
from mathutils import Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mats as MT

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC, OUT = ARGS[0], ARGS[1]
WHICH = ARGS[2:] or ['rifle', 'pistol']
os.makedirs(OUT, exist_ok=True)
THREADS = int(os.environ.get('THREADS', '2'))
def log(*a): print('[scanwear]', *a, flush=True)

R = 'bolt_action_rifle_7_62_'
SETS = {
    'rifle': dict(root='rifleScoped', sets={
        'main': dict(diff=R + 'diff_2k', arm=R + 'arm_1k', nor=R + 'nor_gl_2k', size=2048,
                     lod=(R + 'diff_512', R + 'arm_512', R + 'nor_gl_512')),
        'acc': dict(diff=R + 'accesories_diff_1k', arm=R + 'accesories_arm_1k', nor=R + 'accesories_nor_gl_1k', size=1024,
                    lod=(R + 'accesories_diff_512', R + 'accesories_arm_512', R + 'accesories_nor_gl_512'))},
        # Blender weapon frame (barrel -Y, up +Z, left +X): wrist at y 0.04, fore-end hand at y -0.28, butt to y 0.345
        zones=dict(handR=((0, 0.045, -0.040), (0.030, 0.060, 0.045)), handL=((0, -0.280, -0.020), (0.032, 0.080, 0.035)),
                   cheek=((0.02, 0.200, 0.000), (0.025, 0.110, 0.025)), butt=((0, 0.345, -0.060), (0.04, 0.014, 0.09)),
                   mud=((0, 0.290, -0.135), (0.06, 0.120, 0.055)), mud2=((0, -0.520, -0.035), (0.03, 0.200, 0.018)),
                   oil=((-0.01, -0.070, 0.020), (0.030, 0.090, 0.030)), slide=(0, 1, 0), rub=0.35)),
    'pistol': dict(root='pistol', sets={
        'main': dict(diff='service_pistol_diff_2k', arm='service_pistol_arm_1k', nor='service_pistol_nor_gl_2k', size=2048, lod=None)},
        zones=dict(handR=((0, 0.050, -0.050), (0.030, 0.040, 0.055)), handL=((0, 0.030, -0.060), (0.030, 0.040, 0.050)),
                   cheek=((0, 0, 0), (0.001, 0.001, 0.001)), butt=((0, 0, 0), (0.001, 0.001, 0.001)),
                   mud=((0, 0.055, -0.100), (0.030, 0.040, 0.022)), mud2=((0, -0.090, -0.012), (0.020, 0.050, 0.012)),
                   oil=((0, -0.040, 0.020), (0.020, 0.090, 0.022)), slide=(0, 1, 0), rub=0.85, dustk=1.6, roughmin=0.34)),
}

def load_img(name, data):
    im = bpy.data.images.load(os.path.join(SRC, 'img', name + '.png'), check_existing=True)
    if data: im.colorspace_settings.name = 'Non-Color'
    return im

def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'plain.glb'))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.render.threads_mode = 'FIXED'; sc.render.threads = THREADS
    sc.render.bake.margin = 8
    if sc.world is None: sc.world = bpy.data.worlds.new('W')
    sc.world.color = (0, 0, 0)
    return sc

def root_of(o):
    r = o
    while r.parent: r = r.parent
    return r.name

def wear_material(name, st, W, mask):
    """The scan's maps plus field wear (see the file header)."""
    nb = MT.NB(name, mask)
    nt = nb.nt
    geo = nt.nodes.new('ShaderNodeNewGeometry'); nb.P = geo.outputs['Position']   # meshes are baked into the weapon frame
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'atlas'
    def tex(img):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'
        nt.links.new(uv.outputs[0], t.inputs[0]); return t
    td, ta, tn = tex(load_img(st['diff'], False)), tex(load_img(st['arm'], True)), tex(load_img(st['nor'], True))
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(ta.outputs[0], sp.inputs[0])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.uv_map = 'atlas'; nt.links.new(tn.outputs[0], nm.inputs['Color'])
    P = nb.P
    c, r, metal = td.outputs[0], sp.outputs[1], sp.outputs[2]
    isM = nb.ss(metal, 0.25, 0.65)
    isW = nb.inv(isM)
    edge, cav = nb.edge(), nb.cavity()
    hand = MT._hand(nb, W)
    n2 = nb.noise(P, 180, 4, 0.6, w=3)
    # the scans' bevels are thin and even, so the edge mask alone draws an outline: break it into worn patches
    patch = nb.ss(nb.noise(P, 24, 4, 0.6, w=5), 0.42, 0.62)
    ew = nb.ss(nb.mul(nb.add(nb.mul(edge, nb.add(0.15, nb.mul(n2, 1.1)), nb.add(0.25, patch)), nb.mul(hand, edge, 0.6)), 1.2), 0.40, 0.75)
    # steel: worn bright on edges and corners, rubbed thin where hands go, scratched, pitted in spots
    scr = nb.scratch_set('Y', 1.0, along=1.0, fine=1.0, seed=7)
    pits = nb.mul(nb.ss(nb.vor(P, 420, 'F1', 1.0), 0.06, 0.0), nb.ss(nb.noise(P, 30, 2, 0.5, w=13), 0.55, 0.72))
    c = nb.mixc(nb.mul(hand, isM, 0.45), c, nb.cmul(nb.mixc(0.5, c, (0.20, 0.19, 0.18)), 1.0))
    c = nb.mixc(nb.mul(scr, isM, 0.75), c, (0.44, 0.44, 0.43))
    c = nb.mixc(nb.mul(ew, isM, 0.85), c, (0.50, 0.495, 0.47))
    c = nb.mixc(nb.mul(pits, isM, 0.8), c, (0.10, 0.045, 0.02))
    # holster and pocket wear: the finish rubbed thin to grey steel in broad patches on the flats (pistol mostly)
    k = W.zones.get('rub', 0.0)
    if k:
        rubm = nb.mul(nb.ss(nb.noise(nb.mapping(P, scale=(2.5, 0.4, 2.5)), 30, 4, 0.6, w=21), 0.50, 0.70), isM, k)
        c = nb.mixc(rubm, c, nb.mixc(nb.noise(P, 300, 3, 0.5, w=22), (0.30, 0.295, 0.285), (0.40, 0.395, 0.38)))
        r = nb.lerp(rubm, r, 0.30)
        ew2 = nb.clamp(nb.mul(ew, k))
        c = nb.mixc(nb.mul(ew2, isM), c, (0.55, 0.545, 0.52))
    r = nb.lerp(nb.mul(scr, isM, 0.8), r, 0.24)
    r = nb.lerp(nb.mul(ew, isM), r, 0.22)
    r = nb.lerp(nb.mul(pits, isM), r, 0.85)
    metal = nb.mul(metal, nb.inv(nb.mul(pits, 0.8)))
    # wood: knocked lighter edges, dents and gouges, darker and glossier where hands hold, dry butt and comb
    dent = nb.mul(nb.ss(nb.vor(P, 140, 'F1', 1.0), 0.11, 0.03), nb.ss(nb.noise(P, 14, 2, 0.5, w=8), 0.60, 0.70))
    gouge = nb.scratches(500, 6, (25, 40, 10), 0.05, 0.20, 3)
    wscr = nb.mx(nb.scratches(900, 16, (5, 70, -20), 0.03, 0.26, 9), nb.scratches(700, 12, (-60, 10, 35), 0.03, 0.2, 19))
    worn = nb.clamp(nb.add(nb.zone(*W.zones['butt']), nb.mul(nb.zone(*W.zones['cheek']), 0.8)))
    c = nb.mixc(nb.mul(hand, isW, 0.55), c, nb.cmul(c, 0.55))
    c = nb.mixc(nb.mul(worn, isW, 0.18), c, nb.cmul(nb.mixc(0.25, c, (0.20, 0.15, 0.10)), 1.25))
    c = nb.mixc(nb.mul(ew, isW, 0.75), c, nb.cmul(nb.mixc(0.3, c, (0.22, 0.15, 0.09)), 1.75))
    c = nb.mixc(nb.mul(nb.mx(wscr, gouge), isW, 0.7), c, nb.cmul(c, 1.9))
    c = nb.mixc(nb.mul(dent, isW, 0.6), c, nb.cmul(c, 0.6))
    r = nb.lerp(nb.mul(hand, isW), r, nb.mul(r, 0.72))
    r = nb.lerp(nb.mul(nb.mx(ew, worn), isW, 0.8), r, 0.75)
    h = nb.add(nb.mul(scr, isM, -0.5), nb.mul(pits, -0.6), nb.mul(dent, isW, -1.0), nb.mul(gouge, isW, -0.8), nb.mul(wscr, isW, -0.35))
    if W.zones.get('roughmin'):   # the pistol scan's steel is close to a mirror: no factory-new polish in the field
        r = nb.mx(r, nb.add(W.zones['roughmin'], nb.mul(nb.sub(nb.noise(P, 40, 3, 0.5, w=31), 0.5), 0.16)))
    c, r, metal, h = MT._dirty(nb, W, c, r, metal, h)
    m = nb.finish(c, r, metal, h, bump_dist=0.0004)
    b = next(n for n in nt.nodes if n.type == 'BUMP')
    nt.links.new(nm.outputs[0], b.inputs['Normal'])
    return m

def bake_pass(sc, objs, targets, kind, samples):
    """targets: material -> image (each material bakes into its own set's image)."""
    sc.cycles.samples = samples
    for m, img in targets.items():
        nt = m.node_tree
        n = nt.nodes.get('_bake') or nt.nodes.new('ShaderNodeTexImage')
        n.name = '_bake'; n.image = img; nt.nodes.active = n
    for o in sc.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kw = dict(type=kind, margin=8, use_clear=True)
    if kind == 'NORMAL': kw['normal_space'] = 'TANGENT'
    bpy.ops.object.bake(**kw)
    for m in targets:
        n = m.node_tree.nodes.get('_bake')
        if n: m.node_tree.nodes.remove(n)

def emit_route(mats, what):
    sv = []
    for m in mats:
        nt = m.node_tree
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        old = [l.from_socket for l in out.inputs[0].links]
        em = nt.nodes.new('ShaderNodeEmission')
        b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        if what == 'metal':
            src = nt.nodes['METAL'].outputs[0]
        else:
            sock = b.inputs['Base Color' if what == 'color' else 'Roughness']
            src = sock.links[0].from_socket
        nt.links.new(src, em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs[0]); sv.append((m, old, em, out))
    return sv

def emit_restore(sv):
    for m, old, em, out in sv:
        m.node_tree.nodes.remove(em)
        if old: m.node_tree.links.new(old[0], out.inputs[0])

def pixels(img):
    a = np.zeros(img.size[0] * img.size[1] * 4, np.float32); img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)[::-1]          # row 0 at the top, like PIL

def run(key):
    from PIL import Image
    cfg = SETS[key]
    sc = setup()
    W = SimpleNamespace(kind=key, zones=cfg['zones'])
    objs = [o for o in sc.objects if o.type == 'MESH' and root_of(o) == cfg['root']]
    for o in list(sc.objects):
        if o.type == 'MESH' and o not in objs:
            o.hide_render = True
    for o in objs:   # the weapon frame into the mesh data, so object = world coordinates for the materials
        M = o.matrix_world.copy(); o.parent = None; o.matrix_world = Matrix(); o.data.transform(M)
        o.data.uv_layers[0].name = 'atlas'
    # per set: which materials, mask image and targets
    setmats, mask_imgs = {}, {}
    for o in objs:
        for s in o.material_slots:
            m = s.material
            for sk, st in cfg['sets'].items():
                if any(n.type == 'TEX_IMAGE' and n.image and n.image.name.startswith(st['diff']) for n in m.node_tree.nodes):
                    setmats.setdefault(sk, set()).add(m)
    glass = [s.material for o in objs for s in o.material_slots if 'glass' in s.material.name]
    dummy = bpy.data.images.new('dummy', 16, 16)
    def imgs(tag, data):
        d = {}
        for sk, st in cfg['sets'].items():
            im = bpy.data.images.new('%s_%s_%s' % (key, sk, tag), st['size'], st['size'], alpha=True, float_buffer=data)
            if data: im.colorspace_settings.name = 'Non-Color'
            im.generated_color = (0, 0, 0, 0)
            d[sk] = im
        return d
    # 1. masks
    mm = {sk: MT.mask_material('MASK_' + sk) for sk in cfg['sets']}
    saved = {o.name: [s.material for s in o.material_slots] for o in objs}
    for o in objs:
        for s in o.material_slots:
            m = s.material
            sk = next((k for k, v in setmats.items() if m in v), None)
            s.material = mm[sk] if sk else MT.mask_material('MASK_glass')
    mi = imgs('mask', True)
    tg = {mm[sk]: mi[sk] for sk in cfg['sets']}
    for o in objs:
        for s in o.material_slots:
            if s.material not in tg: tg[s.material] = dummy
    bake_pass(sc, objs, tg, 'EMIT', 16); log(key, 'mask')
    for sk, im in mi.items():
        p = os.path.join(OUT, '%s_%s_mask.png' % (key, sk)); im.filepath_raw = p; im.file_format = 'PNG'; im.save()
    # 2. wear materials
    wm = {sk: wear_material('WEAR_%s_%s' % (key, sk), cfg['sets'][sk], W, mi[sk]) for sk in cfg['sets']}
    for o in objs:
        for s, m in zip(o.material_slots, saved[o.name]):
            sk = next((k for k, v in setmats.items() if m in v), None)
            s.material = wm[sk] if sk else m
    res = {}
    for what, samples in (('color', 4), ('rough', 4), ('metal', 2)):
        ti = imgs(what, what != 'color')
        sv = emit_route(list(wm.values()), what)
        tg = {wm[sk]: ti[sk] for sk in cfg['sets']}
        for g in glass: tg[g] = dummy
        bake_pass(sc, objs, tg, 'EMIT', samples); emit_restore(sv)
        res[what] = {sk: pixels(im) for sk, im in ti.items()}; log(key, what)
    ti = imgs('normal', True)
    tg = {wm[sk]: ti[sk] for sk in cfg['sets']}
    for g in glass: tg[g] = dummy
    bake_pass(sc, objs, tg, 'NORMAL', 4); res['normal'] = {sk: pixels(im) for sk, im in ti.items()}; log(key, 'normal')
    # 3. write the maps at the scan's sizes; texels no face covers keep the scan's own values
    for sk, st in cfg['sets'].items():
        cov = res['color'][sk][..., 3] > 0.5
        def orig(name, mode, size):
            return np.asarray(Image.open(os.path.join(SRC, 'img', name + '.png')).convert(mode).resize((size, size), Image.LANCZOS)).astype(np.float32) / 255
        S = st['size']
        col = orig(st['diff'], 'RGB', S)
        col[cov] = res['color'][sk][..., :3][cov]      # a byte sRGB bake image already holds sRGB values
        nor = orig(st['nor'], 'RGB', S); nor[cov] = res['normal'][sk][..., :3][cov]
        arm = orig(st['arm'], 'RGB', S)
        arm[..., 1][cov] = res['rough'][sk][..., 0][cov]; arm[..., 2][cov] = res['metal'][sk][..., 0][cov]
        def wr(a, name, size):
            im = Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
            if size != im.size[0]: im = im.resize((size, size), Image.LANCZOS)
            im.save(os.path.join(OUT, name + '.png'))
        asz = Image.open(os.path.join(SRC, 'img', st['arm'] + '.png')).size[0]
        wr(col, st['diff'], S); wr(nor, st['nor'], S); wr(arm, st['arm'], asz)
        if st.get('lod'):
            wr(col, st['lod'][0], 512); wr(arm, st['lod'][1], 512); wr(nor, st['lod'][2], 512)
        log(key, sk, 'written')

for k in WHICH:
    run(k)
print('SCANWEAR DONE')
