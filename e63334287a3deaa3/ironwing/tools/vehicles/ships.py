# Ironwing ships, modelled in Blender (frame as lib.py: forward -Y, up +Z, the ship's right (starboard) side is -X).
# Invented classes in real sizes: the carrier (236 m), a destroyer (112 m) and a cruiser (172 m). Painted in neutral
# greys: the game tints each ship for its side. No hull numbers, flags or ensigns. Node layout (glTF, game frame):
#   <kind>                 root (waterline at y = 0, centre of the hull)
#     <kind>_hull          everything that doesn't move (materials: paint, dark, wood, glass)
#     <kind>_deck          the carrier's flight deck (material 'deck', UV across 0..1 and along 0..6.8)
#     <kind>_aaL0.. / _aaH0..   light and heavy gun mounts (empties: the AA fires from here)
#     <kind>_funnel0..     funnel smoke origins     <kind>_wakeStern     <kind>_bridgeEye     <kind>_lod1
# Sizes match js/units.js (deck heights, lengths, beams, the carrier's island box).
import math
from mathutils import Vector
import lib
from lib import loft_y, lathe, cyl, box, sphere, torus, sweep, plate, move, rot, scale, mirror_x, join, part, empty, dup, decimate, subsurf

HULL, DARK, DECK, BOOT, WIN, WOOD = '#9aa2a9', '#3d4247', '#6f757a', '#5a2d26', '#1d252c', '#7a6a55'

def hull(name, L, B, D, draft, sheer=3.0, transom=0.78, flare=0.08, knuckle=True):
    """Hull loft from bow (-Y) to stern (+Y): flared sides, rounded bilge, raised bow."""
    st = []
    N = 22
    for i in range(N + 1):
        u = i / N; y = -L / 2 + L * u
        if u < 0.32:                       # entry: sharp bow widening to full beam
            k = (u / 0.32); w = B * (0.06 + 0.94 * math.sin(k * math.pi / 2) ** 0.85)
        elif u > 0.86:
            k = (u - 0.86) / 0.14; w = B * (1 - (1 - transom) * k ** 1.6)
        else:
            w = B
        zt = D + sheer * max(0, 1 - u / 0.28) ** 2 + 0.4 * max(0, (u - 0.85) / 0.15)
        zb = -draft * (0.55 + 0.45 * math.sin(min(1, u / 0.12) * math.pi / 2)) * (1 - 0.35 * max(0, (u - 0.9) / 0.1))
        st.append(dict(y=y, zt=zt, zb=zb, wt=w * (1 + flare * (1 - u)), wb=w * 0.82, et=7.0, eb=2.4))
    h = loft_y(name, st, n=28)
    def col(c, n):
        if n.z > 0.8 and c.z > D - 0.6: return DECK
        if -0.7 < c.z < 0.9: return BOOT
        if c.z <= -0.7: return '#2b2622'
        return HULL
    part(h, col, 'paint'); lib.smooth_by_angle(h, 35)
    return h

def turret(name, x, y, z, w, l, h, barrels, blen, br, face=1, guns=None):
    """A gun turret: sloped front (toward -Y when face=1), barrels with blast bags, on a round barbette."""
    f = face
    prof = [(-l / 2 * f, 0), (-l / 2 * f, h * 0.55), (-l / 2 * f + 0.35 * l * f, h), (l / 2 * f, h), (l / 2 * f, 0)]
    if f < 0:
        prof = prof[::-1]
    t = plate(name, prof, -w / 2, w / 2, bev=0.05, seg=1, axis='X'); move(t, (x, y, z + 0.4))
    bb = cyl(name + '_barbette', w * 0.42, z - 0.2, z + 0.45, axis='Z', c=(x, y, 0), n=20)
    parts = [t, bb]
    yf, zb = y - f * l / 2, z + 0.4 + h * 0.45          # the turret's front face, the barrels' height
    for i in range(barrels):
        bx = x + (i - (barrels - 1) / 2) * w * 0.3
        b = cyl(name + '_barrel', br, 0, -f * blen, axis='Y', n=10, r1=br * 0.8); move(b, (bx, yf, zb))
        bag = cyl(name + '_bag', br * 1.8, 0, -f * 0.4, axis='Y', n=10); move(bag, (bx, yf, zb))
        part(b, DARK, 'dark'); part(bag, '#8b8a7e', 'paint'); parts += [b, bag]
    for p_ in (t, bb):
        part(p_, HULL, 'paint')
    return join(parts, name)

