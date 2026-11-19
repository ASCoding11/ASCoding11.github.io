# Weapon builders. Each returns a Weapon: named parts (each a list of (object, material type)), empties and
# pivots, in the Blender weapon frame (barrel -Y, up +Z, right side -X, origin at the right-hand grip, metres).
# Shapes follow real period small arms by proportion; no markings of any kind are modelled.
import math
from mathutils import Vector
import geo as G

class Weapon:
    def __init__(self, kind, hi=True):
        self.kind = kind; self.hi = hi
        self.parts = {}          # part name -> [(obj, mat)]
        self.pivots = {}         # part name -> pivot point (moving parts get an empty there)
        self.empties = {}        # suffix -> (location, forward vector or None)
        self.gripL = (0, -0.3, 0)
        self.zones = {}          # wear zones for the materials (hand areas, etc.)
        self.uvscale = {}        # part name -> uv island scale factor
    def add(self, ob, mat, part='body'):
        self.parts.setdefault(part, []).append((ob, mat))
        return ob
    def n(self, hi, lo):
        return hi if self.hi else lo

BORE = 0.020

# =====================================================================================================
def rifle_scoped(hi=True):
    """Bolt-action service rifle with a pistol-grip stock and a telescopic sight on a one-piece base
    (proportions of the 1903-pattern sniper rifles). Overall 1.09 m."""
    W = Weapon('rifleScoped' if hi else 'rifleScopedLod', hi)
    N = W.n
    # ---------------- stock (walnut)
    S = [
        dict(y=-0.489, zt=0.0085, zb=-0.006, w=0.020, e=2.2),
        dict(y=-0.484, zt=0.0115, zb=-0.0135, w=0.029, et=3.2, eb=2.4),
        dict(y=-0.40, zt=0.0120, zb=-0.0165, w=0.0315, et=3.4, eb=2.4),
        dict(y=-0.30, zt=0.0120, zb=-0.0185, w=0.0335, et=3.4, eb=2.4),
        dict(y=-0.225, zt=0.0130, zb=-0.0205, w=0.0355, et=3.4, eb=2.4),
        dict(y=-0.190, zt=0.0175, zb=-0.0250, w=0.0395, et=3.4, eb=2.6),
        dict(y=-0.140, zt=0.0200, zb=-0.0385, w=0.0410, et=3.4, eb=2.8),
        dict(y=-0.060, zt=0.0200, zb=-0.0395, w=0.0410, et=3.4, eb=2.8),
        dict(y=-0.025, zt=0.0180, zb=-0.0350, w=0.0385, et=3.0, eb=2.6),
        dict(y=0.008, zt=0.0110, zb=-0.0360, w=0.0350, et=2.8, eb=2.4),
        dict(y=0.035, zt=0.0045, zb=-0.0500, w=0.0315, et=2.6, eb=2.3),
        dict(y=0.060, zt=0.0030, zb=-0.0670, w=0.0325, et=2.6, eb=2.3),
        dict(y=0.078, zt=0.0050, zb=-0.0770, w=0.0335, et=2.6, eb=2.4),
        dict(y=0.094, zt=0.0120, zb=-0.0735, w=0.0355, et=2.6, eb=2.6),
        dict(y=0.112, zt=0.0215, zb=-0.0745, w=0.0375, et=2.6, eb=2.6),
        dict(y=0.160, zt=0.0255, zb=-0.0800, w=0.0395, et=2.8, eb=2.6),
        dict(y=0.240, zt=0.0280, zb=-0.0900, w=0.0410, et=2.8, eb=2.6),
        dict(y=0.330, zt=0.0300, zb=-0.1010, w=0.0420, et=2.9, eb=2.6),
        dict(y=0.3515, zt=0.0305, zb=-0.1035, w=0.0425, et=3.0, eb=2.7),
    ]
    if not hi:
        S = [S[i] for i in (0, 1, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18)]
    stock = G.loft_y('stock', S, n=N(30, 12))
    W.add(stock, 'wood')
    # butt plate (steel, checkered in the material), slightly proud of the wood
    last = dict(S[-1]); bp = []
    for dy, grow in ((0.0, 0.0006), (0.0045, 0.0006), (0.0062, -0.0006)):
        st = dict(last); st['y'] = last['y'] + dy
        st['zt'] += grow + 0.0005; st['zb'] -= grow + 0.0005; st['w'] += 2 * grow
        bp.append(st)
    W.add(G.loft_y('buttplate', bp, n=N(30, 12)), 'blued')
    # hand guard (walnut) over the barrel from the receiver ring to the upper band
    HG = [dict(y=-0.468, zt=0.0310, zb=0.0110, w=0.0255, et=2.1, eb=6),
          dict(y=-0.455, zt=0.0335, zb=0.0110, w=0.0290, et=2.1, eb=6),
          dict(y=-0.205, zt=0.0345, zb=0.0110, w=0.0300, et=2.1, eb=6),
          dict(y=-0.192, zt=0.0310, zb=0.0110, w=0.0290, et=2.1, eb=6)]
    W.add(G.loft_y('handguard', HG, n=N(22, 10)), 'wood')
    # ---------------- barrel (lathe, with crown and bore)
    bprof = [(0.0040, -0.700), (0.0040, -0.7275), (0.0052, -0.7305), (0.0078, -0.7305), (0.0083, -0.7290),
             (0.0083, -0.700), (0.0088, -0.600), (0.0093, -0.470), (0.0100, -0.330), (0.0108, -0.250),
             (0.0118, -0.215), (0.0134, -0.200), (0.0134, -0.170)]
    if not hi:
        bprof = [(0.0040, -0.71), (0.0040, -0.7305), (0.0083, -0.7305), (0.0093, -0.470), (0.0134, -0.200), (0.0134, -0.170)]
    W.add(G.lathe('barrel', bprof, n=N(28, 8), axis='Y', center=(0, 0, BORE), cap0=True, cap1=True), 'blued')
    # ---------------- receiver: round body, front ring, rear bridge, open top between them, bolt way
    rcv = G.lathe('receiver', [(0.0168, 0.028), (0.0168, -0.130), (0.0178, -0.133), (0.0178, -0.178), (0.0170, -0.180)],
                  n=N(28, 12), axis='Y', center=(0, 0, BORE), cap0=True, cap1=True)
    if hi:
        G.boolean(rcv, G.cyl('boltway', 0.0102, 0.04, -0.17, c=(0, 0, BORE), n=24))
        G.boolean(rcv, G.box('cutTop', (-0.012, -0.067, BORE + 0.022), (0.036, 0.110, 0.03), bev=0.0))
        G.boolean(rcv, G.box('cutRight', (-0.018, -0.067, BORE + 0.016), (0.03, 0.110, 0.03), bev=0.0))
        G.boolean(rcv, G.box('cutHandle', (-0.018, 0.0, BORE + 0.010), (0.022, 0.016, 0.03), bev=0.0))
        G.boolean(rcv, G.cyl('thumbcut', 0.010, -0.03, 0.03, axis='X', c=(0.0, -0.075, BORE + 0.026), n=16))
        G.bevel(rcv, 0.0006, seg=1, angle=40)
    W.add(rcv, 'blued')
    # receiver tang along the wrist top
    W.add(G.plate('tang', [(0.020, 0.0020), (0.088, 0.0020), (0.094, 0.0050), (0.088, 0.0065), (0.020, 0.0090)],
                  -0.0055, 0.0055, bev=0.0008), 'blued')
    # ---------------- bolt (moving part): body, extractor, sleeve, cocking piece, safety, bent handle
    bolt = []
    bolt.append(G.lathe('boltBody', [(0.0084, -0.118), (0.0088, -0.114), (0.0088, 0.040), (0.0105, 0.042),
                                     (0.0108, 0.072), (0.0080, 0.076), (0.0075, 0.090), (0.0083, 0.093), (0.0083, 0.099), (0.0070, 0.1005)],
                        n=N(22, 10), axis='Y', center=(0, 0, BORE), cap0=True, cap1=True))
    if hi:
        bolt.append(G.box('extractor', (-0.0072, -0.060, BORE + 0.0035), (0.0035, 0.100, 0.0060), bev=0.0007))
        bolt.append(G.plate('safety', [(0.050, 0.0), (0.066, 0.0), (0.066, 0.004), (0.058, 0.008), (0.050, 0.004)],
                            -0.0015, 0.0015, bev=0.0005))
        G.move(bolt[-1], (-0.006, 0, BORE + 0.0095))
    arm = G.bezier([(-0.0075, 0.004, BORE + 0.001), (-0.034, 0.002, BORE + 0.001), (-0.046, 0.010, BORE - 0.012), (-0.050, 0.019, BORE - 0.021)], N(8, 4))
    bolt.append(G.sweep('boltArm', arm, [dict(w=0.0085, h=0.0070, e=2.4)] * len(arm), n=N(10, 6)))
    bolt.append(G.sphere('boltKnob', 0.0090, c=(-0.0515, 0.0205, BORE - 0.0245), n=N(16, 8), m=N(10, 6), sx=1.0, sy=1.05, sz=1.12))
    for o in bolt:
        W.add(o, 'steel', 'bolt')
    W.pivots['bolt'] = (0, 0, BORE)
    # ---------------- trigger guard + floorplate, trigger
    W.add(G.plate('floorplate', [(-0.124, -0.0360), (-0.030, -0.0360), (-0.030, -0.0425), (-0.118, -0.0425), (-0.124, -0.040)],
                  -0.0115, 0.0115, bev=0.0012, seg=2), 'blued')
    gp = G.bezier([(0, -0.031, -0.038), (0, -0.026, -0.060), (0, 0.012, -0.062), (0, 0.023, -0.038)], N(12, 6))
    W.add(G.sweep('guardbow', gp, dict(w=0.0034, h=0.0095, e=3.0), n=N(10, 6), up=Vector((1, 0, 0))), 'blued')
    if hi:
        for y in (-0.118, 0.019):
            W.add(G.cyl('gscrew', 0.0032, -0.0435, -0.0445, axis='Z', c=(0, y, 0), n=12), 'blued')
    tp = G.bezier([(0, -0.0045, -0.030), (0, -0.0060, -0.044), (0, -0.0030, -0.052), (0, 0.0015, -0.0555)], N(6, 3))
    W.add(G.sweep('trigger', tp, [dict(w=0.0042, h=0.0060, e=3.0)] * (len(tp) - 1) + [dict(w=0.003, h=0.0055, e=3.0)],
                  n=8, up=Vector((1, 0, 0))), 'steel', 'trigger')
    W.pivots['trigger'] = (0, -0.0045, -0.031)
    # ---------------- bands, bayonet lug, sling swivels
    def band(y0, y1, zt, zb, w, name):
        st = [dict(y=y0, zt=zt - 0.0008, zb=zb + 0.0008, w=w - 0.0016, e=3.0), dict(y=y0 + 0.0012, zt=zt, zb=zb, w=w, e=3.0),
              dict(y=y1 - 0.0012, zt=zt, zb=zb, w=w, e=3.0), dict(y=y1, zt=zt - 0.0008, zb=zb + 0.0008, w=w - 0.0016, e=3.0)]
        return G.loft_y(name, st, n=N(26, 12))
    W.add(band(-0.338, -0.326, 0.0362, -0.0200, 0.0352, 'lowerBand'), 'blued')
    W.add(band(-0.4915, -0.455, 0.0350, -0.0180, 0.0335, 'upperBand'), 'blued')
    W.add(G.lathe('nose', [(0.0090, -0.4795), (0.0108, -0.4800), (0.0108, -0.4950), (0.0094, -0.4975)],
                  n=N(20, 10), axis='Y', center=(0, 0, BORE), cap0=False, cap1=False, closed=True), 'blued')
    W.add(G.box('bayLug', (0, -0.489, 0.0060), (0.0060, 0.020, 0.0080), bev=0.001), 'blued')
    def swivel(y, z, name, part):
        base = G.box(name + 'Stud', (0, y, z + 0.003), (0.008, 0.012, 0.006), bev=0.0012)
        loop = G.sweep(name + 'Loop', [(-0.016, y, z - 0.002), (-0.017, y, z - 0.012), (-0.012, y, z - 0.015), (0.012, y, z - 0.015),
                                        (0.017, y, z - 0.012), (0.016, y, z - 0.002), (0.0, y, z + 0.001)],
                       dict(w=0.0034, h=0.0034, e=2.0), n=8, closed=True)
        W.add(base, 'blued', part); W.add(loop, 'blued', part)
    swivel(-0.466, -0.0185, 'swF', 'body')
    # rear swivel: on the butt underside
    swivel(0.255, -0.0935, 'swR', 'body')
    # ---------------- scope: tube with eyepiece and objective bells, turret saddle, turrets, rings, one-piece base
    SZ = 0.0745
    sprof = [(0.0118, 0.1110), (0.0122, 0.1150), (0.0150, 0.1185), (0.0166, 0.1172), (0.0168, 0.0960), (0.0162, 0.0935),
             (0.0168, 0.0905), (0.0168, 0.0740), (0.0150, 0.0650), (0.0120, 0.0540), (0.0112, 0.0460),
             (0.0112, -0.1640), (0.0118, -0.1700), (0.0144, -0.1880), (0.0150, -0.2060), (0.0155, -0.2085),
             (0.0153, -0.2125), (0.0132, -0.2135), (0.0127, -0.2085)]
    if not hi:
        sprof = [(0.0122, 0.114), (0.0168, 0.1172), (0.0168, 0.074), (0.0112, 0.050), (0.0112, -0.166), (0.0150, -0.206), (0.0153, -0.2125), (0.0127, -0.209)]
    W.add(G.lathe('scopeTube', sprof, n=N(36, 10), axis='Y', center=(0, 0, SZ), cap0=True, cap1=True), 'blued')
    sad = [dict(y=-0.050, zt=SZ + 0.0118, zb=SZ - 0.0118, w=0.0236, e=2.0), dict(y=-0.046, zt=SZ + 0.0132, zb=SZ - 0.0132, w=0.0262, e=2.6),
           dict(y=-0.014, zt=SZ + 0.0132, zb=SZ - 0.0132, w=0.0262, e=2.6), dict(y=-0.010, zt=SZ + 0.0118, zb=SZ - 0.0118, w=0.0236, e=2.0)]
    W.add(G.loft_y('saddle', sad, n=N(24, 8)), 'blued')
    tur = [(0.0, 0.0), (0.0088, 0.0), (0.0088, 0.0085), (0.0094, 0.0090), (0.0094, 0.0150), (0.0086, 0.0158), (0.0, 0.0158)]
    t1 = G.lathe('turretE', [(r, z + 0.0115) for r, z in tur], n=N(24, 10), axis='Z', center=(0, -0.030, SZ))
    t2 = G.lathe('turretW', [(r, -(z + 0.0115)) for r, z in tur], n=N(24, 10), axis='X', center=(0, -0.030, SZ))
    W.add(t1, 'blued'); W.add(t2, 'blued')
    def ring(y, name):
        if not hi:
            W.add(G.box(name, (0, y, SZ - 0.006), (0.030, 0.009, 0.034), bev=0.002), 'blued'); return
        r = G.lathe(name, [(0.0112, y + 0.0048), (0.0142, y + 0.0048), (0.0148, y + 0.0030), (0.0148, y - 0.0030),
                           (0.0142, y - 0.0048), (0.0112, y - 0.0048)], n=N(28, 12), axis='Y', center=(0, 0, SZ), cap0=False, cap1=False, closed=True)
        G.fix_normals(r)
        W.add(r, 'blued')
        W.add(G.box(name + 'Leg', (0, y, 0.0525), (0.0120, 0.0094, 0.0130), bev=0.0012), 'blued')
        W.add(G.box(name + 'Ears', (0, y, SZ), (0.0350, 0.0090, 0.0072), bev=0.0014), 'blued')
        if hi:
            for s in (-1, 1):
                W.add(G.cyl(name + 'Screw', 0.0028, 0.0175 * s, 0.0195 * s, axis='X', c=(0, y, SZ), n=10), 'blued')
    ring(0.031, 'ringR'); ring(-0.106, 'ringF')
    base = [dict(y=-0.170, zt=0.0455, zb=0.0350, w=0.0150, e=3.5), dict(y=-0.165, zt=0.0470, zb=0.0340, w=0.0185, e=4.0),
            dict(y=-0.130, zt=0.0470, zb=0.0350, w=0.0185, e=4.0), dict(y=-0.120, zt=0.0470, zb=0.0400, w=0.0160, e=4.0),
            dict(y=-0.010, zt=0.0470, zb=0.0400, w=0.0160, e=4.0), dict(y=0.000, zt=0.0470, zb=0.0340, w=0.0200, e=4.0),
            dict(y=0.040, zt=0.0470, zb=0.0340, w=0.0200, e=4.0), dict(y=0.044, zt=0.0450, zb=0.0350, w=0.0160, e=3.5)]
    W.add(G.loft_y('base', base, n=N(16, 8)), 'blued')
    if hi:
        for s in (-1, 1):   # rear windage screws, one each side of the rear ring
            W.add(G.cyl('windScrew', 0.0047, 0.0100 * s, 0.0160 * s, axis='X', c=(0, 0.031, 0.0420), n=14), 'blued')
    # lenses (separate nodes, glass)
    W.add(G.cyl('lensRear', 0.0121, 0.1112, 0.1104, c=(0, 0, SZ), n=N(28, 12)), 'glass', 'scopeLensRear')
    W.add(G.cyl('lensFront', 0.0127, -0.2083, -0.2075, c=(0, 0, SZ), n=N(28, 12)), 'glass', 'scopeLensFront')
    # ---------------- sling (leather, 1.25 in), front loop doubled back through a keeper, brass hook
    yF, zF = -0.466, -0.0335
    yR, zR = 0.255, -0.1085
    pts = []
    K = N(26, 10)
    for i in range(K + 1):
        t = i / K
        y = yF + (yR - yF) * t
        z = zF + (zR - zF) * t - 0.030 * 4 * t * (1 - t) ** 1.3
        pts.append((0.0, y, z))
    sl = [dict(w=0.0030, h=0.0310, e=6.0)] * len(pts)
    W.add(G.sweep('sling', pts, sl, n=N(10, 6), up=Vector((1, 0, 0))), 'leather', 'sling')
    if hi:
        # doubled strap from the front swivel back to the hook
        d = [(0.0, yF + 0.002, zF + 0.0035)]
        for i in range(1, 9):
            t = i / 8 * 0.20
            y = yF + (yR - yF) * t
            z = zF + (zR - zF) * t - 0.030 * 4 * t * (1 - t) ** 1.3 + 0.0034
            d.append((0.0, y, z))
        W.add(G.sweep('slingD', d, [dict(w=0.0028, h=0.0300, e=6.0)] * len(d), n=8, up=Vector((1, 0, 0))), 'leather', 'sling')
        # keepers
        for t in (0.045, 0.16):
            y = yF + (yR - yF) * t
            z = zF + (zR - zF) * t - 0.030 * 4 * t * (1 - t) ** 1.3 + 0.0017
            ang = math.degrees(math.atan2(zR - zF, yR - yF))
            k = G.loft_y('keeper', [dict(y=y - 0.006, zt=z + 0.0045, zb=z - 0.0045, w=0.0345, e=8),
                                    dict(y=y + 0.006, zt=z + 0.0045, zb=z - 0.0045, w=0.0345, e=8)], n=16)
            G.rot(k, ang * 0.9, 'X', (0, y, z))
            W.add(k, 'leather', 'sling')
        hy = yF + (yR - yF) * 0.205
        hz = zF + (zR - zF) * 0.205 - 0.030 * 4 * 0.205 * (0.795) ** 1.3 + 0.0042
        hk = G.box('hook', (0, hy, hz), (0.020, 0.010, 0.0032), bev=0.0012)
        W.add(hk, 'brass', 'sling')
    # ---------------- empties
    W.empties['muzzle'] = ((0, -0.7305, BORE), (0, -1, 0))
    W.empties['ejection'] = ((-0.012, -0.066, BORE + 0.010), (-1, 0, 0.6))
    W.empties['scopeEye'] = ((0, 0.118 + 0.080, SZ), (0, -1, 0))
    W.gripL = (0, -0.300, 0.0)
    W.zones = dict(handR=((0, 0.050, -0.030), (0.030, 0.050, 0.045)), handL=((0, -0.300, 0.000), (0.030, 0.075, 0.040)),
                   cheek=((0.02, 0.200, 0.025), (0.025, 0.110, 0.020)), butt=((0, 0.352, -0.035), (0.04, 0.012, 0.09)),
                   slide=(0, 1, 0))
    W.uvscale = {'bolt': 1.5, 'trigger': 1.2, 'sling': 0.55}
    return W


