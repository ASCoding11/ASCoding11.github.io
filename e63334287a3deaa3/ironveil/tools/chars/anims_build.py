# Builds every clip of the IVChars API on the shared skeleton and exports anims.glb + grips.json.
import bpy, sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as L_, anim_lib as A
from mathutils import Vector, Matrix, Quaternion, Euler
from anim_lib import FWD, LEFT, UP, keys, smooth, lerp

OUT = sys.argv[-1]
ONLY = os.environ.get('ONLY', '').split(',') if os.environ.get('ONLY') else None
FPS = 30
bpy.ops.wm.open_mainfile(filepath=L_.WORK + '/hero_baked.blend')
arm = bpy.data.objects['Armature']
if 'weapon_r' not in arm.data.bones:
    L_.set_active(arm); bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones; hr = eb['hand_r']; w = eb.new('weapon_r')
    w.head = hr.head.copy(); w.tail = hr.tail.copy(); w.roll = hr.roll; w.parent = hr
    bpy.ops.object.mode_set(mode='OBJECT')
# UAL2 clips
before = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=L_.UAL2)
for o in list(bpy.data.objects):
    if o.name not in ('Armature',) and (o.type in ('MESH', 'ARMATURE')) and o.name.startswith(('Armature.', 'Mannequin', 'Icosphere')):
        bpy.data.objects.remove(o)
R = A.Rig(arm)
R.pel_scale = R.Mr['pelvis'].translation.z / 0.917
SRC = {a.name: a for a in bpy.data.actions}
def src(n): return SRC[n]
def dur(n): return (src(n).frame_range[1] - src(n).frame_range[0]) / 24.0

EYE_R = Vector((-0.031, -0.235, 1.712))
REST = R.rest(); WREST = R.W(REST)

# ---------------- weapon classes (weapon local: -Y barrel, +Z up, +X weapon-left; origin = right grip point)
GUNS = {
    'rifle': dict(sight=0.072, eye=0.23, butt=0.34,
                  gripR=Vector((0, 0.035, -0.012)), dirR=Vector((0.15, -0.55, -0.82)), palmR=Vector((1, 0, -0.1)),
                  gripL=Vector((0, -0.29, -0.004)), dirL=Vector((-0.42, -0.82, 0.38)), palmL=Vector((-0.35, 0.0, 0.94))),
    'pistol': dict(sight=0.04, eye=0.55, butt=0.0,
                   gripR=Vector((0, 0.02, -0.05)), dirR=Vector((0.1, -0.35, -0.93)), palmR=Vector((1, 0, -0.05)),
                   gripL=Vector((0.012, 0.03, -0.06)), dirL=Vector((-0.5, -0.4, -0.75)), palmL=Vector((-0.9, 0.0, 0.3))),
}
CURL_R = {'index': 0.35, 'middle': 0.85, 'ring': 0.92, 'pinky': 0.95}
CURL_L = {'index': 0.6, 'middle': 0.65, 'ring': 0.7, 'pinky': 0.72}

def weapon_matrix(origin, fwd, up=UP):
    f = fwd.normalized(); x = up.cross(-f).normalized() if False else (-f).cross(up).normalized()
    # local axes: +X = weapon left, +Y = backward (-fwd), +Z = up
    y = -f; z = x.cross(y).normalized(); x = y.cross(z).normalized()
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = origin
    return M

def chest_delta(W):
    return W['spine_03'] @ R.Mr['spine_03'].inverted()

LAST = {}
def place_hands(L, W, Wm, gun, right=True, left=True, curl=True, lw=1.0, left_override=None):
    g = GUNS[gun]
    R3 = Wm.to_3x3()
    if right:
        grip = Wm @ g['gripR']; d = (R3 @ g['dirR']).normalized(); pm = (R3 @ g['palmR']).normalized()
        wrist = grip - d * 0.065 - pm * 0.028
        rot = R.hand_rot('r', d, pm)
        LAST['r'] = rot.to_4x4(); LAST['r'].translation = wrist
        pole = chest_delta(W).to_3x3() @ Vector((-0.9, 0.25, -0.7))
        R.two_bone(L, W, 'upperarm_r', 'lowerarm_r', 'hand_r', wrist, pole, Vector((0, 0, 1)), end_rot=rot)
        if curl: R.curl(L, W, 'r', CURL_R, thumb=0.55)
    if left:
        if left_override is not None:
            wrist, rot = left_override
        else:
            grip = Wm @ g['gripL']; d = (R3 @ g['dirL']).normalized(); pm = (R3 @ g['palmL']).normalized()
            wrist = grip - d * 0.06 - pm * 0.03
            rot = R.hand_rot('l', d, pm)
        LAST['l'] = rot.to_4x4(); LAST['l'].translation = wrist
        pole = chest_delta(W).to_3x3() @ Vector((0.35, 0.1, -1.0))
        R.two_bone(L, W, 'upperarm_l', 'lowerarm_l', 'hand_l', wrist, pole, Vector((0, 0, -1)), end_rot=rot)
        if curl: R.curl(L, W, 'l', CURL_L, thumb=0.35)

def set_weapon_bone(L, W, Wm, gun_grip):
    """Make weapon_r carry the weapon at Wm whatever the hand does (gun_grip = hand frame in weapon space)."""
    R.set_world(L, W, 'weapon_r', Wm @ gun_grip)

# ---------- aim solution for the long gun (computed once from the idle base)
def aim_weapon(L, W, pitch=0.0, recoil=0.0, gun='rifle'):
    Dh = R.delta(W, 'Head')
    eye = W['Head'].translation + Dh @ (EYE_R - R.Mr['Head'].translation)
    aim = (Quaternion(LEFT, -pitch + recoil * 0.25) @ FWD).normalized()
    g = GUNS[gun]
    up = (Quaternion(LEFT, -pitch) @ UP)
    origin = eye + aim * g['eye'] - up * g['sight'] - aim * recoil * 0.045
    return weapon_matrix(origin, aim, up)

def eye_pos(W):
    Dh = R.delta(W, 'Head')
    return W['Head'].translation + Dh @ (EYE_R - R.Mr['Head'].translation)

def head_to(L, W, target, iters=10, chain=('neck_01', 'Head', 'spine_03'), limits=(0.4, 0.22, 0.14)):
    """CCD: bring the right eye onto the sight line (cheek weld)."""
    for it in range(iters):
        for b, lim in zip(chain, limits):
            e = eye_pos(W); pv = W[b].translation
            a = (e - pv); c = (target - pv)
            if a.length < 1e-4 or c.length < 1e-4: continue
            q = a.rotation_difference(c)
            ang = q.angle
            if ang < 1e-5: continue
            ax = q.axis
            # damp roll about the aim axis so the head tilts but does not lie on its side
            fw = ax.dot(FWD)
            ax = (ax - FWD * fw * 0.85).normalized()
            q = Quaternion(ax, min(ang, lim / iters * 2))
            R.rot_world(L, W, b, q)
    return (eye_pos(W) - target).length

def stance_aim(L, W, t, pitch=0.0, recoil=0.0, breathe=True, gun='rifle', lean=0.08, blade=-0.22):
    br = math.sin(t * 2 * math.pi / 3.2) * 0.008 if breathe else 0.0
    R.spine(L, W, pitch=lean + br - recoil * 0.10, yaw=blade, roll=0.02)
    R.look(L, W, yaw=-blade * 0.8, pitch=0.0)
    # right shoulder up and forward into the stock, left one forward toward the fore-end
    R.rot_world(L, W, 'clavicle_r', Quaternion(UP, -0.10) @ Quaternion(FWD, 0.10))
    R.rot_world(L, W, 'clavicle_l', Quaternion(UP, 0.12))
    C3 = chest_delta(W).to_3x3()
    g = GUNS[gun]
    # stock high in the shoulder pocket, so the head only has to come forward and down a little onto the comb
    pocket = W['upperarm_r'].translation + C3 @ Vector((0.08, -0.05, 0.065))
    aim = (Quaternion(LEFT, -pitch + recoil * 0.22) @ FWD).normalized()
    up = (Quaternion(LEFT, -pitch + recoil * 0.22) @ UP)
    Wm = weapon_matrix(Vector(), aim, up)
    butt = Vector((0, g['butt'], -0.02))
    origin = pocket - Wm.to_3x3() @ butt - aim * recoil * 0.04
    Wm.translation = origin
    target = Wm @ Vector((0, g['eye'], g['sight'] + 0.012))
    err = head_to(L, W, target)
    if err > 0.015:
        # cannot get the cheek down far enough: raise the gun the rest of the way
        e = eye_pos(W)
        Wm.translation += Vector((0, 0, max(0.0, e.z - target.z)))
    place_hands(L, W, Wm, gun)
    return Wm

