# Worn, gritty bake materials (Cycles nodes). Each material exposes: Base Color, Roughness, Normal (bump) on the
# Principled BSDF, and a value node named 'METAL' (0..1) baked separately through an emission pass.
# Wear is placed where it happens: edges (bevel-node edge mask), cavities (AO), low on the body (mud), knees, etc.
import bpy, math
from mats import lin

class NB:
    def __init__(self, name):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True
        self.m = m; self.nt = m.node_tree; self.nt.nodes.clear(); self.x = -1600
        self.out = self.n('ShaderNodeOutputMaterial'); self.bsdf = self.n('ShaderNodeBsdfPrincipled')
        self.link(self.bsdf.outputs[0], self.out.inputs[0])
        tc = self.n('ShaderNodeTexCoord'); self.obj = tc.outputs['Object']
        self.geo = self.n('ShaderNodeNewGeometry')
    def n(self, t, **kw):
        node = self.nt.nodes.new(t); node.location = (self.x, 0); self.x += 40
        for k, v in kw.items():
            if k in node.inputs: node.inputs[k].default_value = v
            else: setattr(node, k, v)
        return node
    def link(self, a, b): self.nt.links.new(a, b)
    def val(self, v):
        n = self.n('ShaderNodeValue'); n.outputs[0].default_value = v; return n.outputs[0]
    def col(self, h):
        n = self.n('ShaderNodeRGB'); n.outputs[0].default_value = lin(h); return n.outputs[0]
    def math(self, op, a, b=None, clamp=False):
        n = self.n('ShaderNodeMath', operation=op); n.use_clamp = clamp
        self._in(n.inputs[0], a)
        if b is not None: self._in(n.inputs[1], b)
        return n.outputs[0]
    def _in(self, sock, v):
        if isinstance(v, (int, float)): sock.default_value = v
        else: self.link(v, sock)
    def mix(self, a, b, fac, mode='MIX'):
        n = self.n('ShaderNodeMix', data_type='RGBA', blend_type=mode)
        self._in(n.inputs['Factor'], fac)
        if isinstance(a, str): n.inputs[6].default_value = lin(a)
        else: self.link(a, n.inputs[6])
        if isinstance(b, str): n.inputs[7].default_value = lin(b)
        else: self.link(b, n.inputs[7])
        return n.outputs[2]
    def mixf(self, a, b, fac):
        n = self.n('ShaderNodeMix', data_type='FLOAT')
        self._in(n.inputs['Factor'], fac); self._in(n.inputs[2], a); self._in(n.inputs[3], b)
        return n.outputs[0]
    def noise(self, scale, detail=4.0, rough=0.5, vec=None, dist=0.0, stretch=None, w=0.0):
        v = vec or self.obj
        if stretch:
            mp = self.n('ShaderNodeMapping'); mp.inputs['Scale'].default_value = stretch
            self.link(v, mp.inputs['Vector']); v = mp.outputs[0]
        n = self.n('ShaderNodeTexNoise', noise_dimensions='4D')
        n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough; n.inputs['Distortion'].default_value = dist
        n.inputs['W'].default_value = w
        self.link(v, n.inputs['Vector'])
        return n.outputs['Fac']
    def ramp(self, f, a, b):
        """Map f from [a,b] to [0,1] with smoothstep."""
        n = self.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
        self._in(n.inputs['Value'], f); n.inputs['From Min'].default_value = a; n.inputs['From Max'].default_value = b
        return n.outputs[0]
    def edge(self, radius):
        """Convex/concave edge mask from the bevel node (1 on worn edges)."""
        bv = self.n('ShaderNodeBevel', samples=8); bv.inputs['Radius'].default_value = radius
        dp = self.n('ShaderNodeVectorMath', operation='DOT_PRODUCT')
        self.link(bv.outputs[0], dp.inputs[0]); self.link(self.geo.outputs['Normal'], dp.inputs[1])
        e = self.math('SUBTRACT', 1.0, dp.outputs['Value'])
        return self.ramp(e, 0.005, 0.06)
    def ao(self, dist=0.05):
        a = self.n('ShaderNodeAmbientOcclusion', samples=8); a.inputs['Distance'].default_value = dist
        return a.outputs['AO']
    def zcoord(self):
        s = self.n('ShaderNodeSeparateXYZ'); self.link(self.obj, s.inputs[0]); return s
    def finish(self, color, rough, bump_h=None, bump_s=0.3, metal=0.0, bump_dist=0.002):
        self.link(color, self.bsdf.inputs['Base Color']) if not isinstance(color, str) else None
        if isinstance(color, str): self.bsdf.inputs['Base Color'].default_value = lin(color)
        self._in(self.bsdf.inputs['Roughness'], rough)
        if bump_h is not None:
            b = self.n('ShaderNodeBump'); b.inputs['Strength'].default_value = bump_s; b.inputs['Distance'].default_value = bump_dist
            self.link(bump_h, b.inputs['Height']); self.link(b.outputs[0], self.bsdf.inputs['Normal'])
        mv = self.n('ShaderNodeMath', operation='ADD'); mv.name = 'METAL'; mv.label = 'METAL'
        self._in(mv.inputs[0], metal); mv.inputs[1].default_value = 0.0
        self.bsdf.inputs['Metallic'].default_value = 0.0
        return self.m

