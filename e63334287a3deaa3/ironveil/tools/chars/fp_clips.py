# First-person clips: poses the fp_geo.blend arms around each first-person weapon and writes fp.glb (arms + clips).
# usage: CHARS_WORK=... bvenv/bin/python fp_clips.py [preview|export]
#   preview: renders stills of the key poses from the first-person camera (Cycles, quick) to $FP_WORK/preview
#   export:  writes $FP_WORK/fp.glb and $FP_WORK/fp.json (clip lengths, events, sockets, grip fit report)
# Needs $FP_WORK/fp_geo.blend (fp_arms.py) with textures from fp_tex.py when present, and $FP_WORK/weapons_plain.glb
# (fp_unpack.mjs of assets/weapons.glb).
import bpy, sys, os, math, json, time
import numpy as np
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as ML
import anim_lib as AL
import fp_lib as F
from fp_lib import pose_w, blend_m, rot

T0 = time.time()
def log(*a): print('[clips %5.1fs]' % (time.time() - T0), *a, flush=True)
FPW = os.environ.get('FP_WORK') or (ML.WORK + '/fp')
MODE = sys.argv[-1] if sys.argv[-1] in ('preview', 'export', 'diag') else 'preview'
# diag: KINDS=rifleScoped ONLY=reload,boltCycle -> per-frame penetration by side and bone group, no export
FPS = 30

bpy.ops.wm.open_mainfile(filepath=FPW + ('/fp_tex.blend' if os.path.exists(FPW + '/fp_tex.blend') else '/fp_geo.blend'))
arm = bpy.data.objects['FPRig']; mesh = bpy.data.objects['FPArms']
_g = bpy.data.node_groups.get('glTF Material Output')
if _g: _g.name = 'glTF Settings'      # our one-socket group; the importer would try to extend it
bpy.ops.import_scene.gltf(filepath=FPW + '/weapons_plain.glb')
for o in bpy.data.objects:
    if o not in (arm, mesh): o.hide_render = True
rig = AL.Rig(arm)
skin = F.Skin(mesh, rig)
WPN = {k: F.Weapon(k) for k in ('rifleScoped', 'smg', 'pistol', 'grenade', 'binoculars')}
log('loaded', {k: list(w.empty) for k, w in WPN.items() if k in ('rifleScoped', 'smg', 'pistol')})

def rest():
    L = rig.rest(); return L, rig.W(L)

# shoulders: first-person rigs carry the shoulders forward and in (the head is down on the stock); never seen
SHOULDER = {'r': Vector((0.30, 0.05, -0.50)), 'l': Vector((-0.08, 0.10, -0.45))}
REACH = 0.93   # a shoulder moves toward its hand when the hand is further than this share of the arm's reach
POLE = {'r': Vector((1.0, -0.3, -0.6)), 'l': Vector((-0.6, -0.1, -1.0))}

# ------------------------------------------------------------------------------------------------ base poses
# per weapon: hip (weapon pose at the hip), ads (sight on the camera axis), sprint carry, low (lowered)
def ads_pose(k, extra_back=0.0):
    """Sight line on the lens axis: the scope's eye point at the eye (rifle), or the rear and front sights aligned on
    the axis with the rear sight REAR[k] metres in front of the eye (iron sights)."""
    w = WPN[k]
    if 'scopeEye' in w.empty:
        R = F.RZ180.copy(); R.translation = -(F.RZ180.to_3x3() @ w.E('scopeEye').translation) + Vector((0, extra_back, 0))
        return R
    r_, f_ = w.E('sightRear').translation, w.E('sightFront').translation
    d = (f_ - r_).normalized()                       # in the weapon frame, roughly -Y
    R3 = (F.RZ180.to_3x3() @ d).rotation_difference(Vector((0, 1, 0))).to_matrix() @ F.RZ180.to_3x3()
    R = R3.to_4x4(); R.translation = Vector((0, REAR[k], 0)) - R3 @ r_
    return R
REAR = {'smg': 0.20, 'pistol': float(os.environ.get('PREAR', 0.50))}

BASE = {
    'rifleScoped': dict(hip=pose_w(tuple(float(v) for v in os.environ.get('RIFLE_HIP', '0.20,0.58,-0.27').split(',')),
                                   yaw=float(os.environ.get('RIFLE_YAW', 5.0)), pitch=-1.6, roll=float(os.environ.get('RIFLE_ROLL', -8.0))),
                        sprint=pose_w((0.06, 0.40, -0.25), yaw=38, pitch=14, roll=-55),
                        low=pose_w((0.16, 0.16, -0.32), yaw=10, pitch=-30, roll=-10)),
    'smg': dict(hip=pose_w((0.13, 0.33, -0.098), yaw=0.6, pitch=-1.2, roll=-4.0),
                sprint=pose_w((0.05, 0.36, -0.23), yaw=38, pitch=12, roll=-55),
                low=pose_w((0.16, 0.17, -0.32), yaw=10, pitch=-30, roll=-10)),
    # pistol at the hip: compact, low and right like the long guns (the old pose sat in the middle with both arms
    # rising from below the frame)
    'pistol': dict(hip=pose_w((0.15, 0.37, -0.155), yaw=4.0, pitch=0.0, roll=-6.0),
                   sprint=pose_w((0.10, 0.34, -0.22), yaw=15, pitch=-40, roll=-20),
                   low=pose_w((0.12, 0.22, -0.32), yaw=8, pitch=-45, roll=-10)),
}
for k in BASE: BASE[k]['ads'] = ads_pose(k)
# Hip framing from the composition search (FRAME=1 ... diag): muzzle just below and right of the crosshair, the
# left glove on the fore-end fully in frame, the right glove's upper half at the bottom right, each hand at most
# about 12% of the screen width. (target position, yaw, pitch, roll changes about the grip)
HIPFIX = {'rifleScoped': ((0.26, 0.535, -0.23), 0.4, 8.2, -14.5),
          'smg': (None, 0.0, 0.0, 0.0),
          'pistol': ((0.148, 0.46, -0.138), -7.5, 8.2, 4.0)}
def _hipfix(k):
    pos, yw, pt, rl = HIPFIX[k]
    W = BASE[k]['hip']; t = W.translation
    if pos is None: pos = (t.x, t.y, t.z + 0.015)       # SMG: only lifted so the left hand clears the bottom edge
    M = rot('Z', yw) @ rot('X', pt) @ rot('Y', rl) @ Matrix(W.to_3x3()).to_4x4(); M.translation = Vector(pos)
    return M
if not os.environ.get('NOHIPFIX'):
    for k in BASE: BASE[k]['hip'] = _hipfix(k)

# Pistol shoulders follow the pose: at the hip they sit low and wide so the right forearm enters from the lower
# right corner; in ADS they come up toward the sight line (isosceles, head down between the arms) so the arms run
# along the view axis and the forearms hide behind the hands.
SH_PISTOL = {'hip': {'r': Vector((0.22, 0.0, -0.40)), 'l': Vector((-0.07, 0.02, -0.42))},
             'ads': {'r': Vector([float(v) for v in os.environ.get('SH_PADS', '0.15,0.0,-0.24').split(',')]),
                     'l': Vector([-float(v) if i == 0 else float(v) for i, v in enumerate(os.environ.get('SH_PADS', '0.15,0.0,-0.24').split(','))])}}
def shoulders_for(k, Ww):
    if k != 'pistol': return SHOULDER_K.get(k) or SHOULDER
    H = BASE[k]['hip'].translation; A = BASE[k]['ads'].translation
    a = AL.smooth(max(0.0, min(1.0, 1 - (Ww.translation - A).length / max(1e-6, (H - A).length))))
    return {s: SH_PISTOL['hip'][s].lerp(SH_PISTOL['ads'][s], a) for s in ('l', 'r')}