# =====================================================================================================
def smg(hi=True):
    """.45 submachine gun of the 1942-pattern simplified type: square receiver, horizontal fore-end, plain
    barrel, fixed peep sight with protective ears, side cocking knob, 30-round stick magazine. Overall 0.81 m."""
    W = Weapon('smg' if hi else 'smgLod', hi)
    N = W.n
    B = 0.025
    # upper receiver: square section, rounded corners; hollow with ejection port and cocking slot on the right
    R = [dict(y=-0.172, zt=0.0445, zb=0.0005, w=0.0330, e=5.5), dict(y=-0.168, zt=0.0455, zb=0.0, w=0.0345, e=6),
         dict(y=0.074, zt=0.0455, zb=0.0, w=0.0345, e=6), dict(y=0.079, zt=0.0440, zb=0.0010, w=0.0330, e=5.5)]
    rcv = G.loft_y('receiver', R, n=N(40, 12))
    if hi:
        G.boolean(rcv, G.box('inner', (0, -0.04, 0.0230), (0.0260, 0.230, 0.0330), bev=0.0))
        G.boolean(rcv, G.box('port', (-0.016, -0.090, 0.0265), (0.012, 0.050, 0.0190), bev=0.002))
        G.boolean(rcv, G.box('slot', (-0.016, -0.005, 0.0335), (0.012, 0.118, 0.0050), bev=0.0))
        G.boolean(rcv, G.box('topGroove', (0, -0.050, 0.0462), (0.0060, 0.200, 0.0030), bev=0.0))
        G.bevel(rcv, 0.0007, seg=2, angle=40)
    W.add(rcv, 'park')
    # trigger frame
    F = [dict(y=-0.120, zt=0.0020, zb=-0.0240, w=0.0290, e=5), dict(y=-0.116, zt=0.0020, zb=-0.0270, w=0.0310, e=6),
         dict(y=0.072, zt=0.0020, zb=-0.0270, w=0.0310, e=6), dict(y=0.077, zt=0.0020, zb=-0.0240, w=0.0290, e=5)]
    fr = G.loft_y('frame', F, n=N(36, 10))
    if hi:
        G.bevel(fr, 0.0007, seg=2, angle=40)
        G.boolean(fr, G.box('magway', (0, -0.088, -0.012), (0.0240, 0.0420, 0.04), bev=0.0))
    W.add(fr, 'park')
    gp = G.bezier([(0, 0.012, -0.026), (0, 0.006, -0.050), (0, -0.040, -0.052), (0, -0.056, -0.026)], N(12, 6))
    W.add(G.sweep('guard', gp, dict(w=0.0036, h=0.0105, e=3.0), n=N(10, 6), up=Vector((1, 0, 0))), 'park')
    # stock mount plate, buttstock (walnut), butt plate
    W.add(G.box('stockMount', (0, 0.082, 0.018), (0.032, 0.008, 0.044), bev=0.0018), 'park')
    S = [dict(y=0.0855, zt=0.0400, zb=-0.0040, w=0.0300, e=3.0), dict(y=0.110, zt=0.0390, zb=-0.0150, w=0.0330, e=3.0),
         dict(y=0.180, zt=0.0360, zb=-0.0410, w=0.0360, et=2.9, eb=2.7), dict(y=0.270, zt=0.0335, zb=-0.0700, w=0.0385, et=2.9, eb=2.7),
         dict(y=0.3575, zt=0.0320, zb=-0.0935, w=0.0400, et=3.0, eb=2.8)]
    if hi:
        S = [S[0], S[1], dict(y=0.140, zt=0.0375, zb=-0.0270, w=0.0345, e=3.0), S[2], dict(y=0.225, zt=0.0348, zb=-0.0555, w=0.0372, et=2.9, eb=2.7), S[3], dict(y=0.330, zt=0.0326, zb=-0.0860, w=0.0396, et=3.0, eb=2.8), S[4]]
    W.add(G.loft_y('stock', S, n=N(44, 12)), 'wood')
    last = S[-1]; bp = []
    for dy, g in ((0.0, 0.0006), (0.0045, 0.0006), (0.0060, -0.0005)):
        st = dict(last); st['y'] = last['y'] + dy; st['zt'] += g + 0.0005; st['zb'] -= g + 0.0005; st['w'] += 2 * g; bp.append(st)
    W.add(G.loft_y('buttplate', bp, n=N(36, 12)), 'park')
    if hi:
        for z in (0.010, -0.060):
            W.add(G.cyl('bpScrew', 0.0034, last['y'] + 0.0060, last['y'] + 0.0072, c=(0, 0, z), n=12), 'park')
        W.add(G.cyl('stockBolt', 0.0042, -0.0170, -0.0195, axis='X', c=(0, 0.095, 0.020), n=12), 'park')
    # pistol grip (walnut), swept back about 17 degrees
    gpath = G.bezier([(0, 0.030, -0.018), (0, 0.040, -0.060), (0, 0.054, -0.100), (0, 0.060, -0.118)], N(10, 5))
    secs = []
    for i in range(len(gpath)):
        t = i / (len(gpath) - 1)
        secs.append(dict(w=0.044 - 0.004 * t, h=0.0300 + 0.0015 * math.sin(t * math.pi), e=2.5))
    grip = G.sweep('grip', gpath, secs, n=N(32, 10), up=Vector((1, 0, 0)))
    W.add(grip, 'wood')
    # barrel with collar and crown, front sight blade
    bp_ = [(0.0057, -0.420), (0.0057, -0.4385), (0.0072, -0.4410), (0.0098, -0.4410), (0.0105, -0.4395), (0.0105, -0.188),
           (0.0138, -0.186), (0.0138, -0.170)]
    if not hi:
        bp_ = [(0.0057, -0.43), (0.0057, -0.441), (0.0105, -0.441), (0.0105, -0.188), (0.0138, -0.186), (0.0138, -0.170)]
    W.add(G.lathe('barrel', bp_, n=N(32, 10), axis='Y', center=(0, 0, B), cap0=True, cap1=True), 'park')
    W.add(G.plate('fsight', [(-0.4300, B + 0.0090), (-0.4200, B + 0.0090), (-0.4235, B + 0.0185), (-0.4285, B + 0.0185)],
                  -0.0012, 0.0012, bev=0.0004), 'park')
    W.add(G.plate('fsBase', [(-0.436, B + 0.0080), (-0.414, B + 0.0080), (-0.416, B + 0.0115), (-0.434, B + 0.0115)],
                  -0.0040, 0.0040, bev=0.0006), 'park')
    # fore-end (walnut) under the barrel
    FE = [dict(y=-0.3255, zt=0.0120, zb=-0.0060, w=0.0230, e=2.4), dict(y=-0.321, zt=0.0160, zb=-0.0140, w=0.0310, et=3.5, eb=2.4),
          dict(y=-0.250, zt=0.0165, zb=-0.0165, w=0.0330, et=3.5, eb=2.4), dict(y=-0.190, zt=0.0170, zb=-0.0150, w=0.0335, et=3.5, eb=2.5),
          dict(y=-0.176, zt=0.0160, zb=-0.0080, w=0.0310, et=3.5, eb=2.5)]
    W.add(G.loft_y('foreend', FE, n=N(40, 10)), 'wood')
    W.add(G.box('feBracket', (0, -0.173, 0.006), (0.030, 0.006, 0.018), bev=0.0012), 'park')
    # rear sight: base, two protective ears, aperture blade
    W.add(G.box('rsBase', (0, 0.050, 0.0475), (0.0160, 0.024, 0.0040), bev=0.0010), 'park')
    for s in (-1, 1):
        W.add(G.plate('rsEar', [(0.040, 0.049), (0.062, 0.049), (0.058, 0.0640), (0.050, 0.0660), (0.044, 0.0600)],
                      s * 0.0055, s * 0.0078, bev=0.0005), 'park')
    ap = G.plate('rsBlade', [(-0.0050, 0.049), (0.0050, 0.049), (0.0050, 0.0620), (-0.0050, 0.0620)], 0.0525, 0.0545, bev=0.0004, axis='Y')
    if hi:
        G.boolean(ap, G.cyl('peep', 0.0011, -0.01, 0.01, axis='Y', c=(0, 0.053, 0.0585), n=10))
    W.add(ap, 'park')
    # selector and safety levers, magazine catch (left side, +X)
    if hi:
        for y, z, a in ((0.030, -0.010, 25), (0.000, -0.012, -20)):
            lv = G.plate('lever', [(y - 0.003, z - 0.003), (y + 0.003, z - 0.003), (y + 0.0035, z + 0.004), (y - 0.0025, z + 0.016), (y - 0.006, z + 0.014)],
                         0.0155, 0.0180, bev=0.0006)
            G.rot(lv, a, 'X', (0, y, z)); W.add(lv, 'park')
            W.add(G.cyl('leverPin', 0.0032, 0.0155, 0.0185, axis='X', c=(0, y, z), n=10), 'park')
        W.add(G.box('magCatch', (0.0165, -0.060, -0.016), (0.003, 0.010, 0.012), bev=0.0008), 'park')
        # bolt (moving) visible through the port, cocked to the rear
        W.add(G.box('boltB', (0, -0.012, 0.0235), (0.0245, 0.110, 0.0300), bev=0.0015), 'steel', 'bolt')
        W.pivots['bolt'] = (0, -0.012, 0.0235)
    # cocking knob (moving with the bolt), right side
    W.add(G.cyl('cockStem', 0.0030, -0.0160, -0.0240, axis='X', c=(0, 0.040, 0.0335), n=10), 'steel', 'charging')
    W.add(G.lathe('cockKnob', [(0.0, -0.0225), (0.0060, -0.0225), (0.0068, -0.0262), (0.0060, -0.0310), (0.0, -0.0318)],
                  n=N(16, 8), axis='X', center=(0, 0.040, 0.0335)), 'steel', 'charging')
    W.pivots['charging'] = (-0.020, 0.040, 0.0335)
    # trigger
    tp = G.bezier([(0, -0.0130, -0.024), (0, -0.0140, -0.036), (0, -0.0110, -0.044), (0, -0.0065, -0.0475)], N(6, 3))
    W.add(G.sweep('trigger', tp, dict(w=0.0042, h=0.0062, e=3.0), n=8, up=Vector((1, 0, 0))), 'steel', 'trigger')
    W.pivots['trigger'] = (0, -0.013, -0.022)
    # 30-round stick magazine
    my0, my1 = -0.108, -0.068
    mag = G.loft_y('magBody', [dict(y=my0, zt=0.0, zb=-0.236, w=0.0228, e=8), dict(y=my1, zt=0.0, zb=-0.236, w=0.0228, e=8)], n=N(24, 8))
    if hi:
        for sx in (-1, 1):   # stamped stiffening ribs on both sides
            for yy in (-0.097, -0.079):
                rb = G.loft_y('rib', [dict(y=yy - 0.003, zt=-0.030, zb=-0.215, w=0.0010, e=2, x=sx * 0.0114), dict(y=yy + 0.003, zt=-0.030, zb=-0.215, w=0.0010, e=2, x=sx * 0.0114)], n=8)
                mag = G.join([mag, rb], 'magBody')
    W.add(mag, 'park', 'mag')
    W.add(G.box('magFloor', (0, -0.088, -0.2385), (0.0250, 0.0430, 0.0040), bev=0.0012), 'park', 'mag')
    W.pivots['mag'] = (0, -0.088, -0.020)
    # sling swivels (left side) and canvas sling
    for y, z in ((-0.300, 0.000), (0.300, -0.030)):
        W.add(G.box('swBase', (0.0195, y, z), (0.004, 0.010, 0.008), bev=0.0010), 'park')
        W.add(G.sweep('swLoop', [(0.022, y, z + 0.0), (0.026, y - 0.016, z + 0.002), (0.026, y - 0.016, z - 0.004), (0.022, y, z - 0.002),
                                 (0.026, y + 0.016, z - 0.004), (0.026, y + 0.016, z + 0.002)], dict(w=0.003, h=0.003), n=6, closed=True), 'park')
    pts = []
    K = N(40, 9)
    for i in range(K + 1):
        t = i / K
        y = -0.300 + 0.600 * t
        z = -0.006 + (-0.034 + 0.006) * t - 0.125 * math.sin(math.pi * t) ** 1.2
        x = 0.0275 + 0.004 * math.sin(math.pi * t)
        pts.append((x, y, z))
    W.add(G.sweep('sling', pts, dict(w=0.0030, h=0.0300, e=6.0), n=N(12, 6), up=Vector((1, 0, 0))), 'canvas', 'sling')
    if hi:   # brass adjusting buckle and the doubled strap end near the rear swivel
        i0 = int(K * 0.72); p0 = Vector(pts[i0]); p1 = Vector(pts[i0 + 1]); d = (p1 - p0).normalized()
        bk = G.loft_y('buckle', [dict(y=-0.009, zt=0.0030, zb=-0.0030, w=0.0360, e=10), dict(y=0.009, zt=0.0030, zb=-0.0030, w=0.0360, e=10)], n=16)
        G.boolean(bk, G.box('bkHole', (0, 0, 0), (0.030, 0.012, 0.02), bev=0.0))
        G.rot(bk, 90, 'Y'); G.rot(bk, math.degrees(math.atan2(d.z, d.y)), 'X'); G.move(bk, p0)
        W.add(bk, 'brass', 'sling')
        dbl = [tuple(Vector(q) + Vector((0.0032, 0, 0))) for q in pts[i0:]]
        W.add(G.sweep('slingD', dbl, dict(w=0.0028, h=0.0295, e=6.0), n=12, up=Vector((1, 0, 0))), 'canvas', 'sling')
    W.empties['muzzle'] = ((0, -0.441, B), (0, -1, 0))
    W.empties['ejection'] = ((-0.019, -0.090, 0.030), (-1, 0, 0.5))
    W.gripL = (0, -0.245, 0.0)
    W.zones = dict(handR=((0, 0.045, -0.065), (0.030, 0.035, 0.060)), handL=((0, -0.250, 0.0), (0.030, 0.070, 0.035)),
                   cheek=((0.02, 0.200, 0.030), (0.025, 0.11, 0.02)), butt=((0, 0.36, -0.03), (0.04, 0.012, 0.08)), slide=(0, 1, 0))
    W.uvscale = {'mag': 0.8, 'sling': 0.5, 'charging': 1.5}
    return W