def hold_low(L, W, t, gun='rifle', bob=0.0):
    """Low ready: muzzle down-forward, stock under the right armpit."""
    R.spine(L, W, pitch=0.04, yaw=-0.12, roll=0.0)
    R.look(L, W, yaw=0.10, pitch=0.02)
    C = chest_delta(W)
    aim = (Quaternion(UP, 0.22) @ Quaternion(LEFT, 0.32) @ FWD).normalized()
    up = (Quaternion(UP, 0.22) @ Quaternion(LEFT, 0.32) @ Quaternion(FWD, 0.2) @ UP)
    o = Vector((-0.12, -0.26, 1.2 + bob))
    Wm = C @ weapon_matrix(o, aim, up)
    place_hands(L, W, Wm, gun)
    return Wm

def port_arms(L, W, t):
    """Rifle diagonal across the chest for sprinting."""
    C = chest_delta(W)
    aim = Vector((0.55, -0.35, 0.75)).normalized()
    up = Vector((0.0, -0.9, 0.3)).normalized()
    o = Vector((-0.10, -0.24, 1.20))
    Wm = C @ weapon_matrix(o, aim, up)
    place_hands(L, W, Wm, 'rifle')
    return Wm

# ---------------- clip builders
CLIPS = {}
def clip(name, length, loop=True):
    def deco(fn):
        CLIPS[name] = (fn, length, loop)
        return fn
    return deco

def base(name, t, speed=1.0):
    d = dur(name)
    L = R.from_action(src(name), (t * speed) % d if d > 0 else 0)
    if name in ('Idle_Loop', 'Walk_Loop'):
        # the source idle/walk slouch and look at the floor; a soldier stands taller and looks ahead
        W = R.W(L)
        R.spine(L, W, pitch=-0.07)
        R.look(L, W, pitch=-0.22 if name == 'Idle_Loop' else -0.12)
    return L

def loc_strip(L):
    pass

def finalize(L, W, Wm=None, gun='rifle'):
    """weapon_r: identity on the hand unless a weapon matrix is given."""
    if Wm is not None and GRIP.get(gun) is not None:
        set_weapon_bone(L, W, Wm, GRIP[gun])
    else:
        L['weapon_r'] = R.Lr['weapon_r'].copy()
    return L

GRIP = {}

def solve_grips():
    L = base('Idle_Loop', 0.0); W = R.W(L)
    # grips = the intended hand frames in weapon space (independent of whether the IK reached them)
    Wm = stance_aim(L, W, 0.0, breathe=False)
    GRIP['rifle'] = Wm.inverted() @ LAST['r']
    GRIP['rifleL'] = Wm.inverted() @ LAST['l']
    L = base('Idle_Loop', 0.0); W = R.W(L)
    Wm = pistol_aim(L, W, 0.0)
    GRIP['pistol'] = Wm.inverted() @ LAST['r']
    GRIP['pistolL'] = Wm.inverted() @ LAST['l']
    for k in ('rifle', 'pistol'):
        print('grip', k, GRIP[k].translation, 'reach error r', (W['hand_r'].translation - LAST['r'].translation).length)
    return GRIP

def pistol_aim(L, W, t, recoil=0.0):
    R.spine(L, W, pitch=0.05 - recoil * 0.1, yaw=-0.12, roll=0.0)
    R.look(L, W, yaw=0.1, pitch=0.08)
    Dh = R.delta(W, 'Head')
    eye = W['Head'].translation + Dh @ (EYE_R + Vector((0.031, 0, 0)) - R.Mr['Head'].translation)
    aim = (Quaternion(LEFT, recoil * 0.4) @ FWD).normalized()
    up = Quaternion(LEFT, recoil * 0.4) @ UP
    origin = eye + aim * 0.42 - up * 0.05 - aim * recoil * 0.04
    Wm = weapon_matrix(origin, aim, up)
    place_hands(L, W, Wm, 'pistol')
    return Wm

# --- locomotion (full body, unarmed upper; the game layers a weapon pose on top)
for nm, srcn in [('idle', 'Idle_Loop'), ('walk', 'Walk_Loop'), ('run', 'Jog_Fwd_Loop'), ('sprint', 'Sprint_Loop'),
                 ('crouchIdle', 'Crouch_Idle_Loop'), ('crouchWalk', 'Crouch_Fwd_Loop'), ('sitIdle', 'Sitting_Idle_Loop')]:
    def mk(srcn=srcn):
        def f(t):
            L = base(srcn, t); W = R.W(L); return finalize(L, W)
        return f
    CLIPS[nm] = (mk(), dur(srcn), True)

if os.environ.get('UALTEST'):
    for srcn in ['Death01', 'Hit_Knockback', 'Hit_Chest', 'Hit_Head', 'OverhandThrow', 'Melee_Hook', 'ClimbUp_1m', 'LayToIdle', 'Idle_Rail_Call', 'Punch_Cross', 'Roll', 'Interact', 'PickUp_Table']:
        def mk(srcn=srcn):
            def f(t):
                L = base(srcn, min(t, dur(srcn) - 0.001)); W = R.W(L); return finalize(L, W)
            return f
        CLIPS['ual_' + srcn] = (mk(), dur(srcn), False)

@clip('aimIdle', 3.2)
def c_aimIdle(t):
    L = base('Idle_Loop', t); W = R.W(L)
    Wm = stance_aim(L, W, t); return finalize(L, W)

@clip('aimWalk', dur('Walk_Loop'))
def c_aimWalk(t):
    L = base('Walk_Loop', t); W = R.W(L)
    # steady the chest against the walk sway
    Wm = stance_aim(L, W, t, breathe=False); return finalize(L, W)

@clip('crouchAim', 3.2)
def c_crouchAim(t):
    L = base('Crouch_Idle_Loop', t); W = R.W(L)
    Wm = stance_aim(L, W, t, pitch=0.0); return finalize(L, W)

@clip('holdRifle', 2.5)
def c_hold(t):
    L = base('Idle_Loop', t); W = R.W(L)
    hold_low(L, W, t); return finalize(L, W)

@clip('aimPistol', 3.2)
def c_aimPistol(t):
    L = base('Idle_Loop', t); W = R.W(L)
    pistol_aim(L, W, t); return finalize(L, W)

@clip('sprintRifle', dur('Sprint_Loop'))
def c_sprintRifle(t):
    L = base('Sprint_Loop', t); W = R.W(L)
    port_arms(L, W, t); return finalize(L, W)

@clip('fire', 0.3, loop=False)
def c_fire(t):
    L = base('Idle_Loop', 0.4); W = R.W(L)
    k = math.exp(-t * 18) * (1 - math.exp(-t * 90)) * 1.6
    stance_aim(L, W, 0.4, recoil=k, breathe=False); return finalize(L, W)

@clip('firePistol', 0.3, loop=False)
def c_firePistol(t):
    L = base('Idle_Loop', 0.4); W = R.W(L)
    k = math.exp(-t * 16) * (1 - math.exp(-t * 90)) * 1.6
    pistol_aim(L, W, 0.4, recoil=k); return finalize(L, W)

# ======================= authored full-body and upper clips =======================
def ease(track, t):
    """track: list of (time, value[, 'in'|'out'|'lin'|'smooth'])."""
    if t <= track[0][0]: return track[0][1]
    for k0, k1 in zip(track, track[1:]):
        t0, v0 = k0[0], k0[1]; t1, v1 = k1[0], k1[1]
        if t <= t1:
            u = max(0.0, min(1.0, (t - t0) / max(1e-6, t1 - t0)))
            mode = k1[2] if len(k1) > 2 else 'smooth'
            if mode == 'in': u = u * u
            elif mode == 'out': u = 1 - (1 - u) * (1 - u)
            elif mode == 'smooth': u = u * u * (3 - 2 * u)
            elif mode == 'bounce': u = 1 - abs(math.cos(u * math.pi * 1.5)) * (1 - u) if u < 1 else 1
            if isinstance(v0, Quaternion): return v0.slerp(v1, u)
            if isinstance(v0, tuple): return tuple(a + (b - a) * u for a, b in zip(v0, v1))
            return v0 + (v1 - v0) * u
    return track[-1][1]

V = lambda x, y, z: Vector((x, y, z))
PEL0 = R.Mr['pelvis'].translation.copy()
SH = {s: R.Mr['upperarm_' + s].translation.copy() for s in 'lr'}
HIPS = {s: R.Mr['thigh_' + s].translation.copy() for s in 'lr'}
ANK = {s: R.Mr['foot_' + s].translation.copy() for s in 'lr'}

def pelvis_set(L, W, pos, pitch=0.0, yaw=0.0, roll=0.0):
    q = Quaternion(UP, yaw) @ Quaternion(LEFT, pitch) @ Quaternion(FWD, -roll)
    M = Matrix.Translation(pos) @ q.to_matrix().to_4x4() @ Matrix.Translation(-PEL0) @ R.Mr['pelvis']
    R.set_world(L, W, 'pelvis', M)
    return q

def spine_rel(L, W, q_body, pitch=0.0, yaw=0.0, roll=0.0, frac=(0.25, 0.35, 0.4)):
    """Spine bend about the body's own axes (q_body = pelvis orientation)."""
    up, left, fwd = q_body @ UP, q_body @ LEFT, q_body @ FWD
    for b, f in zip(('spine_01', 'spine_02', 'spine_03'), frac):
        R.rot_world(L, W, b, Quaternion(up, yaw * f) @ Quaternion(left, pitch * f) @ Quaternion(fwd, -roll * f))

