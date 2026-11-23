# Assemble a baked character into its final GLB (mesh + hair mesh + skeleton, no clips unless asked).
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as L, geo as G, pipe as PP


LOD_TRIS = (('LOD1', 5000), ('LOD2', 1800))   # mid and far LODs (same skeleton, material and UVs)
def make_lods(low, name):
    """Decimated copies of the finished low mesh, made before morphs are added (decimation drops shape keys)."""
    tris = sum(len(p.vertices) - 2 for p in low.data.polygons)
    out = []
    for suf, target in LOD_TRIS:
        c = low.copy(); c.data = low.data.copy(); c.name = name + suf; c.data.name = name + suf
        bpy.context.scene.collection.objects.link(c)
        for m in list(c.modifiers): c.modifiers.remove(m)
        if c.data.shape_keys: c.shape_key_clear()
        PP.decimate(c, min(1.0, target / tris))
        print('lod', c.name, sum(len(p.vertices) - 2 for p in c.data.polygons))
        out.append(c)
    return out

MORPHS = {'hero': ['blink'], 'ally': ['blink'], 'enemy': ['faceB', 'faceC']}
def add_morphs(kind, lows, parts):
    """Face morph targets from morphs.py (work/morph_<kind>.npz), matched to the final meshes by vertex position."""
    import numpy as np, morphs as MO
    path = L.WORK + '/morph_%s.npz' % kind
    if not os.path.exists(path): print('no morph data', path); return
    npz = dict(np.load(path)); names = MORPHS[kind]
    for low in (lows if isinstance(lows, list) else [lows]):
        print('morphs', low.name, MO.apply(low, 'body', npz, names))
    part_of = {'Hair': 'hair', 'Brows': 'brows', 'Lashes': 'lashes', 'Eyes': 'eyes'}
    for o, _, _ in parts:
        print('morphs', o.name, MO.apply(o, part_of.get(o.name, 'body'), npz, names))

def assemble(blend, name, td, out, hair_parts, helmet_trim=True, with_anims=(), extra_meshes=()):
    bpy.ops.wm.open_mainfile(filepath=blend)
    rig = bpy.data.objects['Armature']
    low = bpy.data.objects[name]
    # one material, one UV map
    mat = PP.final_material(name + 'Mat', {'albedo': td + '/albedo.jpg', 'normal': td + '/normal.jpg', 'orm': td + '/orm.jpg'})
    low.data.materials.clear(); low.data.materials.append(mat)
    for p in low.data.polygons: p.material_index = 0
    for uv in list(low.data.uv_layers):
        if uv.name != 'atlas': low.data.uv_layers.remove(uv)
    low.data.uv_layers['atlas'].name = 'UVMap'
    # hair / eyes / brows / lashes in a small alpha atlas
    objs = []
    for objname, img, rect in hair_parts:
        o = bpy.data.objects[objname]
        for m in list(o.modifiers): o.modifiers.remove(m)
        objs.append((o, img, rect))
    PP.hair_atlas(objs, td + '/hair.png', 1024)
    lods = make_lods(low, name)
    add_morphs(name.lower(), low, objs)
    # eyes keep their own glossy material (a sharp catchlight); the rest of the cards share the alpha atlas
    eyes = [o for o, _, _ in objs if o.name == 'Eyes'][0]
    eyes.name = name + 'Eyes'; eyes.data.name = name + 'Eyes'
    em = PP.final_material(name + 'EyeMat', {'albedo': td + '/hair.png'}, alpha=False, rough=0.08)
    eyes.data.materials.clear(); eyes.data.materials.append(em)
    for p in eyes.data.polygons: p.material_index = 0
    hair = G.join([o for o, _, _ in objs if o is not eyes], name + 'Hair')
    hm = PP.final_material(name + 'HairMat', {'albedo': td + '/hair.png'}, alpha=True, rough=0.5)
    hair.data.materials.clear(); hair.data.materials.append(hm)
    for p in hair.data.polygons: p.material_index = 0
    keep = {rig.name, low.name, hair.name, eyes.name} | set(extra_meshes) | {o.name for o in lods}
    for o in list(bpy.data.objects):
        if o.name not in keep: bpy.data.objects.remove(o)
    for o in [low, hair, eyes] + lods + [bpy.data.objects[e] for e in extra_meshes]:
        for m in list(o.modifiers): o.modifiers.remove(m)
        o.parent = rig
        o.modifiers.new('Armature', 'ARMATURE').object = rig
        # drop empty / helper vertex groups
        for vg in list(o.vertex_groups):
            if vg.name not in rig.data.bones: o.vertex_groups.remove(vg)
    rig.animation_data_clear()
    if with_anims:
        rig.animation_data_create()
        for n in with_anims:
            a = bpy.data.actions.get(n)
            if a:
                t = rig.animation_data.nla_tracks.new(); t.name = n; t.strips.new(n, int(a.frame_range[0]), a)
    for o in bpy.context.scene.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animation_mode='NLA_TRACKS' if with_anims else 'ACTIONS',
                              export_animations=bool(with_anims), export_def_bones=False, export_tangents=False,
                              export_image_format='AUTO', export_jpeg_quality=88, export_yup=True, use_selection=False)
    return low, hair