# =====================================================================================================
def pistol(hi=True):
    """.45 service pistol of the 1911 pattern: slide with rear grasping grooves, spur hammer, grip safety,
    thumb safety, slide stop, checkered grips, arched mainspring housing, lanyard loop. Overall 0.216 m."""
    W = Weapon('pistol', hi)
    B = 0.0185
    # slide (moving: 'bolt')
    SL = [dict(y=-0.1720, zt=0.0285, zb=0.0050, w=0.0225, et=3.2, eb=10), dict(y=-0.1680, zt=0.0300, zb=0.0045, w=0.0235, et=3.2, eb=10),
          dict(y=0.0330, zt=0.0300, zb=0.0045, w=0.0235, et=3.2, eb=10), dict(y=0.0365, zt=0.0290, zb=0.0050, w=0.0225, et=3.2, eb=10)]
    slide = G.loft_y('slide', SL, n=40)
    G.boolean(slide, G.box('port', (-0.0100, -0.020, 0.0255), (0.012, 0.0300, 0.0140), bev=0.0015))
    G.boolean(slide, G.cyl('muzHole', 0.0072, -0.18, -0.16, c=(0, 0, B), n=20))
    G.boolean(slide, G.cyl('plugHole', 0.0050, -0.18, -0.16, c=(0, 0, 0.0085), n=14))
    G.bevel(slide, 0.0005, seg=1, angle=40)
    W.add(slide, 'park', 'bolt')
    W.add(G.plate('fSight', [(-0.1640, 0.0295), (-0.1550, 0.0295), (-0.1575, 0.0350), (-0.1620, 0.0350)], -0.0012, 0.0012, bev=0.0003), 'park', 'bolt')
    rs = G.box('rSight', (0, 0.0245, 0.0322), (0.0100, 0.0060, 0.0050), bev=0.0006)
    G.boolean(rs, G.box('notch', (0, 0.0245, 0.0345), (0.0022, 0.010, 0.004), bev=0.0))
    W.add(rs, 'park', 'bolt')
    W.add(G.lathe('bushing', [(0.0060, -0.1700), (0.0080, -0.1700), (0.0080, -0.1745), (0.0060, -0.1745)], n=20, axis='Y', center=(0, 0, B), cap0=False, cap1=False, closed=True), 'park', 'bolt')
    W.pivots['bolt'] = (0, 0, B)
    # barrel (static) and recoil spring plug
    W.add(G.lathe('barrel', [(0.0057, -0.150), (0.0057, -0.1735), (0.0063, -0.1745), (0.0060, -0.1745), (0.0060, -0.150)],
                  n=20, axis='Y', center=(0, 0, B), cap0=True, cap1=False, closed=True), 'steel')
    W.add(G.lathe('barrelHood', [(0.0062, -0.045), (0.0062, -0.0), (0.0, -0.0)], n=16, axis='Y', center=(0, 0, B)), 'steel')
    W.add(G.cyl('plug', 0.0044, -0.150, -0.1730, c=(0, 0, 0.0085), n=14), 'park')
    # frame: dust cover/rails, grip frame (arched mainspring housing), trigger guard
    W.add(G.loft_y('rail', [dict(y=-0.1230, zt=0.0060, zb=-0.0040, w=0.0190, e=2.6), dict(y=-0.1180, zt=0.0060, zb=-0.0080, w=0.0215, e=5),
                            dict(y=-0.0550, zt=0.0060, zb=-0.0120, w=0.0215, e=8), dict(y=0.0340, zt=0.0060, zb=-0.0120, w=0.0215, e=8)], n=20), 'park')
    gf = [(0.0000, -0.0110), (0.0050, -0.0400), (0.0300, -0.1125), (0.0800, -0.1125), (0.0812, -0.1080), (0.0790, -0.0880),
          (0.0740, -0.0600), (0.0640, -0.0300), (0.0560, -0.0110), (0.0480, 0.0010), (0.0340, 0.0060), (0.0020, 0.0060)]
    W.add(G.plate('gripFrame', gf, -0.0108, 0.0108, bev=0.0016, seg=3), 'park')
    gpath = G.bezier([(0, -0.0010, -0.0115), (0, -0.0110, -0.0330), (0, -0.0480, -0.0320), (0, -0.0560, -0.0110)], 10)
    W.add(G.sweep('guard', gpath, dict(w=0.0032, h=0.0098, e=3.0), n=12, up=Vector((1, 0, 0))), 'park')
    # grip panels (both sides), screws
    pan = [(0.0060, -0.0170), (0.0090, -0.0300), (0.0300, -0.1060), (0.0730, -0.1060), (0.0700, -0.0700), (0.0590, -0.0300), (0.0520, -0.0170)]
    for s in (-1, 1):
        p = G.plate('panel', pan, s * 0.0100, s * 0.0150, bev=0.0018, seg=4)
        W.add(p, 'checkplastic')
        for y, z in ((0.0140, -0.0260), (0.0430, -0.0960)):
            W.add(G.lathe('screw', [(0.0, 0.0), (0.0030, 0.0), (0.0030, 0.0008), (0.0022, 0.0016), (0.0, 0.0017)], n=10, axis='X',
                          center=(s * 0.0148, y, z), sx=1, sz=1) if s > 0 else
                  G.lathe('screw', [(0.0, 0.0), (0.0030, 0.0), (0.0030, -0.0008), (0.0022, -0.0016), (0.0, -0.0017)], n=10, axis='X', center=(-0.0148, y, z)), 'park')
    # hammer (moving), grip safety tang, thumb safety, slide stop, magazine catch, lanyard loop
    hm = G.plate('hammer', [(0.0330, 0.0000), (0.0420, 0.0000), (0.0470, 0.0150), (0.0520, 0.0230), (0.0500, 0.0260), (0.0430, 0.0215),
                            (0.0360, 0.0120)], -0.0032, 0.0032, bev=0.0006)
    W.add(hm, 'steel', 'hammer'); W.pivots['hammer'] = (0, 0.0370, 0.0020)
    W.add(G.plate('gsafety', [(0.0480, 0.0010), (0.0700, -0.0010), (0.0720, -0.0050), (0.0640, -0.0110), (0.0560, -0.0300), (0.0500, -0.0300)],
                  -0.0085, 0.0085, bev=0.0016, seg=2), 'park')
    W.add(G.plate('tsafety', [(0.0300, -0.0040), (0.0400, -0.0040), (0.0400, 0.0040), (0.0200, 0.0060), (0.0140, 0.0040), (0.0300, 0.0010)],
                  0.0108, 0.0128, bev=0.0005), 'park')
    W.add(G.plate('sstop', [(-0.0480, -0.0060), (-0.0260, -0.0060), (-0.0230, 0.0000), (-0.0300, 0.0030), (-0.0480, -0.0010)],
                  0.0108, 0.0124, bev=0.0005), 'park')
    W.add(G.cyl('sstopPin', 0.0024, -0.0110, -0.0118, axis='X', c=(0, -0.0430, -0.0030), n=10), 'park')
    W.add(G.cyl('magCatch', 0.0038, 0.0108, 0.0128, axis='X', c=(0, 0.0045, -0.0175), n=12), 'park')
    W.add(G.torus('lanyard', 0.0035, 0.0010, c=(0, 0.0805, -0.1160), axis='X', n=10, m=5), 'park')
    # trigger (slides straight back)
    W.add(G.plate('trigger', [(-0.0215, -0.0110), (-0.0165, -0.0110), (-0.0160, -0.0240), (-0.0190, -0.0262), (-0.0225, -0.0250)],
                  -0.0045, 0.0045, bev=0.0006), 'steel', 'trigger')
    W.pivots['trigger'] = (0, -0.019, -0.012)
    # magazine (moving), mostly hidden in the grip: floor plate shows at the bottom
    mg = G.plate('magBody', [(0.0070, -0.0100), (0.0400, -0.0100), (0.0700, -0.1120), (0.0360, -0.1120)], -0.0090, 0.0090, bev=0.0008)
    W.add(mg, 'park', 'mag')
    W.add(G.plate('magFloor', [(0.0330, -0.1125), (0.0750, -0.1125), (0.0760, -0.1170), (0.0320, -0.1170)], -0.0100, 0.0100, bev=0.0012), 'steel', 'mag')
    W.pivots['mag'] = (0, 0.040, -0.060)
    W.empties['muzzle'] = ((0, -0.1745, B), (0, -1, 0))
    W.empties['ejection'] = ((-0.012, -0.020, 0.028), (-1, 0, 0.6))
    W.zones = dict(handR=((0, 0.045, -0.060), (0.03, 0.045, 0.060)), handL=((0, 0.030, -0.070), (0.03, 0.04, 0.05)),
                   cheek=((0, 0, 0), (0.001, 0.001, 0.001)), butt=((0, 0, 0), (0.001, 0.001, 0.001)), slide=(0, 1, 0))
    W.uvscale = {}
    return W

