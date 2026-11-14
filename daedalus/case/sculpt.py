"""
Project Daedalus: the sculpted surfaces of the case (version 4 onwards).

The flat-faced versions were built entirely from exact solids. A body whose surfaces rise and fall cannot be
described that way without a great deal of fragile surface patching, so the outside of the case is described
instead as a "distance field": a function that says, for any point in space, how far it is from the surface
(negative inside). Fields are easy to sculpt (add a bump here, round an edge there, blend two shapes), and the
wall of the shell is simply every point between the surface and 2 mm inside it, so it has the same thickness
everywhere. The field is turned into triangles ("marching cubes"), and the holes, posts and slots from the
exact model are then cut into those triangles.

Needs: numpy, scipy, scikit-image, manifold3d   (pip install numpy scipy scikit-image manifold3d)
"""

import math
import struct

import numpy as np


# ------------------------------------------------------------------------------------------------ the outline
def outline_polyline(corners, step=0.05):
    """The rounded outline as a closed list of points about `step` mm apart."""
    n = len(corners)
    cuts = []
    for i, (x, y, r) in enumerate(corners):
        px, py, _ = corners[i - 1]
        nx, ny, _ = corners[(i + 1) % n]
        ux, uy, vx, vy = px - x, py - y, nx - x, ny - y
        lu, lv = math.hypot(ux, uy), math.hypot(vx, vy)
        ux, uy, vx, vy = ux / lu, uy / lu, vx / lv, vy / lv
        half = math.acos(max(-1.0, min(1.0, ux * vx + uy * vy))) / 2
        t = r / math.tan(half)
        bx, by = ux + vx, uy + vy
        lb = math.hypot(bx, by)
        cx, cy = x + bx / lb * r / math.sin(half), y + by / lb * r / math.sin(half)     # centre of the arc
        cuts.append(((x + ux * t, y + uy * t), (x + vx * t, y + vy * t), (cx, cy), r))
    pts = []
    for i in range(n):
        a, b, c, r = cuts[i]
        a0 = math.atan2(a[1] - c[1], a[0] - c[0])
        a1 = math.atan2(b[1] - c[1], b[0] - c[0])
        da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi                               # the short way round
        k = max(2, int(abs(da) * r / step))
        for j in range(k):
            ang = a0 + da * j / k
            pts.append((c[0] + r * math.cos(ang), c[1] + r * math.sin(ang)))
        nxt = cuts[(i + 1) % n][0]                                                       # straight run to the next arc
        L = math.hypot(nxt[0] - b[0], nxt[1] - b[1])
        k = max(1, int(L / step))
        for j in range(k):
            pts.append((b[0] + (nxt[0] - b[0]) * j / k, b[1] + (nxt[1] - b[1]) * j / k))
    return np.array(pts)


class Outline:
    """Signed distance from the outline, seen from the front: negative inside, positive outside."""

    def __init__(self, corners):
        from scipy.spatial import cKDTree
        self.poly = outline_polyline(corners)
        self.tree = cKDTree(self.poly)

    def distance(self, x, y):
        from skimage.measure import points_in_poly
        shape = np.broadcast(x, y).shape
        pts = np.stack([np.broadcast_to(x, shape).ravel(), np.broadcast_to(y, shape).ravel()], axis=1)
        d, _ = self.tree.query(pts)
        inside = points_in_poly(pts, self.poly)
        return np.where(inside, -d, d).reshape(shape)


# ------------------------------------------------------------------------------------------------ the field
def smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def rounded(a, b, r):
    """Where two surfaces meet (a and b are each 'how far outside this surface'), round the corner to radius r."""
    wa, wb = a + r, b + r
    return np.minimum(np.maximum(wa, wb), 0.0) + np.hypot(np.maximum(wa, 0.0), np.maximum(wb, 0.0)) - r