def aa_mount(name, x, y, z, r=1.1, barrels=2, tub=True):
    out = []
    if tub:
        tb = lathe(name + '_tub', [(r, 0), (r * 1.02, 0.9), (r * 0.94, 0.95)], n=16, axis='Z', center=(x, y, z)); lib.solidify(tb, 0.08); part(tb, HULL); out.append(tb)
    ped = cyl(name + '_ped', r * 0.28, z, z + 0.7, axis='Z', c=(x, y, 0), n=10); part(ped, DARK, 'dark'); out.append(ped)
    sh = box(name + '_shield', (x, y - r * 0.3, z + 1.0), (r * 1.0, 0.06, 0.55), bev=0.02); part(sh, HULL); out.append(sh)
    for i in range(barrels):
        b = cyl(name + '_b', 0.06, 0, 2.2, axis='Y', n=8); rot(b, -25, 'X'); move(b, (x + (i - (barrels - 1) / 2) * 0.32, y - 0.3, z + 1.05)); part(b, DARK, 'dark'); out.append(b)
    return out

def boat(name, x, y, z, l=7, w=1.8):
    b = lathe(name, [(0.02, -l / 2), (w * 0.35, -l * 0.38), (w * 0.5, -l * 0.1), (w * 0.5, l * 0.25), (w * 0.38, l / 2)], n=14, axis='Y', sz=0.6, cap0=True, cap1=True)
    move(b, (x, y, z)); part(b, '#d8d6cc'); return b

def funnel(name, x, y, z, r, h, rake=8, cap='#25282b'):
    f = lathe(name, [(r * 1.08, 0), (r, 0.6), (r, h), (r * 1.05, h + 0.05)], n=20, axis='Z', sx=1.0, sz=1.0, center=(0, 0, 0), cap1=True)
    scale(f, (1, 1.35, 1)); rot(f, -rake, 'X'); move(f, (x, y, z)); part(f, HULL)
    c = lathe(name + '_cap', [(r * 1.07, h - 0.6), (r * 1.08, h + 0.08)], n=20, axis='Z'); scale(c, (1, 1.35, 1)); rot(c, -rake, 'X'); move(c, (x, y, z)); part(c, cap, 'dark')
    return [f, c]

def mast(name, x, y, z, h, yard=6.0, radar=True):
    out = []
    m = cyl(name, 0.25, z, z + h, axis='Z', c=(x, y, 0), n=8, r1=0.12); part(m, DARK, 'dark'); out.append(m)
    yd = cyl(name + '_yard', 0.08, -yard / 2, yard / 2, axis='X', c=(x, y, z + h * 0.72), n=6); part(yd, DARK, 'dark'); out.append(yd)
    if radar:
        rb = box(name + '_radar', (x, y, z + h * 0.86), (2.4, 0.3, 1.0), bev=0.03); part(rb, '#565c62', 'dark'); out.append(rb)
        rb['radar'] = (x, y, z + h * 0.86)    # turns: build_all makes it a `<kind>_radar<i>` pivot
    for s in (1, -1):    # tripod legs
        lg = sweep(name + '_leg', [(x + s * 1.6, y + 1.4, z), (x, y, z + h * 0.6)], dict(w=0.18, h=0.18, e=2), n=6); part(lg, DARK, 'dark'); out.append(lg)
    return out

def windows(name, x, y, z, w, l, h=0.45, faces='all'):
    """A dark band of bridge windows wrapped round a box face set (slightly proud of it)."""
    return part(box(name, (x, y, z), (w + 0.06, l + 0.06, h), bev=0.0), WIN, 'glass')