def look_rel(L, W, q_body, yaw=0.0, pitch=0.0, roll=0.0, neck=0.45):
    up, left, fwd = q_body @ UP, q_body @ LEFT, q_body @ FWD
    for b, f in (('neck_01', neck), ('Head', 1 - neck)):
        R.rot_world(L, W, b, Quaternion(up, yaw * f) @ Quaternion(left, pitch * f) @ Quaternion(fwd, -roll * f))

def leg(L, W, s, ankle, pole=FWD, foot_dir=None, foot_up=None):
    R.two_bone(L, W, 'thigh_' + s, 'calf_' + s, 'foot_' + s, ankle, pole, Vector((1, 0, 0)))
    if foot_dir is not None:
        if foot_up is None:
            R.aim_bone(L, W, 'foot_' + s, foot_dir)
        else:
            rest_up = Vector((0, 0, 1))
            R.aim_bone(L, W, 'foot_' + s, foot_dir, foot_up, rest_up)

def arm_ik(L, W, s, wrist, pole, hdir=None, palm=None, curl=None):
    hinge = Vector((0, 0, -1)) if s == 'l' else Vector((0, 0, 1))
    rot = R.hand_rot(s, hdir, palm) if hdir is not None else None
    R.two_bone(L, W, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, wrist, pole, hinge, end_rot=rot)
    if curl is not None:
        R.curl(L, W, s, {'index': curl, 'middle': curl, 'ring': curl, 'pinky': curl}, thumb=curl * 0.6)

def chest_pt(W, v):
    """Point given in rest-chest coordinates, moved with the chest."""
    return chest_delta(W) @ v

def relaxed_arms(L, W, swing=0.0, bend=0.35, curl=0.35, spread=0.12):
    for s, sg in (('l', 1), ('r', -1)):
        sh = W['upperarm_' + s].translation
        C3 = chest_delta(W).to_3x3()
        wrist = sh + C3 @ Vector((sg * spread, -0.12 - swing * sg, -0.5 + bend * 0.12))
        arm_ik(L, W, s, wrist, C3 @ Vector((sg * 0.6, 1.0, -0.2)), C3 @ Vector((sg * 0.15, -0.3, -1)), C3 @ Vector((-sg, 0.2, 0)), curl)

# ---- prone
PRONE_Z = 0.13
def prone_base(L, W, t, crawl=None):
    q = pelvis_set(L, W, V(0, 0.15, PRONE_Z + 0.03), pitch=math.radians(84))
    spine_rel(L, W, q, pitch=-0.42, yaw=0.0)          # chest up on the elbows
    for s, sg in (('l', 1), ('r', -1)):
        k = crawl.get(s, 0.0) if crawl else 0.0
        hip = W['thigh_' + s].translation
        # leg straight back, feet slightly apart, toes in the ground; crawl draws the knee up to the side
        ank = V(sg * (0.2 + 0.18 * k), hip.y + 0.86 - 0.42 * k, 0.09 + 0.04 * k)
        leg(L, W, s, ank, pole=V(sg * (0.2 + k), 0.2 - k * 0.5, -1).normalized(), foot_dir=V(0, 0.35, -1).normalized())
    return q

def prone_rifle(L, W, t, aim=False, crawl=None):
    q = prone_base(L, W, t, crawl)
    if aim:
        look_rel(L, W, q, pitch=-0.65)
        sh = W['upperarm_r'].translation
        aimd = FWD.copy(); up = UP.copy()
        Wm = weapon_matrix(Vector(), aimd, up)
        pocket = sh + V(0.07, -0.05, 0.02)
        Wm.translation = pocket - Wm.to_3x3() @ Vector((0, GUNS['rifle']['butt'], -0.02))
        target = Wm @ Vector((0, GUNS['rifle']['eye'], GUNS['rifle']['sight'] + 0.012))
        head_to(L, W, target, chain=('Head', 'neck_01'), limits=(0.6, 0.5))
    else:
        look_rel(L, W, q, pitch=-0.75)
        C = chest_delta(W)
        Wm = weapon_matrix(V(-0.1, -0.45, 0.2), Quaternion(UP, 0.25) @ FWD, UP)
    place_hands(L, W, Wm, 'rifle')
    return Wm

@clip('proneIdle', 3.0)
def c_proneIdle(t):
    L = R.rest(); W = R.W(L)
    prone_rifle(L, W, t); return finalize(L, W)

@clip('proneAim', 3.0)
def c_proneAim(t):
    L = R.rest(); W = R.W(L)
    prone_rifle(L, W, t, aim=True); return finalize(L, W)

@clip('proneCrawl', 1.6)
def c_proneCrawl(t):
    ph = t / 1.6 * 2 * math.pi
    kl = max(0.0, math.sin(ph)); kr = max(0.0, -math.sin(ph))
    L = R.rest(); W = R.W(L)
    q = prone_base(L, W, t, crawl={'l': kl, 'r': kr})
    R.rot_world(L, W, 'pelvis', Quaternion(q @ UP, math.sin(ph) * 0.12))
    look_rel(L, W, q, pitch=-0.7, yaw=-math.sin(ph) * 0.1)
    # elbows reach forward alternately; the rifle rides in the right hand across the forearms
    C3 = chest_delta(W).to_3x3()
    sh = W['upperarm_l'].translation
    wrist = V(sh.x - 0.1, sh.y - 0.28 - 0.18 * kr, 0.11 + 0.05 * kr)
    arm_ik(L, W, 'l', wrist, V(0.8, 0.1, -0.6), V(-0.4, -1, 0), V(0, 0, -1), 0.5)
    sh = W['upperarm_r'].translation
    Wm = weapon_matrix(V(sh.x + 0.1, sh.y - 0.42 - 0.18 * kl, 0.16 + 0.04 * kl), Quaternion(UP, 0.12) @ FWD, Quaternion(FWD, 0.5) @ UP)
    place_hands(L, W, Wm, 'rifle', left=False)
    return finalize(L, W)

# ---- weapon handling (upper clips layered over legs)
def reload_pose(L, W, t, T=2.4):
    """Rifle tilted, held by the left hand; right hand fetches a clip from the belt and loads from the top."""
    R.spine(L, W, pitch=0.12, yaw=-0.15)
    R.look(L, W, yaw=0.15, pitch=0.35)
    C = chest_delta(W)
    tilt = ease([(0, 0.0), (0.25, 0.45), (T - 0.35, 0.45), (T, 0.0)], t)
    aim = (Quaternion(UP, 0.35) @ Quaternion(LEFT, 0.35) @ FWD).normalized()
    up = Quaternion(aim, -tilt) @ (Quaternion(UP, 0.35) @ Quaternion(LEFT, 0.35) @ UP)
    Wm = C @ weapon_matrix(V(-0.06, -0.3, 1.26), aim, up)
    place_hands(L, W, Wm, 'rifle', right=False)
    # right hand path: grip -> belt pouch -> above the receiver (push) -> grip
    g = GUNS['rifle']
    grip = Wm @ g['gripR']; top = Wm @ V(0.0, -0.04, 0.09); press = Wm @ V(0.0, -0.04, 0.045)
    pouch = C @ V(-0.12, -0.22, 1.04)
    pts = [(0.0, grip), (0.35, grip), (0.75, pouch), (0.95, pouch), (1.35, top), (1.6, press), (1.75, top), (2.0, grip), (T, grip)]
    w = ease(pts, t)
    on_grip = t < 0.4 or t > 1.95
    if on_grip:
        place_hands(L, W, Wm, 'rifle', left=False)
    else:
        arm_ik(L, W, 'r', w - V(0, 0, 0.03), C.to_3x3() @ V(-1, 0.3, -0.5), C.to_3x3() @ V(0.2, -0.4, -1), C.to_3x3() @ V(1, 0, 0), 0.75)
    return Wm

@clip('reload', 2.4, loop=False)
def c_reload(t):
    L = base('Idle_Loop', t); W = R.W(L)
    Wm = reload_pose(L, W, t); return finalize(L, W, Wm)

def bolt_pose(L, W, t, T=1.0):
    Wm = stance_aim(L, W, 0.0, breathe=False, recoil=ease([(0, 0.4), (0.2, 0.0), (T, 0.0)], t))
    g = GUNS['rifle']
    knob = V(-0.062, 0.025, 0.012)
    k_up = knob + V(0.0, 0.0, 0.035); k_back = k_up + V(0, 0.085, 0)
    path = [(0.0, g['gripR'] + V(0, 0, 0)), (0.18, knob), (0.3, k_up), (0.48, k_back), (0.62, k_up), (0.72, knob), (0.92, g['gripR']), (T, g['gripR'])]
    p = ease(path, t)
    if t < 0.06 or t > 0.9:
        return Wm
    wp = Wm @ p
    C3 = Wm.to_3x3()
    arm_ik(L, W, 'r', wp - C3 @ V(-0.02, 0.06, 0.02), V(-1, 0.2, -0.6), C3 @ V(0.4, -0.2, -0.9), C3 @ V(0.8, 0, 0.3), 0.7)
    return Wm