# =====================================================================================================
def enemy_rifle(hi=True):
    """Short bolt-action rifle of the 1935-pattern carbine type: straight stock with sling slot and disc, turned-down
    bolt, tangent rear sight, hooded front sight, nose cap with bayonet lug and cleaning rod. Overall 1.11 m."""
    W = Weapon('enemyRifle', hi)
    S = [dict(y=-0.468, zt=0.0110, zb=-0.0130, w=0.0300, et=3.0, eb=2.4), dict(y=-0.400, zt=0.0120, zb=-0.0170, w=0.0320, et=3.2, eb=2.4),
         dict(y=-0.220, zt=0.0130, zb=-0.0220, w=0.0350, et=3.2, eb=2.4), dict(y=-0.185, zt=0.0185, zb=-0.0270, w=0.0400, et=3.2, eb=2.6),
         dict(y=-0.130, zt=0.0200, zb=-0.0380, w=0.0410, et=3.2, eb=2.8), dict(y=-0.050, zt=0.0200, zb=-0.0390, w=0.0410, et=3.2, eb=2.8),
         dict(y=0.005, zt=0.0110, zb=-0.0360, w=0.0350, et=2.8, eb=2.4), dict(y=0.035, zt=0.0045, zb=-0.0480, w=0.0315, et=2.6, eb=2.3),
         dict(y=0.065, zt=0.0050, zb=-0.0640, w=0.0330, et=2.6, eb=2.3), dict(y=0.085, zt=0.0120, zb=-0.0700, w=0.0360, et=2.6, eb=2.5),
         dict(y=0.120, zt=0.0200, zb=-0.0760, w=0.0380, et=2.7, eb=2.6), dict(y=0.250, zt=0.0250, zb=-0.0960, w=0.0410, et=2.8, eb=2.6),
         dict(y=0.3605, zt=0.0280, zb=-0.1120, w=0.0425, et=3.0, eb=2.7)]
    stock = G.loft_y('stock', S, n=16)
    G.boolean(stock, G.box('slingSlot', (0, 0.230, -0.074), (0.06, 0.030, 0.0085), bev=0.003))
    W.add(stock, 'wood2')
    W.add(G.cyl('disc', 0.0120, -0.0205, -0.0225, axis='X', c=(0, 0.250, -0.040), n=14), 'blued')
    last = S[-1]; bp = []
    for dy, g in ((0.0, 0.0008), (0.005, 0.0008), (0.0068, -0.0004)):
        st = dict(last); st['y'] = last['y'] + dy; st['zt'] += g + 0.0005; st['zb'] -= g + 0.0005; st['w'] += 2 * g; bp.append(st)
    W.add(G.loft_y('buttplate', bp, n=16), 'blued')
    W.add(G.loft_y('handguard', [dict(y=-0.415, zt=0.0310, zb=0.0110, w=0.0260, et=2.1, eb=6), dict(y=-0.405, zt=0.0330, zb=0.0110, w=0.0290, et=2.1, eb=6),
                                 dict(y=-0.278, zt=0.0335, zb=0.0110, w=0.0295, et=2.1, eb=6), dict(y=-0.270, zt=0.0310, zb=0.0110, w=0.0270, et=2.1, eb=6)], n=12), 'wood2')
    W.add(G.lathe('barrel', [(0.0040, -0.725), (0.0040, -0.745), (0.0080, -0.745), (0.0082, -0.700), (0.0092, -0.480), (0.0105, -0.300),
                             (0.0125, -0.265), (0.0150, -0.255), (0.0150, -0.195), (0.0135, -0.190), (0.0135, -0.170)],
                  n=14, axis='Y', center=(0, 0, BORE), cap0=True, cap1=True), 'blued')
    rcv = G.lathe('receiver', [(0.0165, 0.028), (0.0165, -0.130), (0.0175, -0.133), (0.0175, -0.178), (0.0165, -0.181)], n=16, axis='Y',
                  center=(0, 0, BORE), cap0=True, cap1=True)
    G.boolean(rcv, G.cyl('boltway', 0.0100, 0.04, -0.17, c=(0, 0, BORE), n=14))
    G.boolean(rcv, G.box('cutTop', (-0.010, -0.067, BORE + 0.022), (0.034, 0.110, 0.03), bev=0.0))
    W.add(rcv, 'blued')
    W.add(G.plate('tang', [(0.020, 0.0020), (0.090, 0.0020), (0.094, 0.0050), (0.020, 0.0090)], -0.0055, 0.0055, bev=0.0008), 'blued')
    bolt = [G.lathe('boltBody', [(0.0085, -0.118), (0.0087, -0.114), (0.0087, 0.040), (0.0108, 0.042), (0.0110, 0.074), (0.0078, 0.080),
                                 (0.0078, 0.094), (0.0060, 0.097)], n=12, axis='Y', center=(0, 0, BORE), cap0=True, cap1=True),
            G.plate('wingSafety', [(0.060, 0.0), (0.070, 0.0), (0.070, 0.012), (0.064, 0.014), (0.060, 0.006)], -0.0012, 0.0012, bev=0.0004)]
    G.move(bolt[1], (0, 0, BORE + 0.009))
    arm = G.bezier([(-0.0075, 0.003, BORE), (-0.028, 0.003, BORE), (-0.036, 0.006, BORE - 0.016), (-0.038, 0.010, BORE - 0.030)], 4)
    bolt.append(G.sweep('boltArm', arm, dict(w=0.0082, h=0.0068, e=2.4), n=6))
    bolt.append(G.sphere('boltKnob', 0.0098, c=(-0.0385, 0.011, BORE - 0.036), n=10, m=7))
    for o in bolt:
        W.add(o, 'steel', 'bolt')
    W.pivots['bolt'] = (0, 0, BORE)
    W.add(G.plate('floorplate', [(-0.124, -0.0365), (-0.030, -0.0365), (-0.030, -0.0425), (-0.118, -0.0425), (-0.124, -0.040)],
                  -0.0115, 0.0115, bev=0.0012), 'blued')
    gp = G.bezier([(0, -0.031, -0.038), (0, -0.026, -0.060), (0, 0.012, -0.062), (0, 0.023, -0.038)], 7)
    W.add(G.sweep('guardbow', gp, dict(w=0.0034, h=0.0095, e=3.0), n=6, up=Vector((1, 0, 0))), 'blued')
    tp = G.bezier([(0, -0.0045, -0.030), (0, -0.0060, -0.044), (0, -0.0030, -0.052), (0, 0.0015, -0.0555)], 3)
    W.add(G.sweep('trigger', tp, dict(w=0.0040, h=0.0058, e=3.0), n=6, up=Vector((1, 0, 0))), 'steel', 'trigger')
    W.pivots['trigger'] = (0, -0.0045, -0.031)
    # tangent rear sight: base on the barrel, leaf hinged at its front
    W.add(G.box('rsBase', (0, -0.228, BORE + 0.0135), (0.0200, 0.048, 0.0080), bev=0.0015), 'blued')
    W.add(G.plate('rsLeaf', [(-0.252, 0.0), (-0.200, 0.0), (-0.200, 0.0035), (-0.252, 0.0030)], -0.0085, 0.0085, bev=0.0006), 'blued', 'sightRear')
    G.move(W.parts['sightRear'][-1][0], (0, 0, BORE + 0.0175))
    W.pivots['sightRear'] = (0, -0.250, BORE + 0.0175)
    # bands, nose cap with bayonet lug, cleaning rod, front sight with hood
    def band(y0, y1, zt, zb, w, name, n=16):
        st = [dict(y=y0, zt=zt - 0.0008, zb=zb + 0.0008, w=w - 0.0016, e=3.0), dict(y=y0 + 0.0012, zt=zt, zb=zb, w=w, e=3.0),
              dict(y=y1 - 0.0012, zt=zt, zb=zb, w=w, e=3.0), dict(y=y1, zt=zt - 0.0008, zb=zb + 0.0008, w=w - 0.0016, e=3.0)]
        return G.loft_y(name, st, n=n)
    W.add(band(-0.423, -0.410, 0.0350, -0.0190, 0.0340, 'lowerBand'), 'blued')
    W.add(G.box('slingBar', (0.0195, -0.416, -0.006), (0.004, 0.026, 0.006), bev=0.0012), 'blued')
    W.add(band(-0.505, -0.468, 0.0300, -0.0140, 0.0310, 'nosecap'), 'blued')
    W.add(G.box('bayLug', (0, -0.495, -0.0145), (0.0070, 0.040, 0.0070), bev=0.0012), 'blued')
    W.add(G.cyl('cleaningRod', 0.0030, -0.505, -0.523, c=(0, 0, -0.0055), n=8), 'steel')
    W.add(G.lathe('rodHead', [(0.0, -0.5230), (0.0042, -0.5225), (0.0042, -0.5300), (0.0, -0.5305)], n=8, axis='Y', center=(0, 0, -0.0055)), 'steel')
    W.add(G.lathe('fsRing', [(0.0082, -0.705), (0.0105, -0.705), (0.0105, -0.728), (0.0082, -0.728)], n=14, axis='Y', center=(0, 0, BORE), closed=True), 'blued')
    W.add(G.plate('fsPost', [(-0.7230, BORE + 0.0090), (-0.7140, BORE + 0.0090), (-0.7175, BORE + 0.0200), (-0.7205, BORE + 0.0200)], -0.0010, 0.0010, bev=0.0003), 'blued')
    hood = G.sweep('fsHood', [(0.0115, -0.7165, BORE + 0.006), (0.0118, -0.7165, BORE + 0.020), (0.0, -0.7165, BORE + 0.0285), (-0.0118, -0.7165, BORE + 0.020), (-0.0115, -0.7165, BORE + 0.006)],
                   dict(w=0.0015, h=0.020, e=8), n=6, up=Vector((0, 1, 0)))
    W.add(hood, 'blued')
    # leather sling: slot in the butt to the bar on the lower band (left side)
    pts = []
    for i in range(13):
        t = i / 12
        y = -0.416 + (0.230 + 0.416) * t
        z = -0.010 + (-0.074 + 0.010) * t - 0.055 * math.sin(math.pi * t)
        pts.append((0.0235 - 0.005 * t, y, z))
    W.add(G.sweep('sling', pts, dict(w=0.0030, h=0.0240, e=6), n=6, up=Vector((1, 0, 0))), 'leather', 'sling')
    W.empties['muzzle'] = ((0, -0.745, BORE), (0, -1, 0))
    W.empties['ejection'] = ((-0.012, -0.066, BORE + 0.010), (-1, 0, 0.6))
    W.gripL = (0, -0.290, 0.0)
    W.zones = dict(handR=((0, 0.050, -0.030), (0.030, 0.050, 0.045)), handL=((0, -0.290, 0.000), (0.030, 0.075, 0.040)),
                   cheek=((0.02, 0.200, 0.022), (0.025, 0.110, 0.020)), butt=((0, 0.36, -0.04), (0.04, 0.012, 0.09)), slide=(0, 1, 0))
    W.uvscale = {'sling': 0.5}
    return W