# ------------------------------------------------------------------ the classes
def warship(kind):
    big = kind == 'cruiser'
    L, B, D = (172, 18, 9) if big else (112, 11.5, 7)
    s = 1.5 if big else 1.0
    root = empty(kind)
    parts = [hull(kind + '_h', L, B, D, 6.5 if big else 4.2, sheer=4.0 if big else 3.4)]
    deckz = D
    # forecastle deckhouse, bridge tower, funnels, after deckhouse
    fwd = -L * 0.16
    parts.append(part(box(kind + '_fh', (0, fwd + 2, deckz + 1.6 * s), (B * 0.55, 15 * s, 3.2 * s), bev=0.15), HULL))
    parts.append(part(box(kind + '_br1', (0, fwd, deckz + 4.6 * s), (B * 0.45, 8 * s, 2.8 * s), bev=0.12), HULL))
    parts.append(windows(kind + '_bw', 0, fwd - 0.6 * s, deckz + 6.4 * s, B * 0.42, 6 * s, 0.7 * s))
    parts.append(part(box(kind + '_br2', (0, fwd + 0.3, deckz + 7.2 * s), (B * 0.44, 6.2 * s, 0.6 * s), bev=0.05), HULL))
    parts.append(part(box(kind + '_br3', (0, fwd + 1.5 * s, deckz + 8.6 * s), (B * 0.28, 4 * s, 2.2 * s), bev=0.08), HULL))
    parts.append(part(cyl(kind + '_rf', 1.0 * s, deckz + 9.7 * s, deckz + 10.6 * s, axis='Z', c=(0, fwd + 1.5 * s, 0), n=12), '#565c62', 'dark'))   # rangefinder
    parts += mast(kind + '_fm', 0, fwd + 4 * s, deckz + 9.7 * s, 12 * s, yard=B * 0.6)
    fun = []
    nf = 2
    for i in range(nf):
        y = -L * 0.02 + i * L * 0.1
        parts += funnel(kind + '_fun' + str(i), 0, y, deckz + 1.2 * s, 1.5 * s, 7.0 * s)
        fun.append((0, y + 0.8 * s, deckz + 8.4 * s))
    parts.append(part(box(kind + '_mid', (0, L * 0.03, deckz + 0.9 * s), (B * 0.62, L * 0.24, 1.8 * s), bev=0.12), HULL))
    parts.append(part(box(kind + '_aft', (0, L * 0.24, deckz + 1.5 * s), (B * 0.5, 13 * s, 3.0 * s), bev=0.12), HULL))
    parts += mast(kind + '_mm', 0, L * 0.2, deckz + 3 * s, 9 * s, yard=B * 0.45, radar=False)
    # main guns: two forward, two aft (raised B and X positions)
    tz = [(-L * 0.36, 0, 1), (-L * 0.27, 1.5, 1), (L * 0.31, 1.5, -1), (L * 0.39, 0, -1)]
    heavy = []
    for i, (y, raise_, f) in enumerate(tz):
        if raise_:
            parts.append(part(cyl(kind + '_bbr', 2.4 * s, deckz, deckz + raise_ * s, axis='Z', c=(0, y, 0), n=16), HULL))
        z0 = deckz + raise_ * s
        parts.append(turret(kind + '_t' + str(i), 0, y, z0, (3.4 if big else 2.6) * s / (1.15 if big else 1), (5.0 if big else 3.6) * s / (1.1 if big else 1), 2.0 * s / (1.1 if big else 1), 3 if big else 2, (9 if big else 5.5) * s / (1.1 if big else 1), 0.18 * s, face=f))
        heavy.append((0, y, z0 + 2.5 * s))
    # light AA: tubs on the deckhouse edges
    light = []
    for fy in ([-0.1, -0.03, 0.06] if big else [-0.08, 0.06]):
        for sx in (1, -1):
            x, y = sx * B * 0.36, L * fy
            parts += aa_mount(kind + '_aa', x, y, deckz + 1.8 * s, r=1.0 * s)
            light.append((x, y, deckz + 2.8 * s))
    # torpedo tubes (destroyer), boats, a crane (cruiser)
    if not big:
        for y in (L * 0.12, L * 0.18):
            base = cyl(kind + '_tt', 1.2, deckz, deckz + 0.5, axis='Z', c=(0, y, 0), n=14); part(base, DARK, 'dark'); parts.append(base)
            for k in range(4):
                tb = cyl(kind + '_tube', 0.28, -3.2, 3.2, axis='X', c=(0, y + (k - 1.5) * 0.6, deckz + 0.9), n=10); rot(tb, 8, 'Z', pivot=(0, y, 0)); part(tb, '#6b7177', 'paint'); parts.append(tb)
    for sx in (1, -1):
        parts.append(boat(kind + '_boat', sx * B * 0.32, L * 0.08, deckz + 3.3 * s, 7 * s, 1.8 * s))
        parts.append(part(box(kind + '_anchor', (sx * B * 0.38, -L * 0.43, D - 1.0), (0.2, 1.2, 1.4), bev=0.05), DARK, 'dark'))
    if big:
        cr = cyl(kind + '_crane', 0.3, deckz + 2, deckz + 12, axis='Z', c=(B * 0.2, L * 0.12, 0), n=8); part(cr, DARK, 'dark'); parts.append(cr)
        jib = sweep(kind + '_jib', [(B * 0.2, L * 0.12, deckz + 11), (B * 0.45, L * 0.12 + 6, deckz + 7)], dict(w=0.25, h=0.25, e=2), n=6); part(jib, DARK, 'dark'); parts.append(jib)
    radars = [p for p in parts if 'radar' in p.keys()]; parts = [p for p in parts if 'radar' not in p.keys()]
    h = join(parts, kind + '_hull'); h.parent = root
    return root, h, None, light, heavy, fun, L, D, radars

