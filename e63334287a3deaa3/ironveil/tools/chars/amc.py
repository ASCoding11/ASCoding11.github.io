# Minimal CMU ASF/AMC reader + forward kinematics (numpy). Positions in metres, Z-up, as world joint positions per frame.
import numpy as np, math

UNIT = 2.54 / 100 / 0.45      # ASF length unit 0.45 -> inches -> metres

def rot(axis, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    if axis == 'x': return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == 'y': return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

def euler(vals, order):
    """order e.g. 'XYZ': rotate about X first, then Y, then Z (static frame) -> R = Rz Ry Rx"""
    R = np.eye(3)
    for ax, v in zip(order.lower(), vals):
        R = rot(ax, v) @ R
    return R

class Skel:
    def __init__(self, path):
        self.bones = {}; self.parent = {}; self.children = {}
        txt = open(path).read()
        bd = txt.split(':bonedata')[1].split(':hierarchy')[0]
        for blk in bd.split('begin')[1:]:
            lines = [l.split() for l in blk.split('end')[0].strip().splitlines() if l.strip()]
            b = {'dof': []}
            for l in lines:
                if l[0] == 'name': b['name'] = l[1]
                elif l[0] == 'direction': b['dir'] = np.array([float(x) for x in l[1:4]])
                elif l[0] == 'length': b['len'] = float(l[1]) * UNIT
                elif l[0] == 'axis': b['axis'] = ([float(x) for x in l[1:4]], l[4])
                elif l[0] == 'dof': b['dof'] = l[1:]
            C = euler(b['axis'][0], b['axis'][1])
            b['C'] = C; b['Cinv'] = C.T
            self.bones[b['name']] = b
        hi = txt.split(':hierarchy')[1].split('end')[0].strip().splitlines()
        for l in hi:
            p = l.split()
            if not p or p[0] == 'begin': continue
            for c in p[1:]:
                self.parent[c] = p[0]; self.children.setdefault(p[0], []).append(c)
        ro = txt.split(':root')[1].split(':bonedata')[0]
        self.root_order = [l.split()[1:] for l in ro.splitlines() if l.strip().startswith('order')][0]
        ax = [l.split()[1] for l in ro.splitlines() if l.strip().startswith('axis')][0]
        self.root_axis = ax

def read_amc(path):
    frames = []; cur = None
    for l in open(path):
        l = l.strip()
        if not l or l[0] in '#:': continue
        p = l.split()
        if p[0].isdigit():
            cur = {}; frames.append(cur)
        else:
            cur[p[0]] = [float(x) for x in p[1:]]
    return frames

def fk(sk, fr):
    """Returns dict bone -> (start position, end position) in metres (ASF Y-up converted to Z-up, -Y forward unknown)."""
    rv = fr['root']
    vals = dict(zip([o.lower() for o in sk.root_order], rv))
    T = np.array([vals['tx'], vals['ty'], vals['tz']]) * UNIT
    R0 = euler([vals['rx'], vals['ry'], vals['rz']], 'XYZ')
    out = {'root': (T, T)}
    mats = {'root': R0}
    def walk(name, pstart):
        for c in sk.children.get(name, []):
            b = sk.bones[c]
            Pm = mats[name]
            if b['dof']:
                v = fr.get(c, [0] * len(b['dof']))
                ang = [0.0, 0.0, 0.0]
                for d, x in zip(b['dof'], v):
                    ang['xyz'.index(d[-1])] = x
                M = euler(ang, 'XYZ')
            else:
                M = np.eye(3)
            W = Pm @ b['C'] @ M @ b['Cinv']
            mats[c] = W
            end = pstart + W @ (b['dir'] * b['len'])
            out[c] = (pstart, end)
            walk(c, end)
    walk('root', T)
    # Y-up -> Z-up
    conv = lambda p: np.array([p[0], -p[2], p[1]])
    return {k: (conv(a), conv(b)) for k, (a, b) in out.items()}

def load(asf, amcf, step=4):
    sk = Skel(asf); frs = read_amc(amcf)
    return [fk(sk, f) for f in frs[::step]], 120.0 / step