class Body:
    """The outside of the controller as a distance field."""

    def __init__(self, p, corners):
        self.p = p
        self.t = p["topo"]
        self.outline = Outline(corners)

    def front(self, x, y):
        """Height of the front face above the board's front, before the edge is rounded: a shallow dome that
        also falls away down the grips."""
        t = self.t
        return (t["front_top"] - x * x / (2 * t["front_rx"]) - (y - t["front_yc"]) ** 2 / (2 * t["front_ry"])
                - t["grip_fall"] * smooth((t["grip_fall_from"] - y) / t["grip_fall_over"]))

    def back(self, x, y):
        """Height of the back face (negative: behind the board): flat in the middle, swelling into each palm."""
        t = self.t
        gx, gy = t["swell_xy"]
        sx, sy = t["swell_size"]
        bump = np.exp(-((np.abs(x) - gx) / sx) ** 2 - ((y - gy) / sy) ** 2)
        return t["back_flat"] - t["swell"] * bump

    def field(self, x, y, z, d2=None):
        t = self.t
        if d2 is None:
            d2 = self.outline.distance(x, y)
        f = rounded(d2, z - self.front(x, y), t["edge_front_r"])
        b = rounded(d2, self.back(x, y) - z, t["edge_back_r"])
        return np.maximum(f, b)

    def ceiling(self, x, y):
        """Inside of the front shell above (x, y), well away from the edge."""
        return float(self.front(x, y)) - self.p["wall"]

    def floor(self, x, y):
        return float(self.back(x, y)) + self.p["wall"]


# ------------------------------------------------------------------------------------------------ triangles
def field_mesh(fn, bounds, h, level=0.0):
    """Triangles of the surface where fn(x, y, z) == level, inside the box bounds = (x0, y0, z0, x1, y1, z1)."""
    import manifold3d as m3
    from skimage.measure import marching_cubes
    x0, y0, z0, x1, y1, z1 = bounds
    xs = np.arange(x0, x1 + h / 2, h, dtype=np.float64)
    ys = np.arange(y0, y1 + h / 2, h, dtype=np.float64)
    zs = np.arange(z0, z1 + h / 2, h, dtype=np.float64)
    vol = fn(xs, ys, zs).astype(np.float32)
    verts, tris, _, _ = marching_cubes(vol, level, spacing=(h, h, h))
    verts = verts + np.array([x0, y0, z0])
    solid = m3.Manifold(m3.Mesh(vert_properties=verts.astype(np.float32), tri_verts=tris.astype(np.uint32)))
    if solid.volume() < 0:
        solid = m3.Manifold(m3.Mesh(vert_properties=verts.astype(np.float32), tri_verts=tris[:, ::-1].astype(np.uint32)))
    assert solid.status() == m3.Error.NoError and not solid.is_empty(), "field_mesh: not a closed surface (%s)" % solid.status()
    return solid


def from_cq(shape, tolerance=0.02, angular=0.12):
    """An exact CadQuery solid as triangles that can be combined with the sculpted ones."""
    import manifold3d as m3
    solid = shape.val() if hasattr(shape, "val") else shape
    verts, tris = solid.tessellate(tolerance, angular)
    v = np.array([(q.x, q.y, q.z) for q in verts], dtype=np.float64)
    t = np.array(tris, dtype=np.int64)
    key = np.round(v / 1e-5).astype(np.int64)                    # weld the points that the faces share
    _, first, inverse = np.unique(key, axis=0, return_index=True, return_inverse=True)
    v = v[first]
    t = inverse.reshape(-1)[t]
    t = t[(t[:, 0] != t[:, 1]) & (t[:, 1] != t[:, 2]) & (t[:, 0] != t[:, 2])]
    out = m3.Manifold(m3.Mesh(vert_properties=v.astype(np.float32), tri_verts=t.astype(np.uint32)))
    assert out.status() == m3.Error.NoError, "from_cq: %s" % out.status()
    if out.volume() < 0:
        out = m3.Manifold(m3.Mesh(vert_properties=v.astype(np.float32), tri_verts=t[:, ::-1].astype(np.uint32)))
    return out


def slab(z0, z1, size=400.0):
    import manifold3d as m3
    return m3.Manifold.cube((size, size, z1 - z0)).translate((-size / 2, -size / 2, z0))


def write_stl(solid, path):
    mesh = solid.to_mesh()
    v = np.asarray(mesh.vert_properties, dtype=np.float32)[:, :3]
    t = np.asarray(mesh.tri_verts, dtype=np.uint32)
    a, b, c = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]
    n = np.cross(b - a, c - a)
    ln = np.linalg.norm(n, axis=1)
    n = n / np.where(ln == 0, 1, ln)[:, None]
    rec = np.zeros(len(t), dtype=[("n", "<f4", 3), ("a", "<f4", 3), ("b", "<f4", 3), ("c", "<f4", 3), ("attr", "<u2")])
    rec["n"], rec["a"], rec["b"], rec["c"] = n, a, b, c
    with open(path, "wb") as f:
        f.write(b"Project Daedalus".ljust(80, b" "))
        f.write(struct.pack("<I", len(t)))
        f.write(rec.tobytes())
    return len(t)
