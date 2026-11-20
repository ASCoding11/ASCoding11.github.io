# Shared helpers for the first-person clips (fp_clips.py): weapon frames, linear-blend skinning in numpy (the same
# maths three.js runs), two-bone arm IK with forearm twist, finger closing against the real weapon surface (BVH) and
# the hand-penetration measure.
#
# Frames (Blender, first-person space): eye at the origin, +Y forward, +Z up, +X right.
# A weapon pose W is the 4x4 that maps the weapon frame (barrel -Y, up +Z, right side -X, origin at the grip) into
# first-person space. The relation of a bone matrix M_b (armature space, Blender bone axes) to the glTF node frame is
# glTF = C * M_b (C = Rx(-90)), while objects and empties convert as C * M * C^-1. Hence:
#   hand bone on a grip empty G:   M_hand = W @ G @ RX90
#   weapon and part bones:         M_w = W @ P @ D @ RX90     (P = part empty rest, D = its animated delta)
import bpy, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
import anim_lib as AL

RX90 = Matrix.Rotation(math.pi / 2, 4, 'X')
RZ180 = Matrix.Rotation(math.pi, 4, 'Z')
FINGERS = ('index', 'middle', 'ring', 'pinky', 'thumb')

def blend_m(A, B, t):
    """Blend two rigid 4x4 matrices: translation lerp, rotation slerp."""
    t = max(0.0, min(1.0, t))
    qa, qb = A.to_quaternion(), B.to_quaternion()
    if qa.dot(qb) < 0: qb = -qb
    M = qa.slerp(qb, t).to_matrix().to_4x4()
    M.translation = A.translation.lerp(B.translation, t)
    return M

def rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)

def pose_w(pos, yaw=0.0, pitch=0.0, roll=0.0):
    """Weapon pose: barrel along +Y (first-person forward), then yaw (+ = muzzle left), pitch (+ = muzzle up),
    roll (+ = top of the weapon to the right, a cant), about the weapon origin."""
    R = rot('Z', yaw) @ rot('X', pitch) @ rot('Y', roll) @ RZ180
    R.translation = Vector(pos)
    return R

# ------------------------------------------------------------------------------------------------ weapons
class Weapon:
    """An imported weapon (from the unpacked weapons.glb): rest frames of its empties, BVHs of its meshes."""
    def __init__(self, kind):
        self.kind = kind
        root = bpy.data.objects[kind]
        self.root = root
        inv = root.matrix_world.inverted()
        self.empty = {}
        self.parts = {}
        for c in root.children_recursive:
            nm = c.name.split('.')[0]
            if c.type == 'EMPTY' and nm.startswith(kind + '_'):
                key = nm[len(kind) + 1:]
                self.empty[key] = inv @ c.matrix_world
        # mesh parts: part name -> list of objects (body = everything not under a moving-part empty)
        self.meshes = {}
        for c in root.children_recursive:
            if c.type != 'MESH': continue
            nm = c.name.split('.')[0][len(kind) + 1:]
            part = 'body' if nm == 'body' else nm.replace('_mesh', '')
            self.meshes.setdefault(part, []).append(c)
        self.moving = [p for p in self.meshes if p != 'body']
        self.bvh = {}
        for part, obs in self.meshes.items():
            V, F = [], []
            # each part in its own pivot frame (body: weapon frame)
            Pinv = self.empty[part].inverted() if part in self.empty else Matrix()
            for o in obs:
                M = Pinv @ inv @ o.matrix_world
                base = len(V)
                V += [M @ v.co for v in o.data.vertices]
                F += [[base + i for i in p.vertices] for p in o.data.polygons]
            self.bvh[part] = BVHTree.FromPolygons(V, F)
            self.__dict__.setdefault('verts', {})[part] = np.array([v[:] for v in V])

    def E(self, name):
        return self.empty[name].copy()

    def hand_on(self, W, name):
        """Hand bone matrix for the hand frame empty `name` (gripR, gripL) of this weapon posed at W."""
        return W @ self.empty[name] @ RX90

    def part_world(self, W, part, D=None):
        return W @ self.empty[part] @ (D or Matrix())

