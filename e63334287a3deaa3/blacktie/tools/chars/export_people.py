# Packs a built character ($CHARS_WORK/<kind>.blend from build_people.py) into the game's GLB:
#   <Name>       body skin + clothes (two materials: skin, cloth; all clothes share one atlas, the bow tie included)
#   <Name>Hair   hair, brows and lashes on one alpha atlas         <Name>Eyes   the eyes (same atlas, opaque)
#   <Name>LOD1 / <Name>LOD2   decimated body + clothes (LOD2 also carries a hair cap baked into the skin colour)
# One skeleton per file (the UAL bone names), so every clip in anims.glb plays on it.
#   KIND=agent bvenv/bin/python export_people.py out.glb
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import mhlib as L, geo as G, people as P
import outfits_people as O

KIND = os.environ.get('KIND', 'agent'); SPEC = O.SPECS[KIND]
NAME = SPEC.get('name', KIND.capitalize())
OUT = sys.argv[-1]
TD = L.WORK + '/tex_' + KIND
bpy.ops.wm.open_mainfile(filepath=L.WORK + '/%s.blend' % KIND)
rig = bpy.data.objects['Armature']
from PIL import Image

def remap(ob, rect):
    """Move an object's UVs (0..1) into rect = (x, y, w, h) of the atlas, y measured from the top."""
    x, y, w, h = rect
    for d in ob.data.uv_layers['UVMap'].data:
        u, v = d.uv
        d.uv = (x + min(max(u, 0), 1) * w, (1 - y - h) + min(max(v, 0), 1) * h)

# ---- clothes atlas
size = SPEC.get('tex', 1024)
atlas = Image.new('RGB', (size, size), (20, 20, 22)); natl = Image.new('RGB', (size, size), (128, 128, 255)); oatl = Image.new('RGB', (size, size), (255, 200, 0))
cloth = []
for item, rect in SPEC['layout']:
    ob = bpy.data.objects['C_' + item]
    x, y, w, h = rect
    box = (int(x * size), int(y * size)); dim = (max(1, int(w * size)), max(1, int(h * size)))
    for img, src in ((atlas, '_albedo.jpg'), (natl, '_normal.jpg'), (oatl, '_orm.jpg')):
        img.paste(Image.open(TD + '/' + item + src).convert('RGB').resize(dim, Image.LANCZOS), box)
    remap(ob, rect); cloth.append(ob)
bow = bpy.data.objects.get('BowTie')
if bow:
    m = np.load(TD + '/male_elegantsuit01_masks.npy').astype(np.float32)[0]
    ys, xs = np.nonzero(m > 0.95); i = len(xs) // 2
    u, v = (xs[i] + 0.5) / m.shape[1], 1 - (ys[i] + 0.5) / m.shape[0]
    for d in bow.data.uv_layers['UVMap'].data: d.uv = (u, v)
    cloth.append(bow)
nsz = min(size, 1024); osz = min(size, 512)
# real white cloth reflects about 80 % of light: soft-knee the brightest texels so shirts do not bloom in the sun
a = np.asarray(atlas).astype(np.float32) / 255
a = np.where(a > 0.62, 0.62 + (a - 0.62) * 0.55, a)
atlas = Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
atlas.save(TD + '/cloth_albedo.jpg', quality=90); natl.resize((nsz, nsz), Image.LANCZOS).save(TD + '/cloth_normal.jpg', quality=90)
oatl.resize((osz, osz), Image.LANCZOS).save(TD + '/cloth_orm.jpg', quality=88)
cm = P.material(NAME + 'Cloth', TD + '/cloth_albedo.jpg', TD + '/cloth_normal.jpg', TD + '/cloth_orm.jpg')
for ob in cloth: P.set_mat(ob, cm)

# ---- skin (1024)
body = bpy.data.objects['Body']
for f, q in (('skin_albedo.jpg', 90), ('skin_normal.jpg', 90), ('skin_orm.jpg', 85)):
    im = Image.open(TD + '/' + f); s = 1024 if 'albedo' in f or 'normal' in f else 512
    im.resize((s, s), Image.LANCZOS).save(TD + '/s_' + f, quality=q)
sm = P.material(NAME + 'Skin', TD + '/s_skin_albedo.jpg', TD + '/s_skin_normal.jpg', TD + '/s_skin_orm.jpg')
P.set_mat(body, sm)

