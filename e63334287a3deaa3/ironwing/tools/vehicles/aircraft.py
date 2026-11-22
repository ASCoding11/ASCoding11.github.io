# Ironwing aircraft, modelled in Blender (see lib.py for the frame: forward -Y, up +Z, right side -X, metres).
# Five invented types, none a copy of a real aircraft: the Kestrel carrier fighter (ours, radial engine), the Shrike
# fighter (theirs, inline engine), the twin-engine level bomber, the torpedo bomber and the dive bomber. Sizes match
# the gameplay hit spheres in js/units.js. Node layout (glTF, game frame):
#   <kind>                      root
#     <kind>_body               airframe (materials: paint, dark)
#     <kind>_glass              canopy and glazing
#     <kind>_prop[0..]          propeller pivots (spin about +Z); child <kind>_prop[i]_mesh
#     <kind>_gearL/_gearR       main gear pivots (fold about Z); <kind>_tailwheel
#     <kind>_aileronL/R, _elevator, _rudder, _flaps    (the Kestrel only: the player's aircraft)
#     <kind>_gunL0.. / _gunR0.. muzzles      <kind>_cockpitEye      <kind>_lod1 (whole aircraft, reduced)
import math
from mathutils import Vector
import lib
from lib import loft_y, lathe, cyl, box, sphere, torus, sweep, mesh_obj, move, rot, scale, mirror_x, join, part, paint, subsurf, flat, empty, pivot, attach, dup, decimate, smooth_by_angle

def mix(a, b, t):
    pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join('%02x' % round(pa[i] + (pb[i] - pa[i]) * t) for i in range(3))

# ------------------------------------------------------------------ airfoils and wings
AF = [0, 0.02, 0.06, 0.12, 0.22, 0.34, 0.48, 0.62, 0.76, 0.88, 1.0]
def _thick(f):
    return 5 * (0.2969 * math.sqrt(f) - 0.126 * f - 0.3516 * f * f + 0.2843 * f ** 3 - 0.1036 * f ** 4)

def wing(name, stations, f0=0.0, f1=1.0, camber=0.25):
    """stations: list of (x, chord, y_le, z, t). f0..f1: the part of the chord to build (control surfaces use the
    trailing part). Sections loop: upper surface leading->trailing, then lower trailing->leading."""
    fs = [f0 + (f1 - f0) * f for f in AF]
    verts, faces = [], []
    for (x, c, yle, z, t) in stations:
        up = [(yle + f * c, z + t * c * _thick(f) * (1 + camber) * 0.5 + 0.02 * c * math.sin(math.pi * f) * camber) for f in fs]
        lo = [(yle + f * c, z - t * c * _thick(f) * (1 - camber) * 0.5) for f in fs]
        ring = up + lo[::-1][1:-1]
        for (y, zz) in ring:
            verts.append((x, y, zz))
    n = len(fs) * 2 - 2; m = len(stations)
    for i in range(m - 1):
        for k in range(n):
            a = i * n + k; b = i * n + (k + 1) % n
            faces.append([a, b, b + n, a + n])
    c = len(verts); x, cc, yle, z, t = stations[-1]
    verts.append((x, yle + cc * (f0 + f1) / 2, z)); faces += [[c, (m - 1) * n + k, (m - 1) * n + (k + 1) % n] for k in range(n)]
    c0 = len(verts); x, cc, yle, z, t = stations[0]
    verts.append((x, yle + cc * (f0 + f1) / 2, z)); faces += [[c0, (k + 1) % n, k] for k in range(n)]
    ob = mesh_obj(name, verts, faces); lib.fix_normals(ob); smooth_by_angle(ob, 50)
    return ob

def planform(x0, x1, c0, c1, le0, le1, z0, dihedral, t0, t1, n=6, tip=0.0, ell=False):
    """Stations for a tapered panel from x0 to x1 (|x|), with optional rounded tip of length tip."""
    st = []
    for i in range(n + 1):
        u = i / n; x = x0 + (x1 - x0) * u
        c = c0 + (c1 - c0) * u; le = le0 + (le1 - le0) * u
        if ell:
            e = math.sqrt(max(0.0, 1 - u ** 2.4 * 0.9)); le += c * (1 - e) * 0.25; c *= e
        st.append((x, c, le, z0 + (x - x0) * math.tan(math.radians(dihedral)), t0 + (t1 - t0) * u))
    if tip > 0:
        x, c, le, z, t = st[-1]
        for k, f in enumerate([0.45, 0.78, 0.95]):
            s = 1 - f
            st.append((x + tip * (math.sin(f * math.pi / 2)), c * (0.25 + 0.75 * math.sqrt(s)), le + c * (1 - math.sqrt(s)) * 0.35, z + tip * f * math.tan(math.radians(dihedral)), t * (0.5 + 0.5 * s)))
    return st