def signed_dist(bvh, p):
    loc, nor, idx, d = bvh.find_nearest(p)
    if loc is None: return 1.0
    return d if (p - loc).dot(nor) >= 0 else -d

# ------------------------------------------------------------------------------------------------ skin
class Skin:
    """Linear blend skinning of the arms mesh in numpy (4 strongest influences, as glTF/three.js)."""
    def __init__(self, mesh, rig):
        self.rig = rig
        me = mesh.data
        self.P = np.array([v.co[:] for v in me.vertices])
        self.N = np.array([v.normal[:] for v in me.vertices])
        names = {g.index: g.name for g in mesh.vertex_groups}
        bones = rig.bones
        self.bidx = {b: i for i, b in enumerate(bones)}
        n = len(self.P)
        J = np.zeros((n, 4), int); Wt = np.zeros((n, 4))
        for v in me.vertices:
            gs = sorted([(g.weight, names[g.group]) for g in v.groups if g.weight > 0 and names[g.group] in self.bidx], reverse=True)[:4]
            s = sum(w for w, _ in gs) or 1.0
            for k, (w, b) in enumerate(gs):
                J[v.index, k] = self.bidx[b]; Wt[v.index, k] = w / s
        self.J, self.Wt = J, Wt
        self.dom = [bones[J[i, 0]] for i in range(n)]
        self.inv = np.array([np.array(rig.Mr[b].inverted()) for b in bones])

    def pose(self, W, idx=None):
        """World positions of the vertices (all, or idx) for the world bone matrices W (dict)."""
        S = np.array([np.array(W[b]) for b in self.rig.bones]) @ self.inv     # (B,4,4)
        J = self.J if idx is None else self.J[idx]
        Wt = self.Wt if idx is None else self.Wt[idx]
        P = self.P if idx is None else self.P[idx]
        Ph = np.concatenate([P, np.ones((len(P), 1))], 1)
        out = np.zeros((len(P), 3))
        for k in range(4):
            M = S[J[:, k]]                                    # (n,4,4)
            out += Wt[:, k:k + 1] * np.einsum('nij,nj->ni', M, Ph)[:, :3]
        return out

    def verts_of(self, prefixes):
        return np.array([i for i, b in enumerate(self.dom) if b.startswith(prefixes)], int)

# ------------------------------------------------------------------------------------------------ arms
HINGE = {'l': Vector((0, 0, 1)), 'r': Vector((0, 0, -1))}

def place_shoulder(rig, L, W, s, target):
    """Move the clavicle so the upper arm head lands at target (first-person shoulders are free to move)."""
    cur = W['upperarm_' + s].translation
    M = W['clavicle_' + s].copy(); M.translation = M.translation + (Vector(target) - cur)
    rig.set_world(L, W, 'clavicle_' + s, M)

def arm_to(rig, L, W, s, Mhand, pole, twist=0.7, reach=0.93):
    """Two-bone IK of shoulder-elbow-wrist onto the hand bone matrix Mhand, elbow toward pole, forearm twist share.
    When the wrist is beyond `reach` of the arm's length the shoulder is carried toward it (up to 0.16 m)."""
    S = W['upperarm_' + s].translation; l1 = rig.len['upperarm_' + s]; l2 = rig.len['lowerarm_' + s]
    d = Mhand.translation - S
    if d.length > reach * (l1 + l2):
        mv = min(0.16, d.length - reach * (l1 + l2))
        place_shoulder(rig, L, W, s, S + d.normalized() * mv)
    rig.two_bone(L, W, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, Mhand.translation, pole, HINGE[s],
                 end_rot=Mhand.to_3x3())
    # forearm twist bone: a share of the hand's roll about the forearm axis
    lo = W['lowerarm_' + s]; ax = (lo.to_3x3() @ Vector((0, 1, 0))).normalized()
    hx = (W['hand_' + s].to_3x3() @ rig.Rr['hand_' + s].inverted() @ rig.Rr['lowerarm_' + s] @ Vector((1, 0, 0)))
    lx = lo.to_3x3() @ Vector((1, 0, 0))
    a = hx - ax * hx.dot(ax); b = lx - ax * lx.dot(ax)
    if a.length > 1e-6 and b.length > 1e-6:
        ang = math.atan2(b.normalized().cross(a.normalized()).dot(ax), b.normalized().dot(a.normalized()))
        tb = 'lowerarm_twist_' + s
        rig.set_world(L, W, tb, W['lowerarm_' + s] @ rig.Lr[tb])
        rig.rot_world(L, W, tb, Quaternion(ax, ang * twist))
    # the hand is a child of the lower arm: restore its world matrix after the twist bone moved (it did not)
    return W

