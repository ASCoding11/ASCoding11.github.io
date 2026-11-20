# Shared outfit pipeline: cloth-from-body, folds, low/high, UV, bake, texture pack.
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, Matrix, noise
import mhlib as L, geo as G, mats as MT

def J(H, b, i=0):
    return H['J'][b][i].copy()

def vweights(ob):
    names = {vg.index: vg.name for vg in ob.vertex_groups}
    out = []
    for v in ob.data.vertices:
        out.append({names[g.group]: g.weight for g in v.groups if g.weight > 0})
    return out

def bone_sum(w, *keys):
    return sum(x for k, x in w.items() if any(k.startswith(p) for p in keys))

class Regions:
    """Per-vertex region labels on the body + displacement amounts + smoothing strength."""
    def __init__(self, body):
        self.body = body
        self.P = G.coords(body.data)
        self.W = vweights(body)
        self.label = ['skin'] * len(self.P)

def neck_threshold(H, p, front_drop=0.06, base=0.0):
    nz = J(H, 'neck_01').z; ny = J(H, 'neck_01').y
    return nz + base + front_drop * (p[1] - ny)

def cloth_body(H, labels, disp, smooth, folds_amp=0.0035, name='Cloth', alpha=None, slack=None, torso_dilate=0.06):
    """Copy the body, smooth anatomy away and push cloth regions out. Returns (low_src, high)."""
    body = H['body']
    ob = body.copy(); ob.data = body.data.copy(); ob.name = name; G.link(ob)
    me = ob.data
    n = len(me.vertices)
    sm = np.array([smooth.get(labels[i], 0.0) for i in range(n)])
    sm = G.diffuse_scalar(me, sm, iters=2)
    G.taubin(me, sm, iters=40)
    sm2 = np.array([1.0 if labels[i] == 'boot' else 0.0 for i in range(n)])
    G.taubin(me, sm2 * 0.5, iters=40, mu=-0.0)
    if alpha:
        tubeify(ob, H, labels, alpha, slack or {}, torso_dilate=torso_dilate)
        G.taubin(me, sm * 0.6, iters=6)
    d = np.array([disp.get(labels[i], 0.0) for i in range(n)])
    d = G.diffuse_scalar(me, d, iters=2)
    G.displace(me, d)
    # material index per face from majority label
    names = sorted(set(labels))
    for p in me.polygons:
        ls = [labels[v] for v in p.vertices]
        best = max(set(ls), key=ls.count)
        p.material_index = names.index(best)
    ob['labels'] = names
    ob['vlabels'] = list(labels)
    return ob

def assign_mats(ob, mats):
    names = list(ob['labels'])
    me = ob.data
    me.materials.clear()
    for n in names: me.materials.append(mats[n])
    labels = list(ob['vlabels'])
    for p in me.polygons:
        ls = [labels[v] for v in p.vertices]
        p.material_index = names.index(max(set(ls), key=ls.count))

