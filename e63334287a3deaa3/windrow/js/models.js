/* Windrow: what you see of yourself. The gloves, sack and blower are drawn in a small scene of their own on top of
   the garden (so they never poke through a wall); the rake is a real object in the garden, because its head is out
   on the ground where the leaves are. Upgrades change these models: the sack swells, the rake head widens, the
   blower's pipe grows. */
(function () {
  'use strict';
  var WR = window.WR, Builder = WR.Builder;
  WR.buildViewModels = function (scene, state) {
    var vm = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(58, 1, 0.02, 5) };
    vm.scene.add(new THREE.HemisphereLight(0xdfe8ee, 0x8a7a5a, 0.75)); var d = new THREE.DirectionalLight(0xffe6c0, 0.7); d.position.set(-1, 2, 1.5); vm.scene.add(d);

    // hands and sack
    var hands = vm.hands = new THREE.Group();
    function glove(side) { var b = new Builder(); b.blob(0, 0, 0, .075, '#d8b27c', .8, 5); b.box(0, -.01, .1, .1, .09, .1, '#c4552d'); b.box(side * -.06, .0, -.03, .04, .04, .08, '#d8b27c'); b.cyl(0, -.01, .22, .045, .05, .16, "#6b7a55", 8); var m = b.mesh(); return m; }
    var rh = vm.rh = glove(1); rh.position.set(.25, -.24, -.5); rh.rotation.set(-.3, .25, -.2); rh.scale.setScalar(.8); hands.add(rh);
    var lh = glove(-1); lh.position.set(-.27, -.27, -.5); lh.rotation.set(-.2, -.3, .2); lh.scale.setScalar(.8); hands.add(lh);
    var sackB = new Builder(); sackB.blob(0, 0, 0, .16, '#b99a66', 1.15, 9); sackB.cyl(0, .17, 0, .1, .12, .06, '#8f7447', 10); sackB.cyl(0, .2, 0, .085, .085, .01, '#3a2a18', 10);
    var sack = vm.sack = sackB.mesh(); sack.position.set(-.33, -.46, -.6); hands.add(sack);
    var fillB = new Builder(); fillB.blob(0, 0, 0, .09, '#c8822c', .6, 21); var fill = vm.sackFill = fillB.mesh(); fill.position.set(0, .2, 0); sack.add(fill);
    vm.scene.add(hands);

    // blower
    var blower = vm.blower = new THREE.Group(), bb = new Builder();
    bb.box(0, 0, .05, .15, .17, .26, '#e0782a'); bb.box(0, .12, .05, .04, .05, .2, '#2f2f33'); bb.box(0, .0, .2, .13, .13, .06, '#2f2f33'); bb.cyl(.08, 0, .05, .06, .06, .02, '#3b3b40', 10);
    var body = bb.mesh(); blower.add(body);
    var pipe = vm.pipe = new THREE.Mesh(new THREE.CylinderGeometry(.036, .05, 1, 10), new THREE.MeshLambertMaterial({ color: 0x3b3b40 })); pipe.geometry.rotateX(-Math.PI / 2); pipe.geometry.translate(0, 0, -.5); pipe.position.set(0, -.02, -.07); blower.add(pipe);
    var tip = vm.tip = new THREE.Mesh(new THREE.CylinderGeometry(.045, .04, .05, 10), new THREE.MeshLambertMaterial({ color: 0xe0b53a })); tip.geometry.rotateX(-Math.PI / 2); blower.add(tip);
    blower.position.set(.3, -.3, -.42); blower.rotation.set(-.12, .16, 0); vm.scene.add(blower);
    // a faint cone of moving air in the garden, so you can see where the blower reaches
    var airG = new THREE.ConeGeometry(1, 1, 14, 1, true); airG.translate(0, -.5, 0); airG.rotateX(-Math.PI / 2);
    var air = vm.air = new THREE.Mesh(airG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false, fog: false })); air.visible = false; scene.add(air);

    // rake (in the garden itself)
    var rake = vm.rake = new THREE.Group(); rake.visible = false; scene.add(rake);
    var handle = vm.handle = new THREE.Mesh(new THREE.CylinderGeometry(.017, .02, 1, 7), new THREE.MeshLambertMaterial({ color: 0xb98a4e })); handle.geometry.rotateX(Math.PI / 2); handle.geometry.translate(0, 0, .5); scene.add(handle); handle.visible = false;
    var headMesh = null;
    vm.setRakeWidth = function (w, gold) {
      if (headMesh) { rake.remove(headMesh); headMesh.geometry.dispose(); }
      var b = new Builder(), n = Math.round(w / .1), metal = gold ? '#e0b53a' : '#6f7479';
      b.box(0, .13, 0, w, .035, .05, metal); for (var i = 0; i <= n; i++) b.box(-w / 2 + i * w / n, .06, .02, .014, .13, .014, gold ? '#f0cf6a' : '#8a9096'); b.box(0, .16, -.05, .05, .05, .14, '#b98a4e');
      headMesh = b.mesh(); headMesh.castShadow = false; rake.add(headMesh);
    };
    // the ring that shows where the hands reach
    var ring = vm.ring = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false, fog: false })); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
    // finder beacons
    vm.beacons = []; var bg = new THREE.CylinderGeometry(.05, .05, 7, 6, 1, true); bg.translate(0, 3.5, 0); var bm = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: .5, depthWrite: false, fog: false });
    for (var i = 0; i < 8; i++) { var be = new THREE.Mesh(bg, bm); be.visible = false; scene.add(be); vm.beacons.push(be); }

    vm.refresh = function () {
      var up = state.up, fill = Math.min(1, state.bagFill / WR.sackCap(state));
      var s = 1 + up.sack * 0.13; sack.scale.set(s * (0.8 + fill * .35), s * (0.75 + fill * .4), s * (0.8 + fill * .35));
      vm.sackFill.visible = fill > 0.02; vm.sackFill.scale.setScalar(0.6 + fill * 0.7);
      var len = 0.42 + up.nozzle * 0.11; pipe.scale.set(1 + up.nozzle * .08, 1 + up.nozzle * .08, len); tip.position.set(0, -.02, -.07 - len);
      body.material.color.setHex([0xffffff, 0xfff0d0, 0xffd9a0, 0xffc070][up.power] || 0xffffff);
      vm.setRakeWidth(WR.rakeWidth(state), state.rewards.crown);
    };
    vm.refresh();
    return vm;
  };
})();