def palm_normal(rig, W, s):
    return (rig.delta(W, 'hand_' + s) @ Vector((0, 0, -1))).normalized()

def set_fingers(rig, L, W, s, ang):
    """ang: finger -> (a1, a2, a3) curl angles in radians (+ toward the palm), thumb also takes 'spread' as a4."""
    palm = palm_normal(rig, W, s)
    for f in FINGERS:
        a = ang.get(f)
        if a is None: continue
        if f == 'thumb' and len(a) > 3 and a[3]:
            b = 'thumb_01_' + s
            d = (W[b].to_3x3() @ Vector((0, 1, 0))).normalized()
            rig.rot_world(L, W, b, Quaternion(d, a[3] * (1 if s == 'r' else -1)))
        for j in range(3):
            b = '%s_0%d_%s' % (f, j + 1, s)
            d = (W[b].to_3x3() @ Vector((0, 1, 0))).normalized()
            ax = d.cross(palm).normalized()
            rig.rot_world(L, W, b, Quaternion(ax, a[j]))

def mix_fingers(A, B, t):
    out = {}
    for f in set(A) | set(B):
        a = A.get(f, (0, 0, 0)); b = B.get(f, (0, 0, 0))
        n = max(len(a), len(b))
        a = tuple(a) + (0,) * (n - len(a)); b = tuple(b) + (0,) * (n - len(b))
        out[f] = tuple(x + (y - x) * t for x, y in zip(a, b))
    return out

RELAXED = {'index': (0.25, 0.35, 0.2), 'middle': (0.35, 0.45, 0.25), 'ring': (0.45, 0.5, 0.3), 'pinky': (0.55, 0.55, 0.3),
           'thumb': (0.15, 0.2, 0.15, 0.1)}
FLAT = {'index': (0.05, 0.08, 0.05), 'middle': (0.06, 0.08, 0.05), 'ring': (0.08, 0.1, 0.05), 'pinky': (0.1, 0.1, 0.05),
        'thumb': (0.0, 0.05, 0.05, 0.0)}

def close_fingers(rig, skin, L0, W0, s, bvh, Minv, fingers=('index', 'middle', 'ring', 'pinky'), start=None,
                  contact=0.0015, step=math.radians(2.5), maxa=(1.5, 1.7, 1.2), thumb_spread=0.0):
    """Close each finger joint by joint (proximal first) until its skin touches the surface in `bvh` (given in the
    frame Minv maps first-person space into). Returns finger -> (a1, a2, a3[, spread])."""
    out = {}
    for f in fingers:
        segs = ['%s_0%d_%s' % (f, j + 1, s) for j in range(3)]
        idx = [skin.verts_of((segs[j],) + tuple(segs[j + 1:]) + ('%s_04_leaf_%s' % (f, s),)) for j in range(3)]
        a = list((start or {}).get(f, (0.0, 0.0, 0.0)))[:3]
        sp = (thumb_spread if f == 'thumb' else 0.0)
        for j in range(3):
            lo_, hi_ = a[j], maxa[j]
            ang = lo_
            while ang <= hi_:
                a[j] = ang
                L = {k: v.copy() for k, v in L0.items()}; W = {k: v.copy() for k, v in W0.items()}
                set_fingers(rig, L, W, s, {f: tuple(a) + ((sp,) if f == 'thumb' else ())})
                P = skin.pose(W, idx[j])
                dmin = min(signed_dist(bvh, Minv @ Vector(p)) for p in P[::2])
                if dmin < contact:
                    a[j] = max(lo_, ang - step * 0.5)
                    break
                ang += step
            else:
                a[j] = hi_
        out[f] = tuple(a) + ((sp,) if f == 'thumb' else ())
    return out