def add_folds(ob, H, labels, amp, seed=0.0):
    """Displace (high mesh) with cloth fold ridges running around the limbs."""
    me = ob.data
    P = G.coords(me); N = G.normals(me)
    W = vweights(ob)
    segs = {}
    for b in ('upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'spine_01', 'spine_02', 'spine_03', 'pelvis'):
        h, t = H['J'][b]
        segs[b] = (np.array(h), np.array(t))
    joints = [np.array(J(H, k)) for k in ('lowerarm_l', 'lowerarm_r', 'calf_l', 'calf_r', 'upperarm_l', 'upperarm_r', 'thigh_l', 'thigh_r')]
    out = P.copy()
    for i in range(len(P)):
        a = amp.get(labels[i] if i < len(labels) else 'skin', 0.0)
        if a <= 0: continue
        w = W[i]
        if not w: continue
        b = max(w, key=w.get)
        key = next((k for k in segs if b.startswith(k[:-2]) and (k[-1] == b[-1] or k.startswith('spine') or k == 'pelvis')), None)
        if b in segs: key = b
        if key is None: continue
        h, t = segs[key]
        ax = t - h; L_ = np.linalg.norm(ax); ax /= L_
        rel = P[i] - h
        s = rel.dot(ax)
        radial = rel - ax * s
        ang = math.atan2(radial[1], radial[0] if abs(ax[2]) > 0.5 else radial[2])
        jd = min(np.linalg.norm(P[i] - j) for j in joints)
        env = 0.5 + 2.6 * math.exp(-(jd / 0.075) ** 2)    # creases bunch at the elbows and knees
        v = noise.noise(Vector((s * 30.0, math.cos(ang) * 1.3, math.sin(ang) * 1.3 + seed)))
        v2 = noise.noise(Vector((s * 75.0 + 3.0, math.cos(ang) * 3.0, math.sin(ang) * 3.0 + seed)))
        ridge = (1.0 - abs(v)) ** 3 * 1.0 + 0.25 * v2
        out[i] = P[i] + N[i] * (ridge * a * env)
    G.set_coords(me, out)

def make_high(cloth, H, labels_by_vertex, fold_amp, subdiv=1, label_fn=None):
    hi = cloth.copy(); hi.data = cloth.data.copy(); hi.name = cloth.name + '_HI'; G.link(hi)
    for m in list(hi.modifiers): hi.modifiers.remove(m)
    # carry labels through subdivision by a float attribute per region index
    names = cloth['labels']
    G.subsurf(hi, subdiv)
    if label_fn is not None:
        cs = [tuple(p.center) for p in hi.data.polygons]
        fl = label_fn(H, cs)
        for p, l in zip(hi.data.polygons, fl):
            if l in names: p.material_index = names.index(l)
    # recompute labels on the subdivided mesh from material index of faces
    lab = ['skin'] * len(hi.data.vertices)
    for p in hi.data.polygons:
        for v in p.vertices: lab[v] = names[p.material_index]
    add_folds(hi, H, lab, fold_amp)
    return hi

def decimate(ob, ratio, protect=None, protect_ratio=None):
    if protect is not None:
        vg = ob.vertex_groups.new(name='_protect')
        vg.add(protect, 1.0, 'REPLACE')
        m = ob.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio
        m.vertex_group = '_protect'; m.invert_vertex_group = True; m.vertex_group_factor = 1.0
        m.use_symmetry = True; m.symmetry_axis = 'X'
    else:
        m = ob.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio; m.use_symmetry = True; m.symmetry_axis = 'X'
    # armature modifier must not be applied
    L.set_active(ob)
    arm = [x for x in ob.modifiers if x.type == 'ARMATURE']
    for a in arm: ob.modifiers.remove(a)
    bpy.ops.object.modifier_apply(modifier=m.name)
    if protect is not None: ob.vertex_groups.remove(ob.vertex_groups['_protect'])

def atlas_uv(ob, big_faces=None, big=2.0, margin=0.004):
    """Smart-project the low mesh into a fresh 'atlas' UV map; scale chosen faces' islands up."""
    me = ob.data
    uv = me.uv_layers.new(name='atlas')
    me.uv_layers.active = uv
    L.set_active(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margin, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    if big_faces:
        # scale those faces' UVs about their own island centres (islands may be shared, so scale per face-connected set)
        bm = bmesh.new(); bm.from_mesh(me)
        uvl = bm.loops.layers.uv['atlas']
        bm.faces.ensure_lookup_table()
        sel = set(big_faces)
        # islands by uv connectivity within selected faces
        seen = set()
        for fi in sel:
            if fi in seen: continue
            stack = [fi]; isl = []
            seen.add(fi)
            while stack:
                f = bm.faces[stack.pop()]; isl.append(f)
                for e in f.edges:
                    for f2 in e.link_faces:
                        if f2.index in sel and f2.index not in seen:
                            # same uv island if shared edge uvs match
                            ok = True
                            for l in f.loops:
                                if l.edge == e:
                                    a = l[uvl].uv; b = l.link_loop_next[uvl].uv
                            for l2 in f2.loops:
                                if l2.edge == e:
                                    c = l2[uvl].uv; d = l2.link_loop_next[uvl].uv
                            if min((a - d).length + (b - c).length, (a - c).length + (b - d).length) > 1e-5: ok = False
                            if ok:
                                seen.add(f2.index); stack.append(f2.index)
            cs = Vector((0, 0)); k = 0
            for f in isl:
                for l in f.loops: cs += l[uvl].uv; k += 1
            cs /= k
            done = set()
            for f in isl:
                for l in f.loops:
                    if l.index in done: continue
                    l[uvl].uv = cs + (l[uvl].uv - cs) * big
                    done.add(l.index)
        bm.to_mesh(me); bm.free()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    try:
        bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=margin, shape_method='CONCAVE')
    except TypeError:
        bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')

def bake(low, highs, size, kind, path, samples=64, extrusion=0.022, ray=0.05, margin=8, colorspace='sRGB'):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ.get('BAKE_THREADS', '2'))   # shared machine
    sc.render.bake.margin = margin
    img = bpy.data.images.new('bake_' + kind, size, size, alpha=False, float_buffer=(kind == 'NORMAL'))
    img.colorspace_settings.name = 'Non-Color' if kind in ('NORMAL', 'ROUGHNESS', 'AO', 'EMIT') else 'sRGB'
    # every low material gets an active image node
    for m in low.data.materials:
        nt = m.node_tree
        n = nt.nodes.get('_bake') or nt.nodes.new('ShaderNodeTexImage')
        n.name = '_bake'; n.image = img
        nt.nodes.active = n
    low.data.uv_layers.active = low.data.uv_layers['atlas']
    for o in bpy.context.scene.objects: o.select_set(False)
    for h in highs:
        h.hide_render = False; h.select_set(True)
    low.select_set(True); bpy.context.view_layer.objects.active = low
    kw = dict(type=kind, use_selected_to_active=bool(highs), cage_extrusion=extrusion, max_ray_distance=ray, margin=margin)
    if kind == 'DIFFUSE':
        kw['pass_filter'] = {'COLOR'}
    if kind == 'NORMAL':
        kw['normal_space'] = 'TANGENT'
    bpy.ops.object.bake(**kw)
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return path