@clip('boltCycle', 1.0, loop=False)
def c_bolt(t):
    L = base('Idle_Loop', 0.4); W = R.W(L)
    Wm = bolt_pose(L, W, t); return finalize(L, W, Wm)

@clip('throw', 1.4, loop=False)
def c_throw(t):
    """Overhand grenade throw: wind-up with the right arm back, step and release at ~0.75 s."""
    L = base('Idle_Loop', 0.3); W = R.W(L)
    lean = ease([(0, 0.0), (0.45, -0.25), (0.75, 0.35, 'in'), (1.0, 0.25), (1.4, 0.0)], t)
    twist = ease([(0, 0.0), (0.45, -0.6), (0.75, 0.45, 'in'), (1.4, 0.0)], t)
    pel = PEL0 + V(0, ease([(0, 0.0), (0.45, 0.08), (0.8, -0.12), (1.4, 0.0)], t), ease([(0, -0.03), (0.45, -0.05), (0.8, -0.08), (1.4, -0.03)], t))
    q = pelvis_set(L, W, pel, yaw=twist * 0.4)
    for s, sg in (('l', 1), ('r', -1)):
        a0 = ANK[s].copy(); a0.z = 0.085
        fwd = ease([(0, 0.0), (0.45, 0.0), (0.75, -0.25), (1.4, -0.12)], t) if s == 'l' else ease([(0, 0.0), (0.45, 0.12), (1.4, 0.05)], t)
        leg(L, W, s, a0 + V(0, fwd, 0), pole=FWD, foot_dir=V(0, -0.85, -0.5).normalized())
    spine_rel(L, W, q, pitch=lean, yaw=twist * 0.6)
    look_rel(L, W, q, yaw=-twist * 0.6, pitch=-0.1)
    C3 = chest_delta(W).to_3x3()
    sh = W['upperarm_r'].translation
    wr = ease([(0.0, V(-0.1, -0.25, -0.25)), (0.45, V(-0.12, 0.3, 0.25)), (0.72, V(-0.05, -0.25, 0.3), 'in'), (0.95, V(0.05, -0.45, -0.25)), (1.4, V(-0.1, -0.2, -0.45))], t)
    arm_ik(L, W, 'r', sh + C3 @ wr, C3 @ V(-1, 0.3, -0.4), C3 @ wr.normalized(), C3 @ V(1, 0, 0), 0.8 if t < 0.75 else 0.2)
    shl = W['upperarm_l'].translation
    wl = ease([(0.0, V(0.15, -0.2, -0.45)), (0.45, V(0.15, -0.45, 0.05)), (0.8, V(0.2, 0.1, -0.4)), (1.4, V(0.15, -0.15, -0.48))], t)
    arm_ik(L, W, 'l', shl + C3 @ wl, C3 @ V(1, 0.3, -0.5), C3 @ V(0.1, -1, 0.2), C3 @ V(-1, 0, 0), 0.4)
    return finalize(L, W)

@clip('melee', 0.9, loop=False)
def c_melee(t):
    """Rifle-butt stroke: from low ready, the butt drives forward and up."""
    L = base('Idle_Loop', 0.3); W = R.W(L)
    k = ease([(0, 0.0), (0.25, -0.35), (0.45, 1.0, 'in'), (0.6, 1.0), (0.9, 0.0)], t)
    R.spine(L, W, pitch=0.05 + 0.15 * max(0, k), yaw=-0.1 + 0.45 * k)
    R.look(L, W, yaw=-0.3 * k)
    C = chest_delta(W)
    aim = (Quaternion(UP, 0.4 + 0.8 * max(0, k)) @ Quaternion(LEFT, 0.5 - 1.3 * max(0, k)) @ FWD).normalized()
    up = Quaternion(UP, 0.4) @ UP
    Wm = C @ weapon_matrix(V(-0.12, -0.24 - 0.12 * max(0, k), 1.22 + 0.1 * max(0, k)), aim, up)
    place_hands(L, W, Wm, 'rifle')
    return finalize(L, W)

@clip('hit', dur('Hit_Chest'), loop=False)
def c_hit(t):
    L = base('Hit_Chest', min(t, dur('Hit_Chest') - 0.01)); W = R.W(L); return finalize(L, W)

@clip('deathBack', dur('Death01'), loop=False)
def c_deathBack(t):
    L = base('Death01', min(t, dur('Death01') - 0.01)); W = R.W(L); return finalize(L, W)

def fall_front(L, W, t, run=False, twist=0.0):
    """Weighty forward death: knees go first, torso folds, hits the ground, small settle."""
    T0 = 0.0
    if run:
        z = ease([(0, PEL0.z - 0.05), (0.25, PEL0.z - 0.02), (0.55, 0.62, 'in'), (0.8, 0.18, 'in'), (0.92, 0.22, 'out'), (1.1, 0.16), (2.0, 0.15)], t)
        y = ease([(0, 0.0), (0.8, -0.85, 'lin'), (1.2, -1.15, 'out'), (2.0, -1.15)], t)
        pit = ease([(0, 0.25), (0.55, 0.8, 'in'), (0.85, 1.48, 'in'), (0.95, 1.42), (1.2, 1.5), (2.0, 1.5)], t)
    else:
        z = ease([(0, PEL0.z - 0.02), (0.18, PEL0.z - 0.06), (0.55, 0.55, 'in'), (0.85, 0.2, 'in'), (0.95, 0.24, 'out'), (1.15, 0.16), (2.4, 0.15)], t)
        y = ease([(0, 0.0), (0.55, -0.25), (0.95, -0.55, 'in'), (2.4, -0.6)], t)
        pit = ease([(0, 0.0), (0.2, -0.08), (0.55, 0.45, 'in'), (0.9, 1.45, 'in'), (1.0, 1.38), (1.25, 1.5), (2.4, 1.5)], t)
    q = pelvis_set(L, W, V(0, y, z), pitch=pit, yaw=0.15 + twist * ease([(0, 0.0), (0.5, 0.6), (1.0, 1.0), (2.4, 1.0)], t), roll=ease([(0, 0.0), (1.0, 0.18), (2.4, 0.22)], t) + twist * 0.35 * ease([(0, 0.0), (1.0, 1.0)], t))
    curl = ease([(0, 0.0), (0.35, 0.35), (0.85, 0.15), (1.0, -0.15), (1.3, -0.05)], t)
    spine_rel(L, W, q, pitch=curl, roll=0.1)
    look_rel(L, W, q, yaw=ease([(0, 0.0), (1.0, 0.7), (2.4, 0.9)], t), pitch=ease([(0, 0.2), (0.9, -0.2), (1.2, 0.1)], t))
    # knees buckle then legs trail
    for s, sg in (('l', 1), ('r', -1)):
        hip = W['thigh_' + s].translation
        kd = ease([(0, 0.0), (0.45, 0.42), (0.9, 0.25), (1.3, 0.15)], t)
        ank_g = V(sg * 0.14 + (0.04 if s == 'l' else -0.02), y + 0.15 + (0.0 if s == 'l' else 0.1), 0.09)
        ank_l = V(sg * 0.18, hip.y + 0.7 + (0.12 if s == 'r' else 0.0), 0.12 + (0.12 if s == 'l' else 0.0))
        u = smooth((t - 0.35) / 0.6)
        ank = ank_g.lerp(ank_l, u)
        leg(L, W, s, ank, pole=(q @ FWD).normalized().lerp(V(0, 0, -1), u) + V(sg * 0.2, 0, 0), foot_dir=V(0, 0.3, -1).normalized() if u > 0.5 else V(0, -0.8, -0.6).normalized())
    # arms reach out to break the fall, then go limp
    C3 = chest_delta(W).to_3x3()
    for s, sg in (('l', 1), ('r', -1)):
        sh = W['upperarm_' + s].translation
        a = ease([(0, V(sg * 0.12, -0.15, -0.5)), (0.6, V(sg * 0.2, -0.45, -0.2)), (0.95, V(sg * 0.35, -0.3, -0.05)), (1.3, V(sg * 0.42, -0.05, 0.1)), (2.4, V(sg * 0.42, 0.0, 0.12))], t)
        w = sh + C3 @ a
        w.z = max(w.z, 0.06)
        arm_ik(L, W, s, w, C3 @ V(sg, 0.4, -0.3), C3 @ a.normalized(), V(0, 0, -1), ease([(0, 0.4), (1.0, 0.2), (1.5, 0.45)], t))

@clip('deathFront', 2.4, loop=False)
def c_deathFront(t):
    L = R.rest(); W = R.W(L)
    fall_front(L, W, t); return finalize(L, W)

@clip('deathLeft', 2.4, loop=False)
def c_deathLeft(t):
    # hit from the left: spins away to the right as the knees go
    L = R.rest(); W = R.W(L)
    fall_front(L, W, t, twist=-1.1); return finalize(L, W)

@clip('deathRight', 2.4, loop=False)
def c_deathRight(t):
    L = R.rest(); W = R.W(L)
    fall_front(L, W, t, twist=1.1); return finalize(L, W)

