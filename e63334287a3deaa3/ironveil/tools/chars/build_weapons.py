import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import mhlib as L, geo as G, mats as MT, weapons as WP, pipe as PP
from mathutils import Vector, Matrix, Quaternion

MODE = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
M = WP.materials()
obs = [b(M) for b in WP.BUILDERS]
for o in obs:
    print(o.name, G.tris(o))
bpy.ops.wm.save_as_mainfile(filepath=L.WORK + '/weapons_geo.blend')

if MODE in ('bake', 'export'):
    TD = L.WORK + '/tex_weapons'; os.makedirs(TD, exist_ok=True)
    sc = bpy.context.scene
    sc.world = bpy.data.worlds.new('W'); sc.world.light_settings.distance = 0.05
    for i, o in enumerate(obs): o.location.x = i * 1.0
    for o in obs:
        o.data.uv_layers.new(name='atlas'); o.data.uv_layers.active = o.data.uv_layers['atlas']
    for o in sc.objects: o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.003, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    size = 2048
    for kind in ('DIFFUSE', 'AO', 'ROUGHNESS', 'NORMAL', 'EMIT'):
        img = bpy.data.images.new('w_' + kind, size, size, float_buffer=(kind == 'NORMAL'))
        img.colorspace_settings.name = 'sRGB' if kind == 'DIFFUSE' else 'Non-Color'
        sv = PP.metal_pass_begin(list(bpy.data.materials)) if kind == 'EMIT' else None
        for m in bpy.data.materials:
            if not m.node_tree: continue
            n = m.node_tree.nodes.get('_bake') or m.node_tree.nodes.new('ShaderNodeTexImage'); n.name = '_bake'; n.image = img
            m.node_tree.nodes.active = n
        sc.render.engine = 'CYCLES'; sc.cycles.samples = {'AO': 32, 'NORMAL': 8, 'DIFFUSE': 4}.get(kind, 2)
        kw = dict(type=kind, margin=8)
        if kind == 'DIFFUSE': kw['pass_filter'] = {'COLOR'}
        if kind == 'NORMAL': kw['normal_space'] = 'TANGENT'
        bpy.ops.object.bake(**kw)
        if sv: PP.metal_pass_end(sv)
        img.filepath_raw = TD + '/_%s.png' % kind.lower(); img.file_format = 'PNG'; img.save()
        print('baked', kind, flush=True)
    from PIL import Image
    d = np.asarray(Image.open(TD + '/_diffuse.png').convert('RGB')).astype(np.float32) / 255
    a = np.asarray(Image.open(TD + '/_ao.png').convert('L')).astype(np.float32) / 255
    Image.fromarray(np.clip((d * (0.4 + 0.6 * a[..., None])) * 255, 0, 255).astype(np.uint8)).save(TD + '/albedo.jpg', quality=90)
    r = np.asarray(Image.open(TD + '/_roughness.png').convert('L'))
    mt = np.asarray(Image.open(TD + '/_emit.png').convert('L'))
    Image.fromarray(np.stack([np.full_like(r, 255), r, mt], -1)).save(TD + '/orm.jpg', quality=90)
    Image.open(TD + '/_normal.png').convert('RGB').save(TD + '/normal.jpg', quality=92)
    for o in obs: o.location.x = 0
    mat = PP.final_material('WeaponMat', {'albedo': TD + '/albedo.jpg', 'orm': TD + '/orm.jpg', 'normal': TD + '/normal.jpg'})
    for o in obs:
        o.data.materials.clear(); o.data.materials.append(mat)
        for p in o.data.polygons: p.material_index = 0
        for uv in list(o.data.uv_layers):
            if uv.name != 'atlas': o.data.uv_layers.remove(uv)
    bpy.ops.wm.save_as_mainfile(filepath=L.WORK + '/weapons_baked.blend')