# =====================================================================================================
def enemy_smg(hi=True):
    """9 mm submachine gun of the 1940-pattern type: round receiver tube, moulded grip frame, ribbed magazine housing,
    underfolding steel stock (extended), barrel rest under the muzzle end, hooded front sight, flip rear sight. 0.83 m."""
    W = Weapon('enemySmg', hi)
    B = 0.028
    W.add(G.lathe('tube', [(0.0, 0.036), (0.0160, 0.036), (0.0185, 0.032), (0.0185, -0.168), (0.0200, -0.170), (0.0200, -0.186), (0.0130, -0.190)],
                  n=18, axis='Y', center=(0, 0, B), cap1=True), 'blued')
    W.add(G.lathe('barrel', [(0.0045, -0.395), (0.0045, -0.4100), (0.0085, -0.4100), (0.0090, -0.360), (0.0095, -0.190)], n=14, axis='Y',
                  center=(0, 0, B), cap0=True, cap1=True), 'blued')
    # barrel rest under the barrel
    W.add(G.plate('rest', [(-0.236, B - 0.006), (-0.206, B - 0.006), (-0.206, B - 0.0095), (-0.214, B - 0.026), (-0.236, B - 0.026)],
                  -0.0050, 0.0050, bev=0.0012), 'bakelite')
    # front sight with hood
    W.add(G.lathe('fsRing', [(0.0088, -0.388), (0.0110, -0.388), (0.0110, -0.404), (0.0088, -0.404)], n=12, axis='Y', center=(0, 0, B), closed=True), 'blued')
    W.add(G.plate('fsPost', [(-0.400, B + 0.009), (-0.392, B + 0.009), (-0.3945, B + 0.019), (-0.3975, B + 0.019)], -0.0010, 0.0010, bev=0.0003), 'blued')
    W.add(G.sweep('fsHood', [(0.0110, -0.396, B + 0.006), (0.0115, -0.396, B + 0.019), (0.0, -0.396, B + 0.0265), (-0.0115, -0.396, B + 0.019), (-0.0110, -0.396, B + 0.006)],
                  dict(w=0.0015, h=0.016, e=8), n=6, up=Vector((0, 1, 0))), 'blued')
    # grip frame (moulded) with pistol grip, trigger guard
    W.add(G.plate('frame', [(-0.075, 0.0120), (0.060, 0.0120), (0.060, -0.0040), (0.040, -0.0140), (-0.075, -0.0080)], -0.0145, 0.0145, bev=0.0025, seg=2), 'bakelite')
    gpath = G.bezier([(0, 0.032, -0.006), (0, 0.040, -0.050), (0, 0.050, -0.090), (0, 0.054, -0.108)], 7)
    W.add(G.sweep('grip', gpath, [dict(w=0.040, h=0.029, e=2.6)] * len(gpath), n=12, up=Vector((1, 0, 0))), 'bakelite')
    gp = G.bezier([(0, 0.016, -0.010), (0, 0.010, -0.034), (0, -0.034, -0.036), (0, -0.046, -0.010)], 7)
    W.add(G.sweep('guard', gp, dict(w=0.0034, h=0.0090, e=3.0), n=6, up=Vector((1, 0, 0))), 'blued')
    tp = G.bezier([(0, -0.012, -0.010), (0, -0.013, -0.022), (0, -0.010, -0.029), (0, -0.006, -0.032)], 3)
    W.add(G.sweep('trigger', tp, dict(w=0.0040, h=0.0058, e=3.0), n=6, up=Vector((1, 0, 0))), 'steel', 'trigger')
    W.pivots['trigger'] = (0, -0.012, -0.008)
    # magazine housing and magazine
    W.add(G.loft_y('magwell', [dict(y=-0.135, zt=0.016, zb=-0.060, w=0.0270, e=7), dict(y=-0.090, zt=0.016, zb=-0.060, w=0.0270, e=7)], n=12), 'blued')
    W.add(G.box('magwellLip', (0, -0.1125, -0.0605), (0.0300, 0.0480, 0.0050), bev=0.0012), 'blued')
    W.add(G.box('magRelease', (0.0160, -0.1125, -0.040), (0.0050, 0.010, 0.010), bev=0.0012), 'blued')
    W.add(G.loft_y('mag', [dict(y=-0.130, zt=-0.040, zb=-0.255, w=0.0225, e=8), dict(y=-0.095, zt=-0.040, zb=-0.255, w=0.0225, e=8)], n=12), 'blued', 'mag')
    W.add(G.box('magFloor', (0, -0.1125, -0.2570), (0.0245, 0.0380, 0.0040), bev=0.0012), 'blued', 'mag')
    W.pivots['mag'] = (0, -0.1125, -0.050)
    # flip rear sight
    W.add(G.box('rsBase', (0, -0.020, B + 0.0195), (0.0130, 0.020, 0.0040), bev=0.0010), 'blued')
    W.add(G.plate('rsLeaf', [(-0.014, 0.0), (-0.010, 0.0), (-0.011, 0.0110), (-0.014, 0.0110)], -0.0055, 0.0055, bev=0.0004), 'blued', 'sightRear')
    G.move(W.parts['sightRear'][-1][0], (0, 0, B + 0.0215))
    W.pivots['sightRear'] = (0, -0.012, B + 0.0215)
    # cocking handle on the left, in its slot, cocked to the rear
    W.add(G.box('slotRail', (0.0175, -0.065, B + 0.004), (0.0030, 0.150, 0.0060), bev=0.0006), 'park')
    W.add(G.cyl('cockStem', 0.0030, 0.0175, 0.0290, axis='X', c=(0, 0.010, B + 0.004), n=8), 'steel', 'charging')
    W.add(G.sphere('cockKnob', 0.0062, c=(0.0310, 0.010, B + 0.004), n=10, m=6, sx=1.2), 'steel', 'charging')
    W.pivots['charging'] = (0.020, 0.010, B + 0.004)
    # underfolding stock, extended: two flat struts and a curved butt plate
    for s in (-1, 1):
        W.add(G.sweep('strut', [(s * 0.0135, 0.055, 0.004), (s * 0.0140, 0.200, -0.006), (s * 0.0130, 0.352, -0.016)],
                      dict(w=0.0040, h=0.0110, e=5), n=6, up=Vector((1, 0, 0))), 'blued')
    W.add(G.box('stockHinge', (0, 0.058, 0.004), (0.031, 0.012, 0.014), bev=0.002), 'blued')
    bpath = G.bezier([(0, 0.356, -0.068), (0, 0.364, -0.030), (0, 0.360, 0.012)], 6)
    W.add(G.sweep('buttPad', bpath, dict(w=0.0045, h=0.034, e=6), n=8, up=Vector((1, 0, 0))), 'blued')
    W.add(G.box('stockCross', (0, 0.352, -0.016), (0.028, 0.008, 0.012), bev=0.0015), 'blued')
    W.empties['muzzle'] = ((0, -0.410, B), (0, -1, 0))
    W.empties['ejection'] = ((-0.019, -0.100, B + 0.006), (-1, 0, 0.4))
    W.gripL = (0, -0.130, -0.040)
    W.zones = dict(handR=((0, 0.045, -0.055), (0.030, 0.035, 0.055)), handL=((0, -0.112, -0.040), (0.030, 0.040, 0.040)),
                   cheek=((0, 0.2, 0.0), (0.001, 0.001, 0.001)), butt=((0, 0.36, -0.03), (0.04, 0.012, 0.05)), slide=(0, 1, 0))
    W.uvscale = {}
    return W

