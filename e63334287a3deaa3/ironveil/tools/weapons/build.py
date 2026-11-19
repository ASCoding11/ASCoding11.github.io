# Build every weapon, unwrap, bake masks then albedo / roughness / normal / metal per texture set, export one GLB.
# usage: python build.py OUT.glb [SIZE] [sets]      (needs Blender as a Python module: pip install bpy)
#   texture sets: rifle (player rifle, 2048), smg (player SMG, 2048), atlas (everything else + the two reduced models)
import bpy, sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import geo as G, models as MD, mats as MT, assemble as AS

OUT = sys.argv[1]
SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 2048
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
WORK = os.path.join(os.path.dirname(OUT), 'tex')
os.makedirs(WORK, exist_ok=True)
T0 = time.time()
def log(*a):
    print('[%6.1fs]' % (time.time() - T0), *a, flush=True)

SETS = [
    ('rifle', [('rifleScoped', True, 1.0)]),
    ('smg', [('smg', True, 1.0)]),
    ('atlas', [('pistol', True, 2.4), ('enemyRifle', True, 1.0), ('enemySmg', True, 1.15), ('mg', True, 1.0),
               ('knife', True, 1.9), ('binoculars', True, 1.6), ('grenade', True, 1.8), ('stickGrenade', True, 1.4),
               ('rifleScoped', False, 0.55), ('smg', False, 0.6)]),
]
if ONLY:
    SETS = [s for s in SETS if s[0] in ONLY]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.render.bake.margin = 6
sc.world = bpy.data.worlds.new('W')
sc.world.color = (0, 0, 0)

def placeholder(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    return m

def unwrap(objs, scales):
    for o in objs:
        uv = o.data.uv_layers.new(name='atlas'); o.data.uv_layers.active = uv
        for l in list(o.data.uv_layers):
            if l.name != 'atlas':
                o.data.uv_layers.remove(l)
    G.set_active(objs[0])
    for o in objs:
        o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(58), island_margin=0.002, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in objs:   # texel density per part (bolt bigger, sling smaller...)
        s = scales.get(o.name, 1.0)
        if abs(s - 1.0) > 1e-3:
            uvd = o.data.uv_layers['atlas'].data
            a = np.zeros(len(uvd) * 2); uvd.foreach_get('uv', a); a = a.reshape(-1, 2)
            c = a.mean(axis=0); a = c + (a - c) * s
            uvd.foreach_set('uv', a.reshape(-1))
    G.set_active(objs[0])
    for o in objs:
        o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    try:
        bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=0.0022, shape_method='CONCAVE', margin_method='FRACTION')
    except TypeError:
        bpy.ops.uv.pack_islands(rotate=True, margin=0.0022)
    bpy.ops.object.mode_set(mode='OBJECT')

def bake_pass(objs, img, kind, samples):
    sc.cycles.samples = samples
    mats = set()
    for o in objs:
        for s in o.material_slots:
            if s.material: mats.add(s.material)
    for m in mats:
        nt = m.node_tree
        n = nt.nodes.get('_bake') or nt.nodes.new('ShaderNodeTexImage')
        n.name = '_bake'; n.image = img; nt.nodes.active = n
    for o in sc.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kw = dict(type=kind, margin=6, use_clear=True)
    if kind == 'DIFFUSE': kw['pass_filter'] = {'COLOR'}
    if kind == 'NORMAL': kw['normal_space'] = 'TANGENT'
    bpy.ops.object.bake(**kw)
    for m in mats:
        n = m.node_tree.nodes.get('_bake')
        if n: m.node_tree.nodes.remove(n)

def new_img(name, size, data=False, float_buf=False):
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=float_buf)
    img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    return img

def save(img, path):
    img.filepath_raw = path; img.file_format = 'PNG'; img.save()

def to_np(path, mode='RGB'):
    return np.asarray(Image.open(path).convert(mode)).astype(np.float32) / 255.0

