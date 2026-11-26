/*
 * Items on the ground (RP.Items), GTA-style:
 *   - weapons lie where they fall as the real model (guards drop theirs when they go down; you can drop yours with B,
 *     or the Drop button in the weapon wheel on phones); each keeps the rounds that were in it
 *   - one weapon per slot (melee, pistol, SMG, rifle, shotgun, sniper, heavy; throwables stack by type; fists always)
 *   - walking over a weapon you already have takes its ammo; over one for an empty slot picks it up; over one for a
 *     slot you've filled shows "E: Swap <yours> for <it>", and swapping drops yours in its place
 *   - health, armour and ammo pickups (first-aid case, vest, ammo can) are taken on touch
 * Picking a weapon up plays a crouch-and-grab; the gun goes into the slot and is drawn only if your hands were empty.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, WP = RP.Weapons;
  var IT = RP.Items = { list: [] };
  var TOUCH_R = 1.0, PROMPT_R = 1.6, GRAV = 9.8;

  IT.clear = function () { IT.list.forEach(function (it) { if (it.g.parent) it.g.parent.remove(it.g); if (it.hl && it.hl.parent) it.hl.parent.remove(it.hl); }); IT.list = []; (IT.debrisList || []).forEach(function (d) { d.g.parent && d.g.parent.remove(d.g); }); IT.debrisList = []; };

  function ring(col) {
    var m = new T.Mesh(new T.RingGeometry(0.36, 0.42, 28), new T.MeshBasicMaterial({ color: RP.col(col).multiplyScalar(1.6), transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.renderOrder = 4; return m;
  }
  function add(it) { RP.R.scene.add(it.g); IT.list.push(it); return it; }

  // a weapon on the ground: id, position, launch velocity, rounds {mag, reserve}
  IT.dropWeapon = function (id, pos, vel, ammo, rotY) {
    var d = WP.DEFS[id]; if (!d || d.unarmed) return null;
    var g = new T.Group(), model = WP.model(id);
    if (!model) return null;
    model.position.set(0, 0, 0); g.add(model);
    var hl = ring(d.cat === 'throw' ? '#e8c46a' : '#f2efe6'); hl.visible = false; RP.R.scene.add(hl);
    g.position.copy(pos);
    g.rotation.set(0, rotY || 0, 0);
    var it = { kind: 'weapon', id: id, g: g, model: model, hl: hl, vel: (vel || new T.Vector3()).clone(), spin: new T.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8),
      rest: false, t: 0, ammo: ammo || { mag: d.mag || 0, reserve: 0 }, len: model.userData.len || 0.4 };
    return add(it);
  };
  // health, armour and ammo: a small model, taken on touch
  IT.pickup = function (kind, x, z, y) {
    y = y == null ? W.ground(x, z, 200).y : y;
    var g = new T.Group(), mats = RP.GunModels && RP.GunModels.mats ? null : null;
    var std = function (hex, r, m) { return new T.MeshStandardMaterial({ color: RP.col(hex), roughness: r, metalness: m || 0 }); };
    if (/^mod:/.test(kind)) {
      // a weapon mod in a small hard case with a coloured band
      var mk = kind.slice(4), band = { suppressor: '#9aa0a6', extmag: '#c9a34a', scope: '#6aa7e8', grip: '#7fcf8a' }[mk] || '#ffffff';
      var cs = new T.Mesh(new T.BoxGeometry(0.3, 0.09, 0.2), std('#1b1c1e', 0.6, 0.2)); cs.position.y = 0.045; g.add(cs);
      var bd = new T.Mesh(new T.BoxGeometry(0.305, 0.03, 0.06), std(band, 0.5)); bd.position.y = 0.07; g.add(bd);
      g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      g.add(ring(band)); g.position.set(x, y, z); g.rotation.y = Math.random() * 6.28;
      return add({ kind: 'mod', mod: mk, g: g, rest: true, t: 0 });
    }
    if (kind === 'health') {
      var c = new T.Mesh(new T.BoxGeometry(0.34, 0.2, 0.12), std('#e9e5dc', 0.5)); c.position.y = 0.1; g.add(c);
      var x1 = new T.Mesh(new T.BoxGeometry(0.12, 0.035, 0.125), std('#c8352a', 0.5)); x1.position.y = 0.11; g.add(x1);
      var x2 = new T.Mesh(new T.BoxGeometry(0.035, 0.12, 0.125), std('#c8352a', 0.5)); x2.position.y = 0.11; g.add(x2);
      var h = new T.Mesh(new T.BoxGeometry(0.12, 0.03, 0.03), std('#2a2a2a', 0.6)); h.position.y = 0.215; g.add(h);
    } else if (kind === 'armour') {
      var v = new T.Mesh(new T.BoxGeometry(0.4, 0.06, 0.46), std('#2b2c28', 0.85)); v.position.y = 0.03; g.add(v);
      for (var i = 0; i < 3; i++) { var p = new T.Mesh(new T.BoxGeometry(0.08, 0.03, 0.12), std('#3a3b35', 0.8)); p.position.set(-0.12 + i * 0.12, 0.075, 0.1); g.add(p); }
    } else {
      var a = new T.Mesh(new T.BoxGeometry(0.3, 0.18, 0.14), std('#4b5340', 0.55, 0.3)); a.position.y = 0.09; g.add(a);
      var l = new T.Mesh(new T.BoxGeometry(0.31, 0.03, 0.15), std('#3c4334', 0.5, 0.4)); l.position.y = 0.19; g.add(l);
      var hd = new T.Mesh(new T.BoxGeometry(0.1, 0.025, 0.03), std('#202020', 0.5, 0.3)); hd.position.y = 0.215; g.add(hd);
    }
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    if (RP.Vehicles && RP.Vehicles.mergeChildren) RP.Vehicles.mergeChildren(g);
    g.add(ring({ health: '#d64b3c', armour: '#3c7bd6', ammo: '#c9a34a' }[kind]));
    g.position.set(x, y, z); g.rotation.y = Math.random() * 6.28;
    return add({ kind: kind, g: g, rest: true, t: 0 });
  };

  // ---- inventory rules
  IT.slotOf = function (p, cat) {
    for (var id in p.inv) { var d = WP.DEFS[id]; if (d && d.cat === cat && !d.unarmed) return id; }
    return null;
  };
  // what touching / using this weapon would do: 'ammo', 'take', 'swap' (with the weapon it replaces) or null
  IT.action = function (p, it) {
    var d = WP.DEFS[it.id];
    if (p.inv[it.id]) return { what: (d.cat === 'throw' || it.ammo.mag + it.ammo.reserve > 0) ? 'ammo' : null };
    if (d.cat === 'throw') return { what: 'take' };
    var have = IT.slotOf(p, d.cat);
    return have ? { what: 'swap', old: have } : { what: 'take' };
  };
  function rounds(it) { return (it.ammo.mag || 0) + (it.ammo.reserve || 0); }
  function takeAmmo(p, it) {
    var d = WP.DEFS[it.id], e = p.inv[it.id];
    if (d.cat === 'throw') { e.reserve = Math.min(d.reserve * 2, e.reserve + Math.max(1, rounds(it))); }
    else e.reserve = Math.min((d.reserve || 0) * 2, e.reserve + rounds(it));
    RP.emit('toast', '+ ' + d.name + (d.cat === 'throw' ? '' : ' ammo')); RP.Audio.mech('magIn', p.pos);
    remove(it);
  }
  function takeWeapon(p, it) {
    var d = WP.DEFS[it.id];
    var e = p.inv[it.id] = { mag: d.cat === 'throw' ? 0 : Math.min(d.mag || 0, it.ammo.mag || 0), reserve: d.cat === 'throw' ? Math.max(1, rounds(it)) : (it.ammo.reserve || 0) };
    if (d.cat !== 'throw' && e.mag === 0 && e.reserve > 0) { var k = Math.min(d.mag, e.reserve); e.mag = k; e.reserve -= k; }
    if (it.mods) e.mods = it.mods;
    RP.emit('toast', 'Picked up ' + d.name); RP.Audio.mech('holster', p.pos);
    remove(it);
    // grab it from the ground
    if (p.actor && p.state === 'move') { p.actor.move('pickup'); p.pickT = 0.55; }
    if (p.cur === 'fists' && d.cat !== 'throw') RP.Player.equip(p, it.id);
    if (d.cat === 'throw') p.throwId = it.id;
    RP.emit('inventory', p);
  }
  // drop a weapon you carry (current one by default): it falls in front of you with its rounds
  IT.playerDrop = function (p, id) {
    id = id || p.cur;
    var d = WP.DEFS[id]; if (!d || d.unarmed || !p.inv[id]) return false;
    var e = p.inv[id], fwd = new T.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    var hand = p.actor.bones.hand_r ? p.actor.bones.hand_r.getWorldPosition(new T.Vector3()) : p.pos.clone().setY(p.pos.y + 1);
    var dr = IT.dropWeapon(id, hand, fwd.multiplyScalar(1.6).setY(1.2).add(p.vel || new T.Vector3()), { mag: e.mag, reserve: e.reserve }, p.yaw);
    if (dr) { dr.noAuto = true; dr.mods = e.mods || null; WP.dress(dr.model, dr.mods); }   // something you dropped on purpose is only picked up again with E
    delete p.inv[id];
    if (p.cur === id) { RP.Player.equip(p, 'fists', true); }
    if (p.throwId === id) p.throwId = Object.keys(p.inv).filter(function (k) { return WP.DEFS[k].cat === 'throw'; })[0] || null;
    p.actor.move('dropW');
    RP.emit('toast', 'Dropped ' + d.name); RP.emit('inventory', p);
    return true;
  };
  function remove(it) { it.gone = true; if (it.g.parent) it.g.parent.remove(it.g); if (it.hl && it.hl.parent) it.hl.parent.remove(it.hl); }

  // small things that fall and vanish (an empty magazine): a copy of the object, from a world position
  IT.debrisList = [];
  IT.debris = function (obj, worldPos) {
    if (IT.debrisList.length > 12) { var o = IT.debrisList.shift(); o.g.parent && o.g.parent.remove(o.g); }
    var g = obj.clone(true); obj.getWorldQuaternion(g.quaternion); g.position.copy(worldPos); g.visible = true;
    RP.R.scene.add(g);
    IT.debrisList.push({ g: g, vy: -0.4, t: 0, sx: (Math.random() - 0.5) * 6 });
  };
  function stepDebris(dt) {
    for (var i = 0; i < IT.debrisList.length; i++) {
      var d = IT.debrisList[i]; d.t += dt;
      if (!d.rest) {
        d.vy -= GRAV * dt; d.g.position.y += d.vy * dt; d.g.rotation.x += d.sx * dt;
        var gy = W.ground(d.g.position.x, d.g.position.z, d.g.position.y + 0.4).y + 0.02;
        if (d.g.position.y <= gy) { d.g.position.y = gy; d.rest = true; d.g.rotation.set(Math.PI / 2, d.g.rotation.y, 0); RP.Audio.mech && RP.Audio.mech('shell', d.g.position); }
      }
      if (d.t > 20) { d.g.parent && d.g.parent.remove(d.g); d.gone = true; }
    }
    IT.debrisList = IT.debrisList.filter(function (d) { return !d.gone; });
  }
  // ---- per frame
  var _q = new T.Quaternion(), _q2 = new T.Quaternion(), _e = new T.Euler();
  IT.near = null;
  IT.update = function (dt) {
    var p = RP.G.player, best = null, bd = 1e9, cam = RP.R.camera, qn = RP.R.qname;
    var showD = qn === 'low' ? 40 : qn === 'high' ? 110 : 70, show2 = showD * showD;
    stepDebris(dt);
    for (var i = 0; i < IT.list.length; i++) {
      var it = IT.list[i]; if (it.gone) continue;
      it.t += dt;
      // small things are not drawn from far off; a weapon on the ground uses the gun's cheaper versions with distance
      var c2 = cam.position.distanceToSquared(it.g.position);
      it.g.visible = c2 < show2;
      if (it.model && it.model.userData.far && RP.GunModels) RP.GunModels.setFar(it.model, c2 < 196 ? 0 : c2 < 900 ? 1 : 2);
      if (it.kind === 'weapon' && !it.rest) stepFall(it, dt);
      if (it.kind !== 'weapon') { it.g.rotation.y += dt * 0.8; }
      if (it.hl) { it.hl.position.set(it.g.position.x, it.gy != null ? it.gy + 0.015 : it.g.position.y, it.g.position.z); }
      if (!p || !p.alive) continue;
      var dx = p.pos.x - it.g.position.x, dz = p.pos.z - it.g.position.z, dy = Math.abs(p.pos.y + 0.3 - it.g.position.y), dist = Math.hypot(dx, dz);
      if (dy > 1.6) continue;
      if (it.kind !== 'weapon') {
        if (dist < TOUCH_R) touchPickup(p, it);
        continue;
      }
      var act = IT.action(p, it);
      if (it.hl) it.hl.visible = dist < 8 && it.rest;
      if (dist < TOUCH_R && act.what === 'ammo') { takeAmmo(p, it); continue; }
      if (dist < TOUCH_R && act.what === 'take' && it.rest && !it.noAuto) { takeWeapon(p, it); continue; }
      if ((act.what === 'swap' || act.what === 'take' && it.noAuto) && it.rest && dist < PROMPT_R && dist < bd) { best = it; bd = dist; }
    }
    IT.list = IT.list.filter(function (it) { return !it.gone; });
    IT.near = best;
    if (best) { var a = IT.action(p, best); RP.HUD.interact = a.what === 'swap' ? 'Swap ' + WP.DEFS[a.old].name + ' for ' + WP.DEFS[best.id].name : 'Pick up ' + WP.DEFS[best.id].name; }
    // keep the scene light: at most 24 weapons lying around (oldest go first)
    var ws = IT.list.filter(function (it) { return it.kind === 'weapon'; });
    if (ws.length > 24) remove(ws[0]);
  };
  // the swap, on E
  IT.interact = function (p) {
    var it = IT.near; if (!it || it.gone) return false;
    var a = IT.action(p, it);
    if (a.what === 'take') { takeWeapon(p, it); return true; }
    if (a.what !== 'swap') return false;
    var wasCur = p.cur === a.old;
    IT.playerDrop(p, a.old);
    takeWeapon(p, it);
    if (wasCur) RP.Player.equip(p, it.id);
    return true;
  };
  function touchPickup(p, it) {
    var TU = RP.TUNING;
    if (it.kind === 'mod') {
      var md = WP.MODS[it.mod], e = p.inv[p.cur];
      if (!WP.canFit(p.cur, it.mod) || (e.mods && e.mods[it.mod])) {
        if ((it.sayT || 0) < RP.G.time) { it.sayT = RP.G.time + 4; RP.emit('toast', md.name + ': hold a weapon it fits'); }
        return;
      }
      e.mods = Object.assign({}, e.mods); e.mods[it.mod] = true;
      RP.Player.refit(p); RP.emit('toast', md.name + ' fitted to ' + WP.DEFS[p.cur].name); RP.Audio.mech('slide', p.pos); RP.emit('inventory', p);
      remove(it); return;
    }
    if (it.kind === 'health') { if (p.hp >= TU.maxHealth) return; p.hp = Math.min(TU.maxHealth, p.hp + 50); RP.emit('toast', '+ Health'); }
    if (it.kind === 'armour') { if (p.armour >= TU.maxArmour) return; p.armour = TU.maxArmour; RP.emit('toast', '+ Armour'); }
    if (it.kind === 'ammo') { Object.keys(p.inv).forEach(function (id) { var d = WP.DEFS[id]; if (d.reserve && d.cat !== 'throw') p.inv[id].reserve = Math.min(d.reserve * 2, p.inv[id].reserve + Math.ceil(d.mag * 2)); }); RP.emit('toast', '+ Ammo'); }
    RP.Audio.ui('ok'); remove(it);
  }
  // tumble, land, settle lying on its side
  function stepFall(it, dt) {
    var g = it.g, v = it.vel;
    v.y -= GRAV * dt;
    g.position.addScaledVector(v, dt);
    g.rotation.x += it.spin.x * dt; g.rotation.y += it.spin.y * dt; g.rotation.z += it.spin.z * dt;
    var gr = W.ground(g.position.x, g.position.z, g.position.y + 0.5);
    var gy = gr ? gr.y : g.position.y - 10;
    var lie = gy + 0.03;
    if (g.position.y <= lie) {
      g.position.y = lie;
      if (Math.abs(v.y) > 1.2) { v.y = -v.y * 0.25; v.x *= 0.5; v.z *= 0.5; it.spin.multiplyScalar(0.4); RP.Audio.step && RP.Audio.step('metal', g.position, 0.5); }
      else {
        v.set(0, 0, 0); it.spin.set(0, 0, 0);
        // lie on the side the gun is turned towards
        _e.set(0, g.rotation.y, Math.PI / 2 * (Math.sin(g.rotation.z) >= 0 ? 1 : -1)); _q.setFromEuler(_e);
        g.quaternion.slerp(_q, Math.min(1, dt * 14));
        if (g.quaternion.angleTo(_q) < 0.02) { g.quaternion.copy(_q); it.rest = true; it.gy = gy; }
      }
    }
    if (it.t > 6 && !it.rest) { it.rest = true; it.gy = gy; }
  }
})();