def cloth(name, base, base2, knee_z=None, mud='#3b3326', fade=0.12, camo=None, mud_amt=0.6, weave=0.25):
    """Field cloth: mottled, darker in creases, faded where exposed, dirty low down, mud on the knees, visible weave."""
    B = NB(name)
    mott = B.noise(6.0, 6, 0.55)
    c = B.mix(base, base2, B.ramp(mott, 0.35, 0.65))
    if camo:
        blot = B.noise(5.5, 3, 0.6, dist=0.4, w=3.0)
        c1 = B.mix(camo[0], camo[1], B.ramp(blot, 0.42, 0.46))
        blot2 = B.noise(8.0, 3, 0.6, dist=0.6, w=7.0)
        c1 = B.mix(c1, camo[2], B.ramp(blot2, 0.58, 0.62))
        blot3 = B.noise(14.0, 2, 0.5, dist=0.8, w=11.0)
        c1 = B.mix(c1, camo[3], B.ramp(blot3, 0.62, 0.65))
        c = B.mix(c, c1, 0.85)
    ao = B.ao(0.06)
    # creases darker, exposed panels sun-faded (lighter, greyer)
    c = B.mix(B.mix(c, '#000000', 0.0), c, 1.0)
    dark = B.math('SUBTRACT', 1.0, ao)
    c = B.mix(c, '#14120e', B.math('MULTIPLY', B.ramp(dark, 0.05, 0.6), 0.55))
    c = B.mix(c, '#8a8878', B.math('MULTIPLY', B.ramp(ao, 0.85, 1.0), fade))
    z = B.zcoord()
    # grime gets heavier toward the boots
    low = B.ramp(z.outputs['Z'], 0.75, 0.05)
    splat = B.ramp(B.noise(9.0, 8, 0.65), 0.38, 0.7)
    c = B.mix(c, mud, B.math('MULTIPLY', B.math('MULTIPLY', low, splat), mud_amt))
    if knee_z:
        kb = B.ramp(B.math('ABSOLUTE', B.math('SUBTRACT', z.outputs['Z'], knee_z)), 0.09, 0.0)
        front = B.ramp(B.math('MULTIPLY', z.outputs['Y'], -1.0), -0.02, 0.06)
        km = B.math('MULTIPLY', B.math('MULTIPLY', kb, front), B.ramp(B.noise(14.0, 6, 0.6), 0.3, 0.6))
        c = B.mix(c, mud, B.math('MULTIPLY', km, 0.85))
    # weave + creases (fine bump)
    # twill weave (two crossing band sets at different scales), fine wrinkles and fuzz: the high-frequency normal detail
    # that makes the cloth read as woven wool or cotton instead of a smooth shell
    wv = B.n('ShaderNodeTexWave', wave_type='BANDS'); wv.inputs['Scale'].default_value = 260.0; wv.inputs['Distortion'].default_value = 2.0
    B.link(B.obj, wv.inputs['Vector'])
    wv2 = B.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Y'); wv2.inputs['Scale'].default_value = 300.0; wv2.inputs['Distortion'].default_value = 1.2
    B.link(B.obj, wv2.inputs['Vector'])
    weave_h = B.math('MULTIPLY', B.math('ADD', wv.outputs['Fac'], B.math('MULTIPLY', wv2.outputs['Fac'], 0.7)), weave * 0.5)
    wr = B.math('MULTIPLY', B.ramp(B.noise(22.0, 3, 0.6, stretch=(1.0, 1.0, 4.0)), 0.45, 0.6), 0.5)
    # sewn seams from the garment's seam field (detail.tailor): a pressed groove and two rows of stitches
    sa = B.n('ShaderNodeAttribute', attribute_name='seam_d'); sb = B.n('ShaderNodeAttribute', attribute_name='seam_s')
    has = B.math('GREATER_THAN', sa.outputs['Fac'], 0.0001)
    dist = B.math('SUBTRACT', 0.05, sa.outputs['Fac'])
    groove = B.math('MULTIPLY', has, B.math('EXPONENT', B.math('MULTIPLY', B.math('POWER', B.math('DIVIDE', dist, 0.0035), 2.0), -1.0)))
    stitch_row = B.math('EXPONENT', B.math('MULTIPLY', B.math('POWER', B.math('DIVIDE', B.math('SUBTRACT', dist, 0.0042), 0.0009), 2.0), -1.0))
    stitch_on = B.math('POWER', B.math('ADD', 0.5, B.math('MULTIPLY', 0.5, B.math('COSINE', B.math('MULTIPLY', sb.outputs['Fac'], 6.2832 / 0.0055)))), 4.0)
    stitches = B.math('MULTIPLY', has, B.math('MULTIPLY', stitch_row, stitch_on))
    seam_h = B.math('ADD', B.math('MULTIPLY', groove, -0.9), B.math('MULTIPLY', stitches, 0.5))
    wr = B.math('ADD', wr, seam_h)
    c = B.mix(c, '#2a2a1e', B.math('MULTIPLY', groove, 0.25))
    rough = B.mixf(0.86, 0.96, B.ramp(mott, 0.3, 0.7))
    # wear: rubbed shiny and a touch lighter at elbows, knees and seat and on the edges of pockets and seams
    zc = B.zcoord()
    ax = B.math('ABSOLUTE', zc.outputs['X'])
    elbow = B.math('MULTIPLY', B.ramp(B.math('ABSOLUTE', B.math('SUBTRACT', ax, 0.46)), 0.07, 0.0), B.ramp(B.math('ABSOLUTE', B.math('SUBTRACT', zc.outputs['Z'], 1.47)), 0.08, 0.0))
    knee = B.ramp(B.math('ABSOLUTE', B.math('SUBTRACT', zc.outputs['Z'], knee_z or 0.52)), 0.08, 0.0)
    seat = B.math('MULTIPLY', B.ramp(zc.outputs['Y'], 0.02, 0.09), B.ramp(B.math('ABSOLUTE', B.math('SUBTRACT', zc.outputs['Z'], 0.88)), 0.1, 0.0))
    worn = B.math('MULTIPLY', B.math('MAXIMUM', B.math('MAXIMUM', elbow, knee), B.math('MAXIMUM', seat, B.math('MULTIPLY', B.edge(0.004), 0.7))), B.ramp(B.noise(18.0, 4, 0.6), 0.3, 0.7))
    rough = B.mixf(rough, 0.64, B.math('MULTIPLY', worn, 0.85))
    c = B.mix(c, '#9a9680', B.math('MULTIPLY', worn, 0.18))
    # dust climbing from the boots to the knees (dry, pale, kills the sheen) under the mud
    dust = B.math('MULTIPLY', B.ramp(zc.outputs['Z'], 0.62, 0.12), B.ramp(B.noise(6.0, 6, 0.6), 0.25, 0.65))
    c = B.mix(c, '#8b7e62', B.math('MULTIPLY', dust, 0.42))
    rough = B.mixf(rough, 0.99, dust)
    # sweat darkening at the collar line and across the shoulders under the braces
    sweat = B.math('MULTIPLY', B.ramp(B.math('ABSOLUTE', B.math('SUBTRACT', zc.outputs['Z'], 1.47)), 0.07, 0.0), B.ramp(ax, 0.2, 0.05))
    c = B.mix(c, '#1d1c14', B.math('MULTIPLY', sweat, 0.3))
    rough = B.mixf(rough, 0.78, B.math('MULTIPLY', sweat, 0.6))
    return B.finish(c, rough, bump_h=B.math('ADD', B.math('ADD', weave_h, wr), B.math('MULTIPLY', B.noise(35.0, 4), 0.35)), bump_s=0.42, bump_dist=0.004)