def inside(bvh, p, dirs=(Vector((0, 0, 1)), Vector((0, 0, -1)), Vector((1, 0, 0)), Vector((-1, 0, 0)), Vector((0, 1, 0)))):
    """Ray-parity inside test, majority of five directions: robust where a scanned mesh is open or has inner faces,
    which fool the nearest-face normal test (an open stock end reads as 'inside' from the face normal alone)."""
    votes = 0
    for d in dirs:
        o = Vector(p); hits = 0
        for _ in range(40):
            loc, nor, idx, dist = bvh.ray_cast(o, d, 2.0)
            if loc is None: break
            hits += 1; o = loc + d * 1e-5
        votes += hits & 1
    return votes >= 3

def penetration(skin, W, bvh, Minv, tol=0.002, idx=None):
    """Arm vertices inside the weapon by more than tol: count and deepest (m). A vertex counts only when both the
    nearest-face test and the ray-parity test agree it is inside."""
    P = skin.pose(W, idx)
    n, deep = 0, 0.0
    for p in P:
        q = Minv @ Vector(p)
        d = signed_dist(bvh, q)
        if d < -tol and inside(bvh, q):
            n += 1; deep = max(deep, -d)
    return n, deep

def wrap_fingers(rig, skin, L0, W0, s, bvh, Minv, fingers=('index', 'middle', 'ring', 'pinky', 'thumb'), start=None,
                 gap=0.0010, maxa=(1.5, 1.75, 1.3), thumb_spread=0.0, reach=None):
    """Wrap each finger on the surface: coordinate descent on the three joint angles so that every phalanx just
    touches (gap) and none sinks in. A phalanx that cannot reach the surface stops at the closest angle."""
    out = {}
    for f in fingers:
        segs = ['%s_0%d_%s' % (f, j + 1, s) for j in range(3)]
        ids = [skin.verts_of((segs[j],) + (('%s_04_leaf_%s' % (f, s),) if j == 2 else ())) for j in range(3)]
        ids = [i[::2] if len(i) > 40 else i for i in ids]
        sp = thumb_spread if f == 'thumb' else 0.0
        def cost(a):
            L = {k: v.copy() for k, v in L0.items()}; W = {k: v.copy() for k, v in W0.items()}
            set_fingers(rig, L, W, s, {f: tuple(a) + ((sp,) if f == 'thumb' else ())})
            c = 0.0
            for j in range(3):
                P = skin.pose(W, ids[j])
                ds = [signed_dist(bvh, Minv @ Vector(p)) for p in P]
                d = min(ds)
                if d < 0 and not any(inside(bvh, Minv @ Vector(P[i])) for i in range(len(P)) if ds[i] < 0):
                    d = min(abs(x) for x in ds)
                pen = max(0.0, -(d - 0.0003))
                c += pen * pen * 4e6 + (d - gap) ** 2 * 1e3 * (1.0 if d < 0.02 else 0.3)
            return c + sum(x * x for x in a) * 0.02
        a = list((start or {}).get(f, (0.3, 0.3, 0.2)))[:3]
        c0 = cost(a); st = math.radians(8)
        while st > math.radians(0.6):
            moved = False
            for j in range(3):
                for sg in (1, -1):
                    b = a[:]; b[j] = max(-0.15, min(maxa[j], b[j] + sg * st))
                    c = cost(b)
                    if c < c0 - 1e-9: a, c0, moved = b, c, True
            if not moved: st *= 0.5
        out[f] = tuple(a) + ((sp,) if f == 'thumb' else ())
    return out