# =====================================================================================================
def mg(hi=True):
    """General-purpose belt-fed machine gun of the 1942 type: slotted rectangular barrel jacket with barrel-change port,
    muzzle booster, feed cover and tray, moulded stock and grip, folding bipod (folded back along the jacket). 1.22 m."""
    W = Weapon('mg', hi)
    B = 0.030
    W.add(G.loft_y('receiver', [dict(y=-0.165, zt=0.058, zb=-0.004, w=0.0480, e=7), dict(y=0.160, zt=0.058, zb=-0.004, w=0.0480, e=7),
                                 dict(y=0.168, zt=0.054, zb=0.000, w=0.0440, e=6)], n=16), 'blued')
    # feed cover (hinged at the rear) and feed tray with belt guide on the left
    W.add(G.loft_y('cover', [dict(y=-0.150, zt=0.068, zb=0.056, w=0.0440, et=2.6, eb=8), dict(y=-0.140, zt=0.074, zb=0.056, w=0.0460, et=2.6, eb=8),
                              dict(y=0.035, zt=0.074, zb=0.056, w=0.0460, et=2.6, eb=8), dict(y=0.045, zt=0.066, zb=0.056, w=0.0440, et=2.6, eb=8)], n=14), 'blued', 'cover')
    W.pivots['cover'] = (0, 0.040, 0.060)
    W.add(G.box('feedTray', (0.034, -0.080, 0.040), (0.026, 0.060, 0.008), bev=0.0015), 'blued')
    W.add(G.box('feedTrayR', (-0.030, -0.080, 0.040), (0.014, 0.050, 0.008), bev=0.0015), 'blued')
    # rear buffer, stock (moulded) and grip
    W.add(G.cyl('buffer', 0.0180, 0.160, 0.190, c=(0, 0, 0.030), n=14), 'blued')
    S = [dict(y=0.188, zt=0.0520, zb=0.0050, w=0.0380, e=4), dict(y=0.260, zt=0.0520, zb=-0.0300, w=0.0400, e=4),
         dict(y=0.400, zt=0.0500, zb=-0.0700, w=0.0420, e=4), dict(y=0.470, zt=0.0500, zb=-0.0850, w=0.0440, e=4),
         dict(y=0.478, zt=0.0480, zb=-0.0830, w=0.0420, e=4)]
    W.add(G.loft_y('stock', S, n=14), 'bakelite')
    W.add(G.box('triggerHousing', (0, 0.020, -0.012), (0.034, 0.090, 0.018), bev=0.002), 'blued')
    gpath = G.bezier([(0, 0.030, -0.018), (0, 0.038, -0.060), (0, 0.048, -0.100), (0, 0.052, -0.118)], 6)
    W.add(G.sweep('grip', gpath, dict(w=0.042, h=0.030, e=2.6), n=12, up=Vector((1, 0, 0))), 'bakelite')
    gp = G.bezier([(0, 0.016, -0.020), (0, 0.010, -0.044), (0, -0.032, -0.046), (0, -0.044, -0.020)], 6)
    W.add(G.sweep('guard', gp, dict(w=0.0036, h=0.010, e=3.0), n=6, up=Vector((1, 0, 0))), 'blued')
    tp = G.bezier([(0, -0.010, -0.020), (0, -0.012, -0.032), (0, -0.009, -0.040), (0, -0.005, -0.043)], 3)
    W.add(G.sweep('trigger', tp, dict(w=0.0040, h=0.0060, e=3.0), n=6, up=Vector((1, 0, 0))), 'steel', 'trigger')
    W.pivots['trigger'] = (0, -0.010, -0.018)
    # barrel jacket: hollow, oval cooling slots on top and left, long barrel-change port on the right
    J = [dict(y=-0.610, zt=B + 0.024, zb=B - 0.024, w=0.0440, e=5), dict(y=-0.170, zt=B + 0.026, zb=B - 0.026, w=0.0480, e=5)]
    jac = G.loft_y('jacket', J, n=16, cap0=True, cap1=True)
    G.boolean(jac, G.loft_y('jin', [dict(y=-0.62, zt=B + 0.0215, zb=B - 0.0215, w=0.0395, e=5), dict(y=-0.18, zt=B + 0.0235, zb=B - 0.0235, w=0.0435, e=5)], n=12))
    cut = []
    for i in range(6):
        y = -0.225 - i * 0.060
        cut.append(G.sweep('slotT', [(0, y + 0.018, B + 0.03), (0, y - 0.018, B + 0.03)], dict(w=0.020, h=0.03, e=2.0), n=8, up=Vector((0, 0, 1))))
        for z in (B - 0.010, B + 0.010):
            cut.append(G.sweep('slotL', [(0.03, y + 0.017, z), (0.03, y - 0.017, z)], dict(w=0.010, h=0.03, e=2.0), n=8, up=Vector((1, 0, 0))))
    cut.append(G.box('port', (-0.03, -0.285, B), (0.03, 0.180, 0.030), bev=0.004))
    cu = G.join(cut, 'cutters')
    G.boolean(jac, cu)
    W.add(jac, 'blued')
    W.add(G.cyl('barrel', 0.0105, -0.172, -0.612, c=(0, 0, B), n=12), 'blued')
    W.add(G.lathe('booster', [(0.0045, -0.680), (0.0045, -0.6935), (0.0150, -0.6935), (0.0175, -0.688), (0.0220, -0.640), (0.0225, -0.612),
                              (0.0245, -0.606)], n=16, axis='Y', center=(0, 0, B), cap0=True, cap1=True), 'blued')
    W.add(G.plate('fsight', [(-0.598, B + 0.024), (-0.590, B + 0.024), (-0.592, B + 0.050), (-0.596, B + 0.050)], -0.0012, 0.0012, bev=0.0004), 'blued')
    W.add(G.box('rsight', (0, -0.180, B + 0.030), (0.016, 0.040, 0.008), bev=0.0015), 'blued')
    W.add(G.plate('rsLeaf', [(-0.196, B + 0.034), (-0.168, B + 0.034), (-0.168, B + 0.037), (-0.196, B + 0.036)], -0.006, 0.006, bev=0.0005), 'blued', 'sightRear')
    W.pivots['sightRear'] = (0, -0.196, B + 0.035)
    # charging handle on the right
    W.add(G.box('chHandle', (-0.030, -0.030, 0.022), (0.014, 0.012, 0.010), bev=0.002), 'steel', 'charging')
    W.pivots['charging'] = (-0.025, -0.030, 0.022)
    # bipod: clamp on the jacket front, legs folded back under the jacket (rotate about X to deploy)
    bip = [G.lathe('clamp', [(0.0270, -0.548), (0.0300, -0.548), (0.0300, -0.566), (0.0270, -0.566)], n=14, axis='Y', center=(0, 0, B), sz=1.0, closed=True)]
    for s in (-1, 1):
        bip.append(G.sweep('leg', [(s * 0.014, -0.556, B - 0.032), (s * 0.016, -0.400, B - 0.036), (s * 0.017, -0.250, B - 0.038)],
                           dict(w=0.0110, h=0.0110, e=2.0), n=8))
        bip.append(G.box('foot', (s * 0.017, -0.238, B - 0.040), (0.010, 0.026, 0.008), bev=0.002))
    for o in bip:
        W.add(o, 'blued', 'bipod')
    W.pivots['bipod'] = (0, -0.556, B - 0.030)
    # ammunition belt hanging from the left of the feed tray
    pts = []
    for i in range(8):
        t = i / 7
        pts.append((0.050 + 0.040 * t, -0.080, 0.040 - 0.200 * t * t))
    for i, p in enumerate(pts):
        ang = -math.degrees(math.atan2(0.4 * i / 7, 1.0)) * 2
        rnd = G.lathe('round', [(0.0, 0.040), (0.0018, 0.036), (0.0040, 0.020), (0.0040, 0.000), (0.0060, -0.004), (0.0060, -0.022),
                                (0.0058, -0.040), (0.0060, -0.040), (0.0, -0.040)], n=8, axis='Y', center=(0, 0, 0))
        G.rot(rnd, ang, 'Y'); G.move(rnd, (p[0], p[1] + 0.006, p[2]))
        W.add(rnd, 'brass', 'belt')
        lk = G.box('link', (p[0], p[1] - 0.004, p[2]), (0.012, 0.022, 0.014), bev=0.003)
        G.rot(lk, ang, 'Y', p)
        W.add(lk, 'blued', 'belt')
    W.empties['muzzle'] = ((0, -0.6935, B), (0, -1, 0))
    W.empties['ejection'] = ((0, -0.060, -0.006), (0, 0, -1))
    W.gripL = (0, 0.090, 0.0)
    W.zones = dict(handR=((0, 0.040, -0.065), (0.030, 0.035, 0.060)), handL=((0, 0.300, 0.050), (0.030, 0.090, 0.020)),
                   cheek=((0.02, 0.3, 0.04), (0.02, 0.1, 0.02)), butt=((0, 0.478, -0.02), (0.05, 0.012, 0.08)), slide=(0, 1, 0))
    W.uvscale = {'belt': 1.0}
    return W

