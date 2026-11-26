# Stamped markings for the weapons, drawn from code (no font files): a small stroke alphabet on a 4 x 6 grid, rendered
# into a height image that mats.py projects onto one side of a weapon. All lettering is invented: a pattern mark, a
# serial number and plain selector symbols; no maker's names, proof marks or insignia.
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# strokes per glyph: polylines in a 4-wide, 6-tall cell, y up
GL = {
    '0': [[(0, 1), (0, 5), (1, 6), (3, 6), (4, 5), (4, 1), (3, 0), (1, 0), (0, 1)], [(0.6, 0.8), (3.4, 5.2)]],
    '1': [[(1, 5), (2, 6), (2, 0)], [(1, 0), (3, 0)]],
    '2': [[(0, 5), (1, 6), (3, 6), (4, 5), (4, 4), (0, 0), (4, 0)]],
    '3': [[(0, 6), (4, 6), (2, 3.6), (3, 3.6), (4, 2.6), (4, 1), (3, 0), (1, 0), (0, 1)]],
    '4': [[(3, 0), (3, 6), (0, 2), (4, 2)]],
    '5': [[(4, 6), (0, 6), (0, 3.4), (3, 3.4), (4, 2.4), (4, 1), (3, 0), (0, 0)]],
    '6': [[(3.5, 6), (1, 6), (0, 5), (0, 1), (1, 0), (3, 0), (4, 1), (4, 2.4), (3, 3.4), (0, 3.4)]],
    '7': [[(0, 6), (4, 6), (1.5, 0)]],
    '8': [[(1, 3.3), (0, 4.3), (0, 5.2), (1, 6), (3, 6), (4, 5.2), (4, 4.3), (3, 3.3), (1, 3.3), (0, 2.3), (0, 0.9), (1, 0), (3, 0), (4, 0.9), (4, 2.3), (3, 3.3)]],
    '9': [[(4, 2.6), (1, 2.6), (0, 3.6), (0, 5), (1, 6), (3, 6), (4, 5), (4, 1), (3, 0), (0.5, 0)]],
    'M': [[(0, 0), (0, 6), (2, 2.5), (4, 6), (4, 0)]],
    'O': [[(1, 0), (0, 1), (0, 5), (1, 6), (3, 6), (4, 5), (4, 1), (3, 0), (1, 0)]],
    'N': [[(0, 0), (0, 6), (4, 0), (4, 6)]],
    'o': [[(1.2, 0), (0.4, 0.8), (0.4, 2.6), (1.2, 3.4), (2.4, 3.4), (3.2, 2.6), (3.2, 0.8), (2.4, 0), (1.2, 0)]],
    'K': [[(0, 0), (0, 6)], [(4, 6), (0, 2.4)], [(1.3, 3.4), (4, 0)]],
    'R': [[(0, 0), (0, 6), (3, 6), (4, 5), (4, 4), (3, 3), (0, 3)], [(2, 3), (4, 0)]],
    'T': [[(0, 6), (4, 6)], [(2, 6), (2, 0)]],
    'A': [[(0, 0), (2, 6), (4, 0)], [(0.8, 2.3), (3.2, 2.3)]],
    'L': [[(0, 6), (0, 0), (4, 0)]],
    'C': [[(4, 5), (3, 6), (1, 6), (0, 5), (0, 1), (1, 0), (3, 0), (4, 1)]],
    '-': [[(0.5, 3), (3.5, 3)]],
    '.': [[(1.8, 0.2), (2.2, 0.2)]],
    '/': [[(0, 0), (4, 6)]],
    ' ': [],
}

def _text(d, s, x0, y0, h, px, lw):
    """Draw string s with its baseline-left at (x0, y0) metres in a canvas of px pixels per metre; cell height h."""
    k = h / 6.0
    x = x0
    pts = []
    for ch in s:
        for line in GL.get(ch, []):
            q = [((x + a * k) * px, (y0 + b * k) * px) for a, b in line]
            pts.append(q)
        x += (4 + 1.6) * k
    return pts