# ------------------------------------------------------------------------------------------------ grips
# Hand frames from the weapon's real shape (sections measured on the meshes): where the palm centre sits, which way
# the straight fingers point and which way the palm faces, all in the weapon frame. The fit then slides the palm
# until it touches without sinking in, and the fingers close joint by joint on the surface.
def nz(*v): return Vector(v).normalized()
GRIPSPEC = {
    # rifle (ray-probed scan): stock wrist at y 0.04..0.08 is 26-32 mm wide, z -0.059..-0.010; the fore-end at
    # y -0.255 is 36 mm wide with its underside at z -0.024
    ('rifleScoped', 'gripR'): dict(pc=(-0.022, 0.074, -0.026), dir=nz(0.25, -0.55, -0.8), palm=nz(0.75, 0.0, -0.66), bound=(0.005, 0.010, 0.006)),
    ('rifleScoped', 'gripL'): dict(pc=tuple(float(v) for v in os.environ.get('RGL_PC', '0.020,-0.255,-0.031').split(',')),
                                   dir=nz(*[float(v) for v in os.environ.get('RGL_DIR', '-1,-0.35,0.05').split(',')]),
                                   palm=nz(*[float(v) for v in os.environ.get('RGL_PALM', '-0.3,0,1').split(',')]), bound=(0.006, 0.015, 0.004)),
    ('smg', 'gripR'): dict(pc=(-0.022, 0.072, -0.070), dir=nz(0.15, -1, -0.25), palm=nz(1, -0.5, 0)),
    ('smg', 'gripL'): dict(pc=(0.004, -0.20, -0.017), dir=nz(-1, -0.25, 0.05), palm=nz(-0.25, 0, 1)),
    # palm round onto the backstrap with the web high under the slide, so the camera behind the gun sees the hand, not a bare backstrap
    ('pistol', 'gripR'): dict(pc=tuple(float(v) for v in os.environ.get('PGR_PC', '-0.019,0.064,-0.024').split(',')),
                              dir=nz(*[float(v) for v in os.environ.get('PGR_DIR', '0.15,-1,-0.25').split(',')]),
                              palm=nz(*[float(v) for v in os.environ.get('PGR_PALM', '1,-1,0').split(',')]),
                              thumb=tuple(float(v) for v in os.environ.get('PGR_THUMB', '').split(',') if v) or None,
                              bound=(0.008, 0.008, 0.004)),     # keep the web high under the slide
    ('pistol', 'gripL'): dict(pc=tuple(float(v) for v in os.environ.get('PGL_PC', '0.014,0.060,-0.058').split(',')),
                              dir=nz(*[float(v) for v in os.environ.get('PGL_DIR', '-0.35,-1,-0.35').split(',')]), palm=nz(-1, 0.35, 0.15), fixed=True),
}
PALM = {}
for s_ in ('l', 'r'):
    ids = [i for i, b in enumerate(skin.dom) if b == 'hand_' + s_ and skin.N[i][2] < -0.5]
    PALM[s_] = Vector(skin.P[ids].mean(0))
GRIP = {}       # (kind, name) -> {'off': Vector (weapon frame), 'fingers': {...}, 'pen': (n, deep)}

def hand_matrix(s, pc, d, palm):
    """Hand bone matrix (armature space) putting the palm centre at pc, straight fingers along d, palm facing palm."""
    R = rig.hand_rot(s, d, palm)
    head = rig.Mr['hand_' + s].translation
    wrist = pc - (R @ rig.Rr['hand_' + s].transposed()) @ (PALM[s] - head)
    M = R.to_4x4(); M.translation = wrist
    return M

def hand_frame(k, s, W, which=None, off=None):
    nm = which or ('gripR' if s == 'r' else 'gripL')
    g = GRIPSPEC[(k, nm)]
    o = off if off is not None else GRIP.get((k, nm), {}).get('off', Vector())
    R3 = W.to_3x3()
    return hand_matrix(s, W @ (Vector(g['pc']) + o), R3 @ g['dir'], R3 @ g['palm'])