LIMBS = {'upperarm': 'arm', 'lowerarm': 'arm', 'thigh': 'leg', 'calf': 'leg', 'foot': 'foot', 'ball': 'foot'}

def tubeify(ob, H, labels, alpha, slack, torso_dilate=0.06, torso_labels=('jacket',), nbins=24):
    """Make cloth hang like fabric: limbs get rounder/looser cross-sections, torso loses its waist and belly shape.
    alpha: {label: blend toward round section}, slack: {label: extra radius (m)}"""
    me = ob.data
    P = G.coords(me)
    W = vweights(ob)
    n = len(P)
    new = np.zeros_like(P); wsum = np.zeros(n)
    segs = {}
    for b in ('upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r'):
        h, t = H['J'][b]
        segs[b] = (np.array(h), np.array(t))
    # per-segment radial profile
    prof = {}
    for b, (h, t) in segs.items():
        ax = t - h; Ln = np.linalg.norm(ax); ax = ax / Ln
        idx = [i for i in range(n) if W[i].get(b, 0) > 0.3 and labels[i] != 'skin' and labels[i] != 'glove']
        if not idx: continue
        rel = P[idx] - h
        s = rel @ ax
        rad = np.linalg.norm(rel - np.outer(s, ax), axis=1)
        lo, hi = s.min(), s.max()
        bins = np.clip(((s - lo) / max(1e-6, hi - lo) * nbins).astype(int), 0, nbins - 1)
        rmax = np.zeros(nbins)
        for k in range(nbins):
            sel = rad[bins == k]
            rmax[k] = np.percentile(sel, 85) if len(sel) else 0
        # fill gaps and smooth along the limb
        for k in range(nbins):
            if rmax[k] == 0: rmax[k] = rmax[max(0, k - 1)]
        rmax = np.convolve(np.pad(rmax, 2, mode='edge'), np.ones(5) / 5, mode='valid')
        prof[b] = (h, ax, lo, hi, rmax)
    for i in range(n):
        lab = labels[i]
        a = alpha.get(lab, 0.0); sl = slack.get(lab, 0.0)
        if a <= 0 and sl <= 0: continue
        for b, w in W[i].items():
            if b not in prof or w < 0.02: continue
            h, ax, lo, hi, rmax = prof[b]
            rel = P[i] - h; s = rel @ ax
            radv = rel - ax * s; r = np.linalg.norm(radv)
            if r < 1e-6: continue
            k = int(np.clip((s - lo) / max(1e-6, hi - lo) * nbins, 0, nbins - 1))
            r2 = (1 - a) * r + a * rmax[k] + sl
            new[i] += w * (h + ax * s + radv / r * r2); wsum[i] += w
    res = P.copy()
    m = wsum > 0
    # verts only partly covered by limb bones keep the rest of their position
    cov = np.clip(wsum, 0, 1)
    res[m] = P[m] * (1 - cov[m, None]) + (new[m] / wsum[m, None]) * cov[m, None]
    # torso dilation: radial distance from the spine axis -> max over a z window, per angle sector
    tid = [i for i in range(n) if labels[i] in torso_labels and sum(W[i].get(b, 0) for b in ('spine_01', 'spine_02', 'spine_03', 'pelvis')) > 0.5]
    if tid and torso_dilate > 0:
        cy = float(np.mean(P[tid, 1]))
        T = res[tid]
        ang = np.arctan2(T[:, 0], -(T[:, 1] - cy))
        rr = np.hypot(T[:, 0], T[:, 1] - cy)
        z = T[:, 2]
        out = rr.copy()
        for j in range(len(tid)):
            sel = (np.abs(z - z[j]) < torso_dilate) & (np.abs(ang - ang[j]) < 0.12)
            if sel.any():
                # only grow below the chest line (keeps shoulders)
                out[j] = max(rr[j], 0.65 * rr[j] + 0.35 * rr[sel].max())
        for j, i in enumerate(tid):
            sc = out[j] / max(rr[j], 1e-6)
            res[i, 0] *= sc; res[i, 1] = cy + (res[i, 1] - cy) * sc
    G.set_coords(me, res)

