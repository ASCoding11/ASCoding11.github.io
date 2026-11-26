/* Leaf Sweep: what you see of yourself. Rounded gloves on olive sleeves: open hands and the sack for gathering, a
   fist on the blower's handle, and two fists that grip the rake's handle. The gloves, sack and blower are drawn in a
   small scene of their own on top of the garden (so they never poke through a wall); the rake, the two fists on it
   and their forearms are real objects in the garden, because the rake's head is out on the ground where the leaves
   are. Upgrades change these models: the sack swells, the rake head widens, the blower's pipe grows.
   Also here: the ring that shows the hands' reach, the wind streaks in the blower's stream, the finder's light
   beams and the bouncing marker over a bin. */
(function () {
  'use strict';
  var WR = window.WR, Builder = WR.Builder, lin = WR.lin;
  var TAN = '#e2be88', TAN2 = '#cfa56c', CUFF = '#c4552d', SLEEVE = '#5f7350';
  // a tube along +z, from z to z + len
  function tube(b, x, y, z, r0, r1, len, color, seg) { var g = new THREE.CylinderGeometry(r1, r0, len, seg || 12); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2); b.add(g, color, x, y, z); }
  function openGlove(side) {
    var b = new Builder();
    b.ball(0, 0, 0, .046, .021, .056, TAN);
    for (var f = 0; f < 4; f++) b.ball(-.031 + f * .0205, -.004 - Math.abs(f - 1.5) * .003, -.074 - (f === 1 || f === 2 ? .006 : 0), .0105, .011, .034, f % 2 ? TAN2 : TAN, 8);
    b.ball(side * -.052, -.002, -.022, .012, .012, .031, TAN2, 8);
    tube(b, 0, 0, .04, .04, .042, .035, CUFF); tube(b, 0, -.004, .07, .036, .046, .4, SLEEVE);
    return b.mesh();
  }
  function fist(side) {
    var b = new Builder();
    b.ball(0, 0, 0, .042, .046, .05, TAN); b.ball(0, -.03, -.004, .04, .03, .046, TAN2); b.ball(side * -.03, .012, -.03, .014, .014, .03, TAN2, 8);
    tube(b, 0, 0, .035, .043, .046, .04, CUFF);
    return b.mesh();
  }
  WR.buildViewModels = function (scene, state) {
    var vm = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(58, 1, 0.02, 5) };
    vm.scene.add(new THREE.HemisphereLight(lin('#cfe0f2'), lin('#a08a66'), 0.7)); var d = new THREE.DirectionalLight(lin('#ffe6c0'), 0.9); d.position.set(-1.2, 1.6, 1.4); vm.scene.add(d);

    // open hands and the sack
    var hands = vm.hands = new THREE.Group();
    var rh = vm.rh = openGlove(1); rh.position.set(.17, -.2, -.5); rh.rotation.set(.78, .42, -.2); hands.add(rh);
    var sack = vm.sack = new THREE.Group(), sb = new Builder();
    sb.ball(0, 0, 0, .15, .17, .15, '#b99a66', 12); sb.ball(0, -.06, 0, .16, .12, .16, '#a98a58', 12); sb.cyl(0, .17, 0, .085, .11, .07, '#8f7447', 12); sb.cyl(0, .15, 0, .1, .1, .018, '#6b5230', 12); sb.cyl(0, .207, 0, .078, .078, .006, '#3a2a18', 12);
    sack.add(sb.mesh()); sack.position.set(-.28, -.4, -.56); hands.add(sack);
    var fb = new Builder(); fb.ball(0, 0, 0, .085, .05, .085, '#c8822c', 9); fb.ball(.03, .02, -.02, .05, .035, .05, '#d9a23a', 8); fb.ball(-.035, .015, .02, .045, .03, .045, '#b8552a', 8);
    var fill = vm.sackFill = fb.mesh(); fill.position.set(0, .2, 0); sack.add(fill);
    var lh = fist(-1); lh.position.set(.1, .2, .0); lh.rotation.set(.3, .2, 1.2); sack.add(lh);
    var la = new Builder(); tube(la, 0, 0, 0, .036, .046, .4, SLEEVE); var lArm = la.mesh(); lArm.position.set(.13, .2, .03); lArm.rotation.set(.75, .35, 0); sack.add(lArm);
    vm.scene.add(hands);

    // blower, with a fist on its handle
    var blower = vm.blower = new THREE.Group(), bb = new Builder();
    bb.ball(0, 0, .06, .085, .092, .15, '#e37a2c', 12); bb.ball(0, .0, .17, .07, .075, .06, '#2f2f33', 10); bb.cyl(.084, 0, .06, .05, .05, .02, '#3b3b40', 12);
    bb.box(0, .135, .05, .028, .028, .2, '#2f2f33'); bb.box(0, .1, -.04, .028, .08, .028, '#2f2f33'); bb.box(0, .1, .14, .028, .08, .028, '#2f2f33'); bb.ball(0, -.01, -.06, .058, .058, .05, '#c9651f', 10);
    var body = bb.mesh(); blower.add(body);
    var pipe = vm.pipe = new THREE.Mesh(new THREE.CylinderGeometry(.034, .05, 1, 12), new THREE.MeshLambertMaterial({ color: lin('#3b3b40') })); pipe.geometry.rotateX(-Math.PI / 2); pipe.geometry.translate(0, 0, -.5); pipe.position.set(0, -.02, -.07); blower.add(pipe);
    var tip = vm.tip = new THREE.Mesh(new THREE.CylinderGeometry(.045, .038, .05, 12), new THREE.MeshLambertMaterial({ color: lin('#e0b53a') })); tip.geometry.rotateX(-Math.PI / 2); blower.add(tip);
    var bf = fist(1); bf.position.set(0, .15, .05); bf.rotation.set(0, 0, -.2); bf.scale.setScalar(.8); blower.add(bf);
    var ba = new Builder(); tube(ba, 0, 0, 0, .036, .048, .42, SLEEVE); var bArm = ba.mesh(); bArm.position.set(.005, .15, .085); bArm.rotation.set(.5, .3, 0); bArm.scale.set(.85, .85, 1); blower.add(bArm);
    blower.position.set(.2, -.27, -.52); blower.rotation.set(-.1, .2, 0); vm.scene.add(blower);
    // a faint cone of moving air in the garden, and streaks that run along it
    var airG = new THREE.ConeGeometry(1, 1, 14, 1, true); airG.translate(0, -.5, 0); airG.rotateX(-Math.PI / 2);
    var air = vm.air = new THREE.Mesh(airG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false, fog: false })); air.visible = false; scene.add(air);
    var sg = new THREE.PlaneGeometry(.03, 1); sg.rotateX(-Math.PI / 2); var streaks = [], tmpV = new THREE.Vector3();
    for (var i = 0; i < 14; i++) { var sm = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); sm.visible = false; scene.add(sm); streaks.push({ m: sm, t: Math.random(), a: 0, b: 0, v: 1 }); }
    // called every frame: `on` = the blower is running; origin, direction, reach and half-angle of its cone
    vm.wind = function (dt, on, ox, oy, oz, dx, dy, dz, range, half) {
      for (var k = 0; k < streaks.length; k++) {
        var s = streaks[k]; if (!on) { s.m.visible = false; continue; }
        s.t += dt * s.v; if (s.t >= 1 || !s.m.visible) { s.t = s.m.visible ? 0 : Math.random() * .8; s.a = (Math.random() * 2 - 1) * half * .8; s.b = (Math.random() * 2 - 1) * half * .35; s.v = 1.6 + Math.random() * 1.4; s.m.visible = true; }
        var ca = Math.cos(s.a), sa = Math.sin(s.a), rx = dx * ca - dz * sa, rz = dx * sa + dz * ca, ry = dy + s.b, dist = 0.5 + s.t * (range - 0.8);
        s.m.position.set(ox + rx * dist, Math.max(.08, oy + ry * dist), oz + rz * dist); tmpV.set(ox + rx * (dist + 1), Math.max(.08, oy + ry * (dist + 1)), oz + rz * (dist + 1)); s.m.lookAt(tmpV);
        s.m.scale.set(1 + s.t * 2, 1, .5 + s.t * 1.1); s.m.material.opacity = Math.sin(Math.PI * s.t) * .3;
      }
    };

    // rake (in the garden itself): head, handle, two fists on the handle and their forearms
    var rake = vm.rake = new THREE.Group(); rake.visible = false; scene.add(rake);
    var handle = vm.handle = new THREE.Mesh(new THREE.CylinderGeometry(.017, .02, 1, 8), new THREE.MeshLambertMaterial({ color: lin('#b98a4e') })); handle.geometry.rotateX(Math.PI / 2); handle.geometry.translate(0, 0, .5); scene.add(handle); handle.visible = false;
    vm.grip = [];
    [1, -1].forEach(function (side) { var f = fist(side); f.visible = false; scene.add(f); var ab = new Builder(); tube(ab, 0, 0, 0, .036, .046, 1, SLEEVE); var arm = ab.mesh(); arm.visible = false; scene.add(arm); vm.grip.push({ fist: f, arm: arm, side: side }); });
    var headMesh = null;
    vm.setRakeWidth = function (w, gold) {
      if (headMesh) { rake.remove(headMesh); headMesh.geometry.dispose(); }
      var b = new Builder(), n = Math.round(w / .1), metal = gold ? '#e0b53a' : '#6f7479';
      b.box(0, .13, 0, w, .035, .05, metal); for (var i = 0; i <= n; i++) b.box(-w / 2 + i * w / n, .06, .02, .014, .13, .014, gold ? '#f0cf6a' : '#8a9096'); b.box(0, .16, -.05, .05, .05, .14, '#b98a4e');
      headMesh = b.mesh(); rake.add(headMesh);
    };
    // place the handle between the hands' end (a) and the head (b), and the fists and forearms along it
    var q1 = new THREE.Vector3(), q2 = new THREE.Vector3(), up = new THREE.Vector3();
    vm.poseRake = function (a, b, eye, rx, rz, show) {
      handle.visible = rake.visible = show; vm.grip.forEach(function (G) { G.fist.visible = G.arm.visible = show; }); if (!show) return;
      handle.position.copy(a); handle.lookAt(b); handle.scale.z = a.distanceTo(b);
      vm.grip.forEach(function (G, n) {
        q1.copy(a).lerp(b, (n ? 0.5 : 0.08) / Math.max(1, a.distanceTo(b))); G.fist.position.copy(q1); G.fist.quaternion.copy(handle.quaternion); G.fist.rotateZ(G.side * 1.2); G.fist.rotateX(-1.2);
        q2.set(eye.x + rx * (n ? -0.24 : 0.3), eye.y - 0.52, eye.z + rz * (n ? -0.24 : 0.3)); G.arm.position.copy(q1); G.arm.lookAt(q2); G.arm.scale.z = q1.distanceTo(q2);
      });
    };
    // the ring that shows where the hands reach
    var ring = vm.ring = new THREE.Mesh(new THREE.RingGeometry(.955, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, depthWrite: false, fog: false })); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
    // finder beacons
    vm.beacons = []; var bg = new THREE.CylinderGeometry(.05, .05, 7, 6, 1, true); bg.translate(0, 3.5, 0); var bm = new THREE.MeshBasicMaterial({ color: lin('#ffe27a'), transparent: true, opacity: .5, depthWrite: false, fog: false });
    for (i = 0; i < 8; i++) { var be = new THREE.Mesh(bg, bm); be.visible = false; scene.add(be); vm.beacons.push(be); }
    // a bouncing arrow over the bin a new player should go to
    var mk = vm.marker = new THREE.Group(), mm = new THREE.MeshBasicMaterial({ color: lin('#ffd24a'), fog: false });
    var cone = new THREE.Mesh(new THREE.ConeGeometry(.22, .42, 14), mm); cone.rotation.x = Math.PI; mk.add(cone); var stem = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .34, 10), mm); stem.position.y = .36; mk.add(stem);
    mk.visible = false; scene.add(mk);

    vm.refresh = function () {
      var up2 = state.up, fill2 = Math.min(1, state.bagFill / WR.sackCap(state));
      var s = 1 + up2.sack * 0.11; sack.scale.set(s * (0.82 + fill2 * .3), s * (0.76 + fill2 * .36), s * (0.82 + fill2 * .3));
      vm.sackFill.visible = fill2 > 0.02; vm.sackFill.scale.setScalar(0.6 + fill2 * 0.7);
      var len = 0.42 + up2.nozzle * 0.11; pipe.scale.set(1 + up2.nozzle * .08, 1 + up2.nozzle * .08, len); tip.position.set(0, -.02, -.07 - len);
      vm.setRakeWidth(WR.rakeWidth(state), state.rewards.crown);
    };
    vm.refresh();
    return vm;
  };
})();
