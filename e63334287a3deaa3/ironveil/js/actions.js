/* Midnight Ops: grenades (G) and pings (V).
   A grenade is thrown along the view, bounces off walls and the ground (ray cast each step, the velocity reflected
   and damped), and goes off 3.2 s after the throw: it kills or wounds soldiers within 7 m that it can "see", hurts
   you within 6 m, and the bang brings everyone nearby. Two per life; ammunition pouches sometimes hold one more.
   A ping marks whatever you are looking at for 10 seconds. */
(function () {
  'use strict';
  const MO = window.MO, AC = MO.actions = { live: [], ping: null };
  const FUSE = 3.2, MAX = 4, hit = {}, v = new THREE.Vector3();
  let pool = [];

  AC.init = () => {
    const S = MO.R.scene;
    for (let i = 0; i < MAX; i++) {     // the grenade: a ridged olive body, a fuse top and its lever
      const b = new MO.Builder();
      b.add(MO.lathe([[0, -0.055], [0.022, -0.052], [0.03, -0.04], [0.031, 0.02], [0.026, 0.04], [0.014, 0.05], [0, 0.05]], 12), 'paint_olive');
      for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(0.031, 0.004, 4, 12), 'paint_olive', MO.xf(0, -0.035 + k * 0.018, 0, Math.PI / 2, 0, 0), 0.8);
      b.cyl('steel_dark', 0.009, 0.009, 0.025, 0, 0.06, 0, { seg: 8 }); b.box('steel_dark', 0.012, 0.06, 0.006, 0.016, 0.045, 0, { rz: -0.25, ch: 0 });
      const g = new THREE.Group(); b.build(g, { ao: false, dynamic: true }); g.visible = false; S.add(g);
      pool.push({ g: g, on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), w: new THREE.Vector3(), t: 0, bounces: 0 });
    }
  };
  AC.reset = () => { for (const n of pool) { n.on = false; n.g.visible = false; } AC.ping = null; MO.hud && MO.hud.ping(null); };

  AC.throwNade = () => {
    const W = MO.weapon, P = MO.player, A = MO.audio;
    if (W.nades <= 0) { MO.hud.msg(MO.T('No grenades left')); return; }
    const n = pool.find((q) => !q.on); if (!n) return;
    W.nades--; W.throwKick(); A && A.play('cloth', { vol: 0.9 }); A && A.play('bolt', { vol: 0.4, pitch: 1.6 });
    const cam = MO.R.camera; cam.getWorldDirection(v);
    n.on = true; n.t = FUSE; n.bounces = 0; n.p.copy(cam.position).addScaledVector(v, 0.5); n.p.y -= 0.12;
    const up = MO.clamp(0.25 - v.y * 0.3, 0.05, 0.35);
    n.v.copy(v).multiplyScalar(13).add(P.vel); n.v.y += 13 * up; n.w.set(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6);
    n.g.position.copy(n.p); n.g.visible = true;
  };
  function blast(n) {
    const P = MO.player, x = n.p.x, y = Math.max(0.15, n.p.y), z = n.p.z;
    MO.fx.explosion(x, y - 0.3, z, 0.8); MO.audio && MO.audio.play('explosion', { x: x, y: y, z: z, vol: 1 });
    for (const s of MO.enemies.list) { if (!s.alive) continue; const d = Math.hypot(s.x - x, s.z - z); if (d > 7) continue;
      if (!MO.phys.los(x, y + 0.3, z, s.x, 1.0, s.z)) continue; s.hit(Math.round(260 * Math.pow(1 - d / 7, 1.2)) + 10, false, s.x - x, s.z - z); }
    const dp = Math.hypot(P.pos.x - x, P.pos.z - z); if (dp < 6 && MO.phys.los(x, y + 0.3, z, P.pos.x, P.pos.y + 1, P.pos.z)) P.damage(Math.round(95 * (1 - dp / 6)), x, z);
    MO.emit('shot', x, z); MO.enemies.shout(x, z, 35, P.pos.x, P.pos.z);
  }
  AC.update = (dt) => {
    const I = MO.input, P = MO.player;
    if (I.nadeP && P.alive && !MO.R.hideWeapon && !MO.weapon.reloading && (MO.mission.state === 'play')) AC.throwNade();
    if (I.pingP && P.alive) { const cam = MO.R.camera; cam.getWorldDirection(v);
      const d = MO.phys.ray(cam.position.x, cam.position.y, cam.position.z, v.x, v.y, v.z, 160, hit, true) ? hit.t : 70;      // nothing in the way: mark a spot in the distance
      AC.ping = { x: cam.position.x + v.x * d, y: Math.max(0.3, cam.position.y + v.y * d + 0.3), z: cam.position.z + v.z * d, t: 10 }; MO.hud.ping(AC.ping); MO.audio && MO.audio.play('ui_click', { vol: 0.5 }); }
    if (AC.ping) { AC.ping.t -= dt; if (AC.ping.t <= 0) { AC.ping = null; MO.hud.ping(null); } }
    for (const n of pool) { if (!n.on) continue;
      n.t -= dt;
      const steps = 3, h = dt / steps;
      for (let s = 0; s < steps; s++) {
        n.v.y -= 9.8 * h; const sp = n.v.length(), d = sp * h;
        if (d > 1e-5 && MO.phys.ray(n.p.x, n.p.y, n.p.z, n.v.x / sp, n.v.y / sp, n.v.z / sp, d + 0.04, hit, true)) {
          n.p.set(hit.x + hit.nx * 0.045, Math.max(0.045, hit.y + hit.ny * 0.045), hit.z + hit.nz * 0.045);
          const vn = n.v.x * hit.nx + n.v.y * hit.ny + n.v.z * hit.nz; n.v.x -= 1.4 * vn * hit.nx; n.v.y -= 1.4 * vn * hit.ny; n.v.z -= 1.4 * vn * hit.nz; n.v.multiplyScalar(0.62); n.w.multiplyScalar(0.6); if (hit.ny > 0.7) { n.v.x *= 0.45; n.v.z *= 0.45; }      // the ground grips: it doesn't skid far
          if (n.bounces++ < 3 && sp > 2) MO.audio && MO.audio.play('shell', { x: n.p.x, y: n.p.y, z: n.p.z, vol: 0.9, pitch: 0.55 });
        } else n.p.addScaledVector(n.v, h);
        if (n.p.y < 0.05) { n.p.y = 0.045; if (n.v.y < 0) n.v.y *= -0.3; n.v.x *= 0.82; n.v.z *= 0.82; }
      }
      n.g.position.copy(n.p); n.g.rotation.x += n.w.x * dt; n.g.rotation.y += n.w.y * dt; n.g.rotation.z += n.w.z * dt;
      if (n.t <= 0) { n.on = false; n.g.visible = false; blast(n); }
    }
  };
})();
