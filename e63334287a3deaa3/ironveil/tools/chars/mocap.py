# Retarget CMU motion capture onto the shared UAL-named skeleton as clean, in-place locomotion loops.
#
# Works on joint positions (amc.py forward kinematics), then poses our rig with aim constraints and two-bone IK:
#   1. cut a segment of a take, optionally mirror it (swap left and right), turn it so the body faces -Y
#   2. find foot contacts; pick the left-contact -> left-contact cycle that loops best, remove the residual drift
#   3. warp time so the left foot lands at phase 0 and the right foot at phase 0.5
#   4. scale to our leg length; optionally turn the hips toward a travel direction (derived diagonals) or lower the pelvis
#   5. pin every planted foot on a straight line moving at exactly -velocity (no sliding in the bake); spread the
#      correction over the swing so the swing still lands where the pin needs it
#   6. pose the rig frame by frame (pelvis frame, spine/neck/head aims, arm IK with elbow poles, leg IK with knee poles)
import math, numpy as np
from mathutils import Vector, Quaternion, Matrix
import amc

FWD = Vector((0, -1, 0)); LEFT = Vector((1, 0, 0)); UP = Vector((0, 0, 1))
SIDED = ['hipjoint', 'femur', 'tibia', 'foot', 'toes', 'clavicle', 'humerus', 'radius', 'wrist', 'hand', 'fingers', 'thumb']
# Capture rate: most subjects are 120 Hz; these were recorded at 60 Hz (checked: vertical hip acceleration in the
# flight phase of their runs is about 4 g when read as 120 Hz, and their walking cadence is double a human one).
RATE60 = {'139', '141', '143'}
UPPER = ['lowerback', 'upperback', 'thorax', 'lowerneck', 'upperneck', 'head'] + [s + n for s in 'lr' for n in ('clavicle', 'humerus', 'radius', 'wrist', 'hand', 'fingers', 'thumb')]

def V(a): return Vector((float(a[0]), float(a[1]), float(a[2])))