def fin(name, stations):
    """A vertical surface: stations (z, chord, y_le, x, t) bottom to top, built as a wing turned on its side."""
    ob = wing(name, [(z, c, yle, -x, t) for (z, c, yle, x, t) in stations])
    lib.transform(ob, __import__('mathutils').Matrix.Rotation(math.radians(-90), 4, 'Y'))   # span (x) becomes up (z)
    lib.fix_normals(ob)
    return ob

# ------------------------------------------------------------------ parts
def radial_cowl(name, y0, R, L, cyls=9, rows=1):
    """A radial engine in its cowling: lip at y0 (front), length L, radius R. Returns (cowl, engine)."""
    prof = [(R * 0.72, y0 + 0.02), (R * 0.86, y0 - 0.01), (R * 0.98, y0 + 0.04), (R * 1.0, y0 + 0.14), (R * 1.02, y0 + L * 0.6), (R * 0.97, y0 + L)]
    cowl = lathe(name + '_cowl', prof, n=28, axis='Y')
    lib.solidify(cowl, 0.03)
    parts = [cyl(name + '_crank', R * 0.32, y0 + 0.12, y0 + 0.45, n=16)]
    for r in range(rows):
        for i in range(cyls):
            a = 2 * math.pi * (i + 0.5 * r) / cyls; ca, sa = math.cos(a), math.sin(a)
            c = cyl(name + '_cyl', R * 0.13, R * 0.28, R * 0.74, axis='X', n=10)
            for k in range(5):
                fin_ = cyl(name + '_fin', R * 0.17, R * (0.36 + k * 0.08), R * (0.38 + k * 0.08), axis='X', n=10); c = join([c, fin_], name + '_cyl')
            rot(c, math.degrees(a), 'Y'); move(c, (0, y0 + 0.22 + r * 0.16, 0))
            parts.append(c)
    eng = join(parts, name + '_engine')
    return cowl, eng

def exhausts(name, y, z, x, n, dy=0.16, ang=20, r=0.045, l=0.22):
    out = []
    for i in range(n):
        e = cyl(name, r, 0, l, axis='X', n=8); rot(e, ang, 'Y'); move(e, (x, y + i * dy, z)); out.append(e)
        out.append(mirror_x(e))
    return out

def prop(name, R, blades, chord=0.24, spinner=(0.3, 0.75), color='#1c1c1c', tip='#d9b23a', spin='#3a3a3a'):
    """Propeller about the Y axis at y=0 (pivot), blades in the XZ plane, spinner forward (-Y)."""
    obs = []
    for b in range(blades):
        st = []
        for i in range(7):
            u = i / 6; rr = 0.18 + (R - 0.18) * u
            c = chord * (0.75 + 0.5 * math.sin(math.pi * min(1, u * 1.15))) * (0.6 if u > 0.95 else 1)
            st.append((rr, c, -c * 0.4, 0, 0.12 - 0.07 * u))
        bl = wing(name + '_blade', st, camber=0.4)
        # twist each blade about its span: steep at the root, flat at the tip
        me = bl.data
        for v in me.vertices:
            u = min(1, max(0, (v.co.x - 0.18) / (R - 0.18))); a = math.radians(58 - 38 * u)
            yy, zz = v.co.y, v.co.z; v.co.y = yy * math.cos(a) - zz * math.sin(a); v.co.z = yy * math.sin(a) + zz * math.cos(a)
        part(bl, (lambda c, n: tip if c.x > R - 0.16 else color), 'dark')
        rot(bl, 360 * b / blades, 'Y'); obs.append(bl)
    sp = lathe(name + '_spinner', [(0.0005, -spinner[1]), (spinner[0] * 0.45, -spinner[1] * 0.8), (spinner[0] * 0.8, -spinner[1] * 0.45), (spinner[0], -0.05), (spinner[0], 0.05)], n=20, axis='Y', cap0=True, cap1=True)
    part(sp, spin, 'paint'); obs.append(sp)
    return obs, sp

def wheel(name, R, w, x, y, z):
    t = torus(name + '_tyre', R - w * 0.45, w * 0.5, c=(0, 0, 0), axis='X', n=20, m=8)
    hub = cyl(name + '_hub', R * 0.55, -w * 0.42, w * 0.42, axis='X', n=14)
    part(t, '#1a1a1a', 'dark'); part(hub, '#6a6d70', 'dark')
    o = join([t, hub], name); move(o, (x, y, z)); return o

def gear_leg(name, x, y, ztop, zwheel, R=0.36, w=0.16, door=(0.5, 1.0), col='#b9c3c9'):
    """A main gear leg hinged at (x, y, ztop): strut, oleo, wheel, door. Returns the pivot empty's child mesh."""
    s = cyl(name + '_strut', 0.05, zwheel + R * 0.7, ztop, axis='Z', c=(x, y, 0), n=10)
    o = cyl(name + '_oleo', 0.07, zwheel + R * 0.5, zwheel + (ztop - zwheel) * 0.45, axis='Z', c=(x, y, 0), n=10)
    part(s, '#8f9396', 'dark'); part(o, '#c0c4c6', 'dark')
    wh = wheel(name + '_wheel', R, w, x - math.copysign(w * 0.7, x), y, zwheel)
    d = box(name + '_door', (x + math.copysign(0.06, x), y, (ztop + zwheel) * 0.5 + 0.1), (0.03, door[0], (ztop - zwheel) * 0.9), bev=0.01)
    part(d, col, 'paint')
    return join([s, o, wh, d], name)