def leather(name, base, base2='#100c09', mud='#3d3428', mud_low=0.0, polish=0.45):
    B = NB(name)
    grain = B.noise(180.0, 3, 0.6)
    c = B.mix(base, base2, B.ramp(B.noise(7.0, 5, 0.6), 0.3, 0.7))
    e = B.edge(0.006)
    scuff = B.ramp(B.noise(25.0, 6, 0.7, stretch=(1.0, 1.0, 6.0)), 0.55, 0.75)
    wornc = B.mix(c, '#6a5848', 0.55)
    c = B.mix(c, wornc, B.math('MAXIMUM', B.math('MULTIPLY', e, 0.8), B.math('MULTIPLY', scuff, 0.45)))
    if mud_low > 0:
        z = B.zcoord()
        low = B.ramp(z.outputs['Z'], mud_low, 0.0)
        c = B.mix(c, mud, B.math('MULTIPLY', low, B.ramp(B.noise(12.0, 8, 0.65), 0.3, 0.6)))
        rough_mud = low
    else:
        rough_mud = 0.0
    rough = B.mixf(polish, 0.75, B.math('MAXIMUM', B.math('MAXIMUM', scuff, e), rough_mud))
    return B.finish(c, rough, bump_h=B.math('ADD', B.math('MULTIPLY', grain, 0.4), B.math('MULTIPLY', scuff, -0.3)), bump_s=0.4, bump_dist=0.004)