class Take:
    """A segment of a CMU trial as joint start/end positions, facing -Y, in metres (Z up)."""
    def __init__(self, data_dir, trial, t0, t1, mirror=False, fps=60):
        s = trial.split('_')[0]
        self.sk = amc.Skel(data_dir + s + '.asf')
        cap = 60 if s in RATE60 else 120
        F, _ = amc.load(data_dir + s + '.asf', data_dir + trial + '.amc', step=max(1, int(round(cap / fps))))
        self.fps = cap / max(1, int(round(cap / fps)))
        i0, i1 = int(t0 * self.fps), min(len(F) - 1, int(t1 * self.fps))
        F = F[i0:i1 + 1]
        self.n = len(F)
        J = {nm: [np.array([f[nm][k] for f in F]) for k in (0, 1)] for nm in F[0]}
        self.leg = self.sk.bones['lfemur']['len'] + self.sk.bones['ltibia']['len']
        if mirror:
            def sw(n):
                for b in SIDED:
                    if n == 'l' + b: return 'r' + b
                    if n == 'r' + b: return 'l' + b
                return n
            J2 = {}
            for n, (a, b) in J.items():
                a = a.copy(); b = b.copy(); a[:, 0] *= -1; b[:, 0] *= -1
                J2[sw(n)] = [a, b]
            J = J2
        L = J['lfemur'][0]; R = J['rfemur'][0]
        left = (L - R).mean(0); left[2] = 0; left /= np.linalg.norm(left)
        fwd = np.cross(left, [0, 0, 1])
        ang = math.atan2(fwd[0], -fwd[1])
        c, sn = math.cos(-ang), math.sin(-ang)
        Rz = np.array([[c, -sn, 0], [sn, c, 0], [0, 0, 1]])
        for n in J: J[n] = [J[n][0] @ Rz.T, J[n][1] @ Rz.T]
        self.J = J
        self.mid = (J['lfemur'][0] + J['rfemur'][0]) / 2
        tt = np.arange(self.n) / self.fps
        self.vel = np.array([np.polyfit(tt, self.mid[:, 0], 1)[0], np.polyfit(tt, self.mid[:, 1], 1)[0], 0.0])

    def foot_pts(self, s):
        return self.J[s + 'foot'][0], self.J[s + 'toes'][0], self.J[s + 'toes'][1]   # ankle, ball, toe tip

    def contacts(self, s):
        an, ba, tip = self.foot_pts(s)
        sp = np.r_[0, np.linalg.norm(np.diff(ba[:, :2], axis=0), axis=1) * self.fps]
        spa = np.r_[0, np.linalg.norm(np.diff(an[:, :2], axis=0), axis=1) * self.fps]
        v = max(0.3, float(np.linalg.norm(self.vel)))
        lowb = ba[:, 2] < np.percentile(ba[:, 2], 8) + 0.035
        lowa = an[:, 2] < np.percentile(an[:, 2], 8) + 0.035
        c = (lowb | lowa) & (np.minimum(sp, spa) < 0.2 + 0.25 * v)
        # close one-frame gaps, drop one-frame blips
        for i in range(1, self.n - 1):
            if not c[i] and c[i - 1] and c[i + 1]: c[i] = True
        for i in range(1, self.n - 1):
            if c[i] and not c[i - 1] and not c[i + 1]: c[i] = False
        return c

    def strikes(self, s):
        c = self.contacts(s)
        return [i for i in range(1, self.n) if c[i] and not c[i - 1]]

    def best_cycle(self):
        """(a, r, b, shift): strikes of one foot at a and b, the other foot at r. shift 0.5 when the cycle starts on the
        right foot (output phase 0 is always the left contact)."""
        Ls, Rs = self.strikes('l'), self.strikes('r')
        best = None
        P = self.inplace_all()
        for A_, B_, shift in ((Ls, Rs, 0.0), (Rs, Ls, 0.5)):
            for a, b in zip(A_, A_[1:]):
                r = [x for x in B_ if a < x < b]
                if len(r) != 1: continue
                d = sum(float(np.linalg.norm(P[n][b] - P[n][a])) for n in ('lfoot', 'rfoot', 'lwrist', 'rwrist', 'head'))
                score = d + 0.002 * abs((a + b) / 2 - self.n / 2) + shift * 0.01
                if best is None or score < best[0]: best = (score, a, r[0], b, shift)
        if best is None: raise RuntimeError('no full cycle: strikes L %s R %s' % (Ls, Rs))
        return best[1:]

    def inplace_all(self):
        tt = np.arange(self.n) / self.fps
        drift = np.outer(tt, self.vel)
        drift -= drift.mean(0)
        return {n: self.J[n][0] - drift - np.r_[self.mid[:, :2].mean(0), 0] for n in self.J} | \
               {n + '>': self.J[n][1] - drift - np.r_[self.mid[:, :2].mean(0), 0] for n in self.J}


