/*
 * Ragdolls (RP.Rag): a Verlet particle body on the character's joints (pelvis, chest, head, shoulders, elbows,
 * hands, hips, knees, feet, toes) held by distance constraints with cross-braces for the torso, colliding with the
 * ground and the world's boxes. The skeleton is posed from the particles each frame by swinging each bone from its
 * pose at the moment the ragdoll started. Used for deaths, explosions, car hits, strong melee and big falls; a living
 * character gets up again (RP.Rag.release blends the bones back into animation).
 * No physics library: the Verlet step is a few dozen lines and plenty for a body falling over on stairs and walls.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var Rg = RP.Rag = { list: [] };
  var J = ['pelvis', 'chest', 'head', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'hiL', 'knL', 'ftL', 'toL', 'hiR', 'knR', 'ftR', 'toR'];
  var SRC = { pelvis: 'pelvis', chest: 'spine_03', head: 'Head', shL: 'upperarm_l', elL: 'lowerarm_l', haL: 'hand_l', shR: 'upperarm_r', elR: 'lowerarm_r', haR: 'hand_r',
    hiL: 'thigh_l', knL: 'calf_l', ftL: 'foot_l', toL: 'ball_l', hiR: 'thigh_r', knR: 'calf_r', ftR: 'foot_r', toR: 'ball_r' };
  var LINKS = [['pelvis', 'chest'], ['chest', 'head'], ['chest', 'shL'], ['chest', 'shR'], ['shL', 'shR'], ['shL', 'elL'], ['elL', 'haL'], ['shR', 'elR'], ['elR', 'haR'],
    ['pelvis', 'hiL'], ['pelvis', 'hiR'], ['hiL', 'hiR'], ['hiL', 'knL'], ['knL', 'ftL'], ['ftL', 'toL'], ['hiR', 'knR'], ['knR', 'ftR'], ['ftR', 'toR'],
    // braces (keep the torso rigid)
    ['hiL', 'shL'], ['hiR', 'shR'], ['hiL', 'shR'], ['hiR', 'shL'], ['hiL', 'chest'], ['hiR', 'chest'], ['pelvis', 'shL'], ['pelvis', 'shR'], ['head', 'shL'], ['head', 'shR'],
    ['knL', 'toL'], ['knR', 'toR']];
  var MINL = [['hiL', 'ftL', 0.32], ['hiR', 'ftR', 0.32], ['shL', 'haL', 0.2], ['shR', 'haR', 0.2], ['head', 'pelvis', 0.45], ['knL', 'knR', 0.12], ['ftL', 'ftR', 0.1]];
  // bone -> [joint at its origin, joint it points to]
  var SWING = [['upperarm_l', 'shL', 'elL'], ['lowerarm_l', 'elL', 'haL'], ['upperarm_r', 'shR', 'elR'], ['lowerarm_r', 'elR', 'haR'],
    ['thigh_l', 'hiL', 'knL'], ['calf_l', 'knL', 'ftL'], ['foot_l', 'ftL', 'toL'], ['thigh_r', 'hiR', 'knR'], ['calf_r', 'knR', 'ftR'], ['foot_r', 'ftR', 'toR'], ['neck_01', 'chest', 'head']];
  var _v = new T.Vector3(), _v2 = new T.Vector3(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _m = new T.Matrix4();

  function frame(a, b, c, out) {   // orthonormal basis: up = a->b, right = c (left-right), as a quaternion
    var up = _v.subVectors(b, a).normalize(), rt = _v2.copy(c).normalize();
    var fw = new T.Vector3().crossVectors(rt, up).normalize(); rt.crossVectors(up, fw).normalize();
    _m.makeBasis(rt, up, fw); return out.setFromRotationMatrix(_m);
  }
  Rg.start = function (actor, impulse, at, opts) {
    if (actor.rag) { Rg.push(actor, impulse, at); return actor.rag; }
    actor.root.updateMatrixWorld(true);
    var b = actor.bones, rag = { actor: actor, p: {}, o: {}, q0: {}, d0: {}, t: 0, still: 0, alive: !(opts && opts.dead), frozen: false };
    J.forEach(function (j) {
      var bn = b[SRC[j]], p = bn.getWorldPosition(new T.Vector3());
      if (j === 'head') p.addScaledVector(new T.Vector3(0, 1, 0).applyQuaternion(actor.root.quaternion), 0.1);
      rag.p[j] = p; rag.o[j] = p.clone().sub(actor._vel ? actor._vel.clone().multiplyScalar(1 / 60) : new T.Vector3());
    });
    rag.len = LINKS.map(function (l) { return rag.p[l[0]].distanceTo(rag.p[l[1]]); });
    // start pose: world rotations and swing directions
    for (var k in b) rag.q0[k] = b[k].getWorldQuaternion(new T.Quaternion());
    SWING.forEach(function (s) { rag.d0[s[0]] = rag.p[s[2]].clone().sub(rag.p[s[1]]).normalize(); });
    rag.fPel0 = frame(rag.p.pelvis, rag.p.chest, rag.p.hiL.clone().sub(rag.p.hiR), new T.Quaternion());
    rag.fChe0 = frame(rag.p.pelvis, rag.p.chest, rag.p.shL.clone().sub(rag.p.shR), new T.Quaternion());
    rag.root0 = actor.root.position.clone();
    actor.rag = rag;
    actor.mixer.stopAllAction(); actor.nodes = {}; actor.upper = []; actor.fulls = []; actor.moves = []; actor._upperName = undefined;
    Rg.push(actor, impulse, at);
    Rg.list.push(rag);
    rag.pose = function (a) { pose(rag, a); };
    return rag;
  };
  // add velocity (m/s) to the joints, most near the point `at`
  Rg.push = function (actor, imp, at) {
    var rag = actor.rag; if (!rag || !imp) return;
    J.forEach(function (j) {
      var k = at ? Math.max(0.25, 1 - rag.p[j].distanceTo(at) / 1.2) : 1;
      rag.o[j].addScaledVector(imp, -k / 60);
    });
  };
  var _nb = [];
  function collide(p, o) {
    var g = W.ground(p.x, p.z, p.y + 0.3, 0.6);
    var floor = g.y + 0.06;
    if (p.y < floor) {
      p.y = floor;
      // friction: kill most horizontal motion on contact
      o.x = p.x - (p.x - o.x) * 0.55; o.z = p.z - (p.z - o.z) * 0.55; if (o.y < p.y) o.y = p.y + (p.y - o.y) * 0.2;
    }
    var l = W.near(p.x, p.z, 0.4, _nb), loc = { x: 0, z: 0 };
    for (var i = 0; i < l.length; i++) {
      var b = l[i]; if (b.nocol || p.y > W.topAt(b, 0) + 0.06 || p.y < b.y0) continue;
      W.toLocal(b, p.x, p.z, loc);
      var r = 0.08, ex = b.hx + r - Math.abs(loc.x), ez = b.hz + r - Math.abs(loc.z), top = W.topAt(b, loc.z);
      if (ex <= 0 || ez <= 0) continue;
      var ey = top + 0.06 - p.y;
      if (ey < ex && ey < ez && ey < 0.4) { p.y = top + 0.06; continue; }
      var w = { x: 0, z: 0 };
      if (ex < ez) W.toWorldDir(b, Math.sign(loc.x) * ex, 0, w); else W.toWorldDir(b, 0, Math.sign(loc.z) * ez, w);
      p.x += w.x; p.z += w.z;
    }
  }
  function step(rag, dt) {
    var g = RP.TUNING.gravity * 0.75 * dt * dt, k, p, o, vx, vy, vz;
    var moving = 0;
    for (var i = 0; i < J.length; i++) {
      k = J[i]; p = rag.p[k]; o = rag.o[k];
      vx = (p.x - o.x) * 0.995; vy = (p.y - o.y) * 0.995; vz = (p.z - o.z) * 0.995;
      o.copy(p); p.x += vx; p.y += vy - g; p.z += vz;
      moving += vx * vx + vy * vy + vz * vz;
    }
    for (var it = 0; it < 6; it++) {
      for (i = 0; i < LINKS.length; i++) {
        var a = rag.p[LINKS[i][0]], b = rag.p[LINKS[i][1]], L0 = rag.len[i];
        _v.subVectors(b, a); var L = _v.length() || 1e-4, diff = (L - L0) / L * 0.5;
        var wa = LINKS[i][0] === 'pelvis' || LINKS[i][0] === 'chest' ? 0.6 : 0.5;
        a.addScaledVector(_v, diff * 2 * wa); b.addScaledVector(_v, -diff * 2 * (1 - wa));
      }
      for (i = 0; i < MINL.length; i++) {
        a = rag.p[MINL[i][0]]; b = rag.p[MINL[i][1]];
        _v.subVectors(b, a); L = _v.length() || 1e-4;
        if (L < MINL[i][2]) { diff = (L - MINL[i][2]) / L * 0.5; a.addScaledVector(_v, diff); b.addScaledVector(_v, -diff); }
      }
      for (i = 0; i < J.length; i++) collide(rag.p[J[i]], rag.o[J[i]]);
    }
    rag.still = moving < 1e-6 * J.length ? rag.still + dt : 0;
  }
  function setWorldQuat(bone, q) {
    var pq = bone.parent.getWorldQuaternion(_q2);
    bone.quaternion.copy(pq.invert().multiply(q));
    bone.updateMatrixWorld(true);
  }
  function pose(rag, a) {
    var b = a.bones, p = rag.p;
    // the root follows the pelvis on the ground so culling, LOD and the shadow stay with the body
    a.root.position.set(p.pelvis.x, W.ground(p.pelvis.x, p.pelvis.z, p.pelvis.y).y, p.pelvis.z);
    a.root.updateMatrixWorld(true);
    // pelvis: position + full rotation from the hip frame
    var fP = frame(p.pelvis, p.chest, p.hiL.clone().sub(p.hiR), new T.Quaternion());
    var rotP = fP.clone().multiply(rag.fPel0.clone().invert());
    b.pelvis.position.copy(b.pelvis.parent.worldToLocal(p.pelvis.clone()));
    setWorldQuat(b.pelvis, rotP.clone().multiply(rag.q0.pelvis));
    var fC = frame(p.pelvis, p.chest, p.shL.clone().sub(p.shR), new T.Quaternion());
    var rotC = fC.clone().multiply(rag.fChe0.clone().invert());
    ['spine_01', 'spine_02'].forEach(function (n, i) { var r = rotP.clone().slerp(rotC, (i + 1) / 3); setWorldQuat(b[n], r.multiply(rag.q0[n])); });
    setWorldQuat(b.spine_03, rotC.clone().multiply(rag.q0.spine_03));
    ['clavicle_l', 'clavicle_r'].forEach(function (n) { if (b[n]) setWorldQuat(b[n], rotC.clone().multiply(rag.q0[n])); });
    for (var i = 0; i < SWING.length; i++) {
      var s = SWING[i], bn = b[s[0]]; if (!bn) continue;
      var d = _v.subVectors(p[s[2]], p[s[1]]).normalize();
      // the swing is applied on top of the parent's change, so use the bone's start direction carried by its parent
      var par = s[0].indexOf('upperarm') === 0 ? rotC : s[0].indexOf('thigh') === 0 ? rotP : s[0] === 'neck_01' ? rotC : null;
      var d0 = rag.d0[s[0]].clone();
      var base = rag.q0[s[0]].clone();
      if (par) { d0.applyQuaternion(par); base.premultiply(par); }
      else {
        // child of a swung bone: its start direction moves with the parent's swing
        var pn = bn.parent.name, pq = bn.parent.getWorldQuaternion(new T.Quaternion()), pq0 = rag.q0[pn];
        var rel = pq.clone().multiply(pq0.clone().invert());
        d0.applyQuaternion(rel); base.premultiply(rel);
      }
      _q.setFromUnitVectors(d0, d);
      setWorldQuat(bn, _q.multiply(base));
      if (s[0] === 'neck_01' && b.Head) setWorldQuat(b.Head, b.neck_01.getWorldQuaternion(new T.Quaternion()).multiply(rag.q0.neck_01.clone().invert()).multiply(rag.q0.Head));
    }
  }
  // blend a living character back into animation (call when it should get up)
  Rg.release = function (actor) {
    var rag = actor.rag; if (!rag) return;
    var snap = {}; for (var k in actor.bones) snap[k] = actor.bones[k].quaternion.clone();
    var pelPos = actor.bones.pelvis.position.clone();
    // face along the body (from feet to head) so the get-up turns the right way
    var dir = rag.p.chest.clone().sub(rag.p.pelvis); dir.y = 0;
    var face = Math.atan2(dir.x, dir.z);
    actor.rag = null;
    Rg.list = Rg.list.filter(function (r) { return r !== rag; });
    actor._blendFrom = snap; actor._blendPel = pelPos; actor._blendT = 0.55; actor._blendMax = 0.55;
    return { yaw: face, x: rag.p.pelvis.x, z: rag.p.pelvis.z };
  };
  Rg.update = function (dt) {
    for (var i = 0; i < Rg.list.length; i++) {
      var r = Rg.list[i]; r.t += dt;
      if (r.frozen) continue;
      var sub = dt > 0.02 ? 2 : 1;
      for (var s = 0; s < sub; s++) step(r, dt / sub);
      // a dead body that has stopped is frozen (no more work)
      if (!r.alive && r.still > 1.2) r.frozen = true;
      if (r.t > 12 && !r.alive) r.frozen = true;
    }
  };
  Rg.settled = function (actor) { return actor.rag && (actor.rag.still > 0.5 || actor.rag.t > 3.5) && actor.rag.t > 0.8; };
})();