# ---- hair atlas: hair (top half), brows, lashes, eyes
hs = 1024
hat = Image.new('RGBA', (hs, hs), (0, 0, 0, 0))
parts = [('Hair', TD + '/hair.png', (0, 0, 1, 0.5)), ('Brows', None, (0, 0.5, 0.5, 0.25)), ('Lashes', None, (0.5, 0.5, 0.5, 0.25)),
         ('Eyes', None, (0, 0.75, 0.25, 0.25))]
srcs = {}
for ob in bpy.data.objects:
    if ob.type != 'MESH': continue
    for slot in ob.material_slots:
        for n in slot.material.node_tree.nodes if slot.material and slot.material.node_tree else []:
            if n.type == 'TEX_IMAGE' and n.image: srcs.setdefault(ob.name, bpy.path.abspath(n.image.filepath))
hair_obs = []
for nm, path, rect in parts:
    ob = bpy.data.objects.get(nm)
    if not ob: continue
    path = path or srcs[nm]
    x, y, w, h = rect
    im = Image.open(path).convert('RGBA').resize((int(w * hs), int(h * hs)), Image.LANCZOS)
    if nm == 'Brows':
        from PIL import ImageFilter
        r, g, b, a = im.split()
        a = a.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: max(0, min(255, int((v - 40) * 1.6))))
        rgb = Image.new('RGB', im.size, SPEC.get('brow_rgb', (38, 28, 22)))
        im = Image.merge('RGBA', (*rgb.split(), a))
    if nm == 'Eyes': im.putalpha(255)
    hat.paste(im, (int(x * hs), int(y * hs)))
    remap(ob, rect)
    if nm != 'Eyes': hair_obs.append(ob)
# bleed colour into transparent texels so mipmaps don't fringe white or black
a = np.asarray(hat).astype(np.float32)
al = a[..., 3:4] / 255
from PIL import ImageFilter
rgb = Image.fromarray(a[..., :3].astype(np.uint8))
for _ in range(6): rgb = Image.fromarray(np.where(al > 0.1, a[..., :3], np.asarray(rgb.filter(ImageFilter.MaxFilter(5))).astype(np.float32)).astype(np.uint8))
hat = Image.merge('RGBA', (*rgb.split(), hat.split()[3])); hat.save(TD + '/hair_atlas.png')
hm = P.material(NAME + 'Hair', TD + '/hair_atlas.png', alpha=True, rough=0.5)
eyes = bpy.data.objects['Eyes']
Image.open(TD + '/hair_atlas.png').convert('RGB').save(TD + '/eyes.jpg', quality=90)
em = P.material(NAME + 'Eye', TD + '/eyes.jpg', rough=0.08)
P.set_mat(eyes, em)
for ob in hair_obs: P.set_mat(ob, hm)

# ---- join and bind
for o in [body] + cloth + hair_obs + [eyes]:
    for mo in list(o.modifiers): o.modifiers.remove(mo)
main = G.join([body] + cloth, NAME)
hair = G.join(hair_obs, NAME + 'Hair')
eyes.name = NAME + 'Eyes'; eyes.data.name = NAME + 'Eyes'
L.bind([main, hair, eyes], rig)
for o in (main, hair, eyes):
    for vg in list(o.vertex_groups):
        if vg.name not in rig.data.bones: o.vertex_groups.remove(vg)
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
print('tris', NAME, tris(main), 'hair', tris(hair), 'eyes', tris(eyes))
# everyone but the agent is lighter close up too (they are seen at 12 m or less at this level, twice with shadows)
main_tris = SPEC.get('main_tris', 18000 if KIND != 'agent' else None)
if main_tris and tris(main) > main_tris:
    for mo in list(main.modifiers): main.modifiers.remove(mo)
    md = main.modifiers.new('dec', 'DECIMATE'); md.ratio = main_tris / tris(main); md.use_symmetry = True; md.symmetry_axis = 'X'
    L.set_active(main); bpy.ops.object.modifier_apply(modifier=md.name)
    main.modifiers.new('Armature', 'ARMATURE').object = rig
    print('main decimated', tris(main))