def webbing(name, base, base2):
    """Woven cotton webbing / canvas: strong weave, frayed lighter edges, sweat and dirt."""
    B = NB(name)
    c = B.mix(base, base2, B.ramp(B.noise(8.0, 6, 0.6), 0.3, 0.7))
    e = B.edge(0.004)
    fray = B.math('MULTIPLY', e, B.ramp(B.noise(200.0, 2, 0.5), 0.3, 0.7))
    c = B.mix(c, '#a49c80', B.math('MULTIPLY', fray, 0.7))
    ao = B.ao(0.04)
    c = B.mix(c, '#1a1712', B.math('MULTIPLY', B.ramp(B.math('SUBTRACT', 1.0, ao), 0.05, 0.6), 0.5))
    c = B.mix(c, '#3a3226', B.math('MULTIPLY', B.ramp(B.noise(5.0, 8, 0.7), 0.55, 0.8), 0.5))
    wv1 = B.n('ShaderNodeTexWave', wave_type='BANDS'); wv1.inputs['Scale'].default_value = 520.0
    B.link(B.obj, wv1.inputs['Vector'])
    wv2 = B.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Y'); wv2.inputs['Scale'].default_value = 520.0
    B.link(B.obj, wv2.inputs['Vector'])
    h = B.math('ADD', wv1.outputs['Fac'], wv2.outputs['Fac'])
    return B.finish(c, B.mixf(0.88, 0.97, fray), bump_h=B.math('ADD', B.math('MULTIPLY', h, 0.08), B.math('MULTIPLY', fray, -0.4)), bump_s=0.4, bump_dist=0.004)

def painted_metal(name, paint, paint2, steel='#34332f', rust='#4d3221', chip=0.55, scratch=0.5, camo=None):
    """Helmet / canister paint: matte, chipped on rims and crown, scratched, a little rust in the deepest chips."""
    B = NB(name)
    c = B.mix(paint, paint2, B.ramp(B.noise(9.0, 5, 0.6), 0.3, 0.7))
    if camo:
        bl = B.noise(6.0, 3, 0.6, dist=0.5, w=2.0)
        c = B.mix(c, camo[0], B.ramp(bl, 0.45, 0.48))
        bl2 = B.noise(9.0, 3, 0.6, dist=0.7, w=5.0)
        c = B.mix(c, camo[1], B.ramp(bl2, 0.6, 0.63))
    e = B.edge(0.008)
    z = B.zcoord()
    crown = B.ramp(z.outputs['Z'], 1.80, 1.9)
    rough_noise = B.noise(30.0, 8, 0.75)
    chipmask = B.ramp(B.math('ADD', B.math('MULTIPLY', B.math('ADD', e, B.math('MULTIPLY', crown, 0.5)), chip), B.math('MULTIPLY', rough_noise, 0.6)), 0.47, 0.52)
    scr = B.ramp(B.noise(40.0, 2, 0.5, stretch=(1.0, 14.0, 1.0), w=4.0), 0.72, 0.75)
    scr2 = B.ramp(B.noise(40.0, 2, 0.5, stretch=(12.0, 1.0, 3.0), w=9.0), 0.73, 0.76)
    sc = B.math('MULTIPLY', B.math('MAXIMUM', scr, scr2), scratch)
    under = B.mix(steel, rust, B.ramp(B.noise(50.0, 4), 0.55, 0.75))
    c = B.mix(c, '#5a5a52', B.math('MULTIPLY', sc, 0.7))
    c = B.mix(c, under, chipmask)
    ao = B.ao(0.03)
    c = B.mix(c, '#121210', B.math('MULTIPLY', B.ramp(B.math('SUBTRACT', 1.0, ao), 0.05, 0.6), 0.45))
    rough = B.mixf(B.mixf(0.78, 0.6, sc), 0.42, chipmask)
    h = B.math('SUBTRACT', B.math('MULTIPLY', B.math('SUBTRACT', 1.0, chipmask), 1.0), B.math('MULTIPLY', sc, 0.4))
    h = B.math('ADD', h, B.math('MULTIPLY', B.noise(120.0, 3), 0.15))
    return B.finish(c, rough, bump_h=h, bump_s=0.6, bump_dist=0.006, metal=B.math('MULTIPLY', chipmask, 0.9))

