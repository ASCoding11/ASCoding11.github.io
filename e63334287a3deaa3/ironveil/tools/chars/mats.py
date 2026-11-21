# Procedural bake materials (Blender nodes). Colors are given as sRGB hex.
import bpy

def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

def _n(nt, t, loc=(0, 0), **kw):
    n = nt.nodes.new(t); n.location = loc
    for k, v in kw.items(): setattr(n, k, v)
    return n

def fabric(name, col, col2=None, rough=0.85, scale=18.0, mottle=0.18, dirt=None, dirt_amt=0.0, weave=0.0,
           camo=None, image=None, uv='UVMap', metal=0.0, stripes=None):
    """col: base sRGB; col2: second tone for large-scale mottling; camo: list of hex for blotch camo;
    image: path of an image texture sampled with the given UV map (skin)."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = _n(nt, 'ShaderNodeOutputMaterial', (900, 0))
    bsdf = _n(nt, 'ShaderNodeBsdfPrincipled', (600, 0))
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    tc = _n(nt, 'ShaderNodeTexCoord', (-900, 0))
    if image:
        uvn = _n(nt, 'ShaderNodeUVMap', (-700, 200)); uvn.uv_map = uv
        tex = _n(nt, 'ShaderNodeTexImage', (-400, 200))
        tex.image = bpy.data.images.load(image, check_existing=True)
        nt.links.new(uvn.outputs[0], tex.inputs[0])
        base = tex.outputs[0]
        if col:  # tint (multiply)
            mix = _n(nt, 'ShaderNodeMix', (0, 200)); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            nt.links.new(base, mix.inputs[6]); mix.inputs[7].default_value = lin(col)
            base = mix.outputs[2]
        nt.links.new(base, bsdf.inputs['Base Color'])
        return m
    # large mottling
    nz = _n(nt, 'ShaderNodeTexNoise', (-600, 0))
    nz.inputs['Scale'].default_value = scale * 0.25; nz.inputs['Detail'].default_value = 6.0
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = _n(nt, 'ShaderNodeValToRGB', (-350, 0))
    ramp.color_ramp.elements[0].position = 0.5 - mottle; ramp.color_ramp.elements[1].position = 0.5 + mottle
    ramp.color_ramp.elements[0].color = lin(col)
    ramp.color_ramp.elements[1].color = lin(col2 or col)
    nt.links.new(nz.outputs['Fac'], ramp.inputs[0])
    base = ramp.outputs[0]
    if camo:
        vz = _n(nt, 'ShaderNodeTexNoise', (-600, 400))
        vz.inputs['Scale'].default_value = 7.0; vz.inputs['Detail'].default_value = 3.0
        vz.inputs['Roughness'].default_value = 0.55
        nt.links.new(tc.outputs['Object'], vz.inputs['Vector'])
        cr = _n(nt, 'ShaderNodeValToRGB', (-350, 400)); cr.color_ramp.interpolation = 'CONSTANT'
        els = cr.color_ramp.elements
        k = len(camo)
        els[0].position = 0.0; els[0].color = lin(camo[0])
        els[1].position = 1.0 / k * 1.0 + 0.32; els[1].color = lin(camo[1])
        for i in range(2, k):
            e = els.new(0.32 + i / k * 0.45); e.color = lin(camo[i])
        nt.links.new(vz.outputs['Fac'], cr.inputs[0])
        mixc = _n(nt, 'ShaderNodeMix', (-100, 200)); mixc.data_type = 'RGBA'; mixc.blend_type = 'MULTIPLY'
        mixc.inputs['Factor'].default_value = 1.0
        nt.links.new(cr.outputs[0], mixc.inputs[6])
        # base mottle used as brightness variation
        bw = _n(nt, 'ShaderNodeMix', (-200, 0)); bw.data_type = 'RGBA'; bw.blend_type = 'MIX'
        bw.inputs['Factor'].default_value = 0.0
        nt.links.new(ramp.outputs[0], bw.inputs[6])
        gray = _n(nt, 'ShaderNodeRGBToBW', (-150, -100)); nt.links.new(ramp.outputs[0], gray.inputs[0])
        # normalise: multiply camo by (gray/graybase)*~1
        sc = _n(nt, 'ShaderNodeMath', (-100, -100)); sc.operation = 'MULTIPLY'
        b = lin(col); g0 = 0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]
        nt.links.new(gray.outputs[0], sc.inputs[0]); sc.inputs[1].default_value = 1.0 / max(g0, 1e-3)
        comb = _n(nt, 'ShaderNodeCombineColor', (-50, -100))
        for i in range(3): nt.links.new(sc.outputs[0], comb.inputs[i])
        nt.links.new(comb.outputs[0], mixc.inputs[7])
        base = mixc.outputs[2]
    if weave > 0:
        wv = _n(nt, 'ShaderNodeTexWave', (-600, -300)); wv.wave_type = 'BANDS'
        wv.inputs['Scale'].default_value = 260.0; wv.inputs['Distortion'].default_value = 2.0
        nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
        mw = _n(nt, 'ShaderNodeMix', (100, 0)); mw.data_type = 'RGBA'; mw.blend_type = 'MULTIPLY'
        mw.inputs['Factor'].default_value = weave
        nt.links.new(base, mw.inputs[6]); nt.links.new(wv.outputs[0], mw.inputs[7])
        base = mw.outputs[2]
    if dirt:
        dz = _n(nt, 'ShaderNodeTexNoise', (-600, -600))
        dz.inputs['Scale'].default_value = 3.0; dz.inputs['Detail'].default_value = 8.0
        nt.links.new(tc.outputs['Object'], dz.inputs['Vector'])
        sep = _n(nt, 'ShaderNodeSeparateXYZ', (-600, -800)); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        # more dirt low on the body (z small)
        mz = _n(nt, 'ShaderNodeMapRange', (-400, -800))
        mz.inputs['From Min'].default_value = 0.0; mz.inputs['From Max'].default_value = 0.9
        mz.inputs['To Min'].default_value = 1.0; mz.inputs['To Max'].default_value = 0.15
        nt.links.new(sep.outputs['Z'], mz.inputs['Value'])
        mul = _n(nt, 'ShaderNodeMath', (-250, -700)); mul.operation = 'MULTIPLY'
        nt.links.new(dz.outputs['Fac'], mul.inputs[0]); nt.links.new(mz.outputs[0], mul.inputs[1])
        mr = _n(nt, 'ShaderNodeMapRange', (-100, -700))
        mr.inputs['From Min'].default_value = 0.35; mr.inputs['From Max'].default_value = 0.75
        mr.inputs['To Min'].default_value = 0.0; mr.inputs['To Max'].default_value = dirt_amt
        nt.links.new(mul.outputs[0], mr.inputs['Value'])
        md = _n(nt, 'ShaderNodeMix', (300, -200)); md.data_type = 'RGBA'; md.blend_type = 'MIX'
        nt.links.new(mr.outputs[0], md.inputs['Factor'])
        nt.links.new(base, md.inputs[6]); md.inputs[7].default_value = lin(dirt)
        base = md.outputs[2]
    nt.links.new(base, bsdf.inputs['Base Color'])
    return m