@clip('deathCover', 2.2, loop=False)
def c_deathCover(t):
    # from a crouch behind cover: slumps down onto the side and rolls back against the wall
    L = R.rest(); W = R.W(L)
    k = ease([(0, 0.0), (0.4, 0.3), (1.0, 1.0, 'in'), (1.15, 0.95), (2.2, 1.0)], t)
    z = lerp(PEL0.z - 0.3, 0.2, k)
    q = pelvis_set(L, W, V(0.0, 0.15 * k, z), pitch=lerp(0.12, -0.5, k), roll=lerp(0.0, 0.9, k), yaw=0.2 * k)
    for s, sg in (('l', 1), ('r', -1)):
        a = V(sg * 0.2, lerp(-0.1, -0.55, k) + (0.1 if s == 'r' else 0), 0.09)
        leg(L, W, s, a, pole=V(sg * 0.4, -1, 0.3 * k).normalized(), foot_dir=V(0, -0.85, -0.5).normalized())
    spine_rel(L, W, q, pitch=lerp(0.1, -0.2, k), roll=0.2 * k)
    look_rel(L, W, q, pitch=lerp(0.0, 0.6, k), roll=0.5 * k)
    C3 = chest_delta(W).to_3x3()
    for s, sg in (('l', 1), ('r', -1)):
        sh = W['upperarm_' + s].translation
        arm_ik(L, W, s, sh + C3 @ V(sg * 0.15, -0.15 + 0.1 * k, -0.48), C3 @ V(sg, 0.3, -0.3), C3 @ V(0, -0.2, -1), C3 @ V(-sg, 0, 0), 0.4)
    return finalize(L, W)

@clip('deathRun', 2.0, loop=False)
def c_deathRun(t):
    L = R.rest(); W = R.W(L)
    fall_front(L, W, t, run=True); return finalize(L, W)

@clip('stagger', 1.3, loop=False)
def c_stagger(t):
    """Wounded hit: torso snaps back, a step back, hunched with a hand to the side, then recovers."""
    L = base('Idle_Loop', 0.5); W = R.W(L)
    k = ease([(0, 0.0), (0.12, 1.0, 'out'), (0.5, 0.6), (1.3, 0.0)], t)
    hunch = ease([(0, 0.0), (0.25, -0.1), (0.6, 0.45), (1.0, 0.3), (1.3, 0.0)], t)
    pel = PEL0 + V(0, ease([(0, 0.0), (0.3, 0.14), (0.7, 0.18), (1.3, 0.0)], t), -0.06 * k - 0.04 * max(0, hunch))
    q = pelvis_set(L, W, pel, pitch=-0.15 * k + 0.15 * max(0, hunch), yaw=0.2 * k)
    for s, sg in (('l', 1), ('r', -1)):
        a0 = ANK[s].copy(); a0.z = 0.085
        back = ease([(0, 0.0), (0.25, 0.0), (0.45, 0.3), (1.3, 0.0)], t) if s == 'r' else ease([(0, 0.0), (0.55, 0.0), (0.75, 0.18), (1.3, 0.0)], t)
        lift = 0.08 * math.sin(max(0, min(1, (t - (0.25 if s == 'r' else 0.55)) / 0.2)) * math.pi)
        leg(L, W, s, a0 + V(0, back, lift), pole=FWD, foot_dir=V(0, -0.85, -0.5).normalized())
    spine_rel(L, W, q, pitch=-0.25 * k + hunch, yaw=0.3 * k)
    look_rel(L, W, q, pitch=-0.2 * k + 0.2 * hunch)
    C3 = chest_delta(W).to_3x3()
    shl = W['upperarm_l'].translation
    arm_ik(L, W, 'l', W['spine_02'].translation + C3 @ V(0.13, -0.08, -0.05), C3 @ V(1, 0.3, -0.5), C3 @ V(-0.3, -0.2, -1), C3 @ V(-1, 0.3, 0), 0.5)
    shr = W['upperarm_r'].translation
    arm_ik(L, W, 'r', shr + C3 @ V(-0.2, -0.15 + 0.2 * k, -0.45), C3 @ V(-1, 0.4, -0.3), C3 @ V(0, -0.2, -1), C3 @ V(1, 0, 0), 0.5)
    return finalize(L, W)

@clip('alert', 4.0)
def c_alert(t):
    L = base('Idle_Loop', t * 0.6); W = R.W(L)
    sc = ease([(0, 0.0), (0.8, 0.7), (1.6, 0.7), (2.4, -0.6), (3.3, -0.6), (4.0, 0.0)], t)
    R.spine(L, W, pitch=0.03, yaw=sc * 0.35)
    R.look(L, W, yaw=sc * 0.6, pitch=0.05)
    hold_low(L, W, t)
    return finalize(L, W)

@clip('salute', 2.0, loop=False)
def c_salute(t):
    L = base('Idle_Loop', 0.6); W = R.W(L)
    k = ease([(0, 0.0), (0.35, 1.0), (1.5, 1.0), (2.0, 0.0)], t)
    for s in 'lr':
        a0 = ANK[s].copy(); a0.z = 0.085; a0.x *= 0.7
        leg(L, W, s, a0, pole=FWD, foot_dir=V(0, -0.85, -0.5).normalized())
    R.look(L, W, pitch=-0.05)
    C3 = chest_delta(W).to_3x3()
    eye = eye_pos(W)
    tgt = eye + V(-0.07, -0.02, 0.0)
    sh = W['upperarm_r'].translation
    rest = sh + C3 @ V(-0.05, -0.05, -0.53)
    arm_ik(L, W, 'r', rest.lerp(tgt, k), V(-1, 0.1, 0.0), V(0.5, -0.2, 0.55).normalized().lerp(V(0, -0.15, -1), 1 - k).normalized(), V(0, -0.6, 0.6).normalized().lerp(V(1, 0, 0), 1 - k), 0.05)
    shl = W['upperarm_l'].translation
    arm_ik(L, W, 'l', shl + C3 @ V(0.04, -0.03, -0.53), C3 @ V(1, 0.3, 0), C3 @ V(0, -0.1, -1), C3 @ V(-1, 0, 0), 0.3)
    return finalize(L, W)

def crouch_legs(L, W, depth=0.38, lean=0.25, wide=0.22, stagger=0.25):
    q = pelvis_set(L, W, V(0, 0.05, PEL0.z - depth), pitch=lean)
    for s, sg in (('l', 1), ('r', -1)):
        a = V(sg * wide, (-stagger if s == 'l' else 0.12), 0.085)
        leg(L, W, s, a, pole=V(sg * 0.3, -1, 0.1).normalized(), foot_dir=V(0, -0.85, -0.5).normalized())
    return q

@clip('stackUp', 2.4)
def c_stackUp(t):
    L = R.rest(); W = R.W(L)
    q = crouch_legs(L, W, depth=0.22 + 0.01 * math.sin(t * 2.6), lean=0.3, wide=0.17, stagger=0.2)
    spine_rel(L, W, q, pitch=0.05, yaw=-0.1)
    look_rel(L, W, q, pitch=-0.25, yaw=0.1)
    hold_low(L, W, t)
    return finalize(L, W)

@clip('wallLean', 3.0)
def c_wallLean(t):
    """Shoulder against a wall on the character's left, rifle at low ready, catching breath."""
    L = base('Idle_Loop', t); W = R.W(L)
    q = pelvis_set(L, W, PEL0 + V(0.05, 0.02, -0.05), roll=0.08)
    for s, sg in (('l', 1), ('r', -1)):
        a = V(sg * 0.17 - 0.06, -0.02 + (0.1 if s == 'r' else 0), 0.085)
        leg(L, W, s, a, pole=FWD, foot_dir=V(0, -0.85, -0.5).normalized())
    spine_rel(L, W, q, roll=0.12 + 0.01 * math.sin(t * 2.1), pitch=0.04 + 0.015 * math.sin(t * 2.1))
    look_rel(L, W, q, yaw=0.25, pitch=0.05)
    hold_low(L, W, t)
    return finalize(L, W)

@clip('breachKick', 1.2, loop=False)
def c_breach(t):
    """Front kick at a door (contact ~0.45 s), rifle held at low ready."""
    L = base('Idle_Loop', 0.4); W = R.W(L)
    chamber = ease([(0, 0.0), (0.25, 1.0), (0.42, 0.2, 'in'), (0.6, 0.7), (0.9, 0.0), (1.2, 0.0)], t)
    ext = ease([(0, 0.0), (0.25, 0.0), (0.42, 1.0, 'in'), (0.55, 0.6), (0.9, 0.0)], t)
    q = pelvis_set(L, W, PEL0 + V(0.03, 0.06 * ext, -0.03 - 0.03 * chamber), pitch=-0.25 * ext + 0.08 * chamber)
    a0 = ANK['l'].copy(); a0.z = 0.085
    leg(L, W, 'l', a0 + V(0, 0.05, 0), pole=FWD, foot_dir=V(0, -0.85, -0.5).normalized())
    hip = W['thigh_r'].translation
    k_pos = V(-0.12, -0.25 * chamber, 0.09 + 0.45 * chamber)
    e_pos = V(-0.12, -0.75, 0.55)
    ank = k_pos.lerp(e_pos, ext)
    ank.z += 0.0
    leg(L, W, 'r', ank, pole=V(0, -1, 0.6).normalized(), foot_dir=V(0, -1, 0.5).normalized().lerp(V(0, -0.85, -0.5), 1 - ext).normalized())
    spine_rel(L, W, q, pitch=0.12 * ext - 0.05, yaw=-0.1)
    look_rel(L, W, q, pitch=0.2)
    hold_low(L, W, t)
    return finalize(L, W)