def skin(name, image, grime=0.35, uv='UVMap'):
    """MakeHuman skin + dirt and sweat: grime in creases and on the cheeks/hands, a slightly sweaty sheen in patches."""
    B = NB(name)
    uvn = B.n('ShaderNodeUVMap'); uvn.uv_map = uv
    tex = B.n('ShaderNodeTexImage'); tex.image = bpy.data.images.load(image, check_existing=True)
    B.link(uvn.outputs[0], tex.inputs[0])
    c = B.mix(tex.outputs[0], '#b8a090', 0.12)          # less saturated, a bit paler: tired, cold
    ao = B.ao(0.02)
    c = B.mix(c, '#3a2c22', B.math('MULTIPLY', B.ramp(B.math('SUBTRACT', 1.0, ao), 0.05, 0.5), 0.45))
    smudge = B.ramp(B.noise(7.0, 7, 0.7, dist=0.4), 0.55, 0.78)
    c = B.mix(c, '#3d3226', B.math('MULTIPLY', smudge, grime))
    stub = B.ramp(B.noise(400.0, 2, 0.5), 0.55, 0.7)
    sweat = B.ramp(B.noise(5.0, 3, 0.5, w=3.0), 0.5, 0.7)
    # a few days' stubble on the jaw, upper lip and chin (bind pose: face front is -Y, jaw at about 1.55-1.63 m)
    zc = B.zcoord()
    jaw = B.math('MULTIPLY', B.math('MULTIPLY', B.ramp(B.math('ABSOLUTE', B.math('SUBTRACT', zc.outputs['Z'], 1.585)), 0.045, 0.015),
                                    B.ramp(zc.outputs['Y'], 0.0, -0.06)), B.ramp(B.math('ABSOLUTE', zc.outputs['X']), 0.075, 0.05))
    c = B.mix(c, '#2b231d', B.math('MULTIPLY', B.math('MULTIPLY', jaw, B.ramp(B.noise(520.0, 2, 0.5), 0.45, 0.6)), 0.55))
    # oilier T-zone (forehead, nose), drier cheeks; dirt in the creases already from the AO above
    tz = B.math('MULTIPLY', B.ramp(zc.outputs['Z'], 1.6, 1.68), B.ramp(B.math('ABSOLUTE', zc.outputs['X']), 0.05, 0.02))
    rough = B.mixf(B.mixf(0.62, 0.42, sweat), 0.4, B.math('MULTIPLY', tz, 0.7))
    pores = B.math('MULTIPLY', B.noise(650.0, 2, 0.5), 0.35)
    return B.finish(c, rough, bump_h=B.math('ADD', B.math('ADD', B.math('MULTIPLY', B.noise(250.0, 3, 0.6), 0.5), pores), B.math('MULTIPLY', stub, 0.35)), bump_s=0.22, bump_dist=0.002)

def flat(name, col, rough=0.5, metal=0.0):
    B = NB(name)
    return B.finish(col, rough, metal=metal)

