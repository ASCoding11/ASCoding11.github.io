/* Midnight Ops: enemy soldiers. The figure is a rig declared in code: named bones, and rigid pieces of geometry
   each bound to one bone. There are no animation clips: the controller sets bone rotations directly every frame
   from the soldier's state (stride phase, aiming, crouching, flinching, falling).
   Two kinds: riflemen (45 health, a slow, aimed shot) and sergeants with a submachine gun (140 health, short
   bursts, push forward). Sight is a cone with line of sight; a gunshot is heard; a soldier who spots you shouts to
   those nearby. Only three may shoot at once, so a crowd never fires as one. Hits are tested against spheres and
   capsules, not the mesh. */
(function () {
  'use strict';
  const MO = window.MO, EN = MO.enemies = { list: [], tokens: 0, queue: [], alerted: false, kills: 0 };
  const PI = Math.PI, xf = MO.xf;
  const J = { hips: [0, 0.98, 0], spine: [0, 1.12, 0], chest: [0, 1.3, 0], head: [0, 1.53, 0], lUp: [0.2, 1.44, 0], lFo: [0.2, 1.16, 0], rUp: [-0.2, 1.44, 0], rFo: [-0.2, 1.16, 0],
    lTh: [0.095, 0.95, 0], lSh: [0.095, 0.52, 0], lFt: [0.095, 0.09, 0], rTh: [-0.095, 0.95, 0], rSh: [-0.095, 0.52, 0], rFt: [-0.095, 0.09, 0], gun: [-0.14, 1.36, 0.14] };
  const NAMES = Object.keys(J), PARENT = { hips: null, spine: 'hips', chest: 'spine', head: 'chest', lUp: 'chest', lFo: 'lUp', rUp: 'chest', rFo: 'rUp', lTh: 'hips', lSh: 'lTh', lFt: 'lSh', rTh: 'hips', rSh: 'rTh', rFt: 'rSh', gun: 'chest' };
  const BI = {}; NAMES.forEach((n, i) => { BI[n] = i; });
  const rigs = {};
  function rig(kind) {
    if (rigs[kind]) return rigs[kind];
    const b = new MO.Builder(), U = kind === 's' ? 'wool_grey' : 'wool_grey', on = (n) => { b.bone = BI[n]; };
    const limb = (n, a, c, r1, r2, mat, col) => { on(n); b.cyl(mat, r1, r2, a[1] - c[1], a[0], (a[1] + c[1]) / 2, a[2], { seg: 8, col: col }); };
    on('hips'); b.box(U, 0.36, 0.24, 0.22, 0, 0.98, 0, { ch: 0.05 }); b.box(U, 0.39, 0.2, 0.25, 0, 0.88, 0, { ch: 0.05, col: 0.92 });
    on('spine'); b.box(U, 0.34, 0.22, 0.21, 0, 1.17, 0, { ch: 0.05 }); b.box('leather_dark', 0.37, 0.055, 0.235, 0, 1.07, 0, { ch: 0.012 }); b.box('paint_grey', 0.05, 0.04, 0.02, 0, 1.07, 0.125, { ch: 0.006, col: 1.6 });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.box('leather_dark', 0.05, 0.085, 0.04, s * (0.065 + i * 0.055), 1.045, 0.125 - i * 0.012, { ch: 0.012, rx: -0.1 });
    b.cyl('paint_grey', 0.06, 0.06, 0.27, 0.02, 1.02, -0.15, { rz: PI / 2, seg: 10, col: 0.9 }); b.box('canvas', 0.2, 0.18, 0.07, -0.15, 0.97, -0.12, { ch: 0.03 });
    on('chest'); b.box(U, 0.42, 0.33, 0.25, 0, 1.38, 0, { ch: 0.07 }); b.sph(U, 0.085, 0.2, 1.45, 0, { seg: 8, seg2: 6 }); b.sph(U, 0.085, -0.2, 1.45, 0, { seg: 8, seg2: 6 });
    for (const s of [-1, 1]) { b.box('leather_dark', 0.035, 0.36, 0.012, s * 0.1, 1.32, 0.128, { ch: 0.004, rz: s * 0.1 }); b.box('leather_dark', 0.035, 0.36, 0.012, s * 0.06, 1.34, -0.128, { ch: 0.004, rz: s * -0.16 }); }
    b.box(U, 0.2, 0.06, 0.2, 0, 1.55, 0.0, { ch: 0.02, col: 0.8 });
    on('head'); b.cyl('skin_pale', 0.05, 0.055, 0.1, 0, 1.55, 0, { seg: 8 }); b.sph('skin_pale', 0.1, 0, 1.655, 0.005, { sy: 1.16, sz: 1.06, seg: 10, seg2: 8 }); b.box('skin_pale', 0.03, 0.04, 0.03, 0, 1.64, 0.105, { ch: 0.01 });
    if (kind === 's') { b.add(MO.lathe([[0, 0.07], [0.09, 0.07], [0.11, 0.03], [0.108, -0.01], [0.1, -0.02], [0, -0.02]], 12), U, xf(0, 1.75, 0, 0.06, 0, 0), 0.85); b.box('leather_dark', 0.16, 0.012, 0.07, 0, 1.735, 0.11, { ch: 0.004, rx: 0.3 }); }
    else b.add(MO.lathe([[0, 0.125], [0.06, 0.118], [0.105, 0.085], [0.125, 0.03], [0.128, -0.03], [0.15, -0.065], [0.155, -0.075], [0.14, -0.07], [0.115, -0.03], [0, -0.03]], 14), 'paint_grey', xf(0, 1.72, -0.005, 0.03, 0, 0), 0.75);
    for (const s of ['l', 'r']) { const sg = s === 'l' ? 1 : -1;
      limb(s + 'Up', J[s + 'Up'], J[s + 'Fo'], 0.062, 0.052, U); limb(s + 'Fo', J[s + 'Fo'], [sg * 0.2, 0.9, 0], 0.052, 0.042, U);
      on(s + 'Fo'); b.box('skin_pale', 0.075, 0.1, 0.04, sg * 0.2, 0.855, 0.005, { ch: 0.015 });
      limb(s + 'Th', J[s + 'Th'], J[s + 'Sh'], 0.092, 0.072, U); limb(s + 'Sh', J[s + 'Sh'], [sg * 0.095, 0.3, 0], 0.07, 0.065, U);
      on(s + 'Sh'); b.cyl('leather_dark', 0.074, 0.062, 0.3, sg * 0.095, 0.24, 0, { seg: 8 });
      on(s + 'Ft'); b.box('leather_dark', 0.1, 0.1, 0.27, sg * 0.095, 0.05, 0.05, { ch: 0.03 }); }
    on('gun'); const g = J.gun;
    if (kind === 's') { b.box('paint_grey', 0.04, 0.05, 0.34, g[0], g[1], g[2] + 0.2, { ch: 0.008, col: 0.5 }); b.cyl('paint_grey', 0.012, 0.012, 0.25, g[0], g[1] + 0.005, g[2] + 0.48, { rx: PI / 2, seg: 6, col: 0.5 });
      b.box('paint_grey', 0.026, 0.22, 0.04, g[0], g[1] - 0.13, g[2] + 0.3, { ch: 0.005, col: 0.45 }); b.box('leather_dark', 0.035, 0.1, 0.04, g[0], g[1] - 0.07, g[2] + 0.08, { ch: 0.008, rx: 0.3 }); b.box('paint_grey', 0.02, 0.02, 0.26, g[0], g[1] - 0.02, g[2] - 0.08, { ch: 0.004, col: 0.5 }); }
    else { b.box('walnut', 0.045, 0.1, 0.36, g[0], g[1] - 0.035, g[2] - 0.08, { ch: 0.015, rx: -0.14 }); b.box('walnut', 0.042, 0.055, 0.62, g[0], g[1] - 0.01, g[2] + 0.4, { ch: 0.012 });
      b.cyl('paint_grey', 0.011, 0.012, 0.66, g[0], g[1] + 0.022, g[2] + 0.55, { rx: PI / 2, seg: 6, col: 0.45 }); b.box('paint_grey', 0.03, 0.035, 0.2, g[0], g[1] + 0.03, g[2] + 0.12, { ch: 0.006, col: 0.5 }); b.cyl('paint_grey', 0.008, 0.008, 0.06, g[0] - 0.035, g[1] + 0.03, g[2] + 0.1, { rz: PI / 2, seg: 5, col: 0.6 }); }
    const geos = {};
    for (const mat in b.b) { const L = b.b[mat]; let n = 0; L.forEach((q) => { n += q.P.length / 3; });
      const geo = b.merged(mat, false), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); let o = 0;
      L.forEach((q) => { const c = q.P.length / 3; for (let i = 0; i < c; i++) { si[(o + i) * 4] = q.bone; sw[(o + i) * 4] = 1; } o += c; });
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 2.2); geos[mat] = geo; }
    return (rigs[kind] = geos);
  }
  function makeBody(kind) {
    const group = new THREE.Group(), bones = {}, list = [];
    NAMES.forEach((n) => { const bn = new THREE.Bone(); bn.name = n; bones[n] = bn; list.push(bn); });
    NAMES.forEach((n) => { const p = PARENT[n], j = J[n]; if (p) { bones[p].add(bones[n]); bones[n].position.set(j[0] - J[p][0], j[1] - J[p][1], j[2] - J[p][2]); } else { group.add(bones[n]); bones[n].position.set(j[0], j[1], j[2]); } });
    group.updateMatrixWorld(true); const sk = new THREE.Skeleton(list), geos = rig(kind);
    for (const mat in geos) { const m = new THREE.SkinnedMesh(geos[mat], MO.mat(mat)); m.castShadow = true; m.receiveShadow = true; m.bind(sk, new THREE.Matrix4()); m.frustumCulled = true; group.add(m); }
    return { group: group, b: bones };
  }

  const hit = {}, tmp = { x: 0, z: 0 };
  class Soldier {
    constructor(kind, x, z, o) {
      o = o || {}; this.kind = kind; this.x = x; this.z = z; this.h = o.face || 0; this.hp = kind === 's' ? 140 : 45; this.alive = true;
      this.state = o.state || (o.path ? 'patrol' : 'idle'); this.post = { x: x, z: z, face: o.face || 0 }; this.route = o.path || null; this.ri = 0; this.wait = o.lag || 0;
      this.aware = 0; this.seen = { x: 0, z: 0, t: -99 }; this.path = null; this.pi = 0; this.repath = 0; this.speed = 0; this.ph = Math.random() * 6; this.aim = 0; this.crouch = 0; this.wantCrouch = false;
      this.fireT = 1 + Math.random() * 1.5; this.burst = 0; this.tok = false; this.think = Math.random() * 0.2; this.strafeT = 2 + Math.random() * 3; this.flinch = 0; this.deadT = 0; this.fallDir = 1; this.los = false; this.first = true; this.shoutT = 0; this.searchT = 0; this.pitch = 0;
      const body = makeBody(kind); this.group = body.group; this.b = body.b; this.group.position.set(x, 0, z); this.group.rotation.y = this.h; MO.R.scene.add(this.group);
    }
    goTo(x, z) { this.path = MO.phys.path(this.x, this.z, x, z); this.pi = 0; this.repath = 0.8 + Math.random() * 0.5; }
    alert(x, z, hard) { if (!this.alive) return; this.seen.x = x; this.seen.z = z; this.seen.t = MO.time; if (hard || this.state === 'combat') { if (this.state !== 'combat') { this.state = 'combat'; this.first = true; this.fireT = 0.7 + Math.random() * 0.9; this.path = null; } } else if (this.state !== 'combat') { this.state = 'alert'; this.goTo(x, z); this.searchT = 9; } }
    hit(dmg, head, dx, dz) {
      if (!this.alive) return false; this.hp -= dmg; this.flinch = 1; const P = MO.player;
      if (this.hp <= 0) { this.alive = false; this.state = 'dead'; this.deadT = 0; this.fallDir = Math.random() < 0.5 ? 1 : -1; this.fallYaw = Math.atan2(dx, dz); if (this.tok) { this.tok = false; EN.tokens--; }
        EN.kills++; MO.audio && MO.audio.play('enemy_down', { x: this.x, y: 1, z: this.z, vol: 0.9 }); MO.emit('kill', this, head);
        if (Math.random() < 0.55) EN.drop(this.x, this.z); EN.shout(this.x, this.z, 22, P.pos.x, P.pos.z); return true; }
      this.alert(P.pos.x, P.pos.z, true); EN.shout(this.x, this.z, 26, P.pos.x, P.pos.z); return false;
    }
    update(dt) {
      const P = MO.player, b = this.b, px = P.pos.x, pz = P.pos.z, dx = px - this.x, dz = pz - this.z, d = Math.hypot(dx, dz);
      if (!this.alive) { this.deadT += dt; this.pose(dt, 0, d); return; }
      // --- senses, a few times a second
      this.think -= dt;
      if (this.think <= 0) { this.think = 0.14 + Math.random() * 0.06;
        const fx = Math.sin(this.h), fz = Math.cos(this.h), dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
        const range = (this.state === 'combat' ? 70 : 34) * (P.crouchK > 0.5 ? 0.62 : 1) * (1 + 0.5 * P.noise);
        this.los = P.alive && d < range && (dot > (this.state === 'combat' ? -0.3 : 0.25) || d < 2.5) && MO.phys.los(this.x, 1.55 - this.crouch * 0.5, this.z, px, P.pos.y + P.eye - 0.15, pz);
        if (this.los) { this.seen.x = px; this.seen.z = pz; this.seen.t = MO.time;
          if (this.state !== 'combat') { this.aware += (0.14 + 0.06) * (2.6 / Math.max(0.35, d / 9)) * (P.crouchK > 0.5 ? 0.55 : 1) * (1 + P.noise); if (this.aware >= 1) { this.alert(px, pz, true); EN.shout(this.x, this.z, 30, px, pz); MO.emit('spotted', this); } } }
        else if (this.state !== 'combat') this.aware = Math.max(0, this.aware - 0.05);
        if (this.state !== 'combat' && P.noise > 0.8 && d < 9 && P.alive) this.alert(px, pz, false);
      }
      // --- decide where to go
      let tx = this.x, tz = this.z, run = false, face = this.h, wantAim = false; this.wantCrouch = false;
      if (this.state === 'patrol') { if (this.wait > 0) this.wait -= dt; else { const w = this.route[this.ri]; if (Math.hypot(w[0] - this.x, w[1] - this.z) < 0.8) { this.ri = (this.ri + 1) % this.route.length; this.wait = 1.5 + Math.random() * 2; this.path = null; } else if (!this.path) this.goTo(w[0], w[1]); } }
      else if (this.state === 'alert') { this.searchT -= dt; if (this.searchT <= 0) { this.state = this.route ? 'patrol' : 'idle'; this.path = null; if (!this.route) this.goTo(this.post.x, this.post.z); this.aware = 0; } else if (!this.path && Math.hypot(this.seen.x - this.x, this.seen.z - this.z) > 2) this.goTo(this.seen.x, this.seen.z); }
      else if (this.state === 'combat') { run = true;
        const near = this.kind === 's' ? 7 : 13, far = this.kind === 's' ? 15 : 30;
        if (this.los) { wantAim = true; face = Math.atan2(dx, dz); this.strafeT -= dt;
          if (d > far) { this.repath -= dt; if (!this.path || this.repath <= 0) this.goTo(px, pz); }
          else if (d < near * 0.5 && this.kind !== 's') { if (!this.path) { const a = Math.atan2(-dx, -dz) + (Math.random() - 0.5); this.goTo(this.x + Math.sin(a) * 6, this.z + Math.cos(a) * 6); } }
          else if (this.strafeT <= 0) { this.strafeT = 2.5 + Math.random() * 3.5; const s = Math.random() < 0.5 ? 1 : -1, a = Math.atan2(dx, dz) + s * PI / 2, r = 2 + Math.random() * 4; const gx = this.x + Math.sin(a) * r, gz = this.z + Math.cos(a) * r; if (MO.phys.walkable(gx, gz)) this.goTo(gx, gz); this.crouchPick = Math.random() < 0.45; }
          else if (d <= far && this.path && this.pi >= this.path.length) this.path = null;
          this.wantCrouch = !!this.crouchPick && !this.path && d > 6; }
        else { this.repath -= dt; const ld = Math.hypot(this.seen.x - this.x, this.seen.z - this.z);
          if (MO.time - this.seen.t > 14 && ld < 4) { this.state = 'alert'; this.searchT = 7; this.path = null; this.aware = 0.5; }
          else if (!this.path || this.repath <= 0) this.goTo(this.seen.x + (Math.random() - 0.5) * 3, this.seen.z + (Math.random() - 0.5) * 3); } }
      else if (this.state === 'idle') { if (Math.hypot(this.post.x - this.x, this.post.z - this.z) < 0.9) { this.path = null; face = this.post.face + Math.sin(MO.time * 0.25 + this.ph) * 0.5; } else if (!this.path) this.goTo(this.post.x, this.post.z); }
      // --- walk the path
      let sp = 0;
      if (this.path && this.pi < this.path.length) { const w = this.path[this.pi]; tx = w.x; tz = w.z; const wd = Math.hypot(tx - this.x, tz - this.z); if (wd < 0.45) { this.pi++; } else { sp = run ? (this.kind === 's' ? 4.3 : 3.7) : 1.35; if (!wantAim) face = Math.atan2(tx - this.x, tz - this.z); else sp *= 0.75; } }
      else if (this.path) this.path = null;
      this.speed = MO.damp(this.speed, sp, 8, dt);
      if (this.speed > 0.05) { const wd = Math.hypot(tx - this.x, tz - this.z) || 1; let nx = this.x + (tx - this.x) / wd * this.speed * dt, nz = this.z + (tz - this.z) / wd * this.speed * dt;
        for (const o of EN.list) { if (o === this || !o.alive) continue; const ox = nx - o.x, oz = nz - o.z, od = Math.hypot(ox, oz); if (od < 0.7 && od > 1e-3) { nx += ox / od * (0.7 - od) * 0.5; nz += oz / od * (0.7 - od) * 0.5; } }
        MO.phys.move(tmp, nx, 0, nz, 0.3, 1.7); this.x = tmp.x; this.z = tmp.z; this.ph += this.speed * dt * (run ? 2.3 : 3.0); }
      this.h += MO.angDiff(this.h, face) * Math.min(1, dt * (wantAim ? 9 : 5));
      this.aim = MO.damp(this.aim, wantAim ? 1 : 0, 7, dt); this.crouch = MO.damp(this.crouch, this.wantCrouch ? 1 : 0, 7, dt);
      this.pitch = MO.damp(this.pitch, wantAim ? Math.atan2((P.pos.y + P.eye - 0.3) - (1.4 - this.crouch * 0.45), Math.max(1, d)) : 0, 8, dt);
      // --- shoot
      if (this.state === 'combat' && this.los && this.aim > 0.8 && P.alive) { this.fireT -= dt;
        if (this.fireT <= 0) { if (!this.tok && EN.tokens < 3) { this.tok = true; EN.tokens++; this.burst = this.kind === 's' ? 4 : 1; }
          if (this.tok) { this.shoot(d); this.burst--; if (this.burst > 0) this.fireT = 0.115; else { this.tok = false; EN.tokens--; this.fireT = this.kind === 's' ? 1.1 + Math.random() * 1.2 : 1.9 + Math.random() * 1.3; } }
          else this.fireT = 0.25; } }
      else if (this.tok) { this.tok = false; EN.tokens--; }
      this.flinch = Math.max(0, this.flinch - dt * 4);
      this.pose(dt, sp, d);
    }
    shoot(d) {
      const P = MO.player, A = MO.audio, my = 1.42 - this.crouch * 0.45, mx = this.x + Math.sin(this.h) * 0.7, mz = this.z + Math.cos(this.h) * 0.7;
      let p = MO.clamp(0.78 - d * 0.013, 0.14, 0.72) * (P.speed > 4.5 ? 0.55 : 1) * (P.crouchK > 0.5 ? 0.8 : 1) * (this.first ? 0.35 : 1) * (this.kind === 's' ? 0.55 : 1) * (MO.diffK || 1); this.first = false;
      const ty = P.pos.y + P.eye - 0.35; let hx = P.pos.x, hy = ty, hz = P.pos.z; const good = Math.random() < p;
      if (!good) { const a = Math.random() * 6.28, r = 0.6 + Math.random() * 1.6; hx += Math.cos(a) * r; hy += (Math.random() - 0.4) * 1.3; hz += Math.sin(a) * r; }
      let dx = hx - mx, dy = hy - my, dz = hz - mz; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      if (good) { MO.fx.tracer(mx, my, mz, hx, hy, hz, false); P.damage(this.kind === 's' ? 7 : 17, this.x, this.z); }
      else { const far = MO.phys.ray(mx, my, mz, dx, dy, dz, 120, hit, true) ? hit.t : 120; MO.fx.tracer(mx, my, mz, mx + dx * far, my + dy * far, mz + dz * far, false);
        if (far < 120) { const tag = hit.box ? hit.box.tag : MO.ground.at(hit.x, hit.z).kind; MO.fx.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, tag); A && A.play(tag === 'metal' ? 'hit_metal' : tag === 'wood' ? 'hit_wood' : tag === 'stone' ? 'hit_stone' : 'hit_dirt', { x: hit.x, y: hit.y, z: hit.z, vol: 0.6 }); }
        if (far > l - 1) A && A.play('whiz', { x: hx, y: hy, z: hz, vol: 0.8 }); }
      A && A.play(this.kind === 's' ? 'shot_smg_enemy' : 'shot_enemy', { x: mx, y: my, z: mz, vol: 1 });
      MO.fx.light(mx, my, mz, [1, 0.62, 0.3], 7, 14, 0.07); MO.fx.add.add({ x: mx + dx * 0.25, y: my + dy * 0.25, z: mz + dz * 0.25, life: 0.05, size: 0.45, r: 6, g: 3.4, b: 1.2, a: 1 }); this.flinch = 0.35;
    }
    pose(dt, sp, d) {
      const b = this.b, g = this.group; g.position.set(this.x, 0, this.z); g.rotation.set(0, this.h, 0);
      if (!this.alive) {        // fall: tip over backward (or to a side), limbs let go, then lie still
        const t = MO.sat(this.deadT / 0.75), e = 1 - Math.pow(1 - t, 2.2), s = this.fallDir;
        g.rotation.set(0, this.fallYaw + PI, 0); b.hips.rotation.set(-1.52 * e, 0, s * 0.25 * e); b.hips.position.set(0, MO.lerp(0.98, 0.17, e), -0.5 * e);
        b.spine.rotation.set(0.15 * e, 0, s * 0.1 * e); b.chest.rotation.set(0.1 * e, s * 0.2 * e, 0); b.head.rotation.set(0.25 * e, s * 0.5 * e, 0);
        b.lUp.rotation.set(-0.5 * e, 0, 1.1 * e); b.rUp.rotation.set(-0.3 * e, 0, -0.8 * e); b.lFo.rotation.set(-0.5 * e, 0, 0); b.rFo.rotation.set(-0.9 * e, 0, 0);
        b.lTh.rotation.set(0.25 * e, 0, 0.12 * e); b.rTh.rotation.set(-0.45 * e * s, 0, -0.15 * e); b.lSh.rotation.set(0.2 * e, 0, 0); b.rSh.rotation.set(0.75 * e, 0, 0); b.gun.rotation.set(1.3 * e, 0.6 * e, 0.4 * e); b.gun.position.y = J.gun[1] - J.chest[1] - 0.2 * e;
        return; }
      const A = MO.sat(this.speed / 3.6), run = A, ph = this.ph, sw = Math.sin(ph), cw = Math.cos(ph), amp = 0.28 + 0.5 * A, moving = MO.sat(this.speed / 0.6), c = this.crouch, aim = this.aim, f = this.flinch;
      b.hips.position.set(0, 0.98 - c * 0.42 + Math.abs(sw) * 0.035 * moving - 0.02 * moving, 0); b.hips.rotation.set(0.05 + 0.12 * run + f * -0.12, sw * 0.08 * moving, 0);
      b.spine.rotation.set(0.06 * run + c * 0.3 + aim * 0.06, -sw * 0.1 * moving, 0); b.chest.rotation.set(0.05 + aim * 0.05 - f * 0.2 + c * 0.1, aim * -0.42, 0);
      b.head.rotation.set(-c * 0.3 - 0.08 * run + aim * 0.02, aim * 0.36 + Math.sin(MO.time * 0.6 + this.ph) * 0.12 * (1 - aim) * (1 - moving), aim * -0.12);
      const leg = (th, sh, ft, s) => { const k = s * sw, lift = Math.max(0, -s * cw); th.rotation.set(-k * amp * moving - c * 1.25 + (s > 0 ? 0 : c * 0.5), 0, 0); sh.rotation.set(lift * (0.6 + 0.9 * A) * moving + Math.max(0, k) * 0.3 * moving + c * (s > 0 ? 1.9 : 2.3), 0, 0); ft.rotation.set(-c * (s > 0 ? 0.6 : -0.4) - Math.max(0, -k) * 0.3 * moving, 0, 0); };
      leg(b.lTh, b.lSh, b.lFt, 1); leg(b.rTh, b.rSh, b.rFt, -1);
      // arms: low ready on the move, rifle to the shoulder when aiming
      const L = MO.lerp;
      b.rUp.rotation.set(L(-0.35 - sw * 0.1 * moving, -1.05, aim), 0, L(-0.18, -0.35, aim)); b.rFo.rotation.set(L(-1.25, -1.35, aim), L(0.5, 0.75, aim), 0);
      b.lUp.rotation.set(L(-0.75 + sw * 0.08 * moving, -1.25, aim), 0, L(0.35, 0.72, aim)); b.lFo.rotation.set(L(-0.85, -0.42, aim), L(-0.9, -0.55, aim), 0);
      b.gun.position.set(J.gun[0] - J.chest[0] + L(0.1, 0.0, aim), J.gun[1] - J.chest[1] + L(-0.2, 0.05, aim), J.gun[2] - J.chest[2] + L(0.02, 0, aim));
      b.gun.rotation.set(L(0.55, -this.pitch - 0.1, aim) - f * 0.25, L(0.75, 0.42, aim), L(0.2, 0, aim));
    }
    remove() { MO.R.scene.remove(this.group); }
  }

  EN.spawn = (kind, x, z, o) => { const s = new Soldier(kind, x, z, o); EN.list.push(s); return s; };
  EN.clear = () => { EN.list.forEach((s) => s.remove()); EN.list.length = 0; EN.tokens = 0; EN.queue.length = 0; EN.kills = 0; EN.alerted = false; drops.forEach((d) => { d.mesh.visible = false; d.on = false; }); };
  EN.alive = () => { let n = 0; for (const s of EN.list) if (s.alive) n++; return n; };
  /* a shout: soldiers within r of x,z learn where the player was */
  EN.shout = (x, z, r, px, pz) => { for (const s of EN.list) if (s.alive && s.state !== 'combat' && Math.hypot(s.x - x, s.z - z) < r) { s.seen.x = px; s.seen.z = pz; s.seen.t = MO.time; s.think = 0.3 + Math.random() * 0.9; s.state = 'combat'; s.first = true; s.fireT = 1 + Math.random(); s.path = null; } EN.alerted = true; };
  MO.on('shot', (x, z) => { for (const s of EN.list) if (s.alive && s.state !== 'combat') { const d = Math.hypot(s.x - x, s.z - z); if (d < 55) s.alert(x + (Math.random() - 0.5) * 6, z + (Math.random() - 0.5) * 6, d < 22); } });
  /* reinforcements: come in from the gates that are far from the player and out of sight */
  EN.wave = (rifles, smgs) => { for (let i = 0; i < rifles; i++) EN.queue.push('r'); for (let i = 0; i < smgs; i++) EN.queue.push('s'); };
  let spawnT = 0;
  function feed(dt) {
    spawnT -= dt; if (!EN.queue.length || spawnT > 0 || (EN.inCombat || 0) >= 8 || EN.alive() >= 16) return; spawnT = 0.9;
    const P = MO.player, gs = MO.level.gates.filter((g) => Math.hypot(g.x - P.pos.x, g.z - P.pos.z) > 38).sort((a, c) => Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(c.x - P.pos.x, c.z - P.pos.z));
    const g = gs[Math.min(gs.length - 1, (Math.random() * 2) | 0)]; if (!g) return;
    const s = EN.spawn(EN.queue.shift(), g.x + (Math.random() - 0.5) * 3, g.z + (Math.random() - 0.5) * 3, { state: 'combat' }); s.seen.x = P.pos.x; s.seen.z = P.pos.z; s.seen.t = MO.time;
  }
  function segRay(ox, oy, oz, dx, dy, dz, x, y0, y1, z, r, max) {       // ray against an upright capsule; returns distance or -1
    const wx = ox - x, wz = oz - z, a = dx * dx + dz * dz; let t;
    if (a < 1e-6) { if (wx * wx + wz * wz > r * r) return -1; t = dy > 0 ? (y0 - oy) / dy : (y1 - oy) / dy; return t > 0 && t < max ? t : -1; }
    const bq = wx * dx + wz * dz, c = wx * wx + wz * wz - r * r, disc = bq * bq - a * c; if (disc < 0) return -1; t = (-bq - Math.sqrt(disc)) / a; if (t < 0 || t > max) return -1;
    const y = oy + dy * t; if (y < y0 - r * 0.5 || y > y1 + r * 0.5) return -1; return t;
  }
  const res = { e: null, t: 0, head: false };
  EN.rayHit = (ox, oy, oz, dx, dy, dz, max) => {
    let best = max, be = null, head = false;
    for (const s of EN.list) { if (!s.alive) continue; const ex = s.x - ox, ez = s.z - oz; if (ex * dx + ez * dz < -1) continue;
      const k = 1 - s.crouch * 0.3, hy = 1.66 * k - s.crouch * 0.1;
      let t = segRay(ox, oy, oz, dx, dy, dz, s.x, 0.1, 1.42 * k, s.z, 0.25, best); if (t >= 0) { best = t; be = s; head = false; }
      const cx = s.x - ox, cy = hy - oy, cz = s.z - oz, tc = cx * dx + cy * dy + cz * dz; if (tc > 0 && tc < best + 0.3) { const px = cx - dx * tc, py = cy - dy * tc, pz = cz - dz * tc, d2 = px * px + py * py + pz * pz; if (d2 < 0.0256) { const th = tc - Math.sqrt(0.0256 - d2); if (th < best + 0.25) { best = Math.min(best, th); be = s; head = true; } } } }
    if (!be) return null; res.e = be; res.t = best; res.head = head; return res;
  };
  // ammunition pouches left by the fallen
  const drops = [];
  EN.drop = (x, z) => { let d = drops.find((q) => !q.on);
    if (!d) { if (drops.length >= 8) return; const b = new MO.Builder(); b.box('canvas', 0.2, 0.12, 0.13, 0, 0.07, 0, { ch: 0.03 }); b.box('leather_dark', 0.21, 0.03, 0.14, 0, 0.1, 0, { ch: 0.006 }); b.box('brass', 0.03, 0.03, 0.02, 0, 0.1, 0.07, { ch: 0.005 });
      const g = new THREE.Group(); b.build(g, { ao: false, dynamic: true }); MO.R.scene.add(g); d = { mesh: g, on: false, x: 0, z: 0 }; drops.push(d); }
    d.on = true; d.x = x + (Math.random() - 0.5); d.z = z + (Math.random() - 0.5); d.mesh.position.set(d.x, 0, d.z); d.mesh.rotation.y = Math.random() * 6; d.mesh.visible = true; };
  EN.update = (dt) => {
    for (const s of EN.list) s.update(dt);
    feed(dt);
    let dead = 0; for (let i = EN.list.length - 1; i >= 0; i--) { const s = EN.list[i]; if (!s.alive && s.deadT > 2) { dead++; if (dead > 7 || s.deadT > 60) { s.remove(); EN.list.splice(i, 1); } } }
    const P = MO.player; for (const d of drops) if (d.on && Math.hypot(d.x - P.pos.x, d.z - P.pos.z) < 1.1 && MO.weapon.reserve < 210) { d.on = false; d.mesh.visible = false; MO.weapon.addAmmo(20); MO.audio && MO.audio.play('mag_in', { vol: 0.5, pitch: 1.3 }); MO.emit('msg', MO.T('+20 rounds')); }
    let c = 0; for (const s of EN.list) if (s.alive && s.state === 'combat') c++; EN.inCombat = c;
  };
})();