def solve_grip(k, nm, s, trigger=False, Wf=None, bvh=None, all_fingers=False):
    """Fit the hand on the weapon: alternate (1) a search over the palm offset and a small turn of the hand, scored
    by every hand vertex inside the weapon plus palm contact, and (2) closing the fingers on the surface."""
    w = WPN[k]; W = BASE[k]['hip']; g = GRIPSPEC[(k, nm)]
    Wf = Wf or W
    bvh = bvh or w.bvh['body']; Minv = Wf.inverted()
    hand_ids = skin.verts_of(('hand_' + s, 'index_', 'middle_', 'ring_', 'pinky_', 'thumb_'))
    hand_ids = np.array([i for i in hand_ids if skin.dom[i].endswith('_' + s)], int)
    palm_ids = np.array([i for i in hand_ids if skin.dom[i] == 'hand_' + s and skin.N[i][2] < -0.3], int)
    if g.get('fixed'):
        ang = {'index': (1.15, 1.2, 0.7), 'middle': (1.2, 1.25, 0.7), 'ring': (1.25, 1.25, 0.7), 'pinky': (1.3, 1.25, 0.7),
               'thumb': (0.05, 0.05, 0.0, 0.1)}   # wrapped over the firing hand, thumb forward along the frame
    else:
        ang = {'index': (0.3, 0.4, 0.2), 'middle': (0.5, 0.5, 0.3), 'ring': (0.5, 0.5, 0.3), 'pinky': (0.5, 0.5, 0.3), 'thumb': (0.1, 0.2, 0.2, 0.3)}
    if not trigger and not all_fingers and not g.get('fixed'): ang['index'] = (0.10, 0.08, 0.05)
    base_dir, base_palm = Vector(g['dir']), Vector(g['palm'])
    def pose_with(x):
        off = Vector(x[:3])
        R = Matrix.Rotation(x[3], 3, base_palm) @ Matrix.Rotation(x[4], 3, base_dir.cross(base_palm).normalized())
        g['dir'] = R @ base_dir; g['palm'] = R @ base_palm
        L, Wd = rest()
        for side in ('l', 'r'): F.place_shoulder(rig, L, Wd, side, shoulders_for(k, W)[side])
        R3 = Wf.to_3x3()
        F.arm_to(rig, L, Wd, s, hand_matrix(s, Wf @ (Vector(g['pc']) + off), R3 @ g['dir'], R3 @ g['palm']), POLE[s])
        g['dir'], g['palm'] = base_dir, base_palm
        return L, Wd, R
    def cost(x, fingers):
        L, Wd, _ = pose_with(x)
        F.set_fingers(rig, L, Wd, s, fingers)
        P = skin.pose(Wd, hand_ids[::2])
        d = np.array([F.signed_dist(bvh, Minv @ Vector(p)) for p in P])
        for i in np.where(d < 0)[0]:          # open scan meshes: a negative reading counts only if really inside
            if not F.inside(bvh, Minv @ Vector(P[i])): d[i] = -d[i]
        pen = np.clip(0.0008 - d, 0, None)
        Pp = skin.pose(Wd, palm_ids[::2])
        dp = np.array([F.signed_dist(bvh, Minv @ Vector(p)) for p in Pp])
        near = np.sort(dp)[: max(4, len(dp) // 5)]
        bnd = g.get('bound', (0.010, 0.020, 0.008))     # per-axis travel limits of the fit (weapon frame, metres)
        over = sum(max(0.0, abs(x[i]) - bnd[i]) ** 2 for i in range(3)) * 1e6 if bnd else 0.0
        return float((pen ** 2).sum() * 6e5 + ((near.mean() - 0.003) ** 2) * 3e4 + Vector(x[:3]).length ** 2 * 60 + (x[3] ** 2 + x[4] ** 2) * 0.5 + over)
    x = [0.0] * 5
    for rnd in range(3):
        c0 = cost(x, ang); step = [0.006] * 3 + [0.12, 0.12]
        while max(step[:3]) > 0.0008:
            moved = False
            for ax in range(5):
                for sg in (-1, 1):
                    cand = list(x); cand[ax] += sg * step[ax]
                    c = cost(cand, ang)
                    if c < c0: c0, x, moved = c, cand, True
            if not moved: step = [v * 0.5 for v in step]
        if g.get('fixed'): break
        L, Wd, R = pose_with(x)
        fingers = ('middle', 'ring', 'pinky', 'thumb') + (('index',) if (trigger or all_fingers) else ())
        new = F.grasp_fingers(rig, skin, L, Wd, s, bvh, Minv, fingers=fingers, thumb_spread=0.35 if s == 'r' else 0.2)
        ang.update(new)
    if g.get('thumb'): ang['thumb'] = g['thumb']        # authored thumb (pistol: along the left of the frame)
    L, Wd, R = pose_with(x)
    g['dir'] = R @ base_dir; g['palm'] = R @ base_palm     # keep the fitted turn in the spec
    F.set_fingers(rig, L, Wd, s, ang)
    pen = F.penetration(skin, Wd, bvh, Minv, idx=hand_ids)
    GRIP[(k, nm)] = {'off': Vector(x[:3]), 'fingers': ang, 'pen': pen}
    Rw = Wf.to_3x3().inverted()
    act_palm = Rw @ F.palm_normal(rig, Wd, s)
    act_dir = Rw @ (Wd['middle_01_' + s].translation - Wd['hand_' + s].translation).normalized()
    log('  frame', k, nm, 'want dir', tuple(round(v, 2) for v in g['dir']), 'got', tuple(round(v, 2) for v in act_dir),
        'want palm', tuple(round(v, 2) for v in g['palm']), 'got', tuple(round(v, 2) for v in act_palm))
    log('grip', k, nm, 'offset', tuple(round(v, 4) for v in x), 'pen', pen, 'cost', round(c0, 3),
        {f: tuple(round(v, 2) for v in a) for f, a in ang.items()})
    return GRIP[(k, nm)]

# ------------------------------------------------------------------------------------------------ frame solve
LASTPOLE = {}
ARM_IDS = {s_: np.array([i for i in skin.verts_of(('lowerarm', 'upperarm')) if skin.dom[i].endswith('_' + s_)], int)[::4] for s_ in ('l', 'r')}
SHOULDER_K = {'pistol': {'r': Vector((0.17, 0.08, -0.48)), 'l': Vector((-0.02, 0.08, -0.48))}}
HAND_IDS = {s_: np.array([i for i in skin.verts_of(('hand_', 'index_', 'middle_', 'ring_', 'pinky_', 'thumb_')) if skin.dom[i].endswith('_' + s_)], int)[::5] for s_ in ('l', 'r')}
POLES = {'l': (0, -25, 25, -50, 50, -80, 80), 'r': (0, -20, 20, -40, 40, -65, 65)}
LASTNUDGE = {}
FORCE = {}      # side -> offset Vector: second pass of a clip, the smoothed nudges applied without a search
def arm_pen(W2, s, bvh, Minv, hand=True):
    """Clearance cost of one arm against the weapon: sum of (4 mm - signed distance) over sampled forearm, upper
    arm and (optionally) hand vertices. A negative reading counts only if the ray-parity test agrees (open scans)."""
    c = 0.0
    for ids in ((ARM_IDS[s], HAND_IDS[s]) if hand else (ARM_IDS[s],)):
        for p in skin.pose(W2, ids):
            q = Minv @ Vector(p); d = F.signed_dist(bvh, q)
            if d < 0.004:
                if d < -0.002 and not F.inside(bvh, q): continue
                c += 0.004 - d
    return c

def frame(k, Ww, hands, fingers, parts=None, shoulders=None, prop=None, nudge=None):
    """One pose. Ww: weapon pose; hands: side -> hand bone matrix; fingers: side -> angles;
    parts: part -> delta matrix; prop: (kind, matrix) for the w_prop bone (scale 0 when None);
    nudge: side -> True when that hand is travelling (not holding anything) and may be moved off its path to keep
    the hand and forearm out of the weapon."""
    L, W = rest()
    for s in ('l', 'r'):
        F.place_shoulder(rig, L, W, s, (shoulders or shoulders_for(k, Ww))[s])
    w = WPN[k]
    Minv = Ww.inverted()
    bvh = w.bvh['body']
    for s in ('r', 'l'):
        if s not in hands: continue
        # elbow: of several pole directions round the shoulder-wrist line, take the one whose forearm and hand stay
        # out of the weapon, preferring small and steady turns
        def solve(H):
            ax = (H.translation - W['upperarm_' + s].translation).normalized()
            best = None
            for a_ in POLES[s]:
                pole = Quaternion(ax, math.radians(a_)) @ POLE[s]
                L2 = {b: m.copy() for b, m in L.items()}; W2 = {b: m.copy() for b, m in W.items()}
                F.arm_to(rig, L2, W2, s, H, pole)
                pen = arm_pen(W2, s, bvh, Minv, hand=bool((nudge or {}).get(s)))
                c = pen + abs(a_) * 0.00004 + abs(a_ - LASTPOLE.get(s, 0)) * 0.0002
                if best is None or c < best[0] - 1e-9: best = (c, L2, W2, a_, pen)
            return best
        if FORCE.get(s) is not None:
            H = hands[s].copy(); H.translation = H.translation + FORCE[s]
            best = solve(H); LASTNUDGE[s] = FORCE[s]
        elif (best := solve(hands[s])) and (nudge or {}).get(s) and best[4] > 0.004:
            # a hand in transit that still cuts the weapon: try moving it out (weapon left/right/below/above, and
            # back toward the eye), the smallest move that clears wins; steady from frame to frame
            R3 = Ww.to_3x3()
            last = LASTNUDGE.get(s, Vector())
            cands = [(best[4] + last.length * 0.08, best, Vector())]
            for dv in ((-1, 0, 0), (1, 0, 0), (0, 0, -1), (0, 0, 1)):
                for m in (0.02, 0.04, 0.07):
                    off = (R3 @ Vector(dv)).normalized() * m
                    H = hands[s].copy(); H.translation = H.translation + off
                    b2 = solve(H)
                    cands.append((b2[4] + m * 0.12 + (off - last).length * 0.08, b2, off))
            _, best, off = min(cands, key=lambda x: x[0])
            LASTNUDGE[s] = off
        else:
            LASTNUDGE[s] = Vector()
        L, W = best[1], best[2]; LASTPOLE[s] = best[3]
    for s in ('r', 'l'):
        if s in fingers: F.set_fingers(rig, L, W, s, fingers[s])
    rig.set_world(L, W, 'w_root', Ww @ F.RX90)
    for p in ('bolt', 'boltHandle', 'mag', 'trigger', 'hammer', 'charging'):
        if p not in w.empty: continue
        D = (parts or {}).get(p, Matrix())
        par = 'w_bolt' if p == 'boltHandle' else 'w_root'
        # parts are keyed in their parent's frame: world = weapon @ part rest @ delta (boltHandle rides the bolt)
        if p == 'boltHandle':
            Db = (parts or {}).get('bolt', Matrix())
            Mw = Ww @ w.empty['bolt'] @ Db @ w.empty['bolt'].inverted() @ w.empty['boltHandle'] @ D
        else:
            Mw = Ww @ w.empty[p] @ D
        if (parts or {}).get(p + '_world') is not None: Mw = parts[p + '_world']
        rig.set_world(L, W, 'w_' + p, Mw @ F.RX90)
    S = {}
    if prop:
        rig.set_world(L, W, 'w_prop', prop[1] @ F.RX90)
    return L, W

# ------------------------------------------------------------------------------------------------ preview
def apply_pose(L):
    for b, (t, q) in rig.basis(L).items():
        pb = arm.pose.bones[b]; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = q; pb.location = t

PROPSHOW = [None]
def place_weapon(k, W):
    for kk in WPN:
        root = WPN[kk].root
        root.hide_render = kk != k
        for c in root.children_recursive: c.hide_render = kk != k
    if PROPSHOW[0]:
        pr = WPN[PROPSHOW[0]].root; pr.hide_render = False
        for c in pr.children_recursive: c.hide_render = False
        pr.matrix_world = W['w_prop'] @ F.RX90.inverted()
    root = WPN[k].root
    root.matrix_world = W[ 'w_root'] @ F.RX90.inverted()
    for p in ('bolt', 'boltHandle', 'mag', 'trigger', 'hammer', 'charging'):
        o = bpy.data.objects.get(k + '_' + p)
        if o is not None:
            o.matrix_world = W['w_' + p] @ F.RX90.inverted()

def setup_render():
    sc = bpy.context.scene
    cam = bpy.data.objects.get('FPCam')
    if cam is None:
        cam = bpy.data.objects.new('FPCam', bpy.data.cameras.new('FPCam')); sc.collection.objects.link(cam)
    cam.data.sensor_fit = 'VERTICAL'; cam.data.angle = math.radians(55); cam.data.clip_start = 0.01
    cam.location = (0, 0, 0); cam.rotation_euler = (math.pi / 2, 0, 0)   # look along +Y, up +Z
    sc.camera = cam
    w = bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.6, 0.65, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.8
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(-20), math.radians(30)); sun.data.energy = 2.5
    sc.render.engine = os.environ.get('ENGINE', 'CYCLES'); sc.cycles.samples = int(os.environ.get('SAMPLES', 24)); sc.cycles.device = 'CPU'
    if sc.render.engine == 'BLENDER_WORKBENCH':   # quick grip checks: studio light, material colours
        sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.threads_mode = 'FIXED'; sc.render.threads = 2
    sc.render.resolution_x = int(os.environ.get('RW', 960)); sc.render.resolution_y = int(os.environ.get('RH', 540))
    sc.view_settings.view_transform = 'AgX'
    if not mesh.data.materials:
        m = bpy.data.materials.new('skin_preview'); m.diffuse_color = (0.6, 0.42, 0.33, 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.36, 0.27, 1)
        mesh.data.materials.append(m)

def render(path, L, W, k, view=None):
    apply_pose(L); place_weapon(k, W)
    cam = bpy.data.objects['FPCam']
    if view:   # close-up: camera at view[0] looking at view[1]
        cam.location = view[0]; d = (Vector(view[1]) - Vector(view[0]))
        cam.rotation_euler = d.to_track_quat('-Z', 'Z').to_euler(); cam.data.angle = math.radians(view[2] if len(view) > 2 else 40)
    else:
        cam.location = (0, 0, 0); cam.rotation_euler = (math.pi / 2 + math.radians(float(os.environ.get('LOOK', 0))), 0, 0)
        cam.data.angle = math.radians(float(os.environ.get('FOV', 55)))
    bpy.context.view_layer.update()
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

# ------------------------------------------------------------------------------------------------ part grips
def part_box(k, part):
    V = WPN[k].verts[part]
    return Vector(V.min(0)), Vector(V.max(0))

def add_part_specs(k):
    """Hand frames on moving parts, in the part's own pivot frame: the left hand on the magazine (palm on its left
    side, fingers round the front), the right hand pinching a bolt knob or charging knob, the left hand over the slide."""
    w = WPN[k]
    if 'mag' in w.bvh:
        lo, hi = part_box(k, 'mag')
        if hi.z - lo.z < 0.09:   # a short box magazine: gripped from the left and below, fingers wrapped round its
            # front, thumb behind it on the release (the old cupped, upturned palm read as an open hand)
            GRIPSPEC[(k, 'magL')] = dict(part='mag', pc=(hi.x + 0.012, (lo.y + hi.y) / 2 + 0.006, lo.z + (hi.z - lo.z) * 0.15),
                                         dir=nz(0.1, -1, -0.35), palm=nz(-1, 0, 0.35))
        else:                    # a long magazine: palm on its left side, fingers round the front
            GRIPSPEC[(k, 'magL')] = dict(part='mag', pc=(hi.x + 0.011, (lo.y + hi.y) / 2 + 0.004, lo.z + (hi.z - lo.z) * 0.38),
                                         dir=nz(0.05, -1, -0.15), palm=nz(-1, 0, 0.1))
    for part in ('boltHandle', 'charging'):
        if part in w.bvh:
            V = w.verts[part]
            if part == 'boltHandle':
                i = int(np.argmax(V[:, 0] ** 2 + (V[:, 2]) ** 2)); knob = Vector(V[i])
            else:
                i = int(np.argmin(V[:, 0])); knob = Vector(V[i])
            GRIPSPEC[(k, part + 'R')] = dict(part=part, pc=tuple(knob + Vector((-0.024, 0.032, -0.018))),
                                            dir=nz(0.25, -0.8, 0.45), palm=nz(0.65, -0.45, 0.55), knob=tuple(knob))
    if k == 'pistol':
        lo, hi = part_box(k, 'bolt')
        GRIPSPEC[(k, 'slideL')] = dict(part='bolt', pc=(0.0, hi.y - 0.022, hi.z + 0.013), dir=nz(-1, 0.15, -0.2), palm=nz(0, 0, -1))

def hand_on_part(k, s, W, nm, D=None, Dparent=None):
    """Hand bone matrix for a part grip, with the part moved by D (and its parent bolt by Dparent)."""
    g = GRIPSPEC[(k, nm)]; w = WPN[k]; part = g['part']
    Mp = W @ w.empty[part] @ (D or Matrix())
    if part == 'boltHandle':
        Mp = W @ w.empty['bolt'] @ (Dparent or Matrix()) @ w.empty['bolt'].inverted() @ w.empty['boltHandle'] @ (D or Matrix())
    o = GRIP.get((k, nm), {}).get('off', Vector())
    R3 = Mp.to_3x3()
    return hand_matrix(s, Mp @ (Vector(g['pc']) + o), R3 @ g['dir'], R3 @ g['palm'])

def solve_part_grip(k, nm, s):
    g = GRIPSPEC[(k, nm)]; part = g['part']; w = WPN[k]
    W = BASE[k]['hip']
    Mp = W @ w.empty[part]
    if part == 'boltHandle': Mp = W @ w.empty['bolt'] @ w.empty['bolt'].inverted() @ w.empty['boltHandle']
    G_ = solve_grip(k, nm, s, Wf=Mp, bvh=w.bvh[part], all_fingers=True)
    if nm.endswith('R') and part in ('boltHandle', 'charging'):
        # a pinch: thumb and index on the knob, the other fingers loosely curled out of the way
        G_['fingers'].update({'middle': (0.9, 1.0, 0.6), 'ring': (1.0, 1.1, 0.6), 'pinky': (1.1, 1.1, 0.6)})
    return G_

# ------------------------------------------------------------------------------------------------ clip programs
K = AL.keys
def M_(a, b, t): return blend_m(a, b, AL.smooth(t))
def rel(W, dx=0, dy=0, dz=0, yaw=0, pitch=0, roll=0):
    """W moved in first-person space (metres) and turned about the weapon origin (degrees)."""
    R = rot('Z', yaw) @ rot('X', pitch) @ rot('Y', roll)
    M = W.copy(); o = M.translation.copy(); M.translation = Vector()
    M = R @ M; M.translation = o + Vector((dx, dy, dz))
    return M
def wave(t, T, a): return a * math.sin(2 * math.pi * t / T)
def tr(v): return Matrix.Translation(Vector(v))
def ramp(t, t0, t1): return AL.smooth((t - t0) / max(1e-6, t1 - t0))
def bump(t, t0, t1, t2): return ramp(t, t0, t1) * (1 - ramp(t, t1, t2))

def grip_r(k, W): return hand_frame(k, 'r', W, 'gripR')
def grip_l(k, W): return hand_frame(k, 'l', W, 'gripL')
def fR(k, trig=0.0):
    g = GRIP[(k, 'gripR')]['fingers']
    if trig > 0:
        g = dict(g); idx = GRIP.get((k, 'gripR_trigger'), {}).get('fingers', {}).get('index', (0.55, 0.75, 0.35))
        g['index'] = tuple(a + (b - a) * trig for a, b in zip(g['index'], idx))
    return g
def fL(k): return GRIP[(k, 'gripL')]['fingers']

def pose_prop(s, M_hand, kind, along=0.0):
    """Prop held in a hand: its root at the palm centre pushed out along the palm normal."""
    R3 = M_hand.to_3x3() @ rig.Rr['hand_' + s].transposed()
    pc = M_hand.translation + R3 @ (PALM[s] - rig.Mr['hand_' + s].translation)
    palm = (R3 @ Vector((0, 0, -1))).normalized()
    fwd = (R3 @ (rig.Mr['middle_01_' + s].translation - rig.Mr['hand_' + s].translation)).normalized()
    M = AL.Rig.frame_rot(Vector((0, -1, 0)), Vector((0, 0, -1)), fwd, palm).to_4x4()
    M.translation = pc + palm * along
    return M

CLIPS = {}      # name -> (duration, loop, fn(t) -> dict, events)
def clip(name, dur, loop=False, events=None):
    def deco(fn):
        CLIPS[name] = (dur, loop, fn, events or {}); return fn
    return deco

def make_clips(k):
    B = BASE[k]; HIP, ADS, SPR, LOW = B['hip'], B['ads'], B['sprint'], B['low']
    w = WPN[k]
    long_ = k != 'pistol'
    def std(W, t=0.0, trig=0.0, parts=None, rh=None, lh=None, rf=None, lf=None, prop=None, hold=()):
        return dict(W=W, rh=rh or grip_r(k, W), lh=lh or grip_l(k, W), rf=rf or fR(k, trig), lf=lf or fL(k), parts=parts or {}, prop=prop, hold=hold)

    @clip(k + '.idle', 3.0, loop=True)
    def _(t):
        return std(rel(HIP, dz=wave(t, 3.0, 0.0018), dx=wave(t + 0.4, 3.0, 0.0008), pitch=wave(t, 3.0, 0.35)))

    @clip(k + '.ads', 3.0, loop=True)
    def _(t):
        return std(rel(ADS, dz=wave(t, 3.0, 0.0005), pitch=wave(t, 3.0, 0.08)), trig=0.35)

    # the raise from the hip to the sights, sampled by the ADS amount: vm.drive holds this clip at time = state.ads,
    # so every in-between pose is solved with the hands on the grips (blending the hip and ADS clips in the mixer
    # let the right hand swing off the gun mid-raise). The gun travels on a slight low arc.
    @clip(k + '.adsRaise', 1.0)
    def _(t):
        W = rel(blend_m(HIP, ADS, t), dz=-0.025 * math.sin(math.pi * t))
        return std(W, trig=0.35 * t)

    fire_T = {'rifleScoped': 0.45, 'smg': 0.11, 'pistol': 0.3}[k]
    @clip(k + '.fire', fire_T, events={'shot': 0.02})
    def _(t):
        tg = bump(t, 0.0, 0.025, fire_T * 0.6)
        parts = {'trigger': rot('X', -14 * tg)}
        if k == 'pistol':
            sl = bump(t, 0.005, 0.035, 0.09)
            parts['bolt'] = tr((0, 0.034 * sl, 0)); parts['hammer'] = rot('X', -40 * min(1, sl * 1.5))
        if k == 'smg':
            parts['bolt'] = tr((0, 0.05 * bump(t, 0.0, 0.035, 0.08), 0))
        kick = bump(t, 0.0, 0.03, fire_T * 0.9)
        return std(rel(HIP, dy=-0.012 * kick, pitch=1.2 * kick), trig=1.0, parts=parts)

    @clip(k + '.fireAds', fire_T, events={'shot': 0.02})
    def _(t):
        d = CLIPS[k + '.fire'][2](t); kick = bump(t, 0.0, 0.03, fire_T * 0.9)
        d['W'] = rel(ADS, dy=-0.008 * kick, pitch=0.6 * kick); d['rh'] = grip_r(k, d['W']); d['lh'] = grip_l(k, d['W'])
        return d

    OFF = rel(HIP, dz=-0.32, dy=-0.05, dx=0.06, pitch=-55, roll=-25, yaw=-10)
    @clip(k + '.draw', 0.65, events={'ready': 0.6})
    def _(t):
        u = ramp(t, 0, 0.55)
        W = M_(OFF, HIP, u) if u < 1 else HIP
        W = rel(W, roll=-6 * bump(t, 0.3, 0.5, 0.65))
        return std(W)

    @clip(k + '.holster', 0.5)
    def _(t):
        return std(M_(HIP, OFF, ramp(t, 0, 0.5)))

    @clip(k + '.sprint', 0.7, loop=True)
    def _(t):
        W = rel(SPR, dz=wave(t, 0.7, 0.008), dx=wave(t, 1.4, 0.006), roll=wave(t, 1.4, 2.0))
        return std(W)

    @clip(k + '.sprintIn', 0.3)
    def _(t): return std(M_(HIP, SPR, ramp(t, 0, 0.3)))

    @clip(k + '.sprintOut', 0.3)
    def _(t): return std(M_(SPR, HIP, ramp(t, 0, 0.3)))

    # ---- magazine reloads
    if 'mag' in w.empty:
        mag_down = Vector((0, 0.0 if long_ else 0.012, -1)).normalized()
        RLD = rel(HIP, dx=-0.04, dz=0.055 if long_ else 0.03, dy=0.0, roll=28 if long_ else 15, pitch=10, yaw=-6)
        T_ = 2.5 if long_ else 1.9
        def reload_fn(t, empty):
            u_in = ramp(t, 0.0, 0.3); u_out = ramp(t, T_ - 0.45, T_ - 0.05)
            W = M_(HIP, RLD, u_in) if t < T_ - 0.45 else M_(RLD, HIP, u_out)
            # magazine: out 0.55-0.8, away (hidden) by 1.1, a full one appears below at 1.25, in 1.55-1.75
            s1 = 0.30 if not long_ else 0.32
            out = ramp(t, 0.55, 0.8) * 0.11 + ramp(t, 0.8, 1.1) * 0.25
            inn = (1 - ramp(t, 1.25, 1.62)) * 0.30 if t >= 1.15 else None
            vis = 0.0 if 1.1 <= t < 1.15 else 1.0
            off = (out if t < 1.15 else inn)
            if empty and not long_ and t < 0.55: off = 0.0
            Dm = tr(mag_down * off)
            if t >= 1.15 and t < 1.62: Dm = Dm @ rot('Y', -25 * (1 - ramp(t, 1.15, 1.62)))
            Dm = Dm @ Matrix.Diagonal((vis, vis, vis, 1.0))
            parts = {'mag': Dm}
            # left hand: fore-end -> magazine (0.3-0.55) -> rides with it (0.55-1.75), slap at 1.72 -> fore-end (1.8-2.1)
            gl = grip_l(k, W)
            gm = hand_on_part(k, 'l', W, 'magL', D=tr(mag_down * off) @ (rot('Y', -25 * (1 - ramp(t, 1.15, 1.62))) if t >= 1.15 and t < 1.62 else Matrix()))
            if t < 0.55: lh = M_(gl, gm, ramp(t, 0.28, 0.55)); lf = F.mix_fingers(fL(k), GRIP[(k, 'magL')]['fingers'], ramp(t, 0.3, 0.55))
            elif t < 1.75: lh = gm; lf = GRIP[(k, 'magL')]['fingers']
            else:
                lh = M_(gm, gl, ramp(t, 1.8, 2.1 if long_ else 1.65 + 0.25)); lf = F.mix_fingers(GRIP[(k, 'magL')]['fingers'], fL(k), ramp(t, 1.75, 2.05))
            if 1.1 <= t < 1.2: lh = M_(gm, gm, 0)
            return std(W, parts=parts, lh=lh, lf=lf, hold=('l',) if 0.55 <= t < 1.75 else ())
        ev = {'magOut': 0.6, 'magIn': 1.62, 'done': T_ - 0.1}
        @clip(k + '.reload', T_, events=ev)
        def _(t): return reload_fn(t, False)
        if k == 'pistol':
            TE = T_ + 0.55
            @clip(k + '.reloadEmpty', TE, events=dict(ev, slide=T_ + 0.2, done=TE - 0.1))
            def _(t):
                if t < T_ - 0.45: d = reload_fn(t, True); d['parts']['bolt'] = tr((0, 0.034, 0)); return d
                # overhand: the left hand grips the slide, pulls it back and lets it go
                W = RLD
                pull = bump(t, T_ - 0.15, T_ + 0.12, T_ + 0.2)
                Db = tr((0, 0.034 * (1 if t < T_ - 0.15 else pull), 0)) if t < T_ + 0.2 else Matrix()
                gs = hand_on_part(k, 'l', W, 'slideL', D=tr((0, 0.034 * max(pull, 0), 0)))
                u = ramp(t, T_ - 0.45, T_ - 0.15)
                lh = M_(grip_l(k, W), gs, u) if t < T_ + 0.2 else M_(gs, grip_l(k, HIP), ramp(t, T_ + 0.2, TE - 0.05))
                Wt = W if t < T_ + 0.2 else M_(RLD, HIP, ramp(t, T_ + 0.2, TE - 0.05))
                if t >= T_ + 0.2: lh = M_(gs, grip_l(k, Wt), ramp(t, T_ + 0.2, TE - 0.05))
                lf = GRIP[(k, 'slideL')]['fingers'] if T_ - 0.2 < t < T_ + 0.25 else fL(k)
                return std(Wt, parts={'bolt': Db}, lh=lh, lf=lf, hold=('l',) if T_ - 0.15 <= t < T_ + 0.2 else ())

    # ---- bolt / charging handle cycle with the right hand (rifle bolt, SMG charging knob)
    part = 'boltHandle' if k == 'rifleScoped' else ('charging' if k == 'smg' else None)
    if part:
        TB = 1.05 if k == 'rifleScoped' else 0.75
        CYC = rel(HIP, roll=7, pitch=-3, dz=-0.012)
        def cycle_parts(t):
            if k == 'rifleScoped':
                up = bump(t, 0.25, 0.36, 0.86) if t < 0.86 else 0.0
                back = bump(t, 0.38, 0.56, 0.74)
                return {'boltHandle': rot('Y', 62 * up), 'bolt': tr((0, 0.078 * back, 0))}, up, back
            back = bump(t, 0.2, 0.38, 0.44)
            return {'charging': tr((0, 0.06 * back, 0)), 'bolt': tr((0, 0.06 * back, 0))}, 0, back
        def cycle_fn(t, base=None, t0=0.0):
            tt = t - t0
            Wb = base or HIP
            W = M_(Wb, CYC, ramp(tt, 0.0, 0.2)) if tt < TB - 0.2 else M_(CYC, Wb, ramp(tt, TB - 0.2, TB))
            parts, up, back = cycle_parts(tt)
            if k == 'rifleScoped':
                Dp = parts['boltHandle']; Dpar = parts['bolt']
                gk = hand_on_part(k, 'r', W, part + 'R', D=Dp, Dparent=Dpar)
            else:
                gk = hand_on_part(k, 'r', W, part + 'R', D=parts['charging'])
            gr = grip_r(k, W)
            if tt < 0.24: rh = M_(gr, gk, ramp(tt, 0.05, 0.24)); rf = F.mix_fingers(fR(k), GRIP[(k, part + 'R')]['fingers'], ramp(tt, 0.08, 0.24))
            elif tt < TB - 0.2: rh = gk; rf = GRIP[(k, part + 'R')]['fingers']
            else: rh = M_(gk, gr, ramp(tt, TB - 0.2, TB - 0.02)); rf = F.mix_fingers(GRIP[(k, part + 'R')]['fingers'], fR(k), ramp(tt, TB - 0.2, TB - 0.05))
            return std(W, parts=parts, rh=rh, rf=rf, hold=('r',) if 0.24 <= tt < TB - 0.2 else ())
        name = '.boltCycle' if k == 'rifleScoped' else '.charge'
        @clip(k + name, TB, events={'boltUp': 0.3, 'boltBack': 0.5, 'eject': 0.52, 'boltForward': 0.7, 'boltDown': 0.84} if k == 'rifleScoped' else {'charge': 0.36})
        def _(t): return cycle_fn(t)
        if 'mag' in w.empty:
            TR = CLIPS[k + '.reload'][0]
            @clip(k + '.reloadEmpty', TR + TB - 0.2, events=dict(CLIPS[k + '.reload'][3], boltBack=TR - 0.2 + 0.5, done=TR + TB - 0.3))
            def _(t):
                if t < TR - 0.45: return CLIPS[k + '.reload'][2](t)
                if t < TR - 0.2:
                    d = CLIPS[k + '.reload'][2](t); return d
                return cycle_fn(t, t0=TR - 0.2)

    # ---- grenade: weapon low and right, left hand takes a grenade from the belt, pin, throw
    @clip(k + '.grenade', 1.55, events={'pin': 0.62, 'release': 1.04, 'done': 1.45})
    def _(t):
        W = M_(HIP, LOW, ramp(t, 0.0, 0.25)) if t < 1.15 else M_(LOW, HIP, ramp(t, 1.15, 1.5))
        gl = grip_l(k, HIP)
        belt = hand_matrix('l', Vector((-0.12, 0.05, -0.55)), nz(0.2, 1, 0.3), nz(0.3, 0, 1))
        hold = hand_matrix('l', Vector((-0.05, 0.30, -0.16)), nz(0.35, 0.6, 0.7), nz(0.6, -0.2, -0.2))
        wind = hand_matrix('l', Vector((-0.22, 0.02, 0.05)), nz(0.1, -0.3, 1), nz(0.7, 0.6, 0))
        throw = hand_matrix('l', Vector((-0.02, 0.62, 0.04)), nz(0.1, 1, 0.3), nz(0.0, 0.3, -1))
        trk = [(0.0, gl), (0.25, belt), (0.42, belt), (0.62, hold), (0.82, wind), (1.01, wind), (1.13, throw), (1.22, throw), (1.5, grip_l(k, HIP))]
        lh = trk[0][1]
        for (t0, a), (t1, b) in zip(trk, trk[1:]):
            if t0 <= t <= t1: lh = M_(a, b, (t - t0) / (t1 - t0)); break
        if t > 1.5: lh = grip_l(k, HIP)
        lf = F.mix_fingers(fL(k), F.RELAXED, ramp(t, 0.0, 0.2))
        hold_f = {'index': (0.8, 0.9, 0.5), 'middle': (0.9, 1.0, 0.5), 'ring': (0.95, 1.0, 0.5), 'pinky': (1.0, 1.0, 0.5), 'thumb': (0.3, 0.3, 0.2, 0.5)}
        if 0.3 < t < 1.04: lf = F.mix_fingers(F.RELAXED, hold_f, ramp(t, 0.3, 0.45))
        elif t >= 1.04: lf = F.mix_fingers(F.FLAT, fL(k), ramp(t, 1.15, 1.45))
        prop = ('grenade', pose_prop('l', lh, 'grenade', 0.03)) if 0.33 <= t < 1.06 else None
        return std(W, lh=lh, lf=lf, prop=prop)

    # the same grenade motion cut in three parts so the game can cook it: pull (ends holding the grenade with the pin
    # out), cook (a held loop), throw (wind and release, then back to the weapon)
    G_ = CLIPS[k + '.grenade'][2]
    @clip(k + '.grenadePull', 0.66, events={'pin': 0.62})
    def _(t): return G_(t)
    @clip(k + '.grenadeCook', 1.0, loop=True)
    def _(t):
        d = G_(0.66); d['W'] = rel(d['W'], dz=wave(t, 1.0, 0.002)); return d
    @clip(k + '.grenadeThrow', 0.89, events={'release': 0.38, 'done': 0.8})
    def _(t): return G_(0.66 + t)

    # ---- melee: a butt stroke with the long guns, a downward pistol-butt blow with the pistol
    @clip(k + '.melee', 0.8, events={'hit': 0.32})
    def _(t):
        if long_:
            wind = rel(HIP, dx=0.06, dy=-0.06, dz=0.02, yaw=-25, roll=-10)
            hit = rel(HIP, dx=-0.08, dy=0.18, dz=0.08, yaw=55, pitch=10, roll=-60)
        else:
            wind = rel(HIP, dz=0.08, dy=-0.04, pitch=35)
            hit = rel(HIP, dz=-0.06, dy=0.16, pitch=-55, roll=-10)
        trk = [(0.0, HIP), (0.15, wind), (0.32, hit), (0.42, hit), (0.8, HIP)]
        W = HIP
        for (t0, a), (t1, b) in zip(trk, trk[1:]):
            if t0 <= t <= t1: W = M_(a, b, (t - t0) / (t1 - t0)); break
        return std(W)

    # ---- interact: weapon dips right, left hand reaches out flat and back
    @clip(k + '.interact', 0.9, events={'touch': 0.45})
    def _(t):
        W = M_(HIP, rel(HIP, dx=0.05, dz=-0.08, roll=-20, pitch=-10), bump(t, 0.0, 0.2, 0.85))
        reach = hand_matrix('l', Vector((-0.02, 0.50, -0.06)), nz(0.15, 1, 0.25), nz(0.1, 0.5, -0.8))
        gl = grip_l(k, W)
        lh = M_(gl, reach, ramp(t, 0.1, 0.42)) if t < 0.5 else M_(reach, gl, ramp(t, 0.55, 0.88))
        lf = F.mix_fingers(fL(k), F.FLAT, bump(t, 0.1, 0.35, 0.85))
        return std(W, lh=lh, lf=lf)

    # ---- binoculars: weapon low, left hand brings the binoculars to the eyes (hold the last frame)
    def bino(t, lower=False):
        u = ramp(t, 0.15, 0.85)
        if lower: u = 1 - ramp(t, 0.0, 0.6)
        W = M_(HIP, LOW, ramp(t, 0.0, 0.3) if not lower else 1 - ramp(t, 0.4, 0.8))
        b = WPN['binoculars']; eye = b.E('scopeEye') if 'scopeEye' in b.empty else Matrix.Translation((0, 0.06, 0.02))
        at_eye = F.RZ180.copy(); at_eye.translation = -(F.RZ180.to_3x3() @ eye.translation)
        start = rel(at_eye, dz=-0.42, dy=0.05, pitch=-40, roll=20)
        Mb = M_(start, at_eye, u)
        # the left hand holds the binoculars by the gripR frame of the small item (mirror of a right-hand hold)
        lh = hand_matrix('l', Mb @ Vector((0.045, 0.02, -0.025)), (Mb.to_3x3() @ Vector((-0.2, -1, 0))).normalized(), (Mb.to_3x3() @ Vector((-1, 0, 0.2))).normalized())
        gl = grip_l(k, W)
        if not lower:
            lh = M_(gl, lh, ramp(t, 0.0, 0.25)) if t < 0.25 else lh
        else:
            lh = M_(lh, grip_l(k, HIP), ramp(t, 0.6, 1.0)) if t > 0.6 else lh
        lf = {'index': (0.7, 0.8, 0.5), 'middle': (0.8, 0.9, 0.5), 'ring': (0.85, 0.9, 0.5), 'pinky': (0.9, 0.9, 0.5), 'thumb': (0.3, 0.3, 0.2, 0.5)}
        vis = (0.15 < t) if not lower else (t < 0.6)
        return std(W, lh=lh, lf=lf, prop=('binoculars', Mb) if vis else None, hold=('l',) if vis else ())
    @clip(k + '.binoculars', 1.0, events={'atEye': 0.85})
    def _(t): return bino(t)
    @clip(k + '.binocularsLower', 1.0)
    def _(t): return bino(t, lower=True)

# ------------------------------------------------------------------------------------------------ bake clips
PROPBONES = {'grenade': 'w_prop', 'binoculars': 'w_prop'}
def solve_frame(k, d):
    # a hand may be nudged clear only while it travels: not on its weapon grip and not holding a part (d['hold'])
    nud = {}
    for s, key, g in (('r', 'rh', grip_r), ('l', 'lh', grip_l)):
        nud[s] = s not in d.get('hold', ()) and (d[key].translation - g(k, d['W']).translation).length > 0.003
    L, W = frame(k, d['W'], {'r': d['rh'], 'l': d['lh']}, {'r': d['rf'], 'l': d['lf']}, parts=d['parts'],
                 prop=d['prop'], nudge=nud)
    if d['prop'] is None:
        M = W['w_root'].copy(); M = M @ Matrix.Diagonal((0.0001, 0.0001, 0.0001, 1.0)); rig.set_world(L, W, 'w_prop', M)
    return L, W

LOC = ('clavicle_l', 'clavicle_r') + tuple(F_ for F_ in ('w_root', 'w_bolt', 'w_boltHandle', 'w_mag', 'w_trigger', 'w_hammer', 'w_charging', 'w_prop'))
def write_action(name, frames):
    """frames: list of local pose dicts L. Rotation for every bone, location for clavicles and weapon bones,
    scale for the magazine and prop bones (hidden = 0)."""
    act = bpy.data.actions.get(name)
    if act: bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name)
    slot = act.slots.new('OBJECT', arm.name)
    cb = act.layers.new('Layer').strips.new(type='KEYFRAME').channelbag(slot, ensure=True)
    n = len(frames)
    for b in rig.bones:
        if b == 'fp_root': continue
        Bs = [rig.Lr[b].inverted() @ L[b] for L in frames]
        qs = [M.to_quaternion() for M in Bs]
        for i in range(1, n):
            if qs[i].dot(qs[i - 1]) < 0: qs[i] = -qs[i]
        chans = [('rotation_quaternion', 4, lambda i, c: qs[i][c])]
        if b in LOC: chans.append(('location', 3, lambda i, c: Bs[i].to_translation()[c]))
        if b in ('w_mag', 'w_prop'): chans.append(('scale', 3, lambda i, c: Bs[i].to_scale()[c]))
        for prop, nc, get in chans:
            for c in range(nc):
                fc = cb.fcurves.new('pose.bones["%s"].%s' % (b, prop), index=c, group_name=b)
                fc.keyframe_points.add(n)
                co = []
                for i in range(n): co += [float(i), get(i, c)]
                fc.keyframe_points.foreach_set('co', co)
                fc.keyframe_points.foreach_set('interpolation', [1] * n)
                fc.update()
    act.use_fake_user = True
    return act