# ---------------- weapons
def wood(name, base='#4a3423', dark='#22160c', axis='Y'):
    """Oiled walnut stock: fine long grain lines, darker oil-soaked grip areas, dings and pale worn edges."""
    B = NB(name)
    warp = B.noise(4.0, 3, 0.5)
    vec = B.n('ShaderNodeVectorMath', operation='ADD')
    B.link(B.obj, vec.inputs[0])
    cw = B.n('ShaderNodeCombineXYZ'); B.link(B.math('MULTIPLY', warp, 0.02), cw.inputs['X']); B.link(B.math('MULTIPLY', warp, 0.03), cw.inputs['Z'])
    B.link(cw.outputs[0], vec.inputs[1])
    # long grain lines: sin(height across the stock * k + warp), so they run along the stock (weapon Y axis)
    sep = B.n('ShaderNodeSeparateXYZ'); B.link(vec.outputs[0], sep.inputs[0])
    ph = B.math('ADD', B.math('MULTIPLY', sep.outputs['Z'], 420.0), B.math('MULTIPLY', B.noise(5.0, 3, 0.5, w=1.0), 9.0))
    bandv = B.math('MULTIPLY', B.math('ADD', B.math('SINE', ph), 1.0), 0.5)
    fine = B.noise(140.0, 4, 0.6, stretch=(6.0, 0.25, 6.0))
    grain = B.math('ADD', B.math('MULTIPLY', B.math('POWER', bandv, 3.0), 0.6), B.math('MULTIPLY', fine, 0.5))
    c = B.mix(base, dark, B.ramp(grain, 0.35, 0.95))
    oil = B.ramp(B.noise(3.0, 3, 0.5, w=2.0), 0.45, 0.7)
    c = B.mix(c, '#1a100a', B.math('MULTIPLY', oil, 0.35))
    e = B.edge(0.004)
    c = B.mix(c, '#8a6a4a', B.math('MULTIPLY', e, 0.6))
    vor = B.n('ShaderNodeTexVoronoi', feature='F1'); vor.inputs['Scale'].default_value = 70.0
    B.link(B.obj, vor.inputs['Vector'])
    ding = B.math('MULTIPLY', B.ramp(vor.outputs['Distance'], 0.12, 0.0), B.ramp(B.noise(18.0, 2, 0.5, w=6.0), 0.5, 0.58))
    c = B.mix(c, '#120a06', B.math('MULTIPLY', ding, 0.7))
    scr = B.ramp(B.noise(28.0, 2, 0.5, stretch=(1.0, 16.0, 1.0), w=2.0), 0.69, 0.72)
    c = B.mix(c, '#7a5a3e', B.math('MULTIPLY', scr, 0.7))
    rough = B.mixf(B.mixf(B.mixf(0.5, 0.36, oil), 0.62, e), 0.78, B.math('MAXIMUM', ding, scr))
    h = B.math('SUBTRACT', B.math('MULTIPLY', grain, 0.15), B.math('ADD', B.math('MULTIPLY', ding, 1.0), B.math('MULTIPLY', scr, 0.5)))
    return B.finish(c, rough, bump_h=h, bump_s=0.7, bump_dist=0.004)

def blued(name, base='#4a4f58', base2='#3c4048', bright='#b8b8b2', wear=1.0, park=False):
    """Blued (or parkerized) steel: dark finish, bright bare steel on edges and high points, fine scratches, holster wear."""
    B = NB(name)
    c = B.mix(base, base2, B.ramp(B.noise(25.0, 5, 0.6), 0.3, 0.7))
    e = B.edge(0.0025)
    worn = B.math('MULTIPLY', B.ramp(B.math('ADD', B.math('MULTIPLY', e, 1.2), B.math('MULTIPLY', B.noise(60.0, 6, 0.7), 0.5)), 0.75, 0.95), wear)
    scr = B.ramp(B.noise(45.0, 2, 0.5, stretch=(1.0, 25.0, 1.0), w=5.0), 0.68, 0.71)
    scr2 = B.ramp(B.noise(45.0, 2, 0.5, stretch=(20.0, 1.0, 6.0), w=8.0), 0.69, 0.72)
    sc = B.math('MAXIMUM', scr, scr2)
    c = B.mix(c, '#8a8a88', B.math('MULTIPLY', sc, 0.7))
    c = B.mix(c, bright, worn)
    ao = B.ao(0.02)
    c = B.mix(c, '#070707', B.math('MULTIPLY', B.ramp(B.math('SUBTRACT', 1.0, ao), 0.05, 0.6), 0.5))
    base_r = 0.62 if park else 0.38
    rough = B.mixf(B.mixf(base_r, 0.5, sc), 0.24, worn)
    h = B.math('ADD', B.math('MULTIPLY', sc, -0.4), B.math('MULTIPLY', B.noise(300.0, 3), 0.08))
    return B.finish(c, rough, bump_h=h, bump_s=0.6, bump_dist=0.003, metal=B.math('ADD', 0.75, B.math('MULTIPLY', worn, 0.25)))