# =====================================================================================================
def knife(hi=True):
    """Fighting knife of the 1943 trench-knife type: spear-point blade with false edge, steel guard with a bent tab,
    stacked-leather grip, steel pommel. Blade along -Y, guard at y=0."""
    W = Weapon('knife', hi)
    # blade: custom lofted section (spine flats, grind to a thin edge)
    st = []
    for i in range(13):
        t = i / 12.0
        y = -0.170 * t
        top = 0.0050 if t < 0.62 else 0.0050 - (t - 0.62) / 0.38 * 0.0090
        bot = -0.0150 + 0.0020 * t if t < 0.70 else -0.0136 + (t - 0.70) / 0.30 * 0.0096
        if t == 1.0:
            top = bot = -0.0040
        th = 0.0026 * (1 - 0.55 * t)
        st.append((y, top, bot, th))
    V, F = [], []
    for y, top, bot, th in st:
        gz = top - (top - bot) * 0.42
        sec = [(th, top), (th, gz), (0.00025, bot), (-0.00025, bot), (-th, gz), (-th, top)]
        for x, z in sec:
            V.append((x, y, z))
    m = 6
    for i in range(len(st) - 1):
        for k in range(m):
            a = i * m + k; b = i * m + (k + 1) % m
            F.append([a, b, b + m, a + m])
    F.append(list(range(m))[::-1])
    blade = G.mesh_obj('blade', V, F)
    G.fix_normals(blade)
    G.smooth_by_angle(blade, 25)
    W.add(blade, 'blade')
    W.add(G.box('guard', (0, 0.003, -0.004), (0.010, 0.006, 0.044), bev=0.0018), 'park')
    tab = G.box('tab', (0, -0.001, 0.0185), (0.009, 0.004, 0.010), bev=0.0012)
    G.rot(tab, -35, 'X', (0, 0.002, 0.014)); W.add(tab, 'park')
    prof = [(0.0100, 0.006)]
    k = 0
    y = 0.006
    while y < 0.116:
        r = 0.0118 + 0.0012 * math.sin(math.pi * (y - 0.006) / 0.11)
        prof += [(r - 0.0006, y + 0.0007), (r, y + 0.0020), (r, y + 0.0072), (r - 0.0006, y + 0.0086)]
        y += 0.0093
    prof += [(0.0105, 0.1180)]
    W.add(G.lathe('handle', prof, n=10, axis='Y', center=(0, 0, -0.004), sx=0.82, sz=1.0, cap0=True, cap1=True), 'leatherstack')
    W.add(G.lathe('pommel', [(0.0, 0.1175), (0.0110, 0.1175), (0.0125, 0.1220), (0.0115, 0.1310), (0.0060, 0.1350), (0.0, 0.1355)],
                  n=12, axis='Y', center=(0, 0, -0.004), sx=0.85), 'park')
    W.empties['muzzle'] = ((0, -0.170, -0.004), (0, -1, 0))
    W.zones = dict(handR=((0, 0.06, -0.004), (0.02, 0.06, 0.02)), handL=((0, 0, 0), (0.001, 0.001, 0.001)),
                   cheek=((0, 0, 0), (0.001, 0.001, 0.001)), butt=((0, 0, 0), (0.001, 0.001, 0.001)), slide=(0, 1, 0))
    W.uvscale = {}
    return W