def carrier():
    kind = 'carrier'; L, B, D = 236, 28, 15
    root = empty(kind)
    parts = [hull('carrier_h', L, B, D, 8.0, sheer=2.5, transom=0.8, flare=0.12)]
    # open hangar deck: a dark band along the sides, then the gallery deck and the flight deck overhang
    hb = box('carrier_hangar', (0, -6, 12.0), (B + 0.3, L * 0.72, 5.0), bev=0.1); part(hb, '#2a2e32', 'dark'); parts.append(hb)
    for k in range(-14, 15):    # hangar side frames
        fr = box('carrier_frame', (0, -6 + k * L * 0.72 / 29, 12.0), (B + 0.5, 0.5, 5.0), bev=0.02); part(fr, HULL); parts.append(fr)
    gal = box('carrier_gal', (0, -6, 15.2), (37, L * 0.86, 1.6), bev=0.1); part(gal, HULL); parts.append(gal)
    for k in range(-6, 7):      # deck supports under the overhang
        for sx in (1, -1):
            sp = sweep('carrier_sup', [(sx * 14.5, -6 + k * 17, 10.5), (sx * 18, -6 + k * 17, 15.2)], dict(w=0.5, h=0.5, e=2), n=6); part(sp, HULL); parts.append(sp)
    # the island (starboard: -X), bridge windows, funnel, tripod mast with radar
    ix, iy = -15.5, -16
    parts.append(part(box('carrier_i1', (ix, iy, D + 6.5), (6, 34, 9), bev=0.25), HULL))
    parts.append(part(box('carrier_i2', (ix, iy - 4, D + 12.6), (5, 16, 3.2), bev=0.2), HULL))
    parts.append(windows('carrier_iw', ix, iy - 6, D + 14.4, 5.2, 9.6, 1.0))
    parts.append(part(box('carrier_i3', (ix, iy - 6, D + 15.4), (5.6, 10.5, 0.5), bev=0.05), HULL))
    parts += funnel('carrier_fun', ix - 0.3, iy + 8, D + 11, 2.6, 9.0, rake=14)
    parts += mast('carrier_mast', ix, iy - 8, D + 15.7, 13, yard=7.0)
    dish = sphere('carrier_dish', 1.4, c=(ix, iy - 8, D + 26), n=12, m=8, sy=0.35); part(dish, '#565c62', 'dark'); parts.append(dish)
    dish['radar'] = (ix, iy - 8, D + 26)
    light, heavy = [], []
    for y in (-96, -60, 60, 96):
        for sx in (1, -1):
            x = sx * 19.2
            parts += aa_mount('carrier_aa', x, -y, D + 0.4, r=2.2)
            light.append((x, -y, D + 1.4))
    for (x, y) in [(19, 20), (19, -30), (-19, 30)]:
        sp = box('carrier_spon', (x, y, D - 1.0), (5.5, 9, 1.2), bev=0.1); part(sp, HULL); parts.append(sp)
        parts.append(turret('carrier_dp', x, y, D - 0.4, 3.0, 4.0, 1.9, 2, 5, 0.16, face=1))
        heavy.append((x, y, D + 1.8))
    for (x, y) in [(ix, iy - 14), (ix, iy + 14)]:
        parts += aa_mount('carrier_iaa', x, y, D + 15.6, r=1.4, tub=False); light.append((x, y, D + 16.4))
    for sx in (1, -1):
        for k in range(3):
            parts.append(boat('carrier_boat', sx * 15.8, 40 + k * 14, 10.5, 8, 2.0))
    radars = [p for p in parts if 'radar' in p.keys()]; parts = [p for p in parts if 'radar' not in p.keys()]
    h = join(parts, 'carrier_hull'); h.parent = root
    # the flight deck (its own material and UVs: the game paints planks and markings on it)
    dk = box('carrier_deck', (0, 0, D + 1.7), (34, 232, 0.8), bev=0.0, seg=1)
    part(dk, '#ffffff', 'deck')
    me = dk.data; uv = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((c.x + 17) / 34, (-c.y + 116) / 232 * 6.8)
    dk.parent = root; dk.name = 'carrier_deck'; dk.data.name = 'carrier_deck'
    fun = [(ix - 0.3, iy + 6.5, D + 20.5)]
    return root, h, dk, light, heavy, fun, L, D, radars