if __name__ == '__main__':
    kind = sys.argv[-2]; out = sys.argv[-1]
    if kind in ('hero', 'ally'):
        nm = kind.capitalize()
        td = L.WORK + '/tex_' + kind
        assemble(L.WORK + '/%s_baked.blend' % kind, nm, td, out, [
            ('Hair', L.MHA + '/hair/short02/short02_diffuse.png', (0, 0, 0.5, 0.5)),
            ('Brows', L.MHA + '/eyebrows/%s/%s.png' % (('eyebrow001',) * 2 if kind == 'hero' else ('eyebrow009',) * 2), (0.5, 0, 0.5, 0.25)),
            ('Lashes', L.MHA + '/eyelashes/eyelashes01/eyelashes01.png', (0.5, 0.25, 0.5, 0.25)),
            ('Eyes', L.MHA + '/eyes/materials/%s_eye.png' % ('brownlight' if kind == 'hero' else 'grey'), (0, 0.5, 0.5, 0.5))],
            with_anims=[])

def assemble_enemy(out):
    bpy.ops.wm.open_mainfile(filepath=L.WORK + '/enemy_baked.blend')
    rig = bpy.data.objects['Armature']
    keep = ['Armature']
    for kind in ('rifleman', 'officer', 'sniper', 'gunner'):
        name = kind.capitalize(); td = L.WORK + '/tex_' + kind
        mat = PP.final_material(name + 'Mat', {'albedo': td + '/albedo.jpg', 'normal': td + '/normal.jpg', 'orm': td + '/orm.jpg'})
        old = bpy.data.objects.get(name + 'LOD')
        if old: bpy.data.objects.remove(old)
        for on in (name,):
            o = bpy.data.objects[on]
            o.data.materials.clear(); o.data.materials.append(mat)
            for p in o.data.polygons: p.material_index = 0
            for uv in list(o.data.uv_layers):
                if uv.name != 'atlas': o.data.uv_layers.remove(uv)
            o.data.uv_layers['atlas'].name = 'UVMap'
            keep.append(on)
        keep += [c.name for c in make_lods(bpy.data.objects[name], name)]
    td = L.WORK + '/tex_enemy'; os.makedirs(td, exist_ok=True)
    parts = []
    for objname, img, rect in [('Hair', L.MHA + '/hair/short02/short02_diffuse.png', (0, 0, 0.5, 0.5)),
                               ('Brows', L.MHA + '/eyebrows/eyebrow005/eyebrow005.png', (0.5, 0, 0.5, 0.25)),
                               ('Lashes', L.MHA + '/eyelashes/eyelashes01/eyelashes01.png', (0.5, 0.25, 0.5, 0.25)),
                               ('Eyes', L.MHA + '/eyes/materials/blue_eye.png', (0, 0.5, 0.5, 0.5))]:
        o = bpy.data.objects[objname]
        for m in list(o.modifiers): o.modifiers.remove(m)
        parts.append((o, img, rect))
    PP.hair_atlas(parts, td + '/hair.png', 1024)
    add_morphs('enemy', [bpy.data.objects[k.capitalize()] for k in ('rifleman', 'officer', 'sniper', 'gunner')], parts)
    eyes = bpy.data.objects['Eyes']; eyes.name = 'EnemyEyes'; eyes.data.name = 'EnemyEyes'
    em = PP.final_material('EnemyEyeMat', {'albedo': td + '/hair.png'}, alpha=False, rough=0.08)
    eyes.data.materials.clear(); eyes.data.materials.append(em)
    for p in eyes.data.polygons: p.material_index = 0
    keep.append('EnemyEyes')
    hair = G.join([o for o, _, _ in parts if o is not eyes], 'EnemyHair')
    hm = PP.final_material('EnemyHairMat', {'albedo': td + '/hair.png'}, alpha=True, rough=0.5)
    hair.data.materials.clear(); hair.data.materials.append(hm)
    for p in hair.data.polygons: p.material_index = 0
    keep.append('EnemyHair')
    for o in list(bpy.data.objects):
        if o.name not in keep: bpy.data.objects.remove(o)
    for on in keep[1:]:
        o = bpy.data.objects[on]
        for m in list(o.modifiers): o.modifiers.remove(m)
        o.parent = rig
        o.modifiers.new('Armature', 'ARMATURE').object = rig
        for vg in list(o.vertex_groups):
            if vg.name not in rig.data.bones: o.vertex_groups.remove(vg)
    rig.animation_data_clear()
    for o in bpy.context.scene.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_def_bones=False, export_tangents=False,
                              export_image_format='AUTO', export_jpeg_quality=88, export_yup=True)

if __name__ == '__main__' and sys.argv[-2] == 'enemy':
    assemble_enemy(sys.argv[-1])
