# Procedural weapon materials (Cycles nodes), baked to albedo / normal / occlusion-roughness-metal maps.
# Every material reads a pre-baked MASK image (R = convex edges, G = cavities, B = broad occlusion) through the
# 'atlas' UV map, plus the weapon's object-space position, so wear lands where wear happens:
#   edges and corners go bright, hands polish and darken, things that slide get scratches along the slide,
#   recesses keep dust and a little rust. Metal amount goes out through a value node named METAL.
# Colours are linear RGB.
import bpy, math

class NB:
    def __init__(self, name, mask_img=None):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        self.m = m; self.nt = m.node_tree; self.nt.nodes.clear()
        self.out = self.nt.nodes.new('ShaderNodeOutputMaterial')
        self.bsdf = self.nt.nodes.new('ShaderNodeBsdfPrincipled')
        self.nt.links.new(self.bsdf.outputs[0], self.out.inputs[0])
        self.P = self.nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
        self.mask = None
        if mask_img is not None:
            uv = self.nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'atlas'
            t = self.nt.nodes.new('ShaderNodeTexImage'); t.image = mask_img; t.interpolation = 'Linear'
            self.nt.links.new(uv.outputs[0], t.inputs[0])
            s = self.nt.nodes.new('ShaderNodeSeparateColor'); self.nt.links.new(t.outputs[0], s.inputs[0])
            self.mask = s
    # ---------------------------------------------------------------- plumbing
    def _in(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = v if len(v) == 4 or len(sock.default_value) == 3 else v + (1.0,)
        else:
            self.nt.links.new(v, sock)
    def math(self, op, a, b=None, c=None, clamp=False):
        n = self.nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        self._in(n.inputs[0], a)
        if b is not None: self._in(n.inputs[1], b)
        if c is not None: self._in(n.inputs[2], c)
        return n.outputs[0]
    def add(self, *a):
        r = a[0]
        for x in a[1:]: r = self.math('ADD', r, x)
        return r
    def mul(self, *a):
        r = a[0]
        for x in a[1:]: r = self.math('MULTIPLY', r, x)
        return r
    def sub(self, a, b): return self.math('SUBTRACT', a, b)
    def inv(self, a): return self.math('SUBTRACT', 1.0, a)
    def mx(self, a, b): return self.math('MAXIMUM', a, b)
    def clamp(self, a): return self.math('ADD', a, 0.0, clamp=True)
    def vmath(self, op, a, b=None, out=0):
        n = self.nt.nodes.new('ShaderNodeVectorMath'); n.operation = op
        self._in(n.inputs[0], a)
        if b is not None: self._in(n.inputs[1], b)
        return n.outputs[out]
    def mapping(self, v, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
        n = self.nt.nodes.new('ShaderNodeMapping')
        self._in(n.inputs['Vector'], v)
        n.inputs['Location'].default_value = loc
        n.inputs['Rotation'].default_value = [math.radians(r) for r in rot]
        n.inputs['Scale'].default_value = scale
        return n.outputs[0]
    def xyz(self, v=None):
        n = self.nt.nodes.new('ShaderNodeSeparateXYZ'); self._in(n.inputs[0], v or self.P)
        return n.outputs[0], n.outputs[1], n.outputs[2]
    def noise(self, v, scale, detail=3.0, rough=0.5, dist=0.0, w=0.0):
        n = self.nt.nodes.new('ShaderNodeTexNoise'); n.noise_dimensions = '4D'
        self._in(n.inputs['Vector'], v)
        n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough; n.inputs['Distortion'].default_value = dist
        n.inputs['W'].default_value = w
        return n.outputs['Fac']
    def vor(self, v, scale, feature='F1', rnd=1.0, out='Distance'):
        n = self.nt.nodes.new('ShaderNodeTexVoronoi'); n.feature = feature
        self._in(n.inputs['Vector'], v)
        n.inputs['Scale'].default_value = scale; n.inputs['Randomness'].default_value = rnd
        return n.outputs[out]
    def ss(self, x, a, b):
        """smoothstep from a to b (a > b inverts)."""
        n = self.nt.nodes.new('ShaderNodeMapRange'); n.interpolation_type = 'SMOOTHSTEP'
        self._in(n.inputs['Value'], x)
        self._in(n.inputs['From Min'], a); self._in(n.inputs['From Max'], b)
        return n.outputs[0]
    def lerp(self, f, a, b):
        n = self.nt.nodes.new('ShaderNodeMix'); n.data_type = 'FLOAT'; n.clamp_factor = True
        self._in(n.inputs[0], f); self._in(n.inputs[2], a); self._in(n.inputs[3], b)
        return n.outputs[0]
    def mixc(self, f, a, b, mode='MIX'):
        n = self.nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = mode; n.clamp_factor = True
        self._in(n.inputs[0], f)
        self._in(n.inputs[6], a if not isinstance(a, tuple) else (a + (1.0,) if len(a) == 3 else a))
        self._in(n.inputs[7], b if not isinstance(b, tuple) else (b + (1.0,) if len(b) == 3 else b))
        return n.outputs[2]
    def cmul(self, c, f):
        """colour times scalar."""
        return self.mixc(1.0, c, self.gray(f), mode='MULTIPLY')
    def gray(self, f):
        n = self.nt.nodes.new('ShaderNodeCombineColor')
        for i in range(3): self._in(n.inputs[i], f)
        return n.outputs[0]
    # ---------------------------------------------------------------- masks
    def edge(self):    return self.mask.outputs[0] if self.mask else 0.0
    def cavity(self):  return self.mask.outputs[1] if self.mask else 0.0
    def occl(self):    return self.mask.outputs[2] if self.mask else 1.0
    def zone(self, c, r, soft=0.45):
        """1 inside an ellipsoid (centre c, radii r) of the weapon frame, fading out over the outer 'soft' part."""
        d = self.vmath('DIVIDE', self.vmath('SUBTRACT', self.P, c), r)
        ln = self.vmath('LENGTH', d, out=1)
        return self.ss(ln, 1.0, 1.0 - soft)
    def scratches(self, scale, stretch, rot, width, density, seed=0.0):
        """Thin line fragments: voronoi cell edges of a stretched space, kept where a sparse noise allows.
        scale: lines per metre across, stretch: ratio along/across (>1 = long lines), rot: orientation (deg)."""
        q = self.mapping(self.P, loc=(seed, seed * 1.7, seed * 0.3), rot=rot)
        q = self.mapping(q, scale=(scale, scale / stretch, scale))
        d = self.vor(q, 1.0, 'DISTANCE_TO_EDGE')
        line = self.ss(d, width, 0.0)
        keep = self.ss(self.noise(self.mapping(self.P, loc=(seed * 3.1, 0, 0)), scale * 0.06, 2.0, 0.5), 1.0 - density, 1.0 - density + 0.12)
        return self.mul(line, keep)
    def scratch_set(self, axis, amount=1.0, along=1.0, fine=1.0, seed=0.0):
        """Directional scratches along the slide axis plus random-direction ones. axis: 'Y' or 'Z'."""
        ar = (0, 0, 0) if axis == 'Y' else (90, 0, 0)
        a1 = self.scratches(1400, 30, ar, 0.035, 0.30 * along, seed)
        a2 = self.scratches(600, 18, (ar[0] + 3, ar[1], ar[2] + 2), 0.025, 0.22 * along, seed + 5)
        r1 = self.scratches(700, 14, (37, 61, 12), 0.03, 0.20 * fine, seed + 11)
        r2 = self.scratches(900, 10, (-48, 20, 75), 0.03, 0.16 * fine, seed + 17)
        r3 = self.scratches(350, 22, (80, -35, 140), 0.02, 0.10 * fine, seed + 23)
        s = self.mx(self.mx(a1, a2), self.mx(r1, self.mx(r2, r3)))
        return self.mul(s, amount)
    def checker(self, a_axis, b_axis, pitch):
        """Diamond checkering height (0..1) on the plane of two axes ('X','Y','Z')."""
        x, y, z = self.xyz()
        A = {'X': x, 'Y': y, 'Z': z}
        k = 2 * math.pi / pitch / 1.4142
        u = self.math('SINE', self.mul(self.add(A[a_axis], A[b_axis]), k))
        v = self.math('SINE', self.mul(self.sub(A[a_axis], A[b_axis]), k))
        h = self.math('MINIMUM', self.math('ABSOLUTE', u), self.math('ABSOLUTE', v))
        return self.ss(h, 0.05, 0.6)
    # ---------------------------------------------------------------- output
    def finish(self, color, rough, metal, height=None, bump_dist=0.0004, bump_strength=1.0):
        self._in(self.bsdf.inputs['Base Color'], color)
        self._in(self.bsdf.inputs['Roughness'], self.clamp(rough) if not isinstance(rough, float) else rough)
        mv = self.nt.nodes.new('ShaderNodeMath'); mv.operation = 'ADD'; mv.use_clamp = True; mv.name = 'METAL'
        self._in(mv.inputs[0], metal); mv.inputs[1].default_value = 0.0
        self._in(self.bsdf.inputs['Metallic'], mv.outputs[0])
        if height is not None:
            b = self.nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump_strength
            b.inputs['Distance'].default_value = bump_dist
            self._in(b.inputs['Height'], height)
            self.nt.links.new(b.outputs[0], self.bsdf.inputs['Normal'])
        return self.m

# ======================================================================================== masks
def mask_material(name):
    """R: convex worn edges, G: cavities (tight AO), B: broad occlusion. Baked through an emission shader."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(em.outputs[0], out.inputs[0])
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    bv = nt.nodes.new('ShaderNodeBevel'); bv.samples = 8; bv.inputs['Radius'].default_value = 0.0011
    dp = nt.nodes.new('ShaderNodeVectorMath'); dp.operation = 'DOT_PRODUCT'
    nt.links.new(bv.outputs[0], dp.inputs[0]); nt.links.new(geo.outputs['Normal'], dp.inputs[1])
    e = nt.nodes.new('ShaderNodeMath'); e.operation = 'SUBTRACT'; e.inputs[0].default_value = 1.0
    nt.links.new(dp.outputs['Value'], e.inputs[1])
    er = nt.nodes.new('ShaderNodeMapRange'); er.inputs['From Min'].default_value = 0.004; er.inputs['From Max'].default_value = 0.06
    nt.links.new(e.outputs[0], er.inputs['Value'])
    a1 = nt.nodes.new('ShaderNodeAmbientOcclusion'); a1.samples = 12; a1.inputs['Distance'].default_value = 0.006
    a2 = nt.nodes.new('ShaderNodeAmbientOcclusion'); a2.samples = 12; a2.inputs['Distance'].default_value = 0.035
    conv = nt.nodes.new('ShaderNodeMapRange'); conv.inputs['From Min'].default_value = 0.72; conv.inputs['From Max'].default_value = 0.95
    nt.links.new(a1.outputs['AO'], conv.inputs['Value'])
    ed = nt.nodes.new('ShaderNodeMath'); ed.operation = 'MULTIPLY'
    nt.links.new(er.outputs[0], ed.inputs[0]); nt.links.new(conv.outputs[0], ed.inputs[1])
    cav = nt.nodes.new('ShaderNodeMapRange'); cav.inputs['From Min'].default_value = 0.92; cav.inputs['From Max'].default_value = 0.45
    nt.links.new(a1.outputs['AO'], cav.inputs['Value'])
    cc = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(ed.outputs[0], cc.inputs[0]); nt.links.new(cav.outputs[0], cc.inputs[1]); nt.links.new(a2.outputs['AO'], cc.inputs[2])
    nt.links.new(cc.outputs[0], em.inputs['Color'])
    return m

# ======================================================================================== metals
def _hand(nb, W, extra=()):
    z = W.zones
    h = nb.add(nb.zone(*z['handR']), nb.zone(*z['handL']))
    for e in extra:
        h = nb.add(h, nb.zone(*e))
    return nb.clamp(h)

def _axis(W):
    s = W.zones.get('slide', (0, 1, 0))
    return 'Z' if abs(s[2]) > 0.5 else 'Y'

def blued(name, W, mask, seed=0.0, tint=(0.060, 0.066, 0.082)):
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 14, 4, 0.55, w=seed)
    n2 = nb.noise(P, 160, 5, 0.6, w=seed + 3)
    n3 = nb.noise(P, 45, 3, 0.5, w=seed + 7)
    hand = _hand(nb, W)
    edge = nb.edge()
    wear = nb.ss(nb.add(nb.mul(edge, nb.add(0.40, nb.mul(n2, 1.2))), nb.mul(hand, edge, 0.6)), 0.34, 0.66)
    scr = nb.scratch_set(_axis(W), 1.0, along=1.2, fine=1.1, seed=seed)
    cav = nb.cavity()
    rust = nb.mul(nb.ss(cav, 0.25, 0.75), nb.ss(nb.noise(P, 70, 4, 0.6, w=seed + 9), 0.50, 0.68))
    pits = nb.ss(nb.vor(nb.mapping(P, scale=(1, 1, 1)), 420, 'F1', 1.0), 0.06, 0.0)
    pits = nb.mul(pits, nb.ss(nb.noise(P, 30, 2, 0.5, w=seed + 13), 0.55, 0.72))
    rust = nb.clamp(nb.add(rust, nb.mul(pits, 0.8)))
    dust = nb.mul(nb.ss(cav, 0.35, 0.9), nb.ss(nb.noise(P, 90, 3, 0.5, w=seed + 2), 0.35, 0.6), 0.9)
    smudge = nb.ss(nb.noise(P, 26, 3, 0.55, w=seed + 4), 0.52, 0.72)
    # colour: bluing varies; worn-thin bluing goes plum-grey where hands rub; scratches and edges bright
    c = nb.mixc(n1, tint, (tint[0] * 1.5, tint[1] * 1.45, tint[2] * 1.35))
    rub = nb.mul(nb.ss(nb.noise(nb.mapping(P, scale=(3, 0.25, 3)), 30, 3, 0.6, w=seed + 15), 0.52, 0.75), 0.55)
    c = nb.mixc(rub, c, (0.13, 0.12, 0.12))
    c = nb.mixc(nb.mul(hand, 0.6, n3), c, (0.21, 0.18, 0.17))
    c = nb.mixc(nb.mul(scr, 0.85), c, (0.42, 0.42, 0.41))
    c = nb.mixc(wear, c, (0.66, 0.65, 0.62))
    c = nb.mixc(rust, c, (0.11, 0.045, 0.020))
    c = nb.mixc(dust, c, (0.20, 0.17, 0.13))
    r = nb.add(0.40, nb.mul(nb.sub(n1, 0.5), 0.18))
    r = nb.lerp(smudge, r, 0.27)                     # oil sheen
    r = nb.lerp(nb.mul(hand, 0.7), r, 0.30)
    r = nb.lerp(nb.mul(scr, 0.8), r, 0.24)
    r = nb.lerp(wear, r, 0.22)
    r = nb.lerp(rust, r, 0.85)
    r = nb.lerp(dust, r, 0.92)
    metal = nb.clamp(nb.sub(1.0, nb.add(rust, nb.mul(dust, 0.9))))
    h = nb.add(nb.mul(scr, -0.5), nb.mul(pits, -0.6), nb.mul(rust, nb.noise(P, 900, 2, 0.5), 0.5), nb.mul(nb.noise(P, 2500, 1, 0.5), 0.05))
    if 'checkY' in W.zones:   # checkered butt plate (face normal along Y)
        y0 = W.zones['checkY']
        x, y, z = nb.xyz()
        cm = nb.mul(nb.ss(y, y0 - 0.0005, y0 + 0.0008), nb.inv(nb.ss(nb.edge(), 0.1, 0.4)))
        ch = nb.mul(nb.checker('X', 'Z', 0.0020), cm, nb.inv(nb.mul(wear, 0.8)))
        h = nb.add(h, nb.mul(ch, 0.7))
    return nb.finish(c, r, metal, h, bump_dist=0.00035)

def parkerized(name, W, mask, seed=0.0, tint=(0.030, 0.031, 0.029), serr=None):
    """Phosphate finish: matte dark grey-green non-metal coat; bare steel shows on worn edges and scratches."""
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 12, 4, 0.55, w=seed)
    n2 = nb.noise(P, 170, 5, 0.6, w=seed + 3)
    n3 = nb.noise(P, 40, 3, 0.5, w=seed + 8)
    hand = _hand(nb, W)
    edge = nb.edge()
    wear = nb.ss(nb.add(nb.mul(edge, nb.add(0.30, nb.mul(n2, 1.15))), nb.mul(hand, edge, 0.7)), 0.40, 0.72)
    scr = nb.scratch_set(_axis(W), 1.0, seed=seed)
    cav = nb.cavity()
    rust = nb.mul(nb.ss(cav, 0.30, 0.80), nb.ss(nb.noise(P, 60, 4, 0.6, w=seed + 9), 0.52, 0.70))
    dust = nb.mul(nb.ss(cav, 0.30, 0.85), nb.ss(nb.noise(P, 90, 3, 0.5, w=seed + 2), 0.30, 0.60))
    oil = nb.ss(nb.noise(P, 22, 3, 0.55, w=seed + 4), 0.50, 0.70)
    blot = nb.noise(P, 6, 4, 0.65, w=seed + 12)                                                                     # uneven phosphate
    c = nb.mixc(n1, tint, (tint[0] * 1.7, tint[1] * 1.72, tint[2] * 1.6))
    c = nb.mixc(nb.ss(blot, 0.40, 0.70), nb.cmul(c, 0.72), nb.cmul(c, 1.25))
    c = nb.mixc(nb.mul(nb.add(oil, nb.mul(hand, 0.8)), 0.5), c, (tint[0] * 0.65, tint[1] * 0.65, tint[2] * 0.65))   # oiled = darker
    c = nb.mixc(nb.mul(n3, hand, 0.35), c, (0.10, 0.10, 0.095))                                                     # rubbed thin
    c = nb.mixc(nb.mul(scr, 0.9), c, (0.46, 0.46, 0.45))
    c = nb.mixc(wear, c, (0.60, 0.59, 0.56))
    c = nb.mixc(rust, c, (0.10, 0.042, 0.018))
    c = nb.mixc(dust, c, (0.19, 0.16, 0.12))
    r = nb.add(0.70, nb.mul(nb.sub(n1, 0.5), 0.14))
    r = nb.lerp(nb.mul(oil, 0.8), r, 0.46)
    r = nb.lerp(nb.mul(hand, 0.8), r, 0.42)
    r = nb.lerp(nb.mul(scr, 0.9), r, 0.30)
    r = nb.lerp(wear, r, 0.26)
    r = nb.lerp(rust, r, 0.88)
    r = nb.lerp(dust, r, 0.93)
    metal = nb.clamp(nb.add(nb.mul(scr, 0.9), wear))
    metal = nb.clamp(nb.sub(metal, nb.add(rust, dust)))
    h = nb.add(nb.mul(scr, -0.5), nb.mul(nb.noise(P, 1800, 2, 0.6), 0.10), nb.mul(rust, -0.3))
    if serr:   # grasping grooves (pistol slide rear): vertical ridges along Y between y0 and y1, above z0
        y0, y1, z0 = serr
        x, y, z = nb.xyz()
        m = nb.mul(nb.ss(y, y0, y0 + 0.0006), nb.ss(y, y1, y1 - 0.0006), nb.ss(z, z0, z0 + 0.0008))
        g = nb.math('ABSOLUTE', nb.math('SINE', nb.mul(y, 2 * math.pi / 0.00185)))
        h = nb.add(h, nb.mul(nb.ss(g, 0.15, 0.7), m, 1.2))
        c = nb.mixc(nb.mul(m, nb.ss(g, 0.5, 0.0), 0.5), c, nb.cmul(c, 0.6))
    return nb.finish(c, r, metal, h, bump_dist=0.00035)

def steel(name, W, mask, seed=0.0):
    """Bright worn steel for bolts, triggers, cocking knobs: heavy scratches along the slide, oil films."""
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 20, 4, 0.55, w=seed)
    n2 = nb.noise(P, 180, 4, 0.6, w=seed + 2)
    edge = nb.edge()
    scr = nb.scratch_set(_axis(W), 1.0, along=1.6, fine=0.6, seed=seed + 31)
    cav = nb.cavity()
    oil = nb.ss(nb.noise(nb.mapping(P, scale=(3, 0.6, 3)), 18, 3, 0.55, w=seed + 4), 0.48, 0.70)
    grime = nb.mul(nb.ss(cav, 0.55, 1.0), nb.ss(nb.noise(P, 60, 3, 0.5, w=seed + 3), 0.4, 0.7), 0.6)
    rust = nb.mul(nb.ss(cav, 0.7, 1.0), nb.ss(nb.noise(P, 80, 4, 0.6, w=seed + 9), 0.62, 0.72))
    c = nb.mixc(n1, (0.30, 0.30, 0.295), (0.40, 0.40, 0.39))
    c = nb.mixc(nb.mul(oil, 0.7), c, (0.21, 0.20, 0.185))
    c = nb.mixc(nb.mul(scr, 0.5), c, (0.56, 0.56, 0.54))
    c = nb.mixc(nb.ss(nb.mul(edge, nb.add(0.4, n2)), 0.3, 0.7), c, (0.70, 0.70, 0.68))
    c = nb.mixc(grime, c, (0.07, 0.06, 0.05))
    c = nb.mixc(rust, c, (0.11, 0.045, 0.02))
    r = nb.add(0.27, nb.mul(nb.sub(n1, 0.5), 0.10))
    r = nb.lerp(oil, r, 0.16)
    r = nb.lerp(nb.mul(scr, 0.6), r, 0.36)
    r = nb.lerp(grime, r, 0.75)
    r = nb.lerp(rust, r, 0.85)
    metal = nb.clamp(nb.sub(1.0, nb.add(rust, nb.mul(grime, 0.8))))
    h = nb.add(nb.mul(scr, -0.22), nb.mul(nb.noise(nb.mapping(P, scale=(1, 0.04, 1)), 1800, 1, 0.5), 0.025))
    return nb.finish(c, r, metal, h, bump_dist=0.0002)

def brass(name, W, mask, seed=0.0):
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 60, 4, 0.6, w=seed)
    tarn = nb.ss(nb.add(nb.noise(P, 25, 3, 0.55, w=seed + 2), nb.mul(nb.cavity(), 0.5)), 0.48, 0.75)
    scr = nb.scratch_set('Y', 0.8, seed=seed)
    c = nb.mixc(n1, (0.62, 0.43, 0.18), (0.74, 0.54, 0.24))
    c = nb.mixc(tarn, c, (0.28, 0.19, 0.08))
    c = nb.mixc(nb.mul(nb.edge(), 0.8), c, (0.85, 0.66, 0.34))
    r = nb.lerp(tarn, 0.26, 0.48)
    r = nb.lerp(scr, r, 0.36)
    return nb.finish(c, r, 1.0, nb.mul(scr, -0.4), bump_dist=0.0003)

# ======================================================================================== wood
def wood(name, W, mask, seed=0.0, kind='walnut'):
    nb = NB(name, mask)
    axis = _axis(W)
    q = nb.P if axis == 'Y' else nb.mapping(nb.P, rot=(90, 0, 0))
    q = nb.mapping(q, rot=(4.5 + (seed % 2.0), 0, 1.5))     # grain runs a few degrees off the stock line
    if kind == 'walnut':
        early, late, pore = (0.058, 0.031, 0.016), (0.030, 0.0155, 0.0080), (0.016, 0.009, 0.005)
        ringsPerM, axisOff = 110.0, (0.19, 0.0, -0.33)
    else:   # beech with a redder oil stain, finer grain, rays
        early, late, pore = (0.060, 0.027, 0.012), (0.036, 0.0158, 0.0070), (0.020, 0.009, 0.004)
        ringsPerM, axisOff = 140.0, (-0.21, 0.0, -0.28)
    warp = nb.add(nb.mul(nb.sub(nb.noise(nb.mapping(q, scale=(9, 0.7, 9)), 1.0, 4, 0.55, dist=0.6, w=seed), 0.5), 0.030),
                  nb.mul(nb.sub(nb.noise(nb.mapping(q, scale=(40, 2.0, 40)), 1.0, 3, 0.5, w=seed + 1), 0.5), 0.006))
    rel = nb.vmath('MULTIPLY', nb.vmath('SUBTRACT', q, axisOff), (1.0, 0.0, 1.0))
    rad = nb.add(nb.vmath('LENGTH', rel, out=1), warp)
    rr = nb.mul(rad, ringsPerM)
    # rings wander: lines converge, spread and curve along the length (no two alike, never evenly spaced)
    rr = nb.add(rr, nb.mul(nb.noise(nb.mapping(q, scale=(6, 0.8, 6)), 1.0, 3, 0.55, w=seed + 9), 14.0),
                nb.mul(nb.noise(nb.mapping(q, scale=(24, 2.5, 24)), 1.0, 2, 0.5, w=seed + 11), 3.5))
    ring = nb.math('FRACT', rr)
    rw = nb.noise(nb.mapping(q, scale=(25, 0.5, 25)), 1.0, 2, 0.5, w=seed + 10)     # ring sharpness varies
    latew = nb.mul(nb.ss(ring, nb.add(0.50, nb.mul(rw, 0.30)), 0.93), nb.ss(ring, 1.0, 0.965))
    latew = nb.mul(latew, nb.add(0.35, nb.mul(nb.noise(nb.mapping(q, scale=(30, 3, 30)), 1.0, 2, 0.5, w=seed + 13), 0.9)))
    pores = nb.ss(nb.noise(nb.mapping(q, scale=(1, 0.06, 1)), 1300, 2, 0.5, w=seed + 2), 0.62, 0.72)
    pores = nb.mul(pores, nb.add(0.45, nb.mul(latew, 0.55)))
    figure = nb.noise(nb.mapping(q, scale=(1, 0.15, 1)), 7, 4, 0.6, w=seed + 3)
    tone = nb.noise(q, 4, 2, 0.5, w=seed + 5)
    c = nb.mixc(nb.mul(latew, 0.6), early, late)
    streak = nb.noise(nb.mapping(q, scale=(60, 1.2, 60)), 1.0, 3, 0.55, w=seed + 14)          # long colour streaks along the grain
    c = nb.cmul(c, nb.add(0.62, nb.mul(tone, 0.45), nb.mul(nb.sub(figure, 0.5), 0.7), nb.mul(nb.sub(streak, 0.5), 0.5)))
    c = nb.mixc(nb.mul(pores, 0.75), c, pore)
    if kind != 'walnut':
        rays = nb.ss(nb.noise(nb.mapping(q, scale=(1, 0.25, 1)), 900, 1, 0.5, w=seed + 6), 0.70, 0.75)
        c = nb.mixc(nb.mul(rays, 0.25), c, (0.12, 0.05, 0.022))
    hand = _hand(nb, W)
    z = W.zones
    worn = nb.clamp(nb.add(nb.zone(*z['butt']), nb.mul(nb.zone(*z['cheek']), 0.8)))
    edge = nb.edge()
    nE = nb.noise(nb.P, 140, 4, 0.6, w=seed + 7)
    edgeW = nb.ss(nb.mul(edge, nb.add(0.3, nb.mul(nE, 1.2))), 0.30, 0.65)
    # dents and dings: small round dents plus short gouges
    dent = nb.ss(nb.vor(nb.P, 140, 'F1', 1.0), 0.11, 0.03)
    dent = nb.mul(dent, nb.ss(nb.noise(nb.P, 14, 2, 0.5, w=seed + 8), 0.62, 0.72))
    gouge = nb.scratches(500, 6, (25, 40, 10), 0.05, 0.16, seed + 3)
    scr = nb.scratches(900, 16, (5, 70, -20), 0.03, 0.22, seed + 9)
    scr = nb.mx(scr, nb.scratches(700, 12, (-60, 10, 35), 0.03, 0.18, seed + 19))
    cav = nb.cavity()
    # finish: oiled; hands darken and polish it; butt and comb worn back to lighter dry wood; edges and dings lighter
    c = nb.cmul(c, nb.lerp(hand, 1.0, 0.62))
    c = nb.mixc(nb.mul(worn, nb.add(0.4, nb.mul(nE, 0.6))), c, nb.cmul(nb.mixc(0.35, c, (0.20, 0.15, 0.10)), 1.55))
    c = nb.mixc(nb.mul(edgeW, 0.85), c, nb.cmul(nb.mixc(0.3, c, (0.22, 0.15, 0.09)), 1.7))
    c = nb.mixc(nb.mul(nb.mx(scr, gouge), 0.7), c, nb.cmul(c, 1.9))
    c = nb.mixc(nb.mul(dent, 0.5), c, nb.cmul(c, 0.7))
    c = nb.mixc(nb.mul(nb.ss(cav, 0.2, 0.9), 0.9), c, (0.020, 0.014, 0.010))
    r = nb.add(0.52, nb.mul(nb.sub(tone, 0.5), 0.16), nb.mul(latew, -0.04), nb.mul(pores, 0.08))
    r = nb.lerp(hand, r, 0.34)
    r = nb.lerp(nb.mul(worn, 0.8), r, 0.70)
    r = nb.lerp(edgeW, r, 0.68)
    r = nb.lerp(nb.mx(scr, gouge), r, 0.72)
    r = nb.lerp(nb.ss(cav, 0.2, 0.9), r, 0.85)
    h = nb.add(nb.mul(latew, -0.10), nb.mul(pores, -0.25), nb.mul(dent, -1.0), nb.mul(gouge, -0.8), nb.mul(scr, -0.35),
               nb.mul(nb.noise(nb.mapping(q, scale=(1, 0.06, 1)), 2200, 1, 0.5), 0.06))
    return nb.finish(c, r, 0.0, h, bump_dist=0.0005)

# ======================================================================================== soft goods and plastics
def leather(name, W, mask, seed=0.0, col=(0.040, 0.024, 0.014)):
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 30, 4, 0.6, w=seed)
    crease = nb.math('ABSOLUTE', nb.sub(nb.noise(nb.mapping(P, scale=(0.5, 1, 0.5)), 120, 3, 0.55, w=seed + 2), 0.5))
    crease = nb.ss(crease, 0.06, 0.0)
    grain = nb.vor(P, 1100, 'F1', 1.0)
    edge = nb.edge()
    edgeW = nb.ss(nb.mul(edge, nb.add(0.4, n1)), 0.25, 0.6)
    scr = nb.scratches(600, 8, (10, 60, 30), 0.04, 0.2, seed)
    c = nb.cmul(col, nb.add(0.75, nb.mul(n1, 0.5)))
    c = nb.mixc(nb.mul(crease, 0.6), c, nb.cmul(c, 0.55))
    c = nb.mixc(edgeW, c, (0.11, 0.07, 0.04))
    c = nb.mixc(nb.mul(scr, 0.6), c, (0.10, 0.065, 0.04))
    c = nb.mixc(nb.mul(nb.ss(nb.cavity(), 0.2, 0.9), 0.8), c, (0.03, 0.02, 0.012))
    r = nb.add(0.56, nb.mul(nb.sub(n1, 0.5), 0.2))
    r = nb.lerp(edgeW, r, 0.75)
    r = nb.lerp(crease, r, 0.70)
    h = nb.add(nb.mul(grain, 0.25), nb.mul(crease, -0.7), nb.mul(scr, -0.4))
    return nb.finish(c, r, 0.0, h, bump_dist=0.0005)

def canvas(name, W, mask, seed=0.0):
    nb = NB(name, mask)
    P = nb.P
    x, y, z = nb.xyz()
    k = 2 * math.pi / 0.0011
    wv = nb.add(nb.math('SINE', nb.mul(y, k)), nb.math('SINE', nb.mul(nb.add(x, z), k)))
    n1 = nb.noise(P, 25, 4, 0.6, w=seed)
    stain = nb.ss(nb.noise(P, 9, 3, 0.6, w=seed + 3), 0.5, 0.75)
    edge = nb.edge()
    c = nb.cmul((0.085, 0.072, 0.042), nb.add(0.80, nb.mul(n1, 0.4)))
    c = nb.mixc(nb.mul(stain, 0.7), c, (0.075, 0.065, 0.040))
    c = nb.mixc(nb.mul(edge, 0.7), c, (0.24, 0.21, 0.14))
    c = nb.mixc(nb.mul(nb.ss(nb.cavity(), 0.2, 0.9), 0.8), c, (0.04, 0.035, 0.025))
    r = nb.lerp(stain, 0.90, 0.78)
    return nb.finish(c, r, 0.0, nb.add(nb.mul(wv, 0.12), nb.mul(n1, 0.2)), bump_dist=0.0004)

def bakelite(name, W, mask, seed=0.0, col=(0.030, 0.015, 0.008)):
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 40, 5, 0.65, w=seed)
    n2 = nb.noise(P, 200, 3, 0.6, w=seed + 1)
    hand = _hand(nb, W)
    edge = nb.edge()
    edgeW = nb.ss(nb.mul(edge, nb.add(0.3, nb.mul(n2, 1.1))), 0.35, 0.7)
    scr = nb.scratch_set('Y', 1.0, along=0.4, fine=1.2, seed=seed)
    c = nb.cmul(col, nb.add(0.70, nb.mul(n1, 0.6)))
    c = nb.mixc(nb.mul(scr, 0.6), c, nb.cmul(col, 2.4))
    c = nb.mixc(edgeW, c, nb.cmul(col, 2.8))
    c = nb.mixc(nb.mul(nb.ss(nb.cavity(), 0.2, 0.9), 0.8), c, (0.05, 0.045, 0.035))
    r = nb.add(0.36, nb.mul(nb.sub(n1, 0.5), 0.15))
    r = nb.lerp(hand, r, 0.26)
    r = nb.lerp(nb.mul(scr, 0.8), r, 0.58)
    r = nb.lerp(edgeW, r, 0.62)
    r = nb.lerp(nb.ss(nb.cavity(), 0.2, 0.9), r, 0.8)
    h = nb.add(nb.mul(scr, -0.4), nb.mul(nb.noise(P, 900, 2, 0.5), 0.05))
    if W.kind == 'enemySmg':   # moulded grip frame: horizontal grip grooves on the pistol grip
        x, y, zz = nb.xyz()
        g = nb.math('ABSOLUTE', nb.math('SINE', nb.mul(zz, 2 * math.pi / 0.0045)))
        m = nb.mul(nb.ss(zz, -0.012, -0.020), nb.ss(zz, -0.105, -0.098))
        h = nb.add(h, nb.mul(nb.ss(g, 0.2, 0.8), m, nb.inv(nb.mul(hand, 0.4)), 0.8))
    return nb.finish(c, r, 0.0, h, bump_dist=0.0004)

def checkplastic(name, W, mask, seed=0.0):
    """Moulded brown grip panels with diamond checkering, flattened and polished where the palm sits."""
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 60, 4, 0.6, w=seed)
    hand = nb.zone(*W.zones['handR'])
    edge = nb.edge()
    ch = nb.checker('Y', 'Z', 0.00135)
    x, y, z = nb.xyz()
    face = nb.ss(nb.math('ABSOLUTE', x), 0.0135, 0.0148)
    chm = nb.mul(face, nb.inv(nb.ss(edge, 0.05, 0.3)))
    flat = nb.mul(hand, nb.ss(nb.noise(P, 80, 3, 0.5, w=seed + 3), 0.35, 0.6), 0.75)
    c = nb.cmul((0.060, 0.026, 0.012), nb.add(0.75, nb.mul(n1, 0.5)))
    c = nb.mixc(nb.mul(nb.inv(ch), chm, 0.6), c, (0.022, 0.011, 0.006))
    c = nb.mixc(nb.mul(edge, 0.8), c, (0.11, 0.06, 0.035))
    r = nb.lerp(flat, 0.48, 0.30)
    r = nb.lerp(nb.mul(nb.inv(ch), chm), r, 0.62)
    h = nb.mul(ch, chm, nb.inv(flat))
    return nb.finish(c, r, 0.0, h, bump_dist=0.00045)

def leatherstack(name, W, mask, seed=0.0):
    """Stacked leather washers: each ring its own shade, lacquered, dark in the grooves, polished by the palm."""
    nb = NB(name, mask)
    x, y, z = nb.xyz()
    rid = nb.math('FLOOR', nb.mul(nb.sub(y, 0.006), 1 / 0.0093))
    tint = nb.noise(nb.gray(nb.mul(rid, 1.37)), 1.0, 1, 0.5, w=seed)
    fib = nb.noise(nb.mapping(nb.P, scale=(1, 0.2, 1)), 700, 3, 0.6, w=seed + 1)
    c = nb.mixc(tint, (0.115, 0.052, 0.022), (0.060, 0.028, 0.013))
    c = nb.cmul(c, nb.add(0.8, nb.mul(fib, 0.4)))
    c = nb.mixc(nb.mul(nb.ss(nb.cavity(), 0.1, 0.8), 0.9), c, (0.02, 0.012, 0.007))
    c = nb.mixc(nb.mul(nb.edge(), 0.6), c, (0.17, 0.10, 0.05))
    r = nb.lerp(nb.zone(*W.zones['handR']), 0.55, 0.40)
    return nb.finish(c, r, 0.0, nb.mul(fib, 0.3), bump_dist=0.0004)

def leatherette(name, W, mask, seed=0.0):
    nb = NB(name, mask)
    P = nb.P
    peb = nb.vor(P, 650, 'F1', 1.0)
    n1 = nb.noise(P, 40, 3, 0.6, w=seed)
    edgeW = nb.ss(nb.mul(nb.edge(), nb.add(0.4, n1)), 0.3, 0.6)
    c = nb.cmul((0.026, 0.025, 0.024), nb.add(0.85, nb.mul(n1, 0.3)))
    c = nb.mixc(edgeW, c, (0.09, 0.085, 0.08))
    r = nb.lerp(edgeW, 0.66, 0.42)
    return nb.finish(c, r, 0.0, nb.mul(peb, 0.6), bump_dist=0.0004)

def paint(name, W, mask, seed=0.0, col=(0.060, 0.066, 0.030), rough=0.62, under='steel'):
    """Painted metal: chips on edges and knocks show dark steel (or brass for the black enamel), rust in chips."""
    nb = NB(name, mask)
    P = nb.P
    n1 = nb.noise(P, 30, 4, 0.6, w=seed)
    n2 = nb.noise(P, 220, 4, 0.6, w=seed + 2)
    edge = nb.edge()
    chips = nb.ss(nb.add(nb.mul(edge, nb.add(0.2, nb.mul(n2, 1.2))), nb.mul(nb.ss(nb.noise(P, 90, 5, 0.7, w=seed + 5), 0.68, 0.74), 0.8)), 0.45, 0.62)
    scuff = nb.scratch_set(_axis(W), 0.9, along=0.3, fine=1.0, seed=seed)
    rustIn = nb.mul(chips, nb.ss(nb.noise(P, 150, 3, 0.6, w=seed + 7), 0.45, 0.7))
    if under == 'brass':
        bare = (0.72, 0.58, 0.36)
    else:
        bare = (0.42, 0.42, 0.41)
    c = nb.cmul(col, nb.add(0.80, nb.mul(n1, 0.4)))
    c = nb.mixc(nb.mul(scuff, 0.5), c, nb.cmul(col, 1.8))
    c = nb.mixc(chips, c, bare)
    c = nb.mixc(nb.mul(rustIn, 0.8), c, (0.10, 0.042, 0.018))
    c = nb.mixc(nb.mul(nb.ss(nb.cavity(), 0.2, 0.9), 0.85), c, (0.03, 0.028, 0.02))
    r = nb.add(rough, nb.mul(nb.sub(n1, 0.5), 0.12))
    r = nb.lerp(nb.mul(scuff, 0.6), r, rough + 0.12)
    r = nb.lerp(chips, r, 0.32)
    r = nb.lerp(rustIn, r, 0.85)
    metal = nb.clamp(nb.sub(chips, rustIn))
    h = nb.add(nb.mul(chips, -0.6), nb.mul(scuff, -0.3), nb.mul(nb.noise(P, 1500, 2, 0.6), 0.08))
    if W.kind == 'grenade':   # pineapple grooves: darker, dirtier
        x, y, z = nb.xyz()
        th = nb.math('ARCTAN2', y, x)
        col_g = nb.math('POWER', nb.math('ABSOLUTE', nb.math('COSINE', nb.mul(th, 4.0))), 18.0)
        row_g = nb.math('POWER', nb.math('ABSOLUTE', nb.math('COSINE', nb.mul(nb.add(z, 0.040), 5 * math.pi / 0.0835))), 18.0)
        g = nb.mul(nb.mx(col_g, row_g), nb.ss(z, 0.040, 0.036), nb.ss(z, -0.039, -0.035))
        c = nb.mixc(nb.mul(g, 0.7), c, (0.020, 0.020, 0.012))
        h = nb.add(h, nb.mul(g, -1.0))
    return nb.finish(c, r, metal, h, bump_dist=0.0004)

def blade(name, W, mask, seed=0.0):
    """Parkerized blade with a honed bright edge, fine sharpening scratches along the edge."""
    nb = NB(name, mask)
    P = nb.P
    x, y, z = nb.xyz()
    hone = nb.ss(nb.math('ABSOLUTE', x), 0.00085, 0.0004)
    n1 = nb.noise(P, 30, 4, 0.55, w=seed)
    scr = nb.scratch_set('Y', 1.0, along=1.6, seed=seed)
    sharp = nb.mul(hone, nb.ss(nb.scratches(3000, 40, (0, 0, 0), 0.08, 0.6, seed + 4), 0.0, 1.0))
    c = nb.mixc(n1, (0.052, 0.055, 0.050), (0.075, 0.078, 0.072))
    c = nb.mixc(nb.mul(scr, 0.85), c, (0.45, 0.45, 0.44))
    c = nb.mixc(hone, c, (0.60, 0.60, 0.58))
    c = nb.mixc(nb.mul(nb.edge(), 0.8), c, (0.55, 0.55, 0.53))
    r = nb.lerp(hone, 0.66, 0.20)
    r = nb.lerp(nb.mul(scr, 0.8), r, 0.30)
    metal = nb.clamp(nb.add(hone, nb.mul(scr, 0.9), nb.edge()))
    return nb.finish(c, r, metal, nb.add(nb.mul(scr, -0.5), nb.mul(sharp, -0.4)), bump_dist=0.0003)

def make(t, name, W, mask, seed=0.0):
    if t == 'blued': return blued(name, W, mask, seed)
    if t == 'park': return parkerized(name, W, mask, seed, serr=W.zones.get('serr'))
    if t == 'steel': return steel(name, W, mask, seed)
    if t == 'brass': return brass(name, W, mask, seed)
    if t == 'wood': return wood(name, W, mask, seed, 'walnut')
    if t == 'wood2': return wood(name, W, mask, seed, 'beech')
    if t == 'leather': return leather(name, W, mask, seed)
    if t == 'canvas': return canvas(name, W, mask, seed)
    if t == 'bakelite': return bakelite(name, W, mask, seed, (0.020, 0.011, 0.007) if W.kind == 'mg' else (0.030, 0.015, 0.008))
    if t == 'checkplastic': return checkplastic(name, W, mask, seed)
    if t == 'leatherstack': return leatherstack(name, W, mask, seed)
    if t == 'leatherette': return leatherette(name, W, mask, seed)
    if t == 'paint_od': return paint(name, W, mask, seed, (0.058, 0.064, 0.030), 0.62)
    if t == 'paint_grey': return paint(name, W, mask, seed, (0.090, 0.094, 0.086), 0.66)
    if t == 'paint_black': return paint(name, W, mask, seed, (0.020, 0.020, 0.021), 0.42, under='brass')
    if t == 'blade': return blade(name, W, mask, seed)
    raise ValueError(t)