ALL = []          # (W, meshes) for export
INFO = {}
glass_mat = bpy.data.materials.new('wpn_glass'); glass_mat.use_nodes = True
gb = glass_mat.node_tree.nodes['Principled BSDF']
gb.inputs['Base Color'].default_value = (0.045, 0.060, 0.050, 1)
gb.inputs['Roughness'].default_value = 0.04; gb.inputs['Metallic'].default_value = 0.0
gb.inputs['Alpha'].default_value = 0.45
try: glass_mat.surface_render_method = 'BLENDED'
except Exception: pass
try: glass_mat.blend_method = 'BLEND'
except Exception: pass

for si, (sname, items) in enumerate(SETS):
    log('=== set', sname)
    objs, built = [], []
    for wi, (kind, hi, sc_) in enumerate(items):
        W = MD.BUILDERS[kind](hi)
        if kind == 'rifleScoped' and hi:
            W.zones['checkY'] = 0.3515
        if kind == 'pistol':
            W.zones['serr'] = (0.0085, 0.0335, 0.0095)
        meshes = {}
        for part, lst in W.parts.items():
            ps = []
            for ob, t in lst:
                G.set_mat(ob, placeholder('PH|%s|%s' % (W.kind, t)))
                ps.append(ob)
            j = G.join(ps, '%s|%s' % (W.kind, part)) if len(ps) > 1 else ps[0]
            j.name = '%s|%s' % (W.kind, part)
            G.smooth_by_angle(j, 33)
            j.location.x = (si * 20 + wi) * 0.6
            meshes[part] = j
            objs.append(j)
        built.append((W, meshes, sc_))
        INFO[W.kind] = {'tris': sum(G.tris(m) for m in meshes.values()), 'parts': {p: G.tris(m) for p, m in meshes.items()}, 'set': sname}
        log(W.kind, INFO[W.kind]['tris'])
    scales = {}
    for W, meshes, s in built:
        for part, m in meshes.items():
            scales[m.name] = s * W.uvscale.get(part, 1.0)
    unwrap(objs, scales)
    log('unwrapped', len(objs))
    # ---- masks
    saved = {o.name: [s.material for s in o.material_slots] for o in objs}
    mm = MT.mask_material('MASK_' + sname)
    for o in objs:
        for s in o.material_slots: s.material = mm
    mimg = new_img('mask_' + sname, SIZE, data=True)
    bake_pass(objs, mimg, 'EMIT', 24)
    mpath = os.path.join(WORK, sname + '_mask.png'); save(mimg, mpath)
    log('masks baked')
    # ---- real materials
    real = {}
    for o in objs:
        for i, s in enumerate(o.material_slots):
            ph = saved[o.name][i]
            _, k, t = ph.name.split('|')
            key = (k, t)
            if key not in real:
                W = next(b[0] for b in built if b[0].kind == k)
                real[key] = MT.make('glassbake' if t == 'glass' else t, '%s_%s_%s' % (sname, k, t), W, mimg, seed=len(real) * 1.7) if t != 'glass' else None
                if t == 'glass':
                    gm = bpy.data.materials.new('%s_%s_glassbake' % (sname, k)); gm.use_nodes = True
                    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.02, 0.02, 1)
                    real[key] = gm
            s.material = real[key]
    log('materials', len(real))
    paths = {}
    for kind, samples, data in (('NORMAL', 4, True),):
        img = new_img('%s_%s' % (sname, kind), SIZE, data=data)
        bake_pass(objs, img, kind, samples)
        paths[kind] = os.path.join(WORK, '%s_%s.png' % (sname, kind.lower())); save(img, paths[kind])
        log('baked', kind)
    # base colour and metal through emission passes (the DIFFUSE bake returns black for metals)
    def emit_pass(what, key, data, samples):
        sv = []
        for m in set(real.values()):
            nt = m.node_tree
            out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            old = [l.from_socket for l in out.inputs[0].links]
            em = nt.nodes.new('ShaderNodeEmission')
            if what == 'metal':
                src = nt.nodes.get('METAL'); src = src.outputs[0] if src else None
            elif what == 'rough':
                b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
                ls = b.inputs['Roughness'].links
                src = ls[0].from_socket if ls else None
                if src is None: em.inputs['Color'].default_value = (b.inputs['Roughness'].default_value,) * 3 + (1,)
            else:
                b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
                ls = b.inputs['Base Color'].links
                src = ls[0].from_socket if ls else None
                if src is None: em.inputs['Color'].default_value = b.inputs['Base Color'].default_value
            if src is not None: nt.links.new(src, em.inputs['Color'])
            elif what == 'metal': em.inputs['Color'].default_value = (0, 0, 0, 1)
            nt.links.new(em.outputs[0], out.inputs[0]); sv.append((m, old, em, out))
        img = new_img('%s_%s' % (sname, key), SIZE, data=data)
        bake_pass(objs, img, 'EMIT', samples)
        paths[key] = os.path.join(WORK, '%s_%s.png' % (sname, key.lower())); save(img, paths[key])
        for m, old, em, out in sv:
            m.node_tree.nodes.remove(em)
            if old: m.node_tree.links.new(old[0], out.inputs[0])
        log('baked', key)
    emit_pass('color', 'DIFFUSE', False, 4)
    emit_pass('metal', 'METAL', True, 2)
    emit_pass('rough', 'ROUGHNESS', True, 4)
    # ---- composite to the shipped maps
    col = to_np(paths['DIFFUSE']); msk = to_np(mpath)
    cav, occ = msk[..., 1], msk[..., 2]
    alb = col * (1.0 - 0.30 * cav)[..., None]
    Image.fromarray(np.clip(alb * 255 + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(WORK, sname + '_albedo.png'))
    rough = to_np(paths['ROUGHNESS'], 'L'); metal = to_np(paths['METAL'], 'L')
    ao = np.clip(0.25 + 0.75 * occ, 0, 1) * (1.0 - 0.25 * cav)
    orm = np.stack([ao, rough, metal], -1)
    Image.fromarray(np.clip(orm * 255 + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(WORK, sname + '_orm.png'))
    Image.open(paths['NORMAL']).convert('RGB').save(os.path.join(WORK, sname + '_normal.png'))
    log('composited')
    # ---- final material
    fm = bpy.data.materials.new('wpn_' + sname); fm.use_nodes = True
    nt = fm.node_tree; b = nt.nodes['Principled BSDF']
    ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = bpy.data.images.load(os.path.join(WORK, sname + '_albedo.png'))
    nt.links.new(ta.outputs[0], b.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(os.path.join(WORK, sname + '_normal.png'))
    tn.image.colorspace_settings.name = 'Non-Color'
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.uv_map = 'atlas'
    nt.links.new(tn.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = bpy.data.images.load(os.path.join(WORK, sname + '_orm.png'))
    to.image.colorspace_settings.name = 'Non-Color'
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(to.outputs[0], sp.inputs[0])
    nt.links.new(sp.outputs[1], b.inputs['Roughness']); nt.links.new(sp.outputs[2], b.inputs['Metallic'])
    for o in objs:
        for s in o.material_slots:
            s.material = glass_mat if s.material and 'glass' in s.material.name else fm
        # merge duplicate slots
        names = []
        for p in o.data.polygons:
            pass
        o.location.x = 0
    for W, meshes, s in built:
        ALL.append((W, meshes))

# ---- tidy slots (one baked material + optional glass per mesh) and export
for W, meshes in ALL:
    for part, o in meshes.items():
        me = o.data
        mats = [s.material for s in o.material_slots]
        uniq = []
        for m in mats:
            if m not in uniq: uniq.append(m)
        remap = [uniq.index(m) for m in mats]
        idx = np.zeros(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('material_index', idx)
        idx = np.array([remap[i] for i in idx], dtype=np.int32)
        me.materials.clear()
        for m in uniq: me.materials.append(m)
        me.polygons.foreach_set('material_index', idx); me.update()
roots = [AS.assemble(W, meshes) for W, meshes in ALL]
AS.export(OUT, roots)
json.dump(INFO, open(os.path.splitext(OUT)[0] + '_info.json', 'w'), indent=1)
log('exported', OUT)