# ------------------------------------------------------------------ the types
SCHEMES = {
    'blue': {'top': '#4a5d6e', 'bot': '#b9c3c9', 'mark': '#d9b23a', 'spin': '#d9b23a'},
    'red': {'top': '#4b5636', 'bot': '#a9ab9a', 'mark': '#efefe6', 'spin': '#7a2a1e'},
    'redB': {'top': '#5a5844', 'bot': '#9fa294', 'mark': '#efefe6', 'spin': '#4a4a40'},
}

def scheme_fn(S, band=None, wingtip=None, chev=None, split=0.0, exhaust=None):
    def fn(c, n):
        x, y, z = c.x, c.y, c.z
        # top/bottom split with a soft wave along the fuselage
        topside = (n.z > 0.15) if abs(n.z) > 0.6 else (z > split)
        col = S['top'] if topside else S['bot']
        if band and band[0] < y < band[1] and abs(x) < 1.6:
            col = S['mark']
        if wingtip and abs(x) > wingtip:
            col = S['mark']
        if chev:
            for (cy, cz, cs, side) in chev:
                if side == 'fus' and abs(x) > 0.25 and abs(n.x) > 0.5 and chev_in(y, z, cy, cz, cs):
                    col = S['mark']
                if side == 'wing' and n.z > 0.5 and chev_in(abs(x), -y, cy, cz, cs):
                    col = S['mark']
        if exhaust and abs(x) > 0.3 and exhaust[0] < y < exhaust[1] and abs(z - exhaust[2]) < 0.35 + (y - exhaust[0]) * 0.08:
            col = mix(col, '#2e2a26', 0.55 * (1 - (y - exhaust[0]) / (exhaust[1] - exhaust[0])))
        return col
    return fn

def chev_in(y, z, y0, z0, s):
    u, v = (y - y0) / s, (z - z0) / s
    top = 0.35 - abs(u) * 0.95
    return abs(u) < 0.6 and top - 0.32 < v < top

