# Tailored cloth detail on the high-poly garment before the bake (displacement along the normal, in metres):
# compression folds in the elbow crook and behind the knee, drag folds from the shoulder to the armpit, bunching
# above the belt, puckering where the trousers blouse over the boots, and sewn seams (a pressed groove with two
# rows of stitch dimples) down the outside of the legs, under the sleeves, down the back and over the shoulders.
import math
import numpy as np
from mathutils import Vector, noise
import geo as G

def _seg(H, b):
    h, t = H['J'][b]
    return np.array(h), np.array(t)

def _along(P, h, t):
    ax = t - h; L = np.linalg.norm(ax); ax = ax / L
    rel = P - h; s = rel @ ax
    rad = rel - np.outer(s, ax)
    return s, rad, ax, L

def tailor(ob, H, labels, upper=('jacket', 'tunic', 'coat', 'smock'), lower=('trousers',), amp=1.0):
    me = ob.data
    P = G.coords(me); N = G.normals(me)
    lab = np.array(labels)
    up_m = np.isin(lab, upper); lo_m = np.isin(lab, lower)
    d = np.zeros(len(P))
    sd = np.full(len(P), 1.0); ss = np.zeros(len(P))     # distance to the nearest seam, position along it
    def seam(on, dist, along):
        m = on & (np.abs(dist) < sd)
        sd[m] = np.abs(dist)[m]; ss[m] = along[m]
    nz = np.array([noise.noise(Vector((p[0] * 9, p[1] * 9, p[2] * 9))) for p in P])

    for s_ in 'lr':
        # elbow crook: compression rings, strongest on the inside of the bend (bind pose: crook faces forward, -Y)
        h, t = _seg(H, 'lowerarm_' + s_)
        s, rad, ax, L = _along(P, h, t)
        rn = rad / np.maximum(np.linalg.norm(rad, axis=1), 1e-6)[:, None]
        crook = np.clip(-rn[:, 1], 0, 1) * 0.8 + 0.2
        env = np.exp(-(s / 0.07) ** 2) * (np.linalg.norm(rad, axis=1) < 0.09)
        d += up_m * env * crook * 0.0055 * np.sin(2 * np.pi * s / 0.026 + nz * 1.5)
        # sleeve seam underneath the arm, from armpit to cuff (on the upper and lower arm)
        for b in ('upperarm_' + s_, 'lowerarm_' + s_):
            h, t = _seg(H, b); s, rad, ax, L = _along(P, h, t)
            r = np.linalg.norm(rad, axis=1); rn = rad / np.maximum(r, 1e-6)[:, None]
            ang = np.arccos(np.clip(-rn[:, 2], -1, 1))       # 0 straight under the arm
            arc = ang * r
            on = up_m & (s > -0.02) & (s < L + 0.02) & (r < 0.09)
            seam(on, arc, s)
        # knee: folds behind the knee and a softer set over the front
        h, t = _seg(H, 'calf_' + s_)
        s, rad, ax, L = _along(P, h, t)
        rn = rad / np.maximum(np.linalg.norm(rad, axis=1), 1e-6)[:, None]
        back = np.clip(rn[:, 1], 0, 1) * 0.75 + 0.25
        env = np.exp(-(s / 0.08) ** 2) * (np.linalg.norm(rad, axis=1) < 0.11)
        d += lo_m * env * back * 0.005 * np.sin(2 * np.pi * s / 0.032 + nz * 1.8)
        # outer leg seam from the hip to the hem (thigh and calf)
        for b in ('thigh_' + s_, 'calf_' + s_):
            h, t = _seg(H, b); s, rad, ax, L = _along(P, h, t)
            r = np.linalg.norm(rad, axis=1); rn = rad / np.maximum(r, 1e-6)[:, None]
            outward = 1.0 if s_ == 'l' else -1.0
            ang = np.arccos(np.clip(rn[:, 0] * outward, -1, 1))
            on = lo_m & (s > -0.03) & (s < L + 0.02) & (r < 0.13)
            seam(on, ang * r, s)
        # blousing over the boot top: vertical puckers just above the ankle band
        h, t = _seg(H, 'calf_' + s_)
        s, rad, ax, L = _along(P, h, t)
        r = np.linalg.norm(rad, axis=1); rn = rad / np.maximum(r, 1e-6)[:, None]
        th = np.arctan2(rn[:, 1], rn[:, 0])
        band = np.exp(-((s - (L - 0.17)) / 0.05) ** 2)
        d += lo_m * band * 0.004 * (np.sin(th * 13 + nz * 2) * 0.5 + 0.5)

    # shoulder-to-armpit drag folds (diagonal ridges on chest and back between the collar bone and the armpit)
    sh = np.array(H['J']['upperarm_l'][0]); pz = sh[2]
    ax_ = np.abs(P[:, 0])
    reg = up_m & (ax_ > 0.06) & (ax_ < 0.2) & (P[:, 2] > pz - 0.2) & (P[:, 2] < pz + 0.02)
    diag = (ax_ - 0.06) * 0.75 + (pz - P[:, 2]) * 0.65
    fade = np.clip(1 - np.abs(P[:, 2] - (pz - 0.09)) / 0.11, 0, 1) * np.clip((ax_ - 0.06) / 0.05, 0, 1)
    d += reg * fade * 0.0045 * np.sin(2 * np.pi * diag / 0.045 + nz)
    # bunching above the belt: horizontal ripples broken by noise
    pel = np.array(H['J']['pelvis'][0]); wz = pel[2] + 0.075
    band = np.exp(-((P[:, 2] - (wz + 0.05)) / 0.04) ** 2)
    d += up_m * band * 0.0045 * np.sin(2 * np.pi * (P[:, 2] - wz) / 0.02 + nz * 3.0)
    # back centre seam and shoulder (yoke) seams
    back = P[:, 1] > np.array(H['J']['spine_02'][0])[1]
    seam(up_m & back & (P[:, 2] > wz) & (P[:, 2] < pz + 0.08), np.abs(P[:, 0]), P[:, 2])
    top = up_m & (ax_ > 0.07) & (ax_ < 0.2) & (P[:, 2] > pz - 0.02)
    seam(top, np.abs(P[:, 1] - sh[1]), P[:, 0])

    d *= amp
    G.set_coords(me, P + N * d[:, None])
    # seams as mesh fields for the cloth shader (it draws the groove and stitches at texel resolution):
    # seam_d = 0.05 - distance (0 = no seam nearby, also on pieces without the field), seam_s = along the seam
    for nm, val in (('seam_d', np.clip(0.05 - sd, 0, 0.05)), ('seam_s', ss)):
        a = me.attributes.get(nm) or me.attributes.new(nm, 'FLOAT', 'POINT')
        a.data.foreach_set('value', val.astype(np.float32))
    return float(np.abs(d).max()), int((sd < 0.02).sum())

def _seam(dist, along, width=0.004, depth=0.0016, stitch=0.0055, row=0.0035):
    """A pressed seam: groove of `width` at dist 0, plus two rows of stitch dimples `row` either side."""
    g = -depth * np.exp(-(dist / width) ** 2)
    st = (0.5 + 0.5 * np.cos(2 * np.pi * along / stitch)) ** 6
    rows = np.exp(-((np.abs(dist) - row) / 0.0009) ** 2)
    return g - 0.0007 * st * rows
