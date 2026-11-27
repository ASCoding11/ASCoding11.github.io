/* Midnight Ops: the wet ground. One flat plane. A mask painted on the CPU (512 x 512 over the level) says, per
   point: how low the ground is (hollows and wheel ruts fill with water), how much is mud instead of cobbles, how
   much is grass. The shader blends cobble, mud and grass by that mask and by the textures' own heights (mud sits in
   the gaps first), then derives every wet state from one water depth: damp, soaked, standing water. Standing water
   is a mirror: the scene is drawn a second time from below the ground (a planar reflection) and blurred by
   roughness. Rain rings spread on the puddles. The same mask answers "what am I standing on" for footsteps. */
(function () {
  'use strict';
  const MO = window.MO, G = MO.ground = {};
  const N = 512, SIZE = 200;
  G.size = SIZE;
  G.build = (paint) => {
    const R = MO.R, data = G.data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / N * SIZE - SIZE / 2, z = (j + 0.5) / N * SIZE - SIZE / 2, p = paint(x, z), o = (j * N + i) * 4;
      data[o] = MO.clamp(p[0], 0, 1) * 255; data[o + 1] = MO.clamp(p[1], 0, 1) * 255; data[o + 2] = MO.clamp(p[2], 0, 1) * 255; data[o + 3] = 255;
    }
    const mask = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); mask.magFilter = THREE.LinearFilter; mask.minFilter = THREE.LinearFilter; mask.needsUpdate = true;
    const cob = MO.bake('cobble'), mud = MO.bake('mud'), grs = MO.bake('grass');
    const planar = R.Q.planar > 0;
    const U = G.u = { tMask: { value: mask }, tMudA: { value: mud.map }, tMudO: { value: mud.orm }, tMudN: { value: mud.normal }, tGrassA: { value: grs.map },
      tRefl: { value: null }, uReflM: { value: new THREE.Matrix4() }, uGSize: { value: SIZE }, uTime: MO.shared.uTime, uPlanar: { value: planar ? 1 : 0 } };
    const m = new THREE.MeshStandardMaterial({ map: cob.map, normalMap: cob.normal, roughnessMap: cob.orm, roughness: 1, metalness: 0 });
    MO.patchStd(m, { wet: 0, key: 'ground', uniforms: U,
      fpars: `uniform sampler2D tMask, tMudA, tMudO, tMudN, tGrassA, tRefl; uniform mat4 uReflM; uniform float uGSize, uTime, uPlanar; vec3 gNts; float gPud;
        float gh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        vec2 ripple(vec2 p, float t){ vec2 acc = vec2(0.0);
          for (int l = 0; l < 3; l++) { float sc = l == 0 ? 2.1 : (l == 1 ? 3.7 : 6.3); vec2 q = p * sc + float(l) * 13.1, c = floor(q), f = fract(q) - 0.5;
            float h = gh(c), ph = fract(t * (0.8 + 0.5 * h) + h * 7.0); vec2 o = (vec2(gh(c + 1.3), gh(c + 2.7)) - 0.5) * 0.5, d = f - o; float r = length(d);
            float ring = sin((r - ph * 0.42) * 44.0) * smoothstep(0.07, 0.0, abs(r - ph * 0.42)) * (1.0 - ph) * (1.0 - ph); acc += d / (r + 1e-4) * ring; }
          return acc; }`,
      fnormal: `{ vec2 g = vWP.xz; vec4 mk = texture2D(tMask, g / uGSize + 0.5);
        float edge = smoothstep(uGSize * 0.5, uGSize * 0.46, max(abs(g.x), abs(g.y))); mk = mix(vec4(0.5, 0.0, 1.0, 1.0), mk, edge);
        vec4 cA = texture2D(map, g / 3.0), cM = texture2D(tMudA, g / 4.0), cG = texture2D(tGrassA, g / 4.0), oA = texture2D(roughnessMap, g / 3.0), oM = texture2D(tMudO, g / 4.0);
        vec3 nA = texture2D(normalMap, g / 3.0).xyz * 2.0 - 1.0, nM = texture2D(tMudN, g / 4.0).xyz * 2.0 - 1.0;
        float hb = smoothstep(-0.2, 0.2, (mk.g * 2.0 - 1.0) + (oM.a - oA.a) * 0.7 + 0.25 * (vn3(vec3(g * 0.9, 1.0)) - 0.5));
        vec3 alb = mix(cA.rgb * cA.rgb, cM.rgb * cM.rgb, hb); float rgh = mix(oA.g, oM.g, hb), hgt = mix(oA.a, oM.a, hb); vec3 nts = normalize(mix(nA, nM, hb));
        float gr = smoothstep(0.35, 0.65, mk.b + 0.3 * (cG.g - 0.25));
        alb = mix(alb, cG.rgb * cG.rgb, gr); rgh = mix(rgh, 0.85, gr); nts = normalize(mix(nts, vec3(0.0, 0.0, 1.0), gr * 0.6));
        alb *= 0.78 + 0.44 * (vn3(vec3(g * 0.21, 3.0)) * 0.6 + vn3(vec3(g * 0.9, 7.0)) * 0.4);
        float depth = (0.5 - mk.r) * 0.6 + (0.45 - hgt) * 0.085 + (vn3(vec3(g * 0.55, 5.0)) - 0.55) * 0.07 - gr * 0.05;
        float pud = smoothstep(0.0, 0.03, depth) * uWet, soak = smoothstep(-0.07, 0.0, depth) * uWet, damp = uWet * (0.55 + 0.45 * smoothstep(-0.3, -0.05, depth));
        alb *= mix(1.0, 0.62, damp) * mix(1.0, 0.72, soak) * mix(1.0, 0.45, pud);
        rgh = mix(rgh, 0.5 + 0.3 * (rgh - 0.5) + 0.12 * hb, damp * (1.0 - 0.8 * gr)); rgh = mix(rgh, 0.2, soak); rgh = mix(rgh, 0.045, pud);
        nts = normalize(mix(nts, vec3(0.0, 0.0, 1.0), soak * 0.6)); nts = normalize(mix(nts, vec3(0.0, 0.0, 1.0), pud));
        float dist = length(vViewPosition);
        vec2 rp = ripple(g, uTime) * pud * smoothstep(34.0, 8.0, dist); nts = normalize(nts + vec3(rp * 0.35, 0.0)); rgh += pud * smoothstep(8.0, 34.0, dist) * 0.05;
        diffuseColor.rgb = alb; roughnessFactor = clamp(rgh, 0.04, 1.0); metalnessFactor = 0.0;
        normal = normalize((viewMatrix * vec4(nts.x, nts.z, nts.y, 0.0)).xyz); gNts = nts; gPud = max(pud, soak * 0.5); }`,
      fend: `if (uPlanar > 0.5) { vec4 rq = uReflM * vec4(vWP, 1.0); vec2 ruv = rq.xy / rq.w + gNts.xy * 0.035;
        vec3 rc = min(textureLod(tRefl, ruv, roughnessFactor * 7.0).rgb, vec3(3.0));
        float fres = 0.025 + 0.975 * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 5.0);
        float mirror = smoothstep(0.36, 0.06, roughnessFactor);
        reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, rc * fres, mirror); }` });
    const geo = new THREE.PlaneGeometry(700, 700, 1, 1); geo.rotateX(-Math.PI / 2);
    const mesh = G.mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; R.scene.add(mesh);
    if (planar) {
      const vcam = G.vcam = new THREE.PerspectiveCamera(); G.rt = null;
      const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      const pos = new THREE.Vector3(), look = new THREE.Vector3(), up = new THREE.Vector3(), q = new THREE.Quaternion();
      R.hooks.push((r) => {
        const w = Math.max(2, Math.floor(R.w * R.Q.planar)), h = Math.max(2, Math.floor(R.h * R.Q.planar));
        if (!G.rt || G.rt.width !== w || G.rt.height !== h) { if (G.rt) G.rt.dispose();
          G.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter }); U.tRefl.value = G.rt.texture; }
        const cam = R.camera; cam.updateMatrixWorld();
        cam.getWorldPosition(pos); cam.getWorldQuaternion(q);
        look.set(0, 0, -1).applyQuaternion(q); up.set(0, 1, 0).applyQuaternion(q);
        look.add(pos); look.y = -look.y; pos.y = -pos.y; up.y = -up.y;
        vcam.position.copy(pos); vcam.up.set(up.x, up.y, up.z); vcam.lookAt(look);
        vcam.fov = cam.fov; vcam.aspect = cam.aspect; vcam.near = cam.near; vcam.far = 260; vcam.updateProjectionMatrix(); vcam.updateMatrixWorld();
        U.uReflM.value.copy(bias).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
        mesh.visible = false; MO.emit('reflect', true);
        r.setRenderTarget(G.rt); r.clear(true, true, false); r.render(R.scene, vcam);
        mesh.visible = true; MO.emit('reflect', false);
      });
    }
  };
  /* what is under a point: {mud, grass, low} from the mask (0..1 each) */
  const out = { mud: 0, grass: 1, low: 0.5, kind: 'grass' };
  G.at = (x, z) => {
    const i = Math.floor((x / SIZE + 0.5) * N), j = Math.floor((z / SIZE + 0.5) * N);
    if (i < 0 || j < 0 || i >= N || j >= N || !G.data) { out.mud = 0; out.grass = 1; out.low = 0.5; out.kind = 'grass'; return out; }
    const o = (j * N + i) * 4; out.low = G.data[o] / 255; out.mud = G.data[o + 1] / 255; out.grass = G.data[o + 2] / 255;
    out.kind = out.low < 0.44 ? 'puddle' : out.grass > 0.5 ? 'grass' : out.mud > 0.5 ? 'mud' : 'stone';
    return out;
  };
})();
