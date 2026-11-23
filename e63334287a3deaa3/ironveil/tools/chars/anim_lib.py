# Pose authoring on the shared UAL-named skeleton, in world space (Blender: -Y forward, +X = character left, +Z up).
import bpy, math
from mathutils import Vector, Matrix, Quaternion

FWD = Vector((0, -1, 0)); LEFT = Vector((1, 0, 0)); UP = Vector((0, 0, 1))

def fcurves_of(action):
    st = action.layers[0].strips[0]
    return st.channelbags[0].fcurves

class Rig:
    def __init__(self, arm):
        self.arm = arm
        self.bones = [b.name for b in arm.data.bones]
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
        self.Mr = {b.name: b.matrix_local.copy() for b in arm.data.bones}
        self.Lr = {}
        for b in self.bones:
            p = self.parent[b]
            self.Lr[b] = (self.Mr[p].inverted() @ self.Mr[b]) if p else self.Mr[b].copy()
        # hierarchical order
        order = []
        def walk(n):
            order.append(n)
            for c in arm.data.bones[n].children: walk(c.name)
        for b in arm.data.bones:
            if b.parent is None: walk(b.name)
        self.order = order
        self.Rr = {b: self.Mr[b].to_3x3() for b in self.bones}
        self.dir = {b: (self.Mr[b].to_3x3() @ Vector((0, 1, 0))).normalized() for b in self.bones}
        self.len = {b: arm.data.bones[b].length for b in self.bones}
        self.pel_scale = 1.0

    # ---------- pose containers
    def rest(self):
        return {b: self.Lr[b].copy() for b in self.bones}

    def from_action(self, action, t, fps_src=24.0, mirror=False):
        """Pose (local matrices) of a source action at time t (seconds)."""
        L = self.rest()
        f = t * fps_src
        ch = {}
        for fc in fcurves_of(action):
            dp = fc.data_path
            if not dp.startswith('pose.bones'): continue
            bn = dp.split('"')[1]; prop = dp.rsplit('.', 1)[1]
            ch.setdefault(bn, {}).setdefault(prop, {})[fc.array_index] = fc.evaluate(f)
        for bn, props in ch.items():
            if bn not in L: continue
            q = props.get('rotation_quaternion')
            Q = Quaternion((q.get(0, 1), q.get(1, 0), q.get(2, 0), q.get(3, 0))) if q else Quaternion()
            Q.normalize()
            loc = props.get('location')
            T = Vector((loc.get(0, 0), loc.get(1, 0), loc.get(2, 0))) if loc else Vector()
            if bn != 'pelvis': T = Vector()
            else: T = T * self.pel_scale
            basis = Matrix.Translation(T) @ Q.to_matrix().to_4x4()
            L[bn] = self.Lr[bn] @ basis
        return L

    def W(self, L):
        W = {}
        for b in self.order:
            p = self.parent[b]
            W[b] = (W[p] @ L[b]) if p else L[b].copy()
        return W

    def set_world(self, L, W, b, M):
        p = self.parent[b]
        L[b] = (W[p].inverted() @ M) if p else M.copy()
        # refresh subtree worlds
        self._refresh(L, W, b)

    def _refresh(self, L, W, b):
        p = self.parent[b]
        W[b] = (W[p] @ L[b]) if p else L[b].copy()
        for c in self.arm.data.bones[b].children:
            self._refresh(L, W, c.name)

    def rot_world(self, L, W, b, q, pivot=None):
        M = W[b]
        pv = M.translation.copy() if pivot is None else pivot
        R = Matrix.Translation(pv) @ q.to_matrix().to_4x4() @ Matrix.Translation(-pv)
        self.set_world(L, W, b, R @ M)

    def set_world_rot(self, L, W, b, R3):
        """Set the bone's world rotation (3x3), keeping its head where the parent puts it."""
        h = W[b].translation.copy()
        M = R3.to_4x4(); M.translation = h
        self.set_world(L, W, b, M)

    def delta(self, W, b):
        """World rotation of the bone relative to its rest orientation (3x3)."""
        return W[b].to_3x3() @ self.Rr[b].inverted()

    def move_pelvis(self, L, W, pos=None, rot=None):
        M = W['pelvis']
        if rot is not None:
            R = rot.to_matrix().to_4x4()
            M = Matrix.Translation(M.translation) @ R @ Matrix.Translation(-M.translation) @ M
        if pos is not None:
            M = M.copy(); M.translation = pos
        self.set_world(L, W, 'pelvis', M)

    # ---------- helpers
    @staticmethod
    def frame_rot(a0, b0, a1, b1):
        """Rotation taking (a0,b0) to (a1,b1) (a exact, b orthogonalised)."""
        def basis(a, b):
            a = a.normalized(); b = (b - a * b.dot(a)).normalized(); c = a.cross(b)
            return Matrix((a, b, c)).transposed()
        return basis(a1, b1) @ basis(a0, b0).inverted()

    def aim_bone(self, L, W, b, want_dir, want_ref=None, rest_ref=None):
        """Point bone along want_dir; optionally align rest_ref (world vector in rest) to want_ref."""
        if want_ref is None:
            cur = (W[b].to_3x3() @ Vector((0, 1, 0))).normalized()
            q = cur.rotation_difference(want_dir.normalized())
            self.rot_world(L, W, b, q)
        else:
            D = self.frame_rot(self.dir[b], rest_ref, want_dir, want_ref)
            self.set_world_rot(L, W, b, D @ self.Rr[b])

    def two_bone(self, L, W, upper, lower, end, target, pole, hinge_rest, twist_share=0.0, end_rot=None):
        """Analytic two-bone IK. hinge_rest: world hinge axis of the joint in rest pose (e.g. Z for elbows, X for knees)."""
        A = W[upper].translation.copy(); B = W[lower].translation.copy(); C = W[end].translation.copy()
        l1 = (B - A).length; l2 = (C - B).length
        T = Vector(target)
        d = T - A; dist = max(1e-4, min(d.length, (l1 + l2) * 0.9995))
        dn = d.normalized()
        cosA = max(-1, min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)))
        sinA = math.sqrt(max(0.0, 1 - cosA * cosA))
        pv = Vector(pole) - dn * Vector(pole).dot(dn)
        if pv.length < 1e-6: pv = UP - dn * UP.dot(dn)
        pv.normalize()
        Bn = A + (dn * cosA + pv * sinA) * l1
        updir = (Bn - A).normalized()
        lodir = (A + dn * dist - Bn).normalized()
        # hinge axis perpendicular to the limb plane; sign chosen to match the rest hinge sense
        # = updir x lodir up to a positive factor (dist * sinA), but stays defined when the limb is straight
        hn = pv.cross(dn).normalized()
        rest_up = self.dir[upper]; rest_lo = self.dir[lower]
        rh = Vector(hinge_rest).normalized()  # = rest_up x (naturally bent lower dir)
        self.set_world_rot(L, W, upper, self.frame_rot(rest_up, rh, updir, hn) @ self.Rr[upper])
        self.set_world_rot(L, W, lower, self.frame_rot(rest_lo, rh, lodir, hn) @ self.Rr[lower])
        if end_rot is not None:
            self.set_world_rot(L, W, end, end_rot)
            if twist_share > 0:
                # share the forearm twist so the wrist does not candy-wrap
                Dl = W[lower].to_3x3(); De = W[end].to_3x3() @ self.Rr[end].inverted() @ self.Rr[lower]
                rel = (Dl.inverted() @ De).to_quaternion()
                ax = Vector((0, 1, 0))
                # swing-twist decomposition about bone Y
                tw = Quaternion((rel.w, 0, rel.y, 0)); tw.normalize()
                ang = 2 * math.atan2(tw.y, tw.w)
                qtw = Quaternion(lodir, ang * twist_share)
                endM = W[end].copy()
                self.rot_world(L, W, lower, qtw)
                self.set_world(L, W, end, endM)

    def hand_rot(self, side, want_dir, want_palm):
        """World rotation for hand_<side> so its bone axis follows want_dir and its palm faces want_palm."""
        b = 'hand_' + side
        rest_palm = Vector((0, 0, -1))  # T-pose palms down
        D = self.frame_rot(self.dir[b], rest_palm, want_dir, want_palm)
        return D @ self.Rr[b]

    def curl(self, L, W, side, amounts, thumb=0.5, spread=0.0):
        """amounts: dict finger -> 0..1 curl. Applied after the hand is placed."""
        hb = 'hand_' + side
        Dh = self.delta(W, hb)
        palm = Dh @ Vector((0, 0, -1))
        for f in ('index', 'middle', 'ring', 'pinky'):
            a = amounts.get(f, 0.0)
            for i, k in ((1, 0.9), (2, 1.1), (3, 0.8)):
                b = '%s_0%d_%s' % (f, i, side)
                if b not in W: continue
                d = (W[b].to_3x3() @ Vector((0, 1, 0))).normalized()
                ax = d.cross(palm).normalized()
                self.rot_world(L, W, b, Quaternion(ax, a * k * 1.45))
        for i, k in ((1, 0.5), (2, 0.8), (3, 0.9)):
            b = 'thumb_0%d_%s' % (i, side)
            if b not in W: continue
            d = (W[b].to_3x3() @ Vector((0, 1, 0))).normalized()
            ax = d.cross(palm).normalized()
            self.rot_world(L, W, b, Quaternion(ax, thumb * k * 1.1))

    def spine(self, L, W, pitch=0.0, yaw=0.0, roll=0.0, frac=(0.25, 0.35, 0.4), rel=True):
        """Bend the spine: pitch>0 forward, yaw>0 turn left, roll>0 lean left. Rotations about character axes."""
        for b, f in zip(('spine_01', 'spine_02', 'spine_03'), frac):
            q = Quaternion(UP, yaw * f) @ Quaternion(LEFT, pitch * f) @ Quaternion(FWD, -roll * f)
            if rel:
                # character axes follow the pelvis yaw only
                pass
            self.rot_world(L, W, b, q)

    def look(self, L, W, yaw=0.0, pitch=0.0, roll=0.0, neck=0.4):
        for b, f in (('neck_01', neck), ('Head', 1 - neck)):
            q = Quaternion(UP, yaw * f) @ Quaternion(LEFT, pitch * f) @ Quaternion(FWD, -roll * f)
            self.rot_world(L, W, b, q)

    # ---------- output
    def basis(self, L):
        out = {}
        for b in self.bones:
            B = self.Lr[b].inverted() @ L[b]
            out[b] = (B.to_translation(), B.to_quaternion())
        return out