lods = []
for suf, target in (('LOD1', SPEC.get('lod1', 6000)), ('LOD2', SPEC.get('lod2', 1600))):
    c = main.copy(); c.data = main.data.copy(); c.name = NAME + suf; c.data.name = NAME + suf
    bpy.context.scene.collection.objects.link(c)
    for mo in list(c.modifiers): c.modifiers.remove(mo)
    md = c.modifiers.new('dec', 'DECIMATE'); md.ratio = min(1.0, target / tris(main)); md.use_symmetry = True; md.symmetry_axis = 'X'
    L.set_active(c); bpy.ops.object.modifier_apply(modifier=md.name)
    c.modifiers.new('Armature', 'ARMATURE').object = rig
    print('lod', c.name, tris(c)); lods.append(c)
# ---- far models in one draw call: skin and clothes side by side in one small atlas, a strip of swatches below,
# and a coarse solid copy of the hair (the alpha hair cards are not drawn at a distance, which left people bald)
AW, AH, SW = 1024, 528, 16
lat = Image.new('RGB', (AW, AH), (30, 30, 30))
lat.paste(Image.open(TD + '/s_skin_albedo.jpg').convert('RGB').resize((512, 512), Image.LANCZOS), (0, 0))
lat.paste(Image.open(TD + '/cloth_albedo.jpg').convert('RGB').resize((512, 512), Image.LANCZOS), (512, 0))
hc = SPEC.get('hair_col', '#2a2018').lstrip('#'); hrgb = tuple(int(hc[i:i + 2], 16) for i in (0, 2, 4))
lat.paste(Image.new('RGB', (64, SW), hrgb), (0, 512))
lat.save(TD + '/lod_albedo.jpg', quality=88)
lm = P.material(NAME + 'LOD', TD + '/lod_albedo.jpg', rough=0.8)
SWATCH = (32 / AW, 1 - (512 + SW / 2) / AH)
# the hair shell: hair-card faces only (the hair is the top half of the hair atlas), decimated, opaque
shell = hair.copy(); shell.data = hair.data.copy(); bpy.context.scene.collection.objects.link(shell)
for mo in list(shell.modifiers): shell.modifiers.remove(mo)
import bmesh
bm = bmesh.new(); bm.from_mesh(shell.data); uvl = bm.loops.layers.uv['UVMap']
bmesh.ops.delete(bm, geom=[f for f in bm.faces if sum(l[uvl].uv.y for l in f.loops) / len(f.loops) < 0.5], context='FACES')
bm.to_mesh(shell.data); bm.free()
if len(shell.data.polygons):
    md = shell.modifiers.new('dec', 'DECIMATE'); md.ratio = min(1.0, 500 / max(1, tris(shell)))
    L.set_active(shell); bpy.ops.object.modifier_apply(modifier=md.name)
for o in lods:
    skin_i = [i for i, m in enumerate(o.data.materials) if m and m.name.startswith(NAME + 'Skin')]
    uv = o.data.uv_layers['UVMap'].data
    for poly in o.data.polygons:
        off = 0.0 if poly.material_index in skin_i else 0.5
        for li in poly.loop_indices:
            u, v = uv[li].uv
            uv[li].uv = (off + min(max(u, 0), 1) * 0.5, (AH - 512) / AH + min(max(v, 0), 1) * 512 / AH)
    if len(shell.data.polygons):
        sc = shell.copy(); sc.data = shell.data.copy(); bpy.context.scene.collection.objects.link(sc)
        for d in sc.data.uv_layers['UVMap'].data: d.uv = SWATCH
        for mo in list(o.modifiers): o.modifiers.remove(mo)
        name = o.name; o2 = G.join([o, sc], name); o = o2
    P.set_mat(o, lm)
    if not any(m.type == 'ARMATURE' for m in o.modifiers): o.modifiers.new('Armature', 'ARMATURE').object = rig
    print('lod one material', o.name, tris(o))
bpy.data.objects.remove(shell)
lods = [bpy.data.objects[NAME + 'LOD1'], bpy.data.objects[NAME + 'LOD2']]
keep = {rig.name, main.name, hair.name, eyes.name} | {o.name for o in lods}
for o in list(bpy.data.objects):
    if o.name not in keep: bpy.data.objects.remove(o)
rig.animation_data_clear()
for o in bpy.context.scene.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=False, export_def_bones=False, export_tangents=False,
                          export_image_format='AUTO', export_jpeg_quality=88, export_yup=True, use_selection=False)
print('exported', OUT)