def trim_hair(hair, c, rr, keep_below=0.0):
    """Delete hair faces hidden under a helmet (centre c, radii rr)."""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(hair.data)
    kill = []
    for f in bm.faces:
        inside = True
        for v in f.verts:
            p = v.co
            dz = p.z - (c.z - 0.005)
            e = ((p.x - c.x) / (rr[0] - 0.005)) ** 2 + ((p.y - c.y) / (rr[1] - 0.005)) ** 2
            if dz < 0 or e > 1.0: inside = False
        if inside: kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(hair.data); bm.free()

def finish(H, name, cloth, gear, labels, fold_amp, size=2048, out_dir=None, low_ratio=0.32, big_skin=2.2,
           ao_mix=0.6, extra_lows=(), log=print, decimate_extra=None, label_fn=None):
    """cloth: processed cloth body with materials; gear: list of (obj, matname) already with materials.
    Builds high + low, bakes textures, returns (low_obj, texture paths)."""
    from PIL import Image
    sc = bpy.context.scene
    if not sc.world:
        sc.world = bpy.data.worlds.new('W')
    sc.world.light_settings.distance = 0.12
    # ---- high
    hi = make_high(cloth, H, labels, fold_amp, label_fn=label_fn)
    highs = [hi]
    for ob, mn in gear:
        c = ob.copy(); c.data = ob.data.copy(); G.link(c); highs.append(c)
        for m in list(c.modifiers): c.modifiers.remove(m)
    log('high tris', sum(G.tris(h) for h in highs))
    # ---- low
    low = cloth.copy(); low.data = cloth.data.copy(); low.name = name + 'Low'; G.link(low)
    decimate(low, low_ratio)
    gl = []
    for ob, mn in gear:
        if ob.get('hi_only'): continue
        c = ob.copy(); c.data = ob.data.copy(); G.link(c); gl.append(c)
    low = G.join([low] + gl, name)
    for m in list(low.modifiers): low.modifiers.remove(m)
    log('low tris', G.tris(low))
    # ---- UVs
    skinmat = [i for i, m in enumerate(low.data.materials) if m and 'skin' in m.name]
    big = [p.index for p in low.data.polygons if p.material_index in skinmat]
    atlas_uv(low, big_faces=big, big=big_skin)
    for o in [low]:
        o.visible_diffuse = False; o.visible_glossy = False; o.visible_shadow = False
        o.visible_transmission = False; o.visible_volume_scatter = False
    for o in bpy.context.scene.objects:
        o.hide_render = not (o in highs or o == low)
    td = out_dir
    os.makedirs(td, exist_ok=True)
    t0 = __import__('time').time()
    bake(low, highs, size, 'DIFFUSE', td + '/_diff.png', samples=2)
    log('baked diffuse', __import__('time').time() - t0)
    bake(low, highs, size, 'NORMAL', td + '/_nrm.png', samples=4)
    log('baked normal')
    bake(low, highs, size // 2, 'AO', td + '/_ao.png', samples=32)
    log('baked ao')
    bake(low, highs, size // 2, 'ROUGHNESS', td + '/_rough.png', samples=1)
    log('baked rough')
    allm = set()
    for h in highs + [low]:
        for m in h.data.materials: allm.add(m)
    sv = metal_pass_begin(list(allm))
    bake(low, highs, size // 2, 'EMIT', td + '/_metal.png', samples=1)
    metal_pass_end(sv)
    log('baked metal')
    # ---- composite
    diff = np.asarray(Image.open(td + '/_diff.png').convert('RGB')).astype(np.float32) / 255
    ao = np.asarray(Image.open(td + '/_ao.png').convert('L').resize((size, size), Image.BILINEAR)).astype(np.float32) / 255
    alb = diff * (1 - ao_mix + ao_mix * ao)[..., None]
    Image.fromarray(np.clip(alb * 255 + 0.5, 0, 255).astype(np.uint8)).save(td + '/albedo.jpg', quality=88)
    fix_normals(td)
    r = np.asarray(Image.open(td + '/_rough.png').convert('L')).astype(np.uint8)
    mt = np.asarray(Image.open(td + '/_metal.png').convert('L')).astype(np.uint8)
    orm = np.stack([np.full_like(r, 255), r, mt], -1)
    Image.fromarray(orm).save(td + '/orm.jpg', quality=85)
    for h in highs: bpy.data.objects.remove(h)
    return low

def fix_normals(td):
    """Write normal.jpg from the baked _nrm.png. A tangent-space normal never points into the surface; texels that
    do (blue well below half: the bake ray hit the wrong surface, e.g. a boot sole tucked against the boot) are
    replaced by the flat normal so they do not catch the sky as white patches."""
    from PIL import Image
    n = np.asarray(Image.open(td + '/_nrm.png').convert('RGB')).astype(np.float32)
    bad = n[..., 2] < 150
    n[bad] = (128, 128, 255)
    Image.fromarray(n.astype(np.uint8)).save(td + '/normal.jpg', quality=92)
    return float(bad.mean())

def hair_atlas(parts, out_png, size=1024):
    """parts: list of (obj, image_path, rect(x,y,w,h) in 0..1 with y from top). Remaps UVs; writes RGBA atlas."""
    from PIL import Image
    atl = Image.new('RGBA', (size, size), (40, 30, 22, 0))
    for ob, img, (x, y, w, h) in parts:
        im = Image.open(img).convert('RGBA').resize((int(w * size), int(h * size)), Image.LANCZOS)
        if 'eyebrow' in img:
            # the brow card is fine single hairs; under an alpha cut-off they break into dashes. Thicken the hair
            # mass (grow, soften, re-threshold) so the cut-off keeps a continuous brow, with a ragged edge
            from PIL import ImageFilter
            r, g, b, al = im.split()
            al = al.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.6))
            al = al.point(lambda v: max(0, min(255, int((v - 45) * 1.7))))
            rgb = Image.merge("RGB", (r, g, b)).filter(ImageFilter.MaxFilter(5)).point(lambda v: min(255, int(v * 1.25 + 12)))
            im = Image.merge('RGBA', (*rgb.split(), al))
        atl.paste(im, (int(x * size), int(y * size)))
        uv = ob.data.uv_layers['UVMap']
        for d in uv.data:
            u, v = d.uv
            d.uv = (x + (u % 1.0 if u != 1.0 else 1.0) * w, (1 - y - h) + (v % 1.0 if v != 1.0 else 1.0) * h)
    # bleed colour into transparent texels so mips do not go dark
    a = np.asarray(atl).astype(np.float32)
    rgb = a[..., :3]; al = a[..., 3:] / 255
    atl.save(out_png)
    return out_png

def final_material(name, td, alpha=False, rough=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(td['albedo'])
    nt.links.new(tex.outputs[0], b.inputs['Base Color'])
    if alpha:
        nt.links.new(tex.outputs[1], b.inputs['Alpha'])
        m.blend_method = 'CLIP' if hasattr(m, 'blend_method') else None
        try: m.surface_render_method = 'DITHERED'
        except Exception: pass
        m.alpha_threshold = 0.5 if hasattr(m, 'alpha_threshold') else None
    if 'normal' in td:
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt2 = nt.nodes.new('ShaderNodeTexImage')
        nt2.image = bpy.data.images.load(td['normal']); nt2.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(nt2.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    if 'orm' in td:
        o = nt.nodes.new('ShaderNodeTexImage'); o.image = bpy.data.images.load(td['orm']); o.image.colorspace_settings.name = 'Non-Color'
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(o.outputs[0], sep.inputs[0])
        nt.links.new(sep.outputs[1], b.inputs['Roughness']); nt.links.new(sep.outputs[2], b.inputs['Metallic'])
    else:
        b.inputs['Roughness'].default_value = rough if rough is not None else 0.6
        b.inputs['Metallic'].default_value = 0.0
    return m

def metal_pass_begin(mats_):
    """Route each material's METAL value into an emission shader so it can be baked with type EMIT."""
    saved = []
    for m in mats_:
        if not m or not m.use_nodes: continue
        nt = m.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        mv = nt.nodes.get('METAL')
        if out is None: continue
        old = [l.from_socket for l in out.inputs[0].links]
        em = nt.nodes.new('ShaderNodeEmission'); em.name = '_metal_em'
        if mv is not None:
            nt.links.new(mv.outputs[0], em.inputs['Color'])
        else:
            em.inputs['Color'].default_value = (0, 0, 0, 1)
        nt.links.new(em.outputs[0], out.inputs[0])
        saved.append((m, old, em))
    return saved

def metal_pass_end(saved):
    for m, old, em in saved:
        nt = m.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        nt.nodes.remove(em)
        if old: nt.links.new(old[0], out.inputs[0])
