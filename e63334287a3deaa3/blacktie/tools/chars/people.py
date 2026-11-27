# Shared helpers for build_people.py: MakeHuman clothes (CC0) fitted to the body, body vertices under the clothes
# removed, code-made texture sets for each outfit, the bow tie, export. Runs in Blender as a module (bpy).
import bpy, os, sys, math, glob
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as L, geo as G

HERE = os.path.dirname(os.path.abspath(__file__))
CL = L.MHA + '/clothes'

def read_delete_verts(path):
    out, on = set(), False
    for ln in open(path):
        s = ln.strip()
        if s.startswith('delete_verts'): on = True; continue
        if not on: continue
        if not s or not (s[0].isdigit()):
            if s and not s[0].isdigit(): on = False
            continue
        a = s.split(); i = 0
        while i < len(a):
            if i + 2 < len(a) and a[i + 1] == '-':
                out.update(range(int(a[i]), int(a[i + 2]) + 1)); i += 3
            else:
                out.add(int(a[i])); i += 1
    return out

def wear(H, V, item, name):
    """Fit one MakeHuman clothes item to the human. Returns (obj, set of base verts it hides)."""
    path = CL + '/%s/%s.mhclo' % (item, item)
    ob, refs = L.fit_mhclo(path, V, name)
    L.add_proxy_weights(ob, refs)
    return ob, read_delete_verts(path)

def delete_body_verts(body, used, dele):
    import bmesh
    bm = bmesh.new(); bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    kill = [bm.verts[i] for i, b in enumerate(used) if b in dele]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(body.data); bm.free()
    return len(kill)

def img_np(path, size=None, mode='RGB'):
    from PIL import Image
    im = Image.open(path).convert(mode)
    if size and im.size != (size, size): im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255

def save(arr, path, q=90):
    from PIL import Image
    a = np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(a).save(path, quality=q)
    return path

def blur(a, r):
    from PIL import Image, ImageFilter
    if a.ndim == 2:
        im = Image.fromarray((np.clip(a, 0, 1) * 65535).astype(np.uint16).astype(np.int32), mode='I')
        im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
        return np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
    return np.stack([blur(a[..., k], r) for k in range(a.shape[2])], -1)

def normal_from_height(h, strength):
    gy, gx = np.gradient(h)
    n = np.stack([-gx * strength, gy * strength, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5

def poly_mask(size, polys):
    """Polygons in texture pixel coords of a 2048 image (y down), scaled to size."""
    from PIL import Image, ImageDraw
    im = Image.new('L', (size, size), 0); d = ImageDraw.Draw(im); k = size / 2048
    for p in polys: d.polygon([(x * k, y * k) for x, y in p], fill=255)
    return np.asarray(im).astype(np.float32) / 255

def hex3(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)

def fbm(size, scale, seed=0, oct=4):
    rng = np.random.default_rng(seed); out = np.zeros((size, size), np.float32); amp = 1.0; tot = 0
    from PIL import Image
    for o in range(oct):
        n = max(2, int(size / scale * 2 ** o))
        r = rng.random((n, n)).astype(np.float32)
        im = Image.fromarray((r * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC)
        out += np.asarray(im).astype(np.float32) / 255 * amp; tot += amp; amp *= 0.5
    return out / tot

def material(name, albedo, normal=None, orm=None, alpha=False, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(albedo)
    nt.links.new(tex.outputs[0], b.inputs['Base Color'])
    if alpha:
        nt.links.new(tex.outputs[1], b.inputs['Alpha'])
        try: m.blend_method = 'CLIP'
        except Exception: pass
        try: m.surface_render_method = 'DITHERED'
        except Exception: pass
    if normal:
        nm = nt.nodes.new('ShaderNodeNormalMap'); t2 = nt.nodes.new('ShaderNodeTexImage')
        t2.image = bpy.data.images.load(normal); t2.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(t2.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    if orm:
        o = nt.nodes.new('ShaderNodeTexImage'); o.image = bpy.data.images.load(orm); o.image.colorspace_settings.name = 'Non-Color'
        sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(o.outputs[0], sep.inputs[0])
        nt.links.new(sep.outputs[1], b.inputs['Roughness']); nt.links.new(sep.outputs[2], b.inputs['Metallic'])
    else:
        b.inputs['Roughness'].default_value = rough
    return m

def set_mat(ob, m):
    ob.data.materials.clear(); ob.data.materials.append(m)
    for p in ob.data.polygons: p.material_index = 0


def smooth_shoulders(ob, H, radius=0.2, iters=10):
    """The rest pose is a T-pose; with the arms down, MakeHuman's tight shoulder weights fold the deltoid into the
    chest and leave the top of the shoulder standing as a ridge (boxy jacket shoulders). Average every vertex group's
    weights with the neighbours' for the vertices round each shoulder joint, so the bend is spread over the shoulder."""
    me = ob.data
    centres = [H['J']['upperarm_l'][0], H['J']['upperarm_r'][0]]
    sel = [v.index for v in me.vertices if min((v.co - c).length for c in centres) < radius]
    if not sel: return 0
    selset = set(sel)
    adj = {i: set() for i in sel}
    for e in me.edges:
        a, b = e.vertices
        if a in selset: adj[a].add(b)
        if b in selset: adj[b].add(a)
    ng = len(ob.vertex_groups)
    W = {}
    need = set(sel)
    for i in sel: need |= adj[i]
    for i in need:
        W[i] = {g.group: g.weight for g in me.vertices[i].groups}
    for _ in range(iters):
        new = {}
        for i in sel:
            acc = dict(W[i]); n = 1
            for j in adj[i]:
                for g, w in W[j].items(): acc[g] = acc.get(g, 0) + w
                n += 1
            # blend less at the edge of the region so it joins the untouched weights
            k = max(0.0, 1 - min((me.vertices[i].co - c).length for c in centres) / radius)
            k = min(1.0, k * 2.5) * 0.7
            new[i] = {g: W[i].get(g, 0) * (1 - k) + (w / n) * k for g, w in acc.items()}
        for i in sel: W[i] = new[i]
    for i in sel:
        tot = sum(W[i].values()) or 1
        for g, w in W[i].items():
            ob.vertex_groups[g].add([i], w / tot, 'REPLACE')
    return len(sel)