def bake_kind(k, report):
    solve_grip(k, 'gripR', 'r', trigger=False)
    solve_grip(k, 'gripL', 'l', trigger=True)
    # trigger finger on the trigger: close the index on the trigger blade
    L, Wd = rest()
    for side in ('l', 'r'): F.place_shoulder(rig, L, Wd, side, shoulders_for(k, BASE[k]['hip'])[side])
    W = BASE[k]['hip']; F.arm_to(rig, L, Wd, 'r', grip_r(k, W), POLE['r'])
    ang = F.grasp_fingers(rig, skin, L, Wd, 'r', WPN[k].bvh['trigger'] if 'trigger' in WPN[k].bvh else WPN[k].bvh['body'],
                          (W @ WPN[k].empty['trigger']).inverted() if 'trigger' in WPN[k].empty else W.inverted(), fingers=('index',),
                          start={'index': (0.25, 0.3, 0.15)})
    GRIP[(k, 'gripR_trigger')] = {'fingers': ang}
    add_part_specs(k)
    for nm in [n for (kk, n) in GRIPSPEC if kk == k and n not in ('gripR', 'gripL')]:
        solve_part_grip(k, nm, 'r' if nm.endswith('R') else 'l')
    make_clips(k)
    made = []
    only = [x for x in os.environ.get('ONLY', '').split(',') if x]
    for name, (dur, loop, fn, ev) in CLIPS.items():
        if not name.startswith(k + '.'): continue
        if only and name.split('.', 1)[1] not in only: continue
        n = max(2, int(round(dur * FPS)) + (0 if loop else 1))
        frames = []; worst = (0, 0.0); near = 9.0
        # pass 1: hands in transit may be nudged out of the weapon; pass 2 applies the nudges dilated and smoothed
        # over time (a nudge that came and went in one frame would pop)
        LASTPOLE.clear(); LASTNUDGE.clear(); FORCE.clear()
        offs = []
        for i in range(n):
            solve_frame(k, fn(min(dur, i / FPS)))
            offs.append({s: LASTNUDGE.get(s, Vector()).copy() for s in ('l', 'r')})
        sm = smooth_offsets(offs, loop)
        nudged = {s: round(max(vlen(o[s]) for o in sm) * 1000, 1) for s in ('l', 'r')}
        LASTPOLE.clear(); LASTNUDGE.clear()
        hw = []
        for i in range(n):
            t = min(dur, i / FPS)
            FORCE.clear(); FORCE.update(sm[i])
            L, W = solve_frame(k, fn(t))
            FORCE.clear()
            frames.append(L)
            hw.append(screen_width(W, 'r'))
            if MODE == 'diag' and i == 0:
                Ww0 = W['w_root'] @ F.RX90.inverted(); Mi0 = Ww0.inverted()
                for s_ in ('l', 'r'):
                    pids = np.array([j for j in HAND_IDS[s_] if skin.dom[j] == 'hand_' + s_ and skin.N[j][2] < -0.3], int)
                    dd = sorted(F.signed_dist(WPN[k].bvh['body'], Mi0 @ Vector(p)) for p in skin.pose(W, pids))
                    hc = Mi0 @ W['hand_' + s_].translation
                    tgt = Mi0 @ (d0 := fn(0.0))[('lh' if s_ == 'l' else 'rh')].translation
                    log('  contact', name, s_, 'palm nearest mm', [round(v * 1000, 1) for v in dd[:4]], 'wrist got', tuple(round(v, 3) for v in hc), 'wanted', tuple(round(v, 3) for v in tgt))
            if MODE == 'diag' and i % 2 == 0:
                Ww = W['w_root'] @ F.RX90.inverted(); Mi = Ww.inverted(); row = []
                for s in ('l', 'r'):
                    for grp, pre in (('arm', ('lowerarm', 'upperarm')), ('hand', ('hand_', 'index_', 'middle_', 'ring_', 'pinky_', 'thumb_'))):
                        ids = np.array([j for j in skin.verts_of(pre) if skin.dom[j].endswith('_' + s)], int)
                        pn = F.penetration(skin, W, WPN[k].bvh['body'], Mi, idx=ids)
                        if pn[0]: row.append('%s.%s %d/%.1fmm' % (s, grp, pn[0], pn[1] * 1000))
                if row or i % 10 == 0: log('  %s t=%.2f hw=%.3f nudge l=%.0f r=%.0f mm  %s' % (name, t, hw[-1], vlen(sm[i]['l']) * 1000, vlen(sm[i]['r']) * 1000, ' '.join(row)))
            if i % 3 == 0:
                # hand penetration against the weapon body, and the closest arm/weapon point to the eye (near plane)
                Ww = W['w_root'] @ F.RX90.inverted()
                pen = F.penetration(skin, W, WPN[k].bvh['body'], Ww.inverted(), idx=PEN_IDX)
                if pen[0] > worst[0]: worst = pen
                P = skin.pose(W)
                near = min(near, float(np.min(np.linalg.norm(P, axis=1))), float(np.min(np.linalg.norm((np.array(Ww) @ WVH[k].T).T[:, :3], axis=1))))
        if MODE != 'diag':
            act = write_action(name, frames); made.append(act)
        report[name] = {'duration': round(dur, 3), 'loop': loop, 'events': ev, 'pen_max_verts': worst[0], 'pen_max_depth_mm': round(worst[1] * 1000, 1),
                        'nudge_max_mm': nudged, 'handR_screen_width_max': round(max(hw), 3), 'handR_screen_width_t0': round(hw[0], 3),
                        'nearest_to_eye_m': round(near, 3), 'prop': 'grenade' if '.grenade' in name else ('binoculars' if '.binoculars' in name else None),
                        'hold': name.endswith(('.binoculars', '.grenadePull'))}
        log(name, report[name])
    return made