def binoculars(hi=True):
    """Porro-prism field glasses (6x30 class): objective tubes, covered prism housings, central hinge, focusing eyepieces."""
    W = Weapon('binoculars', hi)
    for s in (-1, 1):
        W.add(G.lathe('obj', [(0.0150, -0.068), (0.0185, -0.068), (0.0192, -0.064), (0.0185, -0.060), (0.0180, -0.030)],
                      n=16, axis='Y', center=(s * 0.040, 0, -0.004), cap0=False, cap1=True), 'paint_black')
        W.add(G.cyl('objLens', 0.0152, -0.0652, -0.0658, c=(s * 0.040, 0, -0.004), n=16), 'glass')
        W.add(G.loft_y('prism', [dict(y=-0.034, zt=0.018, zb=-0.020, w=0.036, e=3.0, x=s * 0.038), dict(y=-0.030, zt=0.024, zb=-0.022, w=0.040, e=3.2, x=s * 0.038),
                                 dict(y=0.024, zt=0.024, zb=-0.016, w=0.038, e=3.2, x=s * 0.035), dict(y=0.030, zt=0.020, zb=-0.010, w=0.032, e=3.0, x=s * 0.034)], n=16), 'leatherette')
        W.add(G.lathe('eye', [(0.0110, 0.028), (0.0110, 0.040), (0.0135, 0.041), (0.0135, 0.056), (0.0125, 0.060), (0.0090, 0.061)],
                      n=14, axis='Y', center=(s * 0.031, 0, 0.012), cap1=False), 'paint_black')
        W.add(G.cyl('eyeLens', 0.0090, 0.0598, 0.0592, c=(s * 0.031, 0, 0.012), n=12), 'glass')
        W.add(G.box('bridge', (s * 0.012, -0.004, 0.012), (0.016, 0.014, 0.008), bev=0.002), 'paint_black')
    W.add(G.cyl('hinge', 0.0085, -0.022, 0.034, c=(0, 0, 0.012), n=12), 'paint_black')
    W.add(G.cyl('hingeCap', 0.0060, 0.034, 0.040, c=(0, 0, 0.012), n=10), 'steel')
    W.empties['muzzle'] = ((0, -0.068, 0.0), (0, -1, 0))
    W.empties['scopeEye'] = ((0, 0.075, 0.012), (0, -1, 0))
    W.zones = dict(handR=((-0.04, 0.0, 0.0), (0.03, 0.04, 0.04)), handL=((0.04, 0.0, 0.0), (0.03, 0.04, 0.04)),
                   cheek=((0, 0, 0), (0.001, 0.001, 0.001)), butt=((0, 0, 0), (0.001, 0.001, 0.001)), slide=(0, 1, 0))
    W.uvscale = {}
    return W

def grenade(hi=True):
    """Segmented fragmentation hand grenade (pineapple pattern) with striker fuze, lever, pin and ring. Z up."""
    W = Weapon('grenade', hi)
    prof = []
    rows = 15
    for j in range(rows + 1):
        a = math.pi * j / rows
        z = 0.0030 - 0.0440 * math.cos(a)
        r = 0.0290 * math.sin(a) ** 0.85
        prof.append((max(r, 0.0), z))
    prof[0] = (0.0, prof[0][1]); prof[-1] = (0.0105, prof[-1][1] - 0.001)
    body = G.lathe('body', prof, n=32, axis='Z', center=(0, 0, 0), cap1=True)
    me = body.data
    for v in me.vertices:
        x, y, z = v.co
        rr = math.hypot(x, y)
        if rr < 1e-5 or z > 0.040 or z < -0.039:
            continue
        th = math.atan2(y, x)
        col = abs(math.cos(4 * th))            # 1 at the 8 column grooves
        rowp = abs(math.cos((z + 0.040) / 0.0835 * 5 * math.pi))   # 5 rows
        g = max(col ** 30, rowp ** 30)
        f = 1.0 - 0.10 * g
        v.co.x *= f; v.co.y *= f
    W.add(body, 'paint_od')
    W.add(G.lathe('neck', [(0.0105, 0.044), (0.0095, 0.050), (0.0090, 0.052)], n=14, axis='Z', cap1=True), 'paint_od')
    W.add(G.lathe('fuze', [(0.0, 0.052), (0.0082, 0.052), (0.0085, 0.056), (0.0078, 0.066), (0.0060, 0.0695), (0.0, 0.070)], n=14, axis='Z'), 'park')
    spoon = G.sweep('lever', G.bezier([(-0.004, 0, 0.071), (-0.012, 0, 0.070), (-0.028, 0, 0.040), (-0.031, 0, 0.012)], 8),
                    dict(w=0.0018, h=0.012, e=6), n=8, up=Vector((0, 1, 0)))
    W.add(spoon, 'park', 'lever'); W.pivots['lever'] = (-0.006, 0, 0.068)
    W.add(G.cyl('pin', 0.0012, -0.012, 0.016, axis='X', c=(0, 0, 0.061), n=6), 'steel', 'pin')
    W.add(G.torus('ring', 0.0105, 0.0013, c=(0.0175, 0, 0.051), axis='X', n=16, m=6), 'steel', 'pin')
    W.pivots['pin'] = (0.016, 0, 0.061)
    W.empties['muzzle'] = ((0, 0, 0.070), (0, 0, 1))
    W.zones = dict(handR=((0, 0, 0), (0.03, 0.03, 0.05)), handL=((0, 0, 0), (0.001, 0.001, 0.001)),
                   cheek=((0, 0, 0), (0.001, 0.001, 0.001)), butt=((0, 0, 0), (0.001, 0.001, 0.001)), slide=(0, 0, 1))
    W.uvscale = {}
    return W

def stick_grenade(hi=True):
    """Stick hand grenade of the 1924 pattern: steel head can, wooden handle, screw cap at the end. Z up, grip at origin."""
    W = Weapon('stickGrenade', hi)
    W.add(G.lathe('handle', [(0.0118, -0.070), (0.0125, 0.000), (0.0130, 0.150), (0.0140, 0.205)], n=12, axis='Z', cap0=True, cap1=True), 'wood')
    W.add(G.lathe('cap', [(0.0, -0.0830), (0.0110, -0.0830), (0.0140, -0.0805), (0.0140, -0.0700), (0.0128, -0.0680), (0.0120, -0.0680)], n=14, axis='Z', closed=True), 'paint_grey')
    W.add(G.lathe('collar', [(0.0142, 0.200), (0.0160, 0.202), (0.0160, 0.214), (0.0120, 0.216)], n=14, axis='Z', closed=True), 'paint_grey')
    W.add(G.lathe('head', [(0.0120, 0.214), (0.0330, 0.216), (0.0350, 0.220), (0.0350, 0.282), (0.0335, 0.287), (0.0090, 0.289), (0.0, 0.289)],
                  n=24, axis='Z', cap0=True), 'paint_grey')
    W.add(G.box('clip', (0.0365, 0, 0.250), (0.004, 0.012, 0.050), bev=0.0012), 'paint_grey')
    W.empties['muzzle'] = ((0, 0, 0.289), (0, 0, 1))
    W.zones = dict(handR=((0, 0, 0.0), (0.03, 0.03, 0.06)), handL=((0, 0, 0), (0.001, 0.001, 0.001)),
                   cheek=((0, 0, 0), (0.001, 0.001, 0.001)), butt=((0, 0, 0), (0.001, 0.001, 0.001)), slide=(0, 0, 1))
    W.uvscale = {}
    return W

BUILDERS = {'rifleScoped': rifle_scoped, 'smg': smg, 'pistol': pistol, 'enemyRifle': enemy_rifle, 'enemySmg': enemy_smg,
            'mg': mg, 'knife': knife, 'binoculars': binoculars, 'grenade': grenade, 'stickGrenade': stick_grenade}