def make_action(rig_obj, name, frames, bones, fps=30, loc_bones=('pelvis',)):
    """frames: list of basis dicts (from Rig.basis). Writes a new action with fcurves."""
    act = bpy.data.actions.get(name)
    if act: bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name)
    slot = act.slots.new('OBJECT', rig_obj.name)
    layer = act.layers.new('Layer')
    strip = layer.strips.new(type='KEYFRAME')
    cb = strip.channelbag(slot, ensure=True)
    n = len(frames)
    for b in bones:
        qs = [f[b][1] for f in frames]
        # keep quaternion signs continuous
        for i in range(1, n):
            if qs[i].dot(qs[i - 1]) < 0: qs[i] = -qs[i]
        for k in range(4):
            fc = cb.fcurves.new('pose.bones["%s"].rotation_quaternion' % b, index=k, group_name=b)
            fc.keyframe_points.add(n)
            co = []
            for i in range(n): co += [i * (24.0 / fps) if False else float(i), qs[i][k]]
            fc.keyframe_points.foreach_set('co', co)
            fc.keyframe_points.foreach_set('interpolation', [1] * n)  # LINEAR
            fc.update()
        if b in loc_bones:
            for k in range(3):
                fc = cb.fcurves.new('pose.bones["%s"].location' % b, index=k, group_name=b)
                fc.keyframe_points.add(n)
                co = []
                for i in range(n): co += [float(i), frames[i][b][0][k]]
                fc.keyframe_points.foreach_set('co', co)
                fc.keyframe_points.foreach_set('interpolation', [1] * n)
                fc.update()
    act.use_fake_user = True
    act['ivslot'] = slot.identifier
    return act

def smooth(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

def keys(track, t):
    """track: list of (time, value) with numbers or Vectors; smoothstep between keys."""
    if t <= track[0][0]: return track[0][1]
    for (t0, v0), (t1, v1) in zip(track, track[1:]):
        if t <= t1:
            u = smooth((t - t0) / max(1e-6, t1 - t0))
            if isinstance(v0, Quaternion): return v0.slerp(v1, u)
            return v0 + (v1 - v0) * u
    return track[-1][1]