def vlen(v): return v.length if v is not None else 0.0

def smooth_offsets(offs, loop, reach=4, sigma=2.0):
    """Per-frame hand nudges -> dilated (largest within +-reach frames, so the clearance is kept) then Gaussian
    smoothed (sigma frames), per side."""
    n = len(offs); out = [{} for _ in range(n)]
    for s in ('l', 'r'):
        V = np.array([o[s][:] for o in offs])
        if not np.any(V):
            for i in range(n): out[i][s] = None
            continue
        idx = lambda j: (j % n) if loop else min(n - 1, max(0, j))
        D = np.array([V[max((idx(j) for j in range(i - reach, i + reach + 1)), key=lambda j: np.linalg.norm(V[j]))] for i in range(n)])
        ks = np.arange(-3 * int(sigma), 3 * int(sigma) + 1); wk = np.exp(-0.5 * (ks / sigma) ** 2); wk /= wk.sum()
        S = np.array([sum(wk[a] * D[idx(i + ks[a])] for a in range(len(ks))) for i in range(n)])
        for i in range(n): out[i][s] = Vector(S[i])
    return out

def screen_width(W, s):
    """Share of the screen width (16:9, vertical FOV 55) that the hand and fingers of side s cover, in-frame part."""
    P = skin.pose(W, HAND_IDS[s])
    y = np.maximum(P[:, 1], 1e-3); ty = math.tan(math.radians(27.5))
    xn = P[:, 0] / y / (ty * 16 / 9); zn = P[:, 2] / y / ty
    m = (P[:, 1] > 0.01) & (np.abs(zn) <= 1)
    if not np.any(m): return 0.0
    x = np.clip(xn[m], -1, 1)
    return float((x.max() - x.min()) / 2)