TYPES = {
    'fighter': dict(scheme='blue', fus=[(-4.45, 0.62, -0.62, 1.24, 2.0), (-4.0, 0.72, -0.74, 1.40, 2.0), (-3.0, 0.76, -0.82, 1.42, 2.2), (-2.0, 0.80, -0.86, 1.32, 2.4), (-1.0, 0.82, -0.88, 1.18, 2.4), (0.0, 0.80, -0.84, 1.10, 2.4), (1.0, 0.72, -0.74, 0.98, 2.3), (2.5, 0.56, -0.56, 0.76, 2.2), (4.0, 0.42, -0.30, 0.46, 2.2), (5.15, 0.32, 0.08, 0.12, 2.0)],
                    engine='radial', cowl=(-4.45, 0.72, 1.15), prop=(-4.6, 1.6, 3), wing=dict(x0=0.55, x1=5.3, c0=2.45, c1=1.15, le0=-1.78, le1=-1.2, z=-0.42, di=6, tip=0.55),
                    tail=dict(x1=1.95, c0=1.25, c1=0.62, le0=3.85, le1=4.3, z=0.12), fin=dict(h=1.75, c0=1.55, c1=0.68, le0=3.65, le1=4.55, z0=0.42),
                    canopy=(-1.25, 0.65, 0.78, 0.62, 0.5), guns=[(2.4, -1.85, -0.38), (2.85, -1.8, -0.36)], gear=(1.7, -1.25, -0.5, -1.95), tailwheel=4.55,
                    band=(2.55, 3.0), wingtip=5.25, exhaust=(-3.35, -1.2, -0.25), hero=True),
    'raider': dict(scheme='red', fus=[(-4.6, 0.18, -0.10, 0.30, 2.0), (-4.3, 0.42, -0.40, 0.72, 2.2), (-3.4, 0.58, -0.62, 0.92, 2.5), (-2.2, 0.66, -0.74, 1.00, 2.6), (-1.0, 0.72, -0.76, 1.02, 2.5), (0.0, 0.74, -0.72, 0.98, 2.4), (1.2, 0.62, -0.62, 0.86, 2.3), (2.6, 0.48, -0.48, 0.66, 2.2), (4.0, 0.38, -0.26, 0.42, 2.1), (5.0, 0.32, 0.08, 0.12, 2.0)],
                   engine='inline', prop=(-4.7, 1.5, 3), spinner=(0.3, 0.6), wing=dict(x0=0.5, x1=5.0, c0=2.35, c1=1.25, le0=-1.6, le1=-1.0, z=-0.36, di=5, tip=0.4, ell=True),
                   tail=dict(x1=1.8, c0=1.1, c1=0.55, le0=3.7, le1=4.1, z=0.15), fin=dict(h=1.65, c0=1.4, c1=0.6, le0=3.5, le1=4.35, z0=0.36),
                   canopy=(-1.1, 0.55, 0.72, 0.56, 0.48), guns=[(2.1, -1.65, -0.33), (0.22, -3.35, 0.52)], gear=(1.6, -1.0, -0.45, -1.85), tailwheel=4.4, chev=[(2.4, 0.05, 1.25, 'fus'), (3.6, 1.55, 1.3, 'wing')],
                   exhaust=(-3.9, -1.6, 0.25), scoop=True),
    'bomber': dict(scheme='redB', fus=[(-8.5, 0.6, -0.55, 0.9, 2.0), (-7.6, 1.0, -0.95, 1.7, 2.2), (-6.0, 1.15, -1.15, 2.1, 2.5), (-3.0, 1.25, -1.25, 2.3, 2.6), (0.0, 1.25, -1.2, 2.3, 2.6), (3.0, 1.15, -1.0, 2.0, 2.5), (5.6, 0.95, -0.7, 1.5, 2.4), (7.4, 0.7, -0.3, 0.9, 2.2), (8.5, 0.55, 0.05, 0.45, 2.0)],
                   engine='twin', prop=None, wing=dict(x0=1.0, x1=10.4, c0=4.3, c1=1.7, le0=-2.7, le1=-1.2, z=0.15, di=4, tip=0.7),
                   tail=dict(x1=3.8, c0=2.1, c1=1.0, le0=6.3, le1=7.0, z=0.4), fin=dict(h=3.4, c0=2.6, c1=1.2, le0=5.9, le1=7.4, z0=0.8),
                   canopy=(-4.6, 1.0, 1.15, 1.0, 0.55), nose_glass=True, turret=(1.0, 1.35), tailgun=8.6, nacelles=3.6, guns=[(0.0, -1.5, 1.6), (0.0, 8.8, 0.4)],
                   gear=(3.6, -3.1, -0.6, -2.4), tailwheel=7.6, chev=[(4.4, 0.1, 1.3, 'fus'), (7.5, 3.0, 1.6, 'wing')]),
    'torpedo': dict(scheme='redB', fus=[(-4.75, 0.74, -0.74, 1.48, 2.0), (-4.2, 0.85, -0.86, 1.62, 2.0), (-3.0, 0.92, -0.98, 1.66, 2.3), (-1.0, 0.98, -1.02, 1.52, 2.5), (1.0, 0.92, -0.92, 1.36, 2.5), (3.0, 0.72, -0.66, 1.0, 2.3), (4.8, 0.52, -0.32, 0.56, 2.2), (6.0, 0.4, 0.05, 0.16, 2.0)],
                    engine='radial', cowl=(-4.75, 0.86, 1.2), prop=(-4.9, 1.75, 3), wing=dict(x0=0.75, x1=6.7, c0=2.85, c1=1.25, le0=-1.9, le1=-1.15, z=-0.55, di=6, tip=0.7),
                    tail=dict(x1=2.4, c0=1.45, c1=0.72, le0=4.35, le1=4.95, z=0.15), fin=dict(h=2.1, c0=1.75, c1=0.8, le0=4.1, le1=5.5, z0=0.55),
                    canopy=(-1.4, 2.6, 0.92, 0.62, 0.52), guns=[(0.0, 1.9, 1.15)], gear=(2.0, -1.2, -0.6, -2.0), tailwheel=5.5, torpedo=True, chev=[(3.2, 0.0, 1.35, 'fus'), (4.8, 1.75, 1.5, 'wing')],
                    exhaust=(-3.6, -1.5, -0.2)),
    'dive': dict(scheme='redB', fus=[(-4.45, 0.70, -0.70, 1.40, 2.0), (-4.0, 0.82, -0.84, 1.56, 2.0), (-3.0, 0.88, -0.96, 1.6, 2.3), (-1.0, 0.94, -0.98, 1.46, 2.5), (1.0, 0.88, -0.86, 1.28, 2.5), (3.0, 0.66, -0.6, 0.92, 2.3), (4.6, 0.48, -0.28, 0.5, 2.2), (5.6, 0.38, 0.05, 0.14, 2.0)],
                 engine='radial', cowl=(-4.45, 0.82, 1.1), prop=(-4.6, 1.65, 3), wing=dict(x0=0.7, x1=6.0, c0=2.6, c1=1.2, le0=-1.8, le1=-1.0, z=-0.5, di=7, tip=0.6, ell=True),
                 tail=dict(x1=2.1, c0=1.3, c1=0.65, le0=4.1, le1=4.5, z=0.15), fin=dict(h=1.95, c0=1.6, c1=0.75, le0=3.9, le1=5.0, z0=0.5),
                 canopy=(-1.3, 2.2, 0.88, 0.6, 0.5), guns=[(0.0, 1.6, 1.1)], spats=(1.9, -1.3, -0.5, -1.95), tailwheel=5.0, bomb=True, brakes=True, chev=[(2.9, 0.0, 1.3, 'fus'), (4.3, 1.55, 1.4, 'wing')],
                 exhaust=(-3.3, -1.3, -0.2)),
}