def render(items, region, size=2048, depth_blur=1.2):
    """items: list of ('text', s, (u, v) baseline-left metres, height m, stroke m) or ('dot', (u, v), r m) or
    ('ring', (u, v), r, stroke) or ('bar', (u0, v0), (u1, v1), stroke). region: (u0, v0, span m).
    Returns a float32 height image (1 = stamped in), row 0 at the top (v max)."""
    u0, v0, span = region
    px = size / span
    im = Image.new('L', (size, size), 0); d = ImageDraw.Draw(im)
    def P(u, v):
        return ((u - u0) * px, size - (v - v0) * px)
    for it in items:
        if it[0] == 'text':
            _, s, (u, v), h, sw = it
            for line in _text(d, s, u - u0, v - v0, h, px, sw):
                q = [(a, size - b) for a, b in line]
                w = max(1, int(round(sw * px)))
                if len(q) == 2 and q[0] == q[1]:
                    q = [q[0], (q[0][0] + 0.5, q[0][1])]
                d.line(q, fill=255, width=w, joint='curve')
                r = w / 2.0
                for a, b in (q[0], q[-1]):
                    d.ellipse((a - r, b - r, a + r, b + r), fill=255)
        elif it[0] == 'dot':
            _, (u, v), r = it; a, b = P(u, v); rr = r * px
            d.ellipse((a - rr, b - rr, a + rr, b + rr), fill=255)
        elif it[0] == 'ring':
            _, (u, v), r, sw = it; a, b = P(u, v); rr = r * px
            d.ellipse((a - rr, b - rr, a + rr, b + rr), outline=255, width=max(1, int(round(sw * px))))
        elif it[0] == 'bar':
            _, (ua, va), (ub, vb), sw = it
            d.line([P(ua, va), P(ub, vb)], fill=255, width=max(1, int(round(sw * px))))
    im = im.filter(ImageFilter.GaussianBlur(depth_blur))
    return np.asarray(im).astype(np.float32) / 255.0

# ------------------------------------------------------------------ the player's SMG, left side (x +), (u, v) = (y, z)
SMG_REGION = (-0.200, -0.250, 0.320)
def smg_left():
    it = []
    # pattern mark and serial on the receiver's left wall, behind the flutes
    it.append(('text', 'MO-43', (0.0040, 0.0340), 0.0050, 0.00062))
    it.append(('text', 'No 40721', (0.0040, 0.0245), 0.0042, 0.00056))
    it.append(('text', 'K', (0.0040, 0.0140), 0.0030, 0.00045))          # a lone inspector's letter, invented
    # selector (pivot y 0.030, z -0.010) and safety (pivot y 0.000, z -0.012): marks 14.5 mm from the pivot, angles
    # from +y (rearward): one dot = single shots, three dots = automatic; bar = safe, ring = fire
    def at(py, pz, ang, r=0.0145):
        a = math.radians(ang); return py + r * math.cos(a), pz + r * math.sin(a)
    u, v = at(0.030, -0.010, 125); it.append(('dot', (u, v), 0.00100))
    u, v = at(0.030, -0.010, 58)
    for i in (-1, 0, 1):
        it.append(('dot', (u + i * 0.0026, v), 0.00090))
    u, v = at(0.000, -0.012, 118); it.append(('bar', (u - 0.0022, v), (u + 0.0022, v), 0.0008))
    u, v = at(0.000, -0.012, 66); it.append(('ring', (u, v), 0.0016, 0.0006))
    # magazine: capacity
    it.append(('text', '30', (-0.0950, -0.2050), 0.0055, 0.00070))
    # serial repeated small on the magazine housing and the jacket's rear band
    it.append(('text', '721', (-0.1060, -0.0520), 0.0022, 0.00032))
    return render(it, SMG_REGION)

if __name__ == '__main__':
    import sys
    a = smg_left()
    Image.fromarray((a * 255).astype(np.uint8)).save(sys.argv[1] if len(sys.argv) > 1 else '/tmp/stamp.png')