def proj(Pts):
    """Screen fractions (x from the left, y from the top) of first-person points, 16:9, vertical FOV 55."""
    Pts = np.atleast_2d(Pts); ty = math.tan(math.radians(27.5)); y = np.maximum(Pts[:, 1], 1e-3)
    return np.stack([0.5 + 0.5 * Pts[:, 0] / y / (ty * 16 / 9), 0.5 - 0.5 * Pts[:, 2] / y / ty], 1)

def composition(k, W):
    """Where the weapon and hands land on screen for the hip pose W (solved arms, grips as fitted)."""
    d = {'W': W, 'rh': grip_r(k, W), 'lh': grip_l(k, W), 'rf': fR(k), 'lf': fL(k), 'parts': {}, 'prop': None}
    L, Wb = solve_frame(k, d)
    Ww = Wb['w_root'] @ F.RX90.inverted()
    mz = proj(np.array((Ww @ WPN[k].empty['muzzle'].translation)[:]))[0]
    wv = proj((np.array(Ww) @ WVH[k].T).T[:, :3])
    out = {'muzzle': mz, 'wbox': (wv[:, 0].min(), wv[:, 1].min())}
    for s in ('l', 'r'):
        q = proj(skin.pose(Wb, HAND_IDS[s]))
        inn = q[(q[:, 0] <= 1) & (q[:, 1] <= 1) & (q[:, 0] >= 0)]
        out['h' + s] = (q[:, 0].min(), q[:, 0].max(), q[:, 1].min(), q[:, 1].max(),
                        (inn[:, 0].max() - inn[:, 0].min()) if len(inn) else 0.0, len(inn) / max(1, len(q)))
    return out