@clip('signalMoveUp', 1.3, loop=False)
def c_signal(t):
    """Left hand raised beside the head, then chopped forward: 'move up'. Rifle stays in the right hand."""
    L = base('Idle_Loop', 0.5); W = R.W(L)
    R.spine(L, W, pitch=0.04, yaw=0.12)
    R.look(L, W, yaw=0.5, pitch=0.0)
    C = chest_delta(W)
    aim = (Quaternion(UP, 0.2) @ Quaternion(LEFT, 0.7) @ FWD).normalized()
    Wm = C @ weapon_matrix(V(-0.16, -0.18, 1.12), aim, Quaternion(UP, 0.2) @ UP)
    place_hands(L, W, Wm, 'rifle', left=False)
    C3 = C.to_3x3()
    shl = W['upperarm_l'].translation
    w = ease([(0, V(0.12, -0.2, -0.45)), (0.3, V(0.12, -0.05, 0.22)), (0.55, V(0.1, -0.5, 0.05), 'in'), (0.75, V(0.08, -0.55, -0.02)), (1.3, V(0.12, -0.2, -0.45))], t)
    hd = ease([(0, V(0, -0.2, -1)), (0.3, V(0, 0, 1)), (0.55, V(-0.1, -1, 0.1)), (1.3, V(0, -0.2, -1))], t)
    arm_ik(L, W, 'l', shl + C3 @ w, C3 @ V(1, 0.3, -0.5), C3 @ hd.normalized(), C3 @ V(-1, 0, 0), 0.0)
    return finalize(L, W)

@clip('fireCrouch', 0.3, loop=False)
def c_fireCrouch(t):
    L = base('Crouch_Idle_Loop', 0.4); W = R.W(L)
    k = math.exp(-t * 18) * (1 - math.exp(-t * 90)) * 1.6
    stance_aim(L, W, 0.4, recoil=k, breathe=False); return finalize(L, W)

def cover_pose(L, W, t, recoil=0.0):
    q = crouch_legs(L, W, depth=0.3, lean=0.12, wide=0.2, stagger=0.28)
    return stance_aim(L, W, t, recoil=recoil, breathe=recoil == 0, lean=0.12)

@clip('aimCover', 3.2)
def c_aimCover(t):
    L = R.rest(); W = R.W(L)
    cover_pose(L, W, t); return finalize(L, W)

@clip('fireCover', 0.3, loop=False)
def c_fireCover(t):
    L = R.rest(); W = R.W(L)
    k = math.exp(-t * 18) * (1 - math.exp(-t * 90)) * 1.6
    cover_pose(L, W, 0.4, recoil=k); return finalize(L, W)

@clip('limp', dur('Walk_Loop') * 1.25)
def c_limp(t):
    """Wounded walk: the right leg stays stiff, the body dips onto the left, rifle low."""
    d = dur('Walk_Loop') * 1.25
    ts = t / 1.25
    L = base('Walk_Loop', ts); W = R.W(L)
    ph = ts / dur('Walk_Loop') * 2 * math.pi
    # stiffen the right knee by re-solving its leg with the ankle pulled toward a straight leg
    hip = W['thigh_r'].translation; ank = W['foot_r'].translation.copy()
    straight = hip + (ank - hip).normalized() * (R.len['thigh_r'] + R.len['calf_r']) * 0.985
    leg(L, W, 'r', ank.lerp(straight, 0.55), pole=FWD)
    dip = 0.035 * max(0.0, math.sin(ph))
    pelvis_set(L, W, W['pelvis'].translation - V(0, 0, dip), roll=0.05 * math.sin(ph), pitch=0.08)
    R.spine(L, W, roll=-0.1 - 0.06 * math.sin(ph), pitch=0.12)
    hold_low(L, W, t)
    return finalize(L, W)

@clip('holdPistol', 2.5)
def c_holdPistol(t):
    L = base('Idle_Loop', t); W = R.W(L)
    R.spine(L, W, pitch=0.03)
    C = chest_delta(W)
    aim = (Quaternion(LEFT, 0.8) @ FWD).normalized()
    Wm = C @ weapon_matrix(V(-0.14, -0.3, 1.05), aim, Quaternion(LEFT, 0.8) @ UP)
    place_hands(L, W, Wm, 'pistol')
    return finalize(L, W)

def vault_pose(L, W, t, T=0.9):
    """Hand-plant vault over a ~1 m wall that starts 0.5 m ahead. In place: the game moves the root ~1.3 m forward."""
    u = t / T
    # pelvis rises over the wall and drops on the far side (root is moved by the game, so y stays ~0)
    z = ease([(0, PEL0.z - 0.05), (0.2, PEL0.z - 0.12), (0.45, 1.32, 'out'), (0.7, 1.2), (0.9, PEL0.z - 0.12, 'in'), (1.1, PEL0.z - 0.03)], t)
    side = ease([(0, 0.0), (0.45, 0.1), (0.9, 0.0)], t)
    q = pelvis_set(L, W, V(side, 0.0, z), pitch=ease([(0, 0.1), (0.4, 0.35), (0.75, 0.1), (1.1, 0.0)], t), roll=ease([(0, 0.0), (0.45, -0.35), (0.9, 0.0)], t))
    spine_rel(L, W, q, pitch=ease([(0, 0.1), (0.4, 0.3), (0.8, 0.1), (1.1, 0.0)], t))
    look_rel(L, W, q, pitch=-0.15)
    tuck = ease([(0, 0.0), (0.25, 0.2), (0.45, 1.0), (0.7, 0.7), (0.9, 0.0)], t)
    for s, sg in (('l', 1), ('r', -1)):
        hip = W['thigh_' + s].translation
        ground = V(sg * 0.12, 0.0, 0.085 + max(0.0, z - PEL0.z) * 0.0)
        tucked = hip + V(-0.25, -0.1 + (0.08 if s == 'l' else -0.05), -0.42)
        a = ground.lerp(tucked, tuck)
        a.z = max(a.z, 0.085)
        leg(L, W, s, a, pole=V(-0.5, -1, 0.2).normalized(), foot_dir=V(0, -0.85, -0.5).normalized())
    # left hand planted on the wall top, right hand keeps the rifle
    plant = ease([(0, 0.0), (0.15, 1.0), (0.55, 1.0), (0.7, 0.0), (1.1, 0.0)], t)
    C3 = chest_delta(W).to_3x3()
    shl = W['upperarm_l'].translation
    wall = V(0.15, -0.25, 1.02)
    free = shl + C3 @ V(0.15, -0.2, -0.45)
    arm_ik(L, W, 'l', free.lerp(wall, plant), V(1, 0.5, 0), V(0.1, -1, -0.2).normalized().lerp(V(0, -0.2, -1), 1 - plant), V(0, 0, -1).lerp(V(-1, 0, 0), 1 - plant), 0.3)
    hold_low(L, W, t)
    place_hands(L, W, chest_delta(W) @ weapon_matrix(V(-0.13, -0.24, 1.22), (Quaternion(UP, 0.25) @ Quaternion(LEFT, 0.55) @ FWD).normalized(), UP), 'rifle', left=False)

@clip('vault', 1.1, loop=False)
def c_vault(t):
    L = R.rest(); W = R.W(L)
    vault_pose(L, W, t); return finalize(L, W)

# ---- paired takedown: attacker grabs from behind (left arm round the neck), strikes, lowers the victim.
# Victim root = attacker root + 0.42 m forward, same facing. 2.6 s. No blood or wounds are shown.
TD = 2.6
def victim_path(t):
    return {'pel': ease([(0, PEL0 + V(0, 0, -0.02)), (0.35, PEL0 + V(0, 0.12, -0.04)), (1.2, PEL0 + V(0, 0.18, -0.08)), (1.7, V(0, 0.25, 0.62), 'in'),
                         (2.1, V(0, 0.15, 0.2), 'in'), (2.6, V(0, 0.1, 0.16))], t),
            'pit': ease([(0, 0.0), (0.35, -0.3), (1.2, -0.25), (1.7, 0.2), (2.1, 1.2, 'in'), (2.6, 1.45)], t)}