def build(kind):
    T = TYPES[kind]; S = SCHEMES[T['scheme']]
    root = empty(kind)
    sfn = scheme_fn(S, band=T.get('band'), wingtip=T.get('wingtip'), chev=T.get('chev'), split=-0.12, exhaust=T.get('exhaust'))
    body = []
    # fuselage: a subdivided loft through superellipse stations
    st = [dict(y=y, zt=zt, zb=zb, w=w, e=e) for (y, zt, zb, w, e) in T['fus']]
    fus = loft_y(kind + '_fus', st, n=20, cap0=True, cap1=True); subsurf(fus, 1); part(fus, sfn)
    body.append(fus)
    # engine
    if T['engine'] == 'radial':
        y0, R, L = T['cowl']
        cowl, eng = radial_cowl(kind, y0 - 0.02, R, L, cyls=9, rows=2 if kind != 'fighter' else 1)
        part(cowl, (lambda c, n: S['spin'] if kind == 'fighter' and c.y < y0 + 0.2 else ('#2c2d2e' if c.y < y0 + 0.12 else sfn(c, n)))); part(eng, '#3b3c3d', 'dark')
        body += [cowl, eng]
        body += [part(e, '#3a3530', 'dark') for e in exhausts(kind + '_ex', y0 + L - 0.02, -0.3, R * 0.86, 3, dy=0.12, ang=25, r=0.032, l=0.1)]
    elif T['engine'] == 'inline':
        body += [part(e, '#2f2b28', 'dark') for e in exhausts(kind + '_ex', -3.95, 0.22, 0.44, 6, dy=0.2, ang=10, r=0.04, l=0.14)]
    if T.get('scoop'):
        sc = loft_y(kind + '_scoop', [dict(y=-1.2, zt=-0.6, zb=-0.62, w=0.5, e=2.5), dict(y=-0.7, zt=-0.6, zb=-1.02, w=0.62, e=3), dict(y=0.4, zt=-0.6, zb=-0.95, w=0.58, e=3), dict(y=1.2, zt=-0.58, zb=-0.62, w=0.3, e=2.5)], n=16)
        part(sc, S['bot']); body.append(sc)
        body.append(part(box(kind + '_scoopmouth', (0, -1.19, -0.82), (0.5, 0.04, 0.3), bev=0.01), '#151515', 'dark'))
    # wings
    W = T['wing']
    wst = planform(W['x0'], W['x1'], W['c0'], W['c1'], W['le0'], W['le1'], W['z'], W['di'], 0.15, 0.10, n=6, tip=W.get('tip', 0), ell=W.get('ell', False))
    wr = wing(kind + '_wingR', [(-x, c, le, z, t) for (x, c, le, z, t) in wst]); wl = wing(kind + '_wingL', wst)
    part(wr, sfn); part(wl, sfn); body += [wr, wl]
    # fillets where the wing meets the fuselage
    for s in (1, -1):
        fl = loft_y(kind + '_fillet', [dict(y=W['le0'] + 0.1, zt=W['z'] + 0.05, zb=W['z'] - 0.05, w=0.2, e=2, x=s * W['x0'] * 1.05), dict(y=W['le0'] + W['c0'] * 0.4, zt=W['z'] + 0.22, zb=W['z'] - 0.14, w=0.6, e=2.2, x=s * W['x0'] * 1.1), dict(y=W['le0'] + W['c0'] * 1.05, zt=W['z'] + 0.12, zb=W['z'] - 0.06, w=0.3, e=2, x=s * W['x0'] * 1.0)], n=12)
        part(fl, sfn); body.append(fl)
    # tail
    t = T['tail']; tst = planform(0.15, t['x1'], t['c0'], t['c1'], t['le0'], t['le1'], t['z'], 0, 0.11, 0.09, n=3, tip=0.25)
    for sgn in (1, -1):
        tp = wing(kind + '_tail', [(x * sgn, c, le, z, tt) for (x, c, le, z, tt) in tst]); part(tp, sfn); body.append(tp)
    f = T['fin']; fst = []
    for i in range(5):
        u = i / 4; fst.append((f['z0'] + f['h'] * u, f['c0'] + (f['c1'] - f['c0']) * u, f['le0'] + (f['le1'] - f['le0'] - 0) * u * 0.9, 0.0, 0.1))
    x, c, le, z, tt = fst[-1]; fst.append((x + 0.15, c * 0.75, le + c * 0.12, 0, 0.08)); fst.append((x + 0.25, c * 0.4, le + c * 0.3, 0, 0.06))
    fn_ = fin(kind + '_fin', fst); part(fn_, S['top']); body.append(fn_)
    # canopy: windscreen and hood (glass) with frames (paint), a seat and panel inside
    cy0, cy1, cz, cw, ch = T['canopy']
    cst = []
    nfr = 7
    for i in range(nfr):
        u = i / (nfr - 1); y = cy0 + (cy1 - cy0) * u
        prof = math.sin(math.pi * min(1, (u + 0.08) / 0.4) / 2) if u < 0.4 else (1 - 0.35 * max(0, (u - 0.7) / 0.3) ** 1.5)
        cst.append(dict(y=y, zt=cz + ch * prof, zb=cz - 0.25, w=cw * (0.75 + 0.25 * prof), e=2.2))
    glass = loft_y(kind + '_glass', cst, n=18); subsurf(glass, 1); part(glass, '#1c2a36', 'glass')
    frames = []
    for i in range(0, nfr, 2 if kind in ('torpedo', 'dive') else 3):
        s = cst[i]; pts = []
        for k in range(13):
            a = math.pi * k / 12; u, v = math.cos(a), math.sin(a)
            hw = s['w'] / 2 * 1.02; pts.append((hw * u, s['y'], s['zb'] + 0.25 + (s['zt'] - s['zb'] - 0.25) * 1.02 * v + 0.0))
        fr = sweep(kind + '_frame', pts, dict(w=0.045, h=0.045, e=2.0), n=6, cap=True); part(fr, S['top']); frames.append(fr)
    seat = box(kind + '_seat', (0, (cy0 + cy1) / 2 + 0.25, cz - 0.15), (0.45, 0.12, 0.6), bev=0.02); part(seat, '#3a3a36', 'dark')
    dash = box(kind + '_dash', (0, cy0 + 0.25, cz - 0.05), (0.6, 0.06, 0.3), bev=0.01); part(dash, '#1b1b1b', 'dark')
    body += frames + [seat, dash]
    if T.get('nose_glass'):
        ng = lathe(kind + '_noseglass', [(0.001, -8.95), (0.35, -8.85), (0.58, -8.6), (0.66, -8.35)], n=20, axis='Y', sz=0.95)
        move(ng, (0, 0, 0.02)); part(ng, '#1c2a36', 'glass'); glass = join([glass, ng], kind + '_glass')
        for k in range(4):
            r = torus(kind + '_nf', 0.42 + k * 0.07, 0.02, c=(0, -8.78 + k * 0.12, 0.02), axis='Y', n=20, m=4); part(r, S['top']); body.append(r)
    if T.get('turret'):
        ty, tz = T['turret']
        dome = sphere(kind + '_dome', 0.55, c=(0, ty, tz), n=18, m=10, sz=0.8); part(dome, '#1c2a36', 'glass'); glass = join([glass, dome], kind + '_glass')
        ring = torus(kind + '_tring', 0.56, 0.06, c=(0, ty, tz - 0.05), axis='Z', n=20, m=6); part(ring, S['top']); body.append(ring)
        for s in (0.1, -0.1):
            g = cyl(kind + '_tgun', 0.035, 0, 1.3, axis='Y', c=(s, ty + 0.3, tz + 0.12), n=8); part(g, '#222', 'dark'); body.append(g)
    if T.get('tailgun'):
        tg = sphere(kind + '_tailglass', 0.38, c=(0, T['tailgun'], 0.35), n=14, m=8, sy=1.2); part(tg, '#1c2a36', 'glass'); glass = join([glass, tg], kind + '_glass')
        g = cyl(kind + '_tgun2', 0.035, 0, 0.9, axis='Y', c=(0, T['tailgun'] + 0.3, 0.33), n=8); part(g, '#222', 'dark'); body.append(g)
    # wing guns, landing light, pitot, antenna mast
    wz = lambda x: W['z'] + (x - W['x0']) * math.tan(math.radians(W['di']))   # the wing's chord plane height at span x
    T['guns'] = [(gx, gy, wz(gx) - 0.01 if gx > 0.5 else gz) for (gx, gy, gz) in T['guns']]
    for (gx, gy, gz) in T['guns']:
        if gx > 0.5:
            for s in (1, -1):
                g = cyl(kind + '_gun', 0.03, gy - 0.3, gy + 0.25, axis='Y', c=(s * gx, 0, gz), n=8); part(g, '#252525', 'dark'); body.append(g)
    pit = cyl(kind + '_pitot', 0.015, -0.4, 0.3, axis='Y', c=(-(W['x1'] - 0.6), W['le1'] - 0.0, W['z'] + (W['x1'] - 0.6 - W['x0']) * math.tan(math.radians(W['di'])) - 0.08), n=6); part(pit, '#888', 'dark'); body.append(pit)
    mast = cyl(kind + '_mast', 0.025, 0, 0.5, axis='Z', c=(0, cy1 + 0.4, T['fus'][4][1] - 0.05), n=6, r1=0.012); part(mast, S['top']); body.append(mast)
    # bombers: engine nacelles with radial engines and their own props
    props = []
    if T['engine'] == 'twin':
        nx = T['nacelles']
        for s in (1, -1):
            x = s * nx
            nac = loft_y(kind + '_nac', [dict(y=-3.9, zt=0.82, zb=-0.62, w=1.5, e=2, x=x), dict(y=-2.2, zt=0.9, zb=-0.9, w=1.6, e=2.2, x=x), dict(y=0.5, zt=0.6, zb=-0.95, w=1.3, e=2.3, x=x), dict(y=2.6, zt=0.35, zb=-0.4, w=0.6, e=2.2, x=x)], n=16)
            subsurf(nac, 1); part(nac, sfn); body.append(nac)
            cowl, eng = radial_cowl(kind + '_n', -3.95, 0.82, 1.2, cyls=9, rows=2); move(cowl, (x, 0, 0.08)); move(eng, (x, 0, 0.08))
            part(cowl, sfn); part(eng, '#3b3c3d', 'dark'); body += [cowl, eng]
            body += [part(e, '#3a3530', 'dark') for e in exhausts(kind + '_nex', -2.5, -0.3, 0.0, 2, ang=0)]
            pb, sp = prop(kind + '_prop' + ('0' if s > 0 else '1'), 1.85, 3, chord=0.3, spinner=(0.33, 0.7), tip='#1c1c1c', spin=S['spin'])
            props.append((join(pb, kind + '_prop' + ('0' if s > 0 else '1') + '_mesh'), (x, -4.15, 0.08)))
    elif T.get('prop'):
        py, R, n = T['prop']
        pb, sp = prop(kind + '_prop0', R, n, chord=0.26, spinner=T.get('spinner', (0.3, 0.7)), tip='#d9b23a' if kind == 'fighter' else '#1c1c1c', spin=S['spin'])
        props.append((join(pb, kind + '_prop0_mesh'), (0, py, 0)))
    if T.get('torpedo'):
        tp = lathe(kind + '_torp', [(0.02, -2.2), (0.18, -2.05), (0.28, -1.6), (0.28, 1.7), (0.12, 2.2)], n=16, axis='Y', cap0=True, cap1=True); move(tp, (0, 0.1, -1.3)); part(tp, '#3b3f40', 'dark'); body.append(tp)
        for k in range(4):
            fnn = box(kind + '_tfin', (0, 2.0, -1.3), (0.02, 0.35, 0.55), bev=0.005); rot(fnn, 45 + 90 * k, 'Y', pivot=(0, 2.0, -1.3)); part(fnn, '#3b3f40', 'dark'); body.append(fnn)
    if T.get('bomb'):
        bm_ = lathe(kind + '_bomb', [(0.02, -1.0), (0.18, -0.85), (0.24, -0.4), (0.24, 0.5), (0.08, 0.95)], n=16, axis='Y', cap0=True, cap1=True); move(bm_, (0, -0.3, -1.25)); part(bm_, '#3f4438', 'dark'); body.append(bm_)
    if T.get('brakes'):
        for s in (1, -1):
            for zz in (-0.12, 0.12):
                br = box(kind + '_brake', (s * 2.8, W['le0'] + W['c0'] * 0.72, W['z'] + 0.25 + zz), (2.0, 0.05, 0.16), bev=0.01); part(br, '#5f5d4c'); body.append(br)
    # landing gear
    gears = []
    if T.get('gear'):
        gx, gy, gtop, gw = T['gear']
        for s in (1, -1):
            g = gear_leg(kind + ('_gearL' if s > 0 else '_gearR'), s * gx, gy, W['z'] if kind != 'bomber' else -0.4, gw, R=0.38 if kind != 'bomber' else 0.62, w=0.16 if kind != 'bomber' else 0.28, col=S['bot'])
            gears.append((g, (s * gx, gy, gtop)))
    if T.get('spats'):
        gx, gy, gtop, gw = T['spats']
        for s in (1, -1):
            leg = sweep(kind + '_spatleg', [(s * gx, gy - 0.2, W['z'] + 0.05), (s * gx, gy - 0.05, gw + 0.3)], dict(w=0.22, h=0.12, e=2.4), n=10)
            spat = loft_y(kind + '_spat', [dict(y=gy - 0.75, zt=gw + 0.05, zb=gw - 0.02, w=0.06, e=2, x=s * gx), dict(y=gy - 0.4, zt=gw + 0.35, zb=gw - 0.35, w=0.3, e=2.2, x=s * gx), dict(y=gy + 0.3, zt=gw + 0.4, zb=gw - 0.32, w=0.32, e=2.2, x=s * gx), dict(y=gy + 0.8, zt=gw + 0.12, zb=gw + 0.02, w=0.06, e=2, x=s * gx)], n=14)
            subsurf(spat, 1); part(leg, S['bot']); part(spat, S['bot']); body += [leg, spat]
            body.append(wheel(kind + '_spw', 0.36, 0.14, s * gx, gy, gw - 0.05))
    if T.get('tailwheel'):
        tw = wheel(kind + '_tw', 0.16, 0.08, 0, T['tailwheel'], T['fus'][-2][2] - 0.25); tl = cyl(kind + '_twl', 0.03, T['fus'][-2][2] - 0.25, T['fus'][-2][2] + 0.1, axis='Z', c=(0, T['tailwheel'] - 0.05, 0), n=6); part(tl, '#555', 'dark')
        body += [tw, tl]
        hook = cyl(kind + '_hook', 0.025, T['tailwheel'] - 0.6, T['tailwheel'] + 0.4, axis='Y', c=(0, 0, T['fus'][-2][2] - 0.1), n=6); part(hook, '#2b2b2b', 'dark'); body.append(hook)
    # control surfaces (the player's aircraft): separate pivots with the hinge on the leading edge
    hero = []
    if T.get('hero'):
        def cs(name, stations, hinge):
            o = wing(kind + name, stations, f0=0.0, f1=1.0, camber=0.0); part(o, sfn)
            pivot(o, hinge, root); o.name = kind + name; o.data.name = kind + name; hero.append(o)
        def teAt(x):  # trailing edge y and z at span x
            for i in range(len(wst) - 1):
                a, b = wst[i], wst[i + 1]
                if a[0] <= x <= b[0]:
                    u = (x - a[0]) / max(1e-6, b[0] - a[0]); return a[2] + a[1] + (b[2] + b[1] - a[2] - a[1]) * u, a[3] + (b[3] - a[3]) * u, a[1] + (b[1] - a[1]) * u
            return wst[-1][2] + wst[-1][1], wst[-1][3], wst[-1][1]
        for s, nm in ((1, '_aileronL'), (-1, '_aileronR')):
            xa, xb = 3.3, 5.0
            ya, za, ca = teAt(xa); yb, zb, cb = teAt(xb)
            st2 = [(s * xa, ca * 0.24, ya - ca * 0.24 + 0.01, za + 0.012, 0.09), (s * xb, cb * 0.24, yb - cb * 0.24 + 0.01, zb + 0.012, 0.08)]
            if s < 0: st2 = st2[::-1]
            cs(nm, st2, (s * xa, ya - ca * 0.24 + 0.01, za))
        for s, nm in ((1, '_flapsL'), (-1, '_flapsR')):
            xa, xb = W['x0'] + 0.15, 3.2
            ya, za, ca = teAt(xa); yb, zb, cb = teAt(xb)
            st2 = [(s * xa, ca * 0.22, ya - ca * 0.22 + 0.01, za - 0.03, 0.08), (s * xb, cb * 0.22, yb - cb * 0.22 + 0.01, zb - 0.03, 0.08)]
            if s < 0: st2 = st2[::-1]
            cs(nm, st2, (s * xa, ya - ca * 0.22 + 0.01, za - 0.02))
        tb = t['le0'] + t['c0']
        el = [(-t['x1'] + 0.2, 0.32, tb - 0.3 + 0.18, t['z'] + 0.01, 0.08), (-0.2, 0.38, tb - 0.36, t['z'] + 0.01, 0.08)]
        cs('_elevatorR', el, (-0.2, tb - 0.36, t['z']))
        cs('_elevatorL', [(-x, c, le, z, tt) for (x, c, le, z, tt) in el[::-1]], (0.2, tb - 0.36, t['z']))
        fz0, fh = f['z0'], f['h']
        rs = [(fz0 + 0.1, 0.45, f['le0'] + f['c0'] - 0.42, 0.0, 0.08), (fz0 + fh * 0.85, 0.32, f['le0'] + (f['le1'] - f['le0']) * 0.85 * 0.9 + (f['c0'] + (f['c1'] - f['c0']) * 0.85) - 0.3, 0.0, 0.07)]
        rd = fin(kind + '_rudder', rs); part(rd, S['top']); pivot(rd, (0, f['le0'] + f['c0'] - 0.42, 0), root); hero.append(rd)
    # assemble the airframe
    bodyo = join(body, kind + '_body'); attach(bodyo, root)
    attach(glass, root, kind + '_glass')
    for (pm, p) in props:
        pv = empty(pm.name.replace('_mesh', ''), p, root); pm.parent = pv; pm.location = (0, 0, 0)   # built at the origin already
    for (g, p) in gears:
        nm = g.name; pivot(g, p, root)
    # muzzles and the eye
    i = 0
    for (gx, gy, gz) in T['guns']:
        for s in ((1, -1) if gx > 0.5 else (1,)):
            empty(kind + ('_gunL' if s > 0 else '_gunR') + str(i), (s * gx, gy - 0.35, gz), root); i += 1
    empty(kind + '_cockpitEye', (0, (cy0 + cy1) / 2, cz + 0.35), root)
    return root, bodyo, glass, hero

def lod(kind, root, objs, ratio):
    """A reduced copy of the whole aircraft as one mesh, for distance (copies keep their parents, so join places them)."""
    cps = [dup(o, o.name + '_l') for o in objs if o is not None]
    m = join(cps, kind + '_lod1'); decimate(m, ratio)
    mw = m.matrix_world.copy(); m.parent = root; m.matrix_world = mw
    return m