def comp_cost(c, k='rifleScoped'):
    mz = c['muzzle']; hl = c['hl']; hr = c['hr']
    e = 0.0
    if k == 'pistol':   # compact, lower right: the gun and both gloves in frame, the right hand's top at about 0.74
        e += ((mz[0] - 0.64) / 0.03) ** 2 + ((mz[1] - 0.63) / 0.03) ** 2
        e += (((hr[0] + hr[1]) / 2 - 0.74) / 0.05) ** 2 + ((hr[2] - 0.74) / 0.04) ** 2 + ((1 - hr[5]) / 0.1) ** 2
        e += (max(0, hl[4] - 0.12) / 0.02) ** 2 + (max(0, hr[4] - 0.12) / 0.02) ** 2
        return e
    e += ((mz[0] - 0.585) / 0.03) ** 2 + ((mz[1] - 0.59) / 0.03) ** 2
    e += (max(0, 0.52 - c['wbox'][0]) / 0.03) ** 2 + ((c['wbox'][1] - 0.56) / 0.05) ** 2
    e += (((hl[0] + hl[1]) / 2 - 0.615) / 0.05) ** 2 + (((hl[2] + hl[3]) / 2 - 0.75) / 0.05) ** 2 + (max(0, hl[3] - 0.97) / 0.02) ** 2
    e += (((hr[0] + hr[1]) / 2 - 0.85) / 0.05) ** 2 + ((hr[2] - 0.82) / 0.04) ** 2
    e += (max(0, hl[4] - 0.12) / 0.02) ** 2 + (max(0, hr[4] - 0.12) / 0.02) ** 2
    return e