def build_all(out, tex=0, texdir=None):
    """tex: texture size for the carrier's baked set (0 = vertex colours only, as the other ships)."""
    import bpy, os, time
    for kind in ('carrier', 'destroyer', 'cruiser'):
        lib.reset(); t = time.time()
        root, h, deck, light, heavy, fun, L, D, radars = carrier() if kind == 'carrier' else warship(kind)
        baked = tex and kind == 'carrier'
        if baked:
            import texbake; texbake.keep_base([h])
        lib.ao([h], [h] + ([deck] if deck else []), dist=7.0, rays=24, strength=0.75, ground=-1.0)
        for i, p in enumerate(light): empty(kind + '_aaL' + str(i), p, root)
        for i, p in enumerate(heavy): empty(kind + '_aaH' + str(i), p, root)
        for i, p in enumerate(fun): empty(kind + '_funnel' + str(i), p, root)
        for i, r in enumerate(radars):     # radar aerials turn about the game's Y axis
            lib.pivot(r, r['radar'], root); r.name = kind + '_radar' + str(i); r.data.name = r.name
        empty(kind + '_wakeStern', (0, L / 2, 0), root)
        empty(kind + '_bridgeEye', (0, -L * 0.16, D + 8), root)
        lo = dup(h, kind + '_lod1'); lo.parent = root
        if deck:
            d2 = dup(deck, 'dk'); lo = join([lo, d2], kind + '_lod1'); lo.parent = root
        decimate(lo, 0.2)
        lib.finish([lo] + radars, uv=3.0)
        if baked:
            texbake.bake(kind, [h], tex, texdir, hide=[lo] + radars, edge_r=0.12, ao_near=0.6, ao_far=9.0, strength=1.0,
                         island_fn=carrier_islands(D), painter=texbake.carrier_painter(D, L),
                         cut_fn=lambda c: int((c.y + L / 2) // (L / 5)))
            dm = texbake.deck_set(1024, texdir); deck.data.materials.clear(); deck.data.materials.append(dm)
            for a in list(deck.data.color_attributes): deck.data.color_attributes.remove(a)
        else:
            lib.finish([h], uv=3.0)
        lib.export([root], os.path.join(out, 'ship_' + kind + '.glb'))
        print('built', kind, lib.stats([root]), 'hull', lib.tris(h), '%.1fs' % (time.time() - t))

def carrier_islands(D):
    """Texture space by place: almost none under water, more on the island the camera sees up close."""
    def f(c, n):
        if c.z < -1.0: return 0.12
        if abs(c.x) < 18.6 and D - 1.2 < c.z < D + 2.6 and n.z > 0.7: return 0.06   # under the flight deck: never seen
        if abs(c.x) < 13.5 and -0.5 < c.z < D - 0.2 and abs(n.x) < 0.5 and abs(c.y) < 105: return 0.06   # inside the hull
        if c.x < -11.5 and c.z > D + 1.0: return 1.8
        if abs(n.z) > 0.8 and c.z < D - 2: return 0.6     # undersides and floors of the galleries
        return 1.0
    return f