@clip('takedown', TD, loop=False)
def c_takedown(t):
    L = base('Idle_Loop', 0.3); W = R.W(L)
    vp = victim_path(t)
    fwd = ease([(0, 0.0), (0.3, -0.12), (1.4, -0.12), (2.1, -0.15), (2.6, -0.05)], t)
    down = ease([(0, 0.0), (0.3, 0.06), (1.3, 0.08), (2.0, 0.42), (2.6, 0.12)], t)
    q = pelvis_set(L, W, PEL0 + V(0, fwd, -down), pitch=ease([(0, 0.0), (0.3, 0.1), (1.3, 0.05), (2.0, 0.5), (2.6, 0.1)], t))
    for s, sg in (('l', 1), ('r', -1)):
        a = V(sg * 0.18, (-0.18 if s == 'l' else 0.1) + fwd * 0.5, 0.085)
        leg(L, W, s, a, pole=V(sg * 0.2, -1, 0).normalized(), foot_dir=V(0, -0.85, -0.5).normalized())
    spine_rel(L, W, q, pitch=ease([(0, 0.0), (0.3, 0.05), (1.3, 0.0), (2.0, 0.4), (2.6, 0.1)], t))
    look_rel(L, W, q, pitch=0.15)
    C3 = chest_delta(W).to_3x3()
    # victim neck in attacker space
    vneck = V(0, -0.42, 0) + vp['pel'] + V(0, -0.1 * math.sin(vp['pit']), 0.55 * math.cos(vp['pit']))
    grab = ease([(0, 0.0), (0.3, 1.0), (2.2, 1.0), (2.6, 0.0)], t)
    shl = W['upperarm_l'].translation
    w = (shl + C3 @ V(0.15, -0.2, -0.45)).lerp(vneck + V(-0.06, -0.03, -0.02), grab)
    arm_ik(L, W, 'l', w, V(1, 0.2, 0), V(-1, -0.2, 0), V(0, 1, 0), 0.7)
    # right hand: knife strike to the victim's side at ~0.9 s and 1.25 s
    shr = W['upperarm_r'].translation
    strike = ease([(0, 0.0), (0.6, -0.4), (0.85, 1.0, 'in'), (1.0, 0.6), (1.15, 1.0, 'in'), (1.4, 0.0), (2.6, -0.2)], t)
    wr = shr + C3 @ V(-0.08, -0.15 - 0.25 * max(0, strike), -0.32 + 0.1 * strike)
    arm_ik(L, W, 'r', wr, V(-1, 0.3, -0.3), C3 @ V(0.2, -0.6, -0.6), C3 @ V(1, 0, 0), 0.9)
    return finalize(L, W)

@clip('takedownVictim', TD, loop=False)
def c_takedownVictim(t):
    L = base('Idle_Loop', 0.3); W = R.W(L)
    vp = victim_path(t)
    q = pelvis_set(L, W, vp['pel'], pitch=vp['pit'], yaw=ease([(0, 0.0), (2.6, 0.25)], t))
    knees = ease([(0, 0.0), (1.2, 0.2), (1.7, 1.0), (2.1, 0.4), (2.6, 0.1)], t)
    for s, sg in (('l', 1), ('r', -1)):
        a0 = V(sg * 0.13, 0.05, 0.085)
        lying = V(sg * 0.2, vp['pel'].y + 0.85, 0.1)
        kneel = V(sg * 0.15, 0.45, 0.1)
        u = smooth((t - 1.2) / 0.5); v2 = smooth((t - 1.8) / 0.6)
        a = a0.lerp(kneel, u).lerp(lying, v2)
        leg(L, W, s, a, pole=V(sg * 0.1, -1, -0.2 * v2).normalized(), foot_dir=V(0, -0.85, -0.5).normalized().lerp(V(0, 0.3, -1), v2).normalized())
    spine_rel(L, W, q, pitch=ease([(0, 0.0), (0.35, -0.25), (1.2, -0.15), (1.7, 0.2), (2.6, -0.1)], t))
    look_rel(L, W, q, pitch=ease([(0, 0.0), (0.35, -0.4), (1.4, 0.2), (2.6, 0.0)], t), yaw=ease([(0, 0.0), (2.6, 0.8)], t))
    C3 = chest_delta(W).to_3x3()
    neck = W['neck_01'].translation
    claw = ease([(0, 0.0), (0.35, 1.0), (1.3, 1.0), (1.7, 0.0)], t)
    for s, sg in (('l', 1), ('r', -1)):
        sh = W['upperarm_' + s].translation
        limp = sh + C3 @ V(sg * 0.25, -0.1, -0.4)
        grab = neck + C3 @ V(sg * 0.05, -0.08, -0.02)
        arm_ik(L, W, s, limp.lerp(grab, claw), C3 @ V(sg, 0.2, -0.5), C3 @ V(0, 0.2, 1).lerp(V(sg * 0.2, -0.1, -1), 1 - claw).normalized(), C3 @ V(0, 1, 0), 0.6 * claw + 0.3)
    return finalize(L, W)

# ======================= locomotion set for actor.drive() =======================
# Every loop: left foot contact at phase 0, right at 0.5. META records duration and stride (m per cycle).
META = {}

def foot_samples(fn, T, n=120):
    out = []
    for i in range(n):
        t = T * i / n
        L = fn(t); W = R.W(L)
        out.append((t, W['foot_l'].translation.copy(), W['foot_r'].translation.copy(), W['ball_l'].translation.copy()))
    return out