def frame_search(k):
    """Coordinate search of the hip pose (position, yaw, pitch, roll) for the target composition."""
    x = list(BASE[k]['hip'].translation) + [0.0, 0.0, 0.0]
    base = BASE[k]['hip']
    def pose(x):
        return rel(base, dx=x[0] - base.translation.x, dy=x[1] - base.translation.y, dz=x[2] - base.translation.z, yaw=x[3], pitch=x[4], roll=x[5])
    ymax = 0.46 if k == 'pistol' else 0.62
    def cost(x):
        LASTPOLE.clear()
        lim = (max(0, abs(x[3]) - 10) ** 2 + max(0, abs(x[4]) - 8) ** 2 + max(0, -x[5] - 14) ** 2 + max(0, x[5] - 4) ** 2) * 0.5
        lim += (max(0, x[1] - ymax) / 0.01) ** 2 + (max(0, 0.30 - x[1]) / 0.01) ** 2
        return comp_cost(composition(k, pose(x)), k) + lim
    c0 = cost(x); step = [0.02, 0.03, 0.02, 3.0, 3.0, 4.0]
    for it in range(60):
        moved = False
        for i in range(6):
            for sg in (-1, 1):
                y = list(x); y[i] += sg * step[i]; c = cost(y)
                if c < c0: x, c0, moved = y, c, True
        if not moved:
            step = [v * 0.5 for v in step]
            if step[0] < 0.002: break
    c = composition(k, pose(x)); W = pose(x)
    e = W.to_euler('XYZ')
    log('FRAME', k, 'cost %.2f' % c0, 'pos', tuple(round(v, 3) for v in W.translation), 'deltas yaw/pitch/roll', tuple(round(v, 1) for v in x[3:]),
        {kk: tuple(round(float(v), 3) for v in vv) for kk, vv in c.items()})

PEN_IDX = None; WVH = {}
if __name__ == '__main__':
    PEN_IDX = skin.verts_of(('hand_', 'index_', 'middle_', 'ring_', 'pinky_', 'thumb_', 'lowerarm'))
    for kk in ('rifleScoped', 'smg', 'pistol'):
        V = np.concatenate([np.array([(WPN[kk].root.matrix_world.inverted() @ o.matrix_world @ v.co)[:] for v in o.data.vertices]) for obs in WPN[kk].meshes.values() for o in obs])
        WVH[kk] = np.concatenate([V, np.ones((len(V), 1))], 1)[::7]
    kinds = os.environ.get('KINDS', 'rifleScoped,smg,pistol').split(',')
    if MODE == 'preview':
        k = kinds[0]
        setup_render(); os.makedirs(FPW + '/preview', exist_ok=True)
        solve_grip(k, 'gripR', 'r'); solve_grip(k, 'gripL', 'l', trigger=True)
        add_part_specs(k)
        for nm in [n for (kk, n) in GRIPSPEC if kk == k and n not in ('gripR', 'gripL')]:
            solve_part_grip(k, nm, 'r' if nm.endswith('R') else 'l')
        GRIP[(k, 'gripR_trigger')] = {'fingers': {'index': (0.55, 0.75, 0.35)}}
        make_clips(k)
        for spec in os.environ.get('SHOTS', 'idle@0').split(','):
            nm, tt = spec.split('@')
            d_ = CLIPS[k + '.' + nm][2](float(tt))
            L, W = solve_frame(k, d_)
            PROPSHOW[0] = d_['prop'][0] if d_['prop'] else None
            render(FPW + '/preview/%s_%s_%s.png' % (k, nm, tt), L, W, k)
            if os.environ.get('OUTSIDE'):
                render(FPW + '/preview/%s_%s_%s_out.png' % (k, nm, tt), L, W, k, view=(Vector((0.75, -0.45, 0.35)), Vector((0.0, 0.25, -0.2)), 50))
                render(FPW + '/preview/%s_%s_%s_out2.png' % (k, nm, tt), L, W, k, view=(Vector((-0.2, 0.9, -0.5)), Vector((0.0, 0.2, -0.15)), 50))
            if os.environ.get('GRIPVIEW'):   # close views of the right-hand grip: from the left side and from below-behind
                g = W['w_root'] @ F.RX90.inverted() @ Vector([float(v) for v in os.environ.get('GRIPPT', '0,0.04,-0.04').split(',')])
                R3 = (W['w_root'] @ F.RX90.inverted()).to_3x3()
                render(FPW + '/preview/%s_%s_%s_gl.png' % (k, nm, tt), L, W, k, view=(g + R3 @ Vector((0.28, 0.02, 0.03)), g, 30))
                render(FPW + '/preview/%s_%s_%s_gr.png' % (k, nm, tt), L, W, k, view=(g + R3 @ Vector((-0.28, 0.02, 0.03)), g, 30))
                render(FPW + '/preview/%s_%s_%s_gb.png' % (k, nm, tt), L, W, k, view=(g + R3 @ Vector((0.0, 0.28, 0.06)), g, 30))
            log('rendered', nm, tt)
    else:
        report = {}; made = []
        if os.environ.get('FRAME'):
            for k in kinds:
                solve_grip(k, 'gripR', 'r', trigger=False); solve_grip(k, 'gripL', 'l', trigger=True)
                GRIP[(k, 'gripR_trigger')] = {'fingers': {'index': (0.55, 0.75, 0.35)}}
                c = composition(k, BASE[k]['hip']); log('NOW', k, 'cost %.2f' % comp_cost(c, k), {kk: tuple(round(float(v), 3) for v in vv) for kk, vv in c.items()})
                frame_search(k)
            sys.exit(0)
        for k in kinds: made += bake_kind(k, report)
        if MODE == 'diag':
            json.dump(report, open(FPW + '/diag.json', 'w'), indent=1); log('diag written'); sys.exit(0)
        # the ADS offset as a viewmodel-group transform (three.js frame): A @ hip = ads
        C = Matrix.Rotation(-math.pi / 2, 4, 'X')
        kinds_meta = {}
        for k in kinds:
            A = C @ (BASE[k]['ads'] @ BASE[k]['hip'].inverted()) @ C.inverted()
            q = A.to_quaternion()
            kinds_meta[k] = {'adsOffset': {'position': [round(x, 5) for x in A.translation], 'quaternion': [round(q.x, 5), round(q.y, 5), round(q.z, 5), round(q.w, 5)]},
                             'grips': {nm: {'pen_verts': g['pen'][0], 'pen_depth_mm': round(g['pen'][1] * 1000, 1)} for (kk, nm), g in GRIP.items() if kk == k and 'pen' in g}}
        json.dump({'version': 1, 'kinds': kinds_meta, 'clips': report}, open(FPW + '/fp.json', 'w'), indent=1)
        arm.animation_data_create(); arm.animation_data.action = None
        for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
        for a in made:
            tr_ = arm.animation_data.nla_tracks.new(); tr_.name = a.name
            tr_.strips.new(a.name, 0, a)
        for o in list(bpy.data.objects):
            if o not in (arm, mesh): bpy.data.objects.remove(o)
        bpy.context.scene.render.fps = FPS; bpy.context.scene.frame_start = 0
        # rest pose for the bind: arms as in the idle of the first kind would hide nothing; keep the T-pose bind
        bpy.ops.export_scene.gltf(filepath=FPW + '/fp.glb', export_format='GLB', export_animation_mode='NLA_TRACKS',
                                  export_def_bones=False, export_optimize_animation_size=True, export_force_sampling=True,
                                  export_image_format='AUTO')
        log('exported', FPW + '/fp.glb', len(made), 'clips')
