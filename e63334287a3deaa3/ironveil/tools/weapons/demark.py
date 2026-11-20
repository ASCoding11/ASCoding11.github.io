# Remove stamped text, serial numbers, dates, proof marks and national emblems from the Poly Haven weapon textures.
# usage: python demark.py <poly haven folder> <out folder>
# Each mark is a rectangle in 2048 px texture space. It is refilled the same way in the colour, normal and ARM maps:
# a smooth fill from the rectangle's border (Laplace) plus the fine detail of a clean patch nearby (the patch minus
# its own blur), blended with a soft edge. So the grain, scratches and weave carry on, and the lettering is gone.
import sys, os, glob
import numpy as np
from PIL import Image

# set -> list of (x0, y0, x1, y1, dx, dy): rectangle and the offset of the clean patch its detail is taken from
MARKS = {
    'bolt_action_rifle_7_62': [
        (1676, 712, 1812, 770, 136, 0),      # factory line on the barrel shank
        (396, 1332, 538, 1376, 150, 0),      # serial on the receiver
        (474, 1452, 566, 1526, 120, 0),      # emblem and date on the receiver ring
        (1090, 1490, 1174, 1566, 0, -90),    # emblem on the round plate
        (116, 1560, 288, 1648, 300, 0),      # letters, serial and proof marks on the butt top
        (1630, 1380, 1842, 1518, 0, -250),   # arsenal stamp and date on the stock side
        (1454, 1654, 1570, 1690, 170, 0),    # serial on the bottom metal
        (1578, 128, 1666, 162, 0, 34),       # small serial on the bolt
        (2012, 1822, 2046, 1910, 0, -100),   # small serial on the edge part
        (236, 1126, 298, 1178, 0, 60),       # proof marks
        (500, 1006, 536, 1040, 0, 50),
        (130, 1250, 162, 1278, 0, 40),
        (732, 1531, 764, 1562, 60, 0),
    ],
    'bolt_action_rifle_7_62_accesories': [
        (1378, 378, 1526, 422, -160, 0),     # scope serial
        (1856, 1520, 1930, 1640, 0, 0),      # mount numbers (smooth fill + plain steel detail)
        (1936, 1816, 2034, 2006, 0, 0),      # mount maker code and numbers
    ],
    'service_pistol': [
        (80, 840, 198, 894, 250, 0),         # issue text on the frame
        (1560, 1176, 1652, 1294, 0, 0),      # magazine capacity text (smooth fill + clean steel detail, see ABS)
        (1292, 1994, 1476, 2047, -200, 0),   # serial on the frame bottom
        (540, 352, 604, 392, 0, 0),          # lettering round a screw head (smooth fill only)
        (268, 1898, 330, 2002, 0, -110),      # small vertical text
    ],
}
ABS = {('service_pistol', 1): (1290, 1480), ('bolt_action_rifle_7_62_accesories', 1): (330, 800),
       ('bolt_action_rifle_7_62_accesories', 2): (330, 800)}  # absolute source corner for marks whose neighbours carry holes

def laplace_fill(a, m, iters=600):
    """a: HxWxC float, m: HxW bool (True = unknown). Fill unknown pixels smoothly from the known border."""
    out = a.copy()
    k = m.copy()
    mean = a[~m].mean(axis=0) if (~m).any() else a.mean(axis=(0, 1))
    out[k] = mean
    for _ in range(iters):
        p = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) * 0.25
        out[k] = avg[k]
    return out

def blur(a, r=4):
    k = 2 * r + 1
    p = np.pad(a, ((r, r), (r, r), (0, 0)), mode='edge')
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0), (0, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def soft_mask(h, w, f=6):
    y = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]
    x = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
    return np.clip(np.minimum(y, x) / f, 0, 1)

def clean(img, marks, set_name, scale):
    a = np.asarray(img).astype(np.float32)
    H, W = a.shape[:2]
    for i, (x0, y0, x1, y1, dx, dy) in enumerate(marks):
        x0, y0, x1, y1, dx, dy = [int(round(v * scale)) for v in (x0, y0, x1, y1, dx, dy)]
        pad = max(3, int(8 * scale))
        X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
        crop = a[Y0:Y1, X0:X1].copy()
        m = np.zeros(crop.shape[:2], bool); m[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = True
        base = laplace_fill(crop, m)
        if (set_name, i) in ABS:
            sx, sy = [int(v * scale) for v in ABS[(set_name, i)]]
        else:
            sx, sy = X0 + dx, Y0 + dy
        sx = min(max(0, sx), W - (X1 - X0)); sy = min(max(0, sy), H - (Y1 - Y0))
        src = a[sy:sy + (Y1 - Y0), sx:sx + (X1 - X0)]
        detail = src - blur(src, max(2, int(4 * scale))) if (dx or dy or (set_name, i) in ABS) else 0.0
        fill = base + detail
        w = np.zeros(crop.shape[:2]); w[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = soft_mask(y1 - y0, x1 - x0, max(2, int(6 * scale)))
        w = np.maximum(w, m * 0.0)
        crop = crop * (1 - w[..., None]) + fill * w[..., None]
        a[Y0:Y1, X0:X1] = crop
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), img.mode)

def walnut(img):
    """Take the scan's saturated orange birch down to a dark oiled walnut: orange texels lose saturation and value,
    the grain (local contrast) is kept, and a faint warm red stays in the dark rings."""
    import colorsys
    a = np.asarray(img).astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(2); mn = a.min(2); sat = (mx - mn) / np.maximum(mx, 1e-4)
    hue_orange = (r > g) & (g >= b * 0.9) & (r - b > 0.12)
    w = np.clip((sat - 0.30) / 0.2, 0, 1) * hue_orange
    lum = 0.30 * r + 0.55 * g + 0.15 * b
    base = np.stack([lum * 0.78 + 0.035, lum * 0.52 + 0.022, lum * 0.34 + 0.012], 2)   # walnut ramp
    out = a * (1 - w[..., None]) + base * w[..., None]
    return Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8), 'RGB')

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '**', 'textures', '*.jpg'), recursive=True)):
        b = os.path.basename(f)
        set_name = None
        for k in sorted(MARKS, key=len, reverse=True):
            if b.startswith(k + '_'): set_name = k; break
        img = Image.open(f).convert('RGB')
        if set_name:
            img = clean(img, MARKS[set_name], set_name, img.size[0] / 2048.0)
        if b.startswith('bolt_action_rifle_7_62_diff'):
            img = walnut(img)
        img.save(os.path.join(dst, b.replace('.jpg', '.png')))
        print('cleaned' if set_name else 'copied', b)