def analyse(fn, T):
    """Left heel strike time (foot furthest forward while low) and ground speed of the planted foot."""
    S = foot_samples(fn, T)
    zs = [s[1].z for s in S]; zmin = min(zs)
    # heel strike: left foot most forward (min y) among low samples
    low = [s for s in S if s[1].z < zmin + 0.04]
    t0 = min(low, key=lambda s: s[1].y)[0] if low else 0.0
    # planted-foot speed (relative to body): median backward speed while low
    sp = []
    bmin = min(s[3].z for s in S)
    for a, b in zip(S, S[1:] + S[:1]):
        if a[3].z < bmin + 0.012 and b[3].z < bmin + 0.012:
            dt = (b[0] - a[0]) % T or T / len(S)
            sp.append((b[3].y - a[3].y) / dt)
    sp.sort()
    v = sp[len(sp) // 2] if sp else 0.0
    return t0, v

def from_source(name, srcn, speed=1.0):
    T = dur(srcn) / speed
    def raw(t):
        L = base(srcn, (t * speed) % dur(srcn)); W = R.W(L); return finalize(L, W)
    t0, v = analyse(raw, T)
    def f(t):
        return raw((t + t0) % T)
    CLIPS[name] = (f, T, True)
    META[name] = {'duration': T, 'stride': abs(v) * T, 'speed': abs(v)}

def gait(name, theta_deg, v, T, beta, crouch=0.0, lift=0.09, bob=0.025, width=0.1, lean=0.05, arm=0.25, heel=0.45):
    """Procedural step cycle on the shared skeleton. theta: travel direction (0 forward, +90 left, 180 back)."""
    th = math.radians(theta_deg)
    S = v * T
    # hips turn toward sideways travel (legs walk a diagonal), chest counter-turns to keep facing the aim
    if abs(theta_deg) <= 140:
        psi = max(-1.0, min(1.0, th * 0.68))
    else:
        b = th - math.copysign(math.pi, th)
        psi = max(-0.55, min(0.55, b * 0.55))
    d = Vector((math.sin(th), -math.cos(th), 0))          # travel direction in root space
    hipf = Quaternion(UP, psi)
    def f(t):
        ph = (t / T) % 1.0
        L = R.rest(); W = R.W(L)
        jog = beta < 0.5
        # pelvis: bob (low at contact for walk, at mid-stance for jog), sway over the stance foot, counter yaw
        if jog:
            zb = -bob * math.cos(4 * math.pi * (ph - beta * 0.5))
        else:
            zb = -bob * math.cos(4 * math.pi * ph)
        sway = (0.02 if not jog else 0.01) * math.sin(2 * math.pi * (ph + 0.25))
        pos = Vector((0, 0.0, PEL0.z - crouch + zb - (0.005 if jog else 0.0))) + (hipf @ Vector((sway, 0, 0)))
        oy = 0.07 * math.sin(2 * math.pi * ph) * (1.0 if not jog else 0.8)
        q = pelvis_set(L, W, pos, pitch=lean + crouch * 0.9, yaw=psi + oy, roll=0.035 * math.sin(2 * math.pi * ph + math.pi / 2))
        # feet
        for s, off, sg in (('l', 0.0, 1), ('r', 0.5, -1)):
            u = (ph - off) % 1.0
            base_p = hipf @ Vector((sg * width, 0.01, 0.0))
            if u < beta:
                k = u / beta
                disp = S * beta * (0.5 - k); h = 0.0
                rollp = -heel * max(0.0, (k - 0.7) / 0.3) ** 2 * 0.6     # heel peels up before toe-off
            else:
                k = (u - beta) / (1 - beta)
                e = k * k * (3 - 2 * k)
                disp = S * beta * (-0.5 + e)
                h = lift * math.sin(math.pi * k) ** (0.8 if jog else 1.2) + (0.02 if k > 0.8 else 0)
                rollp = -heel * (1 - k) ** 2 * 0.9 + 0.18 * max(0.0, (k - 0.7) / 0.3)   # toe up before heel strike
            ank = base_p + d * disp
            ank.z = 0.086 + h + max(0.0, -rollp) * 0.07
            fdir = (hipf @ Quaternion(UP, 0.0) @ Vector((0, -0.85, -0.5))).normalized()
            fdir = (Quaternion(hipf @ LEFT, -rollp) @ fdir).normalized()
            leg(L, W, s, ank, pole=(hipf @ FWD + Vector((sg * 0.15, 0, 0))).normalized(), foot_dir=fdir)
        # torso: counter the hip turn, lean with speed, counter-swing
        spine_rel(L, W, q, pitch=-0.02 - crouch * 0.6, yaw=-(psi + oy) * 0.95)
        look_rel(L, W, q, yaw=0.0, pitch=0.05 + crouch * 0.4)
        # arms swing opposite to the legs (left arm back when the left foot lands)
        back = -1.0 if abs(theta_deg) > 100 else 1.0
        relaxed_arms(L, W, swing=-arm * math.cos(2 * math.pi * ph) * back, bend=0.35 + (0.6 if jog else 0.0) + crouch)
        return finalize(L, W)
    CLIPS[name] = (f, T, True)
    META[name] = {'duration': T, 'stride': S, 'speed': v, 'theta': theta_deg}

DIRS = [('F', 0), ('FL', 45), ('L', 90), ('BL', 135), ('B', 180), ('BR', -135), ('R', -90), ('FR', -45)]
from_source('walkF', 'Walk_Loop')
for tag, th in DIRS:
    wd = 0.095 if abs(th) < 60 or abs(th) > 120 else 0.12
    if tag != 'F':
        gait('walk' + tag, th, 1.35, 1.1, 0.62, lift=0.075, bob=0.02, width=wd, lean=0.03, arm=0.12)
    if True:
        gait('crouch' + tag, th, 1.1, 1.15, 0.65, crouch=0.30, lift=0.07, bob=0.012, width=wd + 0.03, lean=0.06, arm=0.08)
    gait('jog' + tag, th, 3.4, 0.74, 0.40, lift=0.13, bob=0.025, width=wd - 0.01, lean=0.06 if abs(th) < 100 else -0.02, arm=0.22)
gait('sprintF', 0, 6.0, 0.64, 0.34, lift=0.17, bob=0.04, width=0.08, lean=0.1, arm=0.34, heel=0.6)
META['proneCrawl'] = {'duration': 1.6, 'stride': 0.9, 'speed': 0.56}
gait('turnStep', 0, 0.0, 0.9, 0.6, lift=0.05, bob=0.008, width=0.1, lean=0.0, arm=0.0)
gait('crouchTurnStep', 0, 0.0, 1.0, 0.62, crouch=0.30, lift=0.045, bob=0.006, width=0.13, lean=0.06, arm=0.0)

# ---------------- captured locomotion (CMU motion capture, retargeted; see mocap.py and mocap_list.py)
import mocap as MC, mocap_list as ML
CMU_DIR = L_.WORK + '/cmu/data/'
OUR_LEG = R.len['thigh_l'] + R.len['calf_l']
HIPMID = (HIPS['l'] + HIPS['r']) / 2
_TK = {}
MOCAP_CHECK = {}
def mocap_clip(name, spec):
    key = (spec['trial'], spec['t0'], spec['t1'], bool(spec.get('mirror')))
    if key not in _TK: _TK[key] = MC.Take(CMU_DIR, key[0], key[1], key[2], mirror=key[3])
    tk = _TK[key]
    frames, T, v, th, flags = MC.build_cycle(tk, OUR_LEG, ANK['l'].z, theta=spec.get('theta'), hip_yaw=spec.get('hip_yaw', 0.0),
                                             crouch=spec.get('crouch', 0.0), crouch_lean=spec.get('lean', 0.0), out_fps=FPS,
                                             speed_scale=spec.get('speed', 1.0), stride_scale=spec.get('stride', 1.0), foot_len=R.len['foot_l'])
    n = len(frames)
    AUX = {'HIPMID': HIPMID, 'ANKZ': ANK['l'].z}
    def f(t):
        i = int(round(t * FPS)) % n
        L = R.rest(); W = R.W(L)
        MC.pose(R, L, W, frames[i], AUX)
        return finalize(L, W)
    CLIPS[name] = (f, T, True)
    META[name] = {'duration': T, 'stride': v * T, 'speed': v, 'theta': spec.get('theta', round(th, 1)), 'mocap': 1}
    MOCAP_CHECK[name] = (frames, flags, T, v, th)
    print('mocap', name, spec['trial'], 'T %.3f v %.2f th %.0f frames %d' % (T, v, th, n))

for nm, spec in ML.TAKES.items():
    if ONLY and nm not in ONLY: continue
    mocap_clip(nm, spec)

def check_mocap():
    """Slide of planted feet in the baked pose (world, with the clip's travel added) and leg IK reach error."""
    for nm, (frames, flags, T, v, th) in MOCAP_CHECK.items():
        fn = CLIPS[nm][0]; n = len(frames)
        d = Vector((math.sin(math.radians(th)), -math.cos(math.radians(th)), 0)) * v
        slide = []; reach = []
        prev = None; pq = None; pop = (0, '')
        for i in range(n + 1):
            t = (i % n) / FPS
            L = fn(t); W = R.W(L)
            tt = i / FPS
            Bq = {b: L[b].to_quaternion() for b in R.bones if not b.startswith(('index', 'middle', 'ring', 'pinky', 'thumb'))}
            if pq:
                for b in Bq:
                    ang = math.degrees(Bq[b].rotation_difference(pq[b]).angle)
                    if ang > 180: ang = 360 - ang
                    if ang > pop[0]: pop = (ang, '%s@%d' % (b, i))
            pq = Bq
            if os.environ.get('PDBG') == nm:
                F = frames[i % n]; X = W['thigh_l'].to_3x3()
                print('   %2d thighX %s thighY %s ank %s hip %s knee %s' % (i, tuple(round(v, 2) for v in X.col[0]), tuple(round(v, 2) for v in X.col[1]),
                      tuple(round(v, 2) for v in F['lfoot']), tuple(round(v, 2) for v in F['lfemur']), tuple(round(v, 2) for v in F['ltibia'])))
            cur = {s: (W['foot_' + s].translation + d * tt, W['ball_' + s].translation + d * tt) for s in 'lr'}
            for s in 'lr':
                reach.append((W['foot_' + s].translation - frames[i % n][s + 'foot']).length)
            if prev is not None:
                for s in 'lr':
                    if flags[s][i % n] and flags[s][(i - 1) % n]:
                        slide.append(min((cur[s][0] - prev[s][0]).length, (cur[s][1] - prev[s][1]).length) * FPS)
            prev = cur
            if os.environ.get('MDBG') == nm and i < n:
                F = frames[i % n]
                print('  %2d L%d R%d ballL %+.3f %+.3f %.3f tgt %+.3f %+.3f %.3f ankz %.3f' % (i, flags['l'][i % n], flags['r'][i % n],
                      cur['l'][1].x, cur['l'][1].y, W['ball_l'].translation.z, (F['ltoes'] + d * tt).x, (F['ltoes'] + d * tt).y, F['ltoes'].z, F['lfoot'].z))
        slide.sort(); reach.sort()
        print('check %-9s planted heel-or-ball speed median %.3f p90 %.3f m/s | ankle reach err median %.1f max %.1f cm | max bone step %.0f deg %s' % (
            nm, slide[len(slide) // 2], slide[int(len(slide) * 0.9)], reach[len(reach) // 2] * 100, reach[-1] * 100, pop[0], pop[1]))

# ---------------- run
def build(names=None):
    solve_grips()
    made = []
    for name, (fn, length, loop) in CLIPS.items():
        if names and name not in names: continue
        n = max(2, int(round(length * FPS)) + 1)
        frames = []
        for i in range(n):
            t = i / FPS
            if loop and i == n - 1: t = 0.0  # seamless loop: last frame == first
            L = fn(min(t, length))
            frames.append(R.basis(L))
        act = A.make_action(arm, name, frames, R.bones)
        made.append(act)
        print('clip', name, n, 'frames')
    return made

made = build(ONLY)
check_mocap()
# grips json (Blender armature/weapon space; exported as empties in weapons.glb)
gj = {k: [list(v.to_translation()), list(v.to_quaternion())] for k, v in GRIP.items()}
json.dump(gj, open(L_.WORK + '/grips.json', 'w'), indent=1)
json.dump({k: {kk: round(vv, 4) for kk, vv in v.items()} for k, v in META.items()}, open(L_.WORK + '/out/anims.json', 'w'), indent=1)
# export: skeleton only + clips as NLA tracks
for o in list(bpy.data.objects):
    if o != arm: bpy.data.objects.remove(o)
arm.animation_data_create()
arm.animation_data.action = None
for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
for a in made:
    tr = arm.animation_data.nla_tracks.new(); tr.name = a.name
    st = tr.strips.new(a.name, 0, a)
bpy.context.scene.render.fps = FPS
bpy.context.scene.frame_start = 0
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animation_mode='NLA_TRACKS', export_def_bones=False,
                          export_optimize_animation_size=True, export_force_sampling=True)
bpy.ops.wm.save_as_mainfile(filepath=L_.WORK + '/anims.blend')