def build_cycle(tk, our_leg, ank_rest_z, theta=None, hip_yaw=0.0, crouch=0.0, crouch_lean=0.0, n_out=None, out_fps=30,
                speed_scale=1.0, stride_scale=1.0, cycle=None, foot_len=None):
    """Returns (frames, T, speed, theta_deg): frames = list of dict joint -> Vector (our scale, in place, -Y forward)."""
    a, r, b, shift = cycle or tk.best_cycle()
    P = tk.inplace_all()
    k = our_leg / tk.leg
    src_T = (b - a) / tk.fps
    v_src = tk.vel * k
    th_src = math.degrees(math.atan2(v_src[0], -v_src[1]))
    th = th_src if theta is None else theta
    n = n_out or max(8, int(round(src_T / speed_scale * out_fps)))
    T = n / out_fps                                   # whole frames at the clip rate, so the loop closes exactly
    speed = float(np.linalg.norm(v_src[:2]))
    dist = speed * src_T * stride_scale               # metres per cycle
    vel = Vector((math.sin(math.radians(th)), -math.cos(math.radians(th)), 0)) * dist / T
    # floor: ball height while planted
    cl, cr = tk.contacts('l'), tk.contacts('r')
    names = [nm for nm in P]
    seam = {nm: P[nm][b] - P[nm][a] for nm in names}

    def src_at(p):
        p = (p + shift) % 1.0
        f = a + (r - a) * 2 * p if p < 0.5 else r + (b - r) * (2 * p - 1)
        i = int(math.floor(f)); u = f - i; i2 = min(i + 1, tk.n - 1)
        lin = (f - a) / (b - a)
        return {nm: (P[nm][i] * (1 - u) + P[nm][i2] * u) - seam[nm] * lin for nm in names}, f

    raw = [src_at(i / n) for i in range(n)]
    # contact flags in output phase
    def cflag(c, f):
        i = int(round(f)); return bool(c[min(max(i, 0), tk.n - 1)])
    flags = {'l': [cflag(cl, f) for _, f in raw], 'r': [cflag(cr, f) for _, f in raw]}
    # make sure each foot is planted at its own strike frame (phase 0 left, 0.5 right)
    flags['l'][0] = True; flags['r'][n // 2] = True
    # longer steps (stride_scale): feet and knees move further from the hips along the travel line
    if abs(stride_scale - 1) > 1e-3:
        dvec = np.array([math.sin(math.radians(th)), -math.cos(math.radians(th)), 0.0])
        for J, f in raw:
            hm = (J['lfemur'] + J['rfemur']) / 2
            for nm in list(J):
                base = nm.rstrip('>')
                w = 1.0 if base[1:] in ('foot', 'toes') or nm in ('ltibia>', 'rtibia>') else (0.5 if base[1:] == 'tibia' else 0.0)
                if base[0] not in 'lr' or not w: continue
                along = float((J[nm] - hm) @ dvec)
                J[nm] = J[nm] + dvec * along * (stride_scale - 1) * w
    ball_z = []
    for s in 'lr':
        for i in range(n):
            if flags[s][i]: ball_z.append(raw[i][0][s + 'toes'][2])
    floor = float(np.median(ball_z)) if ball_z else 0.0
    # scale about the hips' ground point; then lift so the planted ankle sits at our rest ankle height
    frames = []
    for (J, f) in raw:
        F = {}
        for nm, p in J.items():
            q = np.array(p, dtype=float); q[2] -= floor
            F[nm] = Vector(q * k)
        frames.append(F)
    # our foot length: keep the captured ankle->ball direction, put the ball where our ball is
    if foot_len:
        for F in frames:
            for s in 'lr':
                an, to, tip = F[s + 'foot'], F[s + 'toes'], F[s + 'toes>']
                nb = an + (to - an).normalized() * foot_len
                F[s + 'toes>'] = tip + (nb - to); F[s + 'toes'] = nb
    # floor: the ball sits at our rest ball height (1 cm) when the foot is flat in stance
    bz = []
    for s in 'lr':
        for i in range(n):
            if flags[s][i]: bz.append(frames[i][s + 'toes'].z)
    dz = 0.012 - float(np.percentile(bz, 25))
    for F in frames:
        for nm in F: F[nm].z += dz
    # derived directions: turn the hips (and legs) toward travel, counter-turn the upper body progressively
    TW = {'lowerback>': 0.55, 'upperback': 0.55, 'upperback>': 0.2, 'thorax': 0.2}
    def share(nm):
        if nm in TW: return TW[nm]
        if nm.rstrip('>') in UPPER and nm != 'lowerback': return 0.0
        return 1.0
    if abs(hip_yaw) > 1e-4:
        for F in frames:
            piv = (F['lfemur'] + F['rfemur']) / 2; piv.z = 0
            for nm in list(F):
                amt = share(nm)
                if amt: F[nm] = piv + Quaternion(UP, hip_yaw * amt) @ (F[nm] - piv)
    # crouch: lower everything above the ankles (legs solve it with IK later), pitch the trunk forward about the hips
    if crouch > 0:
        FEET = ('lfoot', 'rfoot', 'ltoes', 'rtoes', 'ltoes>', 'rtoes>', 'lfoot>', 'rfoot>', 'ltibia>', 'rtibia>')
        for F in frames:
            for nm in list(F):
                if nm in FEET: continue
                F[nm] = F[nm] - Vector((0, 0, crouch))
            if crouch_lean:
                piv = (F['lfemur'] + F['rfemur']) / 2
                for nm in list(F):
                    amt = 1.0 - share(nm) if nm.rstrip('>') in UPPER or nm in TW else 0.0
                    if nm.rstrip('>') in UPPER and nm != 'lowerback': amt = 1.0
                    if amt: F[nm] = piv + Quaternion(LEFT, crouch_lean * amt) @ (F[nm] - piv)
    # foot pinning: each planted foot moves at exactly -vel (in place) on a straight line
    dt = T / n
    for s in 'lr':
        fl = flags[s]
        corr = [None] * n
        i = 0
        # contact runs (cyclic)
        runs = []
        start = None
        for j in range(n):
            if fl[j] and (j == 0 or not fl[j - 1]): start = j
            if fl[j] and (j == n - 1 or not fl[j + 1]): runs.append((start, j))
        if len(runs) >= 2 and runs[0][0] == 0 and runs[-1][1] == n - 1:
            runs = [(runs[-1][0] - n, runs[0][1])] + runs[1:-1]
        for (j0, j1) in runs:
            jm = (j0 + j1) // 2
            ref = {nm: frames[jm % n][s + nm] for nm in ('foot', 'toes', 'toes>')}
            for j in range(j0, j1 + 1):
                jj = j % n
                # pin the heel (ankle) while the foot is flat, the ball once the heel has lifted
                drift = vel * ((j - jm) * dt)
                ca = (ref['foot'] - drift) - frames[jj][s + 'foot']
                cb = (ref['toes'] - drift) - frames[jj][s + 'toes']
                w = min(1.0, max(0.0, (frames[jj][s + 'foot'].z - ank_rest_z - 0.01) / 0.04))
                c = ca.lerp(cb, w); c.z = 0
                corr[jj] = c
        # interpolate corrections across swings (cyclic), smoothstep
        known = [j for j in range(n) if corr[j] is not None]
        if not known: continue
        for j in range(n):
            if corr[j] is not None: continue
            prv = max([x for x in known if x < j], default=known[-1] - n)
            nxt = min([x for x in known if x > j], default=known[0] + n)
            u = (j - prv) / (nxt - prv); u = u * u * (3 - 2 * u)
            corr[j] = corr[prv % n].lerp(corr[nxt % n], u)
        for j in range(n):
            for nm in ('foot', 'toes', 'toes>', 'tibia>'):
                key = s + nm
                if key in frames[j]: frames[j][key] = frames[j][key] + corr[j]
        # planted heel/ball never under the floor
        for j in range(n):
            for nm in ('toes', 'toes>'):
                p = frames[j][s + nm]
                if p.z < 0.01: frames[j][s + nm] = Vector((p.x, p.y, 0.01))
    # legs never over-stretched: lower the body (not the feet) where an ankle is out of reach, smoothed over time
    reach = our_leg * 0.985
    need = []
    for F in frames:
        d = 0.0
        for s in 'lr':
            h, a_ = F[s + 'femur'], F[s + 'foot']
            hz = a_.z + math.sqrt(max(0.0, reach * reach - ((h.x - a_.x) ** 2 + (h.y - a_.y) ** 2)))
            d = max(d, h.z - hz)
        need.append(d)
    drop = [max(need[(j + o) % n] * (1 - abs(o) / 4.0) for o in range(-3, 4)) for j in range(n)]
    FEET = ('lfoot', 'rfoot', 'ltoes', 'rtoes', 'ltoes>', 'rtoes>', 'lfoot>', 'rfoot>', 'ltibia>', 'rtibia>')
    for F, d in zip(frames, drop):
        if d <= 0: continue
        for nm in F:
            if nm not in FEET: F[nm] = F[nm] - Vector((0, 0, d))
    return frames, T, dist / T, th, flags


def pose(R, L, W, F, A):
    """Pose the rig from one retargeted frame. A: dict with PEL0, HIPMID (rest), helpers two_bone etc."""
    hipL, hipR = F['lfemur'], F['rfemur']
    mid = (hipL + hipR) / 2
    left = (hipL - hipR).normalized()
    up = (F['lowerback>'] - F['lowerback']).normalized()
    D = R.frame_rot(UP, LEFT, up, left)
    M = (D.to_4x4() @ Matrix.Translation(-A['HIPMID']) @ R.Mr['pelvis'])
    M.translation = mid + D @ (R.Mr['pelvis'].translation - A['HIPMID'])
    R.set_world(L, W, 'pelvis', M)
    sl = (F['lhumerus'] - F['rhumerus']).normalized()
    for b, seg, ref in (('spine_01', 'lowerback', left), ('spine_02', 'upperback', (left + sl).normalized()),
                        ('spine_03', 'thorax', sl), ('neck_01', 'lowerneck', sl), ('Head', 'upperneck', sl)):
        d = F[seg + '>'] - F[seg]
        if seg == 'upperneck': d = (F['head>'] - F['upperneck'])
        R.aim_bone(L, W, b, d.normalized(), ref, LEFT)
    for s in 'lr':
        cl = F[s + 'humerus'] - F[s + 'clavicle']
        if cl.length > 1e-4:
            R.aim_bone(L, W, 'clavicle_' + s, cl.normalized())
        sh, el, wr = F[s + 'humerus'], F[s + 'radius'], F[s + 'wrist']
        ua, fa = (el - sh).normalized(), (wr - el).normalized()
        o = W['upperarm_' + s].translation
        tgt = o + ua * R.len['upperarm_' + s] + fa * R.len['lowerarm_' + s]
        side = left if s == 'l' else -left
        pole = el - (sh + wr) * 0.5 - left.cross(up).normalized() * 0.03 + side * 0.02
        hinge = Vector((0, 0, -1)) if s == 'l' else Vector((0, 0, 1))
        R.two_bone(L, W, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, tgt, pole.normalized(), hinge)
        hd = F[s + 'hand>'] - F[s + 'hand'] if s + 'hand>' in F else None
        if hd is not None and hd.length > 1e-4:
            R.aim_bone(L, W, 'hand_' + s, hd.normalized())
    for s in 'lr':
        hp, kn, an = F[s + 'femur'], F[s + 'tibia'], F[s + 'foot']
        # knee direction from the capture, biased toward the pelvis' forward so a straight leg cannot flip the twist
        fwd = left.cross(up).normalized()
        pole = (kn - (hp + an) * 0.5) + fwd * 0.12
        pole = pole.normalized()
        # our foot is not the captured foot's length: once the heel is up, place the ankle so our ball lands on the
        # captured (pinned) ball instead of the ankle
        to = F[s + 'toes']
        w = min(1.0, max(0.0, (an.z - A['ANKZ'] - 0.01) / 0.04))
        if w > 0 and (to - an).length > 1e-4:
            an = an.lerp(to - (to - an).normalized() * R.len['foot_' + s], w)
        R.two_bone(L, W, 'thigh_' + s, 'calf_' + s, 'foot_' + s, an, pole, Vector((1, 0, 0)))
        fd = F[s + 'toes'] - an
        side = left.cross(UP).cross(UP) * -1 if False else left
        if fd.length > 1e-4:
            R.aim_bone(L, W, 'foot_' + s, fd.normalized(), side, LEFT)
        td = F[s + 'toes>'] - F[s + 'toes']
        if 'ball_' + s in W and td.length > 1e-4:
            R.aim_bone(L, W, 'ball_' + s, td.normalized(), side, LEFT)
