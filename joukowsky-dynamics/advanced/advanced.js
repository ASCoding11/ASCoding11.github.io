// Joukowsky Dynamics Rev 08 — blueprint sequence, advanced part blueprint and proprotor / flight dynamics.
// Geometry comes from the CadQuery build (cad/source/build_rev08.py): every part is a B-rep solid,
// tessellated per face into advanced/data/meshes.bin and catalogued in advanced/data/parts.json.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const REPO = 'https://github.com/ASCoding11/Joukowsky-Dynamics/blob/main/';
const BASE = new URL('./', import.meta.url);
const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const ramp = (t, a, b) => smooth(clamp((t - a) / (b - a)));
const rad = THREE.MathUtils.degToRad;
const deg = THREE.MathUtils.radToDeg;
const fmt = (v, d = 1) => Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ tabs (works alongside app.js)
const MY_TABS = { sequence: 'sequence-panel', advanced: 'advanced-panel', flight: 'flight-panel' };
let activeTab = 'model';
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(tab) {
  activeTab = tab;
  for (const [t, id] of Object.entries(MY_TABS)) {
    const el = $(id);
    el.hidden = t !== tab;
    el.classList.toggle('active', t === tab);
  }
  if (!(tab in MY_TABS)) current = null;
  if (tab in MY_TABS) {
    for (const id of ['model-panel', 'systems-panel', 'notes-panel', 'materials-panel']) { const el = $(id); if (el) el.hidden = true; }
    boot().then(() => activate(tab));
  }
}

// ------------------------------------------------------------------ data
let DATA, BUF, bootPromise;
function boot() {
  if (!bootPromise) {
    bootPromise = Promise.all([
      fetch(new URL('data/parts.json', BASE)).then((r) => r.json()),
      fetch(new URL('data/meshes.bin', BASE)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .catch(() => fetch(new URL('data/meshes.json', BASE)).then((r) => r.json()).then((j) => {   // base64 pack where .bin is not served
          const bin = atob(j.b64), out = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
          return out.buffer;
        })),
    ]).then(([d, b]) => { DATA = d; BUF = b; buildEngine(); buildModel(); computeMass(); initSequence(); initAdvanced(); initFlight(); })
      .catch((e) => { for (const id of ['seq-loading', 'adv-loading']) { const el = $(id); if (el) el.textContent = 'CAD DATA FAILED TO LOAD: ' + e.message; } throw e; });
  }
  return bootPromise;
}

// ------------------------------------------------------------------ engine (one renderer shared by tabs 05 / 06)
let renderer, scene, composer, bloom, renderPass, envTex, groundMat, platform;
const views = {};
function buildEngine() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x06121a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x0b1a22, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(6, 10, 7); scene.add(sun);
  // holographic ground grid at the A1 ground plane
  groundMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOffset: { value: 0 }, uColor: { value: new THREE.Color(0x6be1ed) }, uAlpha: { value: 1 }, uRing: { value: -1 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uOffset; uniform vec3 uColor; uniform float uAlpha; uniform float uRing; varying vec3 vW;
      float grid(vec2 p, float s){ vec2 g = abs(fract(p/s-.5)-.5)/fwidth(p/s); return 1.-min(min(g.x,g.y),1.); }
      void main(){ vec2 p = vec2(vW.x + uOffset, vW.z); float r = length(vW.xz);
        float a = grid(p, .5)*.10 + grid(p, 2.5)*.26; float fade = smoothstep(14., 2., r);
        float ring = uRing > 0. ? smoothstep(.10, 0., abs(r - uRing)) * .6 : 0.;
        gl_FragColor = vec4(uColor, (a*fade + ring*fade) * uAlpha); }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = DATA.meta.ground_y - 0.002; ground.renderOrder = -1;
  scene.add(ground);
  platform = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.66, 128), new THREE.MeshBasicMaterial({ color: 0x6be1ed, transparent: true, opacity: .35, side: THREE.DoubleSide }));
  platform.rotation.x = -Math.PI / 2; platform.position.y = DATA.meta.ground_y; scene.add(platform);
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, null); composer.addPass(renderPass);
  bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.45, 0.18); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  renderer.setAnimationLoop(loop);
  new ResizeObserver(() => resize()).observe(document.body);
}
function makeView(name, containerId, camPos, target) {
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 200);
  camera.position.set(...camPos);
  const el = $(containerId);
  const controls = new OrbitControls(camera, el);
  controls.target.set(...target); controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxDistance = 40; controls.minDistance = 0.4;
  views[name] = { camera, controls, el };
  return views[name];
}
let current = null;
function activate(tab) {
  if (FOCUS.region && FOCUS.view !== tab) exitFocus(true);
  const v = views[tab === 'flight' ? null : tab];
  if (tab === 'flight') { current = null; renderFlight(); return; }
  if (!v) return;
  current = tab;
  v.el.appendChild(renderer.domElement);
  resize();
  if (tab === 'sequence') { applyStyle(seq.style); setSeqTime(seq.t, true); }
  else { applyStyle(adv.holo ? 'holo' : 'cad'); applyAdvState(); }
}
function resize() {
  if (!current) return;
  const v = views[current];
  const w = v.el.clientWidth, h = v.el.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  v.camera.aspect = w / h; v.camera.updateProjectionMatrix();
}
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!current || document.hidden) return;
  const v = views[current];
  if (current === 'sequence') tickSequence(dt);
  tickFocus(dt, current);
  v.controls.update();
  const t = performance.now() / 1000;
  for (const m of holoMats) m.uniforms.uTime.value = t;
  renderPass.camera = v.camera;
  if (current === 'sequence' && seq.style === 'holo' && seq.bloom) composer.render();
  else renderer.render(scene, v.camera);
  if (current === 'sequence') drawCallouts();
  drawRegionLabels(current);
}

// ------------------------------------------------------------------ materials
const LOOKS = {
  metal: { metalness: .85, roughness: .32 }, paint: { metalness: .25, roughness: .3, clearcoat: 1 },
  carbon: { metalness: .3, roughness: .42 }, glass: { metalness: 0, roughness: .05, transparent: true, opacity: .32 },
  rubber: { metalness: 0, roughness: .92 }, light: { metalness: 0, roughness: .1, emissive: 0x9fd8ff, emissiveIntensity: .6 },
  cell: { metalness: .5, roughness: .4 }, pcb: { metalness: .2, roughness: .6 }, plastic: { metalness: .05, roughness: .7 },
  fabric: { metalness: 0, roughness: .95 }, hv: { metalness: .1, roughness: .55 }, copper: { metalness: .9, roughness: .3 },
};
const cadMats = {};
function cadMat(key) {
  if (cadMats[key]) return cadMats[key];
  const m = DATA.materials[key];
  const L = LOOKS[m.look] || LOOKS.metal;
  const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(m.color), envMap: envTex, envMapIntensity: .9, side: THREE.DoubleSide, ...L });
  if (L.transparent) mat.depthWrite = false;
  return (cadMats[key] = mat);
}
const cadLine = new THREE.LineBasicMaterial({ color: 0x02080c, transparent: true, opacity: .38 });
const holoMats = [];
function holoMat(color, opacity, rimK = 1.6) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, clipping: true,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uReveal: { value: 99 }, uTime: { value: 0 }, uRim: { value: rimK } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <clipping_planes_pars_vertex>
      void main(){ vec4 p = vec4(position,1.); vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix*p; n = mat3(instanceMatrix)*n;
        #endif
        vec4 w = modelMatrix*p; vW = w.xyz; vN = normalize(mat3(modelMatrix)*n); vV = cameraPosition - w.xyz;
        vec4 mvPosition = viewMatrix*w;
        #include <clipping_planes_vertex>
        gl_Position = projectionMatrix*mvPosition; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uReveal; uniform float uTime; uniform float uRim;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <clipping_planes_pars_fragment>
      void main(){
        #include <clipping_planes_fragment>
        if (vW.x > uReveal) discard;
        float f = 1. - abs(dot(normalize(vN), normalize(vV)));
        float rim = pow(f, 2.2);
        float band = smoothstep(.35, 0., abs(vW.x - uReveal));
        float scan = .5 + .5*sin(vW.y*42. - uTime*3.);
        float a = uOpacity*(.22 + rim*uRim) + band*.5;
        gl_FragColor = vec4(uColor*(.55 + rim*1.1 + .12*scan) + vec3(.8,1.,1.)*band, a); }`,
  });
  holoMats.push(m);
  return m;
}
function holoLine(color, opacity) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, clipping: true,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uReveal: { value: 99 }, uTime: { value: 0 }, uRim: { value: 0 } },
    vertexShader: `varying vec3 vW;
      #include <clipping_planes_pars_vertex>
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w;
        #include <clipping_planes_vertex>
        gl_Position = projectionMatrix*mvPosition; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uReveal; varying vec3 vW;
      #include <clipping_planes_pars_fragment>
      void main(){
        #include <clipping_planes_fragment>
        if (vW.x > uReveal) discard;
        float band = smoothstep(.35, 0., abs(vW.x - uReveal));
        gl_FragColor = vec4(uColor + vec3(1.)*band, uOpacity + band*.6); }`,
  });
  holoMats.push(m);
  return m;
}
let H; // holo material sets
function makeHoloSets() {
  H = {
    holo: { mesh: holoMat(0x2fb8cc, .10), line: holoLine(0x6be1ed, .42), meshHot: holoMat(0xffb35c, .16), lineHot: holoLine(0xffc27a, .7), shell: holoMat(0x4fd2e4, .07, 3.2),
      ghost: holoMat(0x2fb8cc, .015, .6), ghostLine: holoLine(0x2f8fa0, .05) },
    xray: { mesh: holoMat(0x8fb8ff, .05, 1.2), line: holoLine(0xcfe4ff, .22), meshHot: holoMat(0xff9d6b, .12), lineHot: holoLine(0xffd0a8, .6), shell: holoMat(0xa9c8ff, .04, 2.6),
      ghost: holoMat(0x8fb8ff, .012, .5), ghostLine: holoLine(0x7f9fd0, .04) },
  };
}
const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: .55, depthTest: false });
const highlightLine = new THREE.LineBasicMaterial({ color: 0xffe2b8, depthTest: false });
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x6be1ed, transparent: true, opacity: .035, depthWrite: false });
const ghostLine = new THREE.LineBasicMaterial({ color: 0x6be1ed, transparent: true, opacity: .05, depthWrite: false });
const cadHotLine = new THREE.LineBasicMaterial({ color: 0xffb35c, transparent: true, opacity: .9 });

// ------------------------------------------------------------------ model
let root;
const NODE = [];          // { def, group, q0, p0 }
const NODE_BY_ID = {};
const PARTS = [];         // { def, geo, edges, idx }
const OBJS = [];          // render records { obj, line, pi, ni, instIdx:[global instance ids], sys }
const INST_TO_OBJ = [];   // global instance -> [rec, localIndex]
const animNodes = [];
function decode(p) {
  const m = p.mesh;
  const q = new Int16Array(BUF, m.voff, m.nv * 3);
  const pos = new Float32Array(m.nv * 3);
  for (let i = 0; i < pos.length; i++) { const k = i % 3; pos[i] = (q[i] + 32767) / 65534 * m.ext[k] + m.min[k]; }
  const idx = m.wide ? new Uint32Array(BUF.slice(m.ioff, m.ioff + m.ni * 4)) : new Uint16Array(BUF.slice(m.ioff, m.ioff + m.ni * 2));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
function buildModel() {
  makeHoloSets();
  for (const p of DATA.parts) { const geo = decode(p); PARTS.push({ def: p, geo, edges: new THREE.EdgesGeometry(geo, 28), sys: p.system.slice(0, 3) }); }
  DATA.nodes.forEach((n, i) => {
    const g = new THREE.Group(); g.name = n.id;
    g.position.set(...n.pos); g.quaternion.set(...n.q);
    if (n.mirror) g.scale.set(1, 1, -1);
    const rec = { def: n, group: g, q0: g.quaternion.clone(), p0: g.position.clone(), i };
    NODE.push(rec); NODE_BY_ID[n.id] = rec;
    if (n.anim) animNodes.push(rec);
  });
  NODE.forEach((r) => { if (r.def.parent >= 0) NODE[r.def.parent].group.add(r.group); else root = r.group; });
  scene.add(root);
  // group instances by (part, node)
  const groups = new Map();
  DATA.instances.forEach((ins, gi) => {
    const key = ins[0] + '|' + ins[1];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(gi);
  });
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), vv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (const [key, list] of groups) {
    const [pi, ni] = key.split('|').map(Number);
    const P = PARTS[pi], parent = NODE[ni].group;
    const mat = cadMat(P.def.material);
    const mtx = list.map((gi) => { const s = DATA.instances[gi]; return new THREE.Matrix4().compose(vv.set(s[2], s[3], s[4]), qq.set(s[5], s[6], s[7], s[8]), one); });
    let obj, line;
    if (list.length >= 3) {
      obj = new THREE.InstancedMesh(P.geo, mat, list.length);
      mtx.forEach((m, k) => obj.setMatrixAt(k, m));
      obj.instanceMatrix.needsUpdate = true; obj.computeBoundingSphere();
      // merged edges in node space
      const src = P.edges.attributes.position.array;
      if (src.length * list.length < 900000) {
        const out = new Float32Array(src.length * list.length);
        mtx.forEach((m, k) => { for (let i = 0; i < src.length; i += 3) { vv.set(src[i], src[i + 1], src[i + 2]).applyMatrix4(m); out.set([vv.x, vv.y, vv.z], k * src.length + i); } });
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(out, 3));
        line = new THREE.LineSegments(lg, cadLine);
      }
    } else {
      obj = new THREE.Group();
      mtx.forEach((m) => {
        const me = new THREE.Mesh(P.geo, mat); me.matrixAutoUpdate = false; me.matrix.copy(m);
        const li = new THREE.LineSegments(P.edges, cadLine); li.matrixAutoUpdate = false; li.matrix.copy(m);
        me.userData.rec = null; obj.add(me, li);
      });
    }
    parent.add(obj); if (line) parent.add(line);
    const rec = { obj, line, pi, ni, inst: list, sys: P.sys, mtx };
    obj.userData.rec = rec;
    if (!obj.isInstancedMesh) obj.children.forEach((c, k) => { c.userData.rec = rec; c.userData.k = c.isMesh ? k / 2 : -1; });
    list.forEach((gi, k) => (INST_TO_OBJ[gi] = [rec, k]));
    OBJS.push(rec);
  }
  assignRegions();
  // rotor-disc glow per module (shown when a rotor spins in flight)
  for (const c of ['FL', 'FR', 'RL', 'RR']) {
    const md = NODE_BY_ID['mod_' + c];
    const disc = new THREE.Mesh(new THREE.RingGeometry(0.13, DATA.meta.duct_R - 0.02, 64, 1), new THREE.MeshBasicMaterial({ color: 0x6be1ed, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    disc.position.z = DATA.meta.z_rotor; disc.userData.disc = true; md.group.add(disc); discs.push(disc);
  }
}
const discs = [];
let styleNow = 'cad';
let hotSystems = new Set();
function applyStyle(style) {
  styleNow = style;
  const set = H[style];
  const fr = FOCUS.region, hv = FOCUS.hover;
  for (const r of OBJS) {
    const inFocus = fr && r.region === fr, ghost = fr && !inFocus;
    const hot = fr ? inFocus : hv ? r.region === hv : hotSystems.has(r.sys);
    const shell = r.sys === '101' || r.sys === '102';
    let mesh = style === 'cad' ? cadMat(PARTS[r.pi].def.material) : hot ? set.meshHot : shell ? set.shell : set.mesh;
    let line = style === 'cad' ? (hot && hv && !fr ? cadHotLine : cadLine) : hot ? set.lineHot : set.line;
    if (ghost) { mesh = style === 'cad' ? ghostMat : set.ghost; line = style === 'cad' ? ghostLine : set.ghostLine; }
    if (r.obj.isInstancedMesh) r.obj.material = mesh; else r.obj.children.forEach((c) => (c.material = c.isMesh ? mesh : line));
    if (r.line) r.line.material = line;
  }
  discs.forEach((d) => d.material.color.set(style === 'cad' ? 0x8aa6b0 : 0x6be1ed));
  groundMat.uniforms.uAlpha.value = style === 'cad' ? .45 : 1;
  platform.visible = style !== 'cad';
  renderer.setClearColor(style === 'cad' ? 0x0b1a23 : 0x050f16, 1);
}
function setReveal(x) { for (const m of holoMats) m.uniforms.uReveal.value = x; }

// ------------------------------------------------------------------ vehicle state -> nodes
const EXPLODE_GROUPS = {
  body: [0, 2.6, 0], door_L: [0, 2.4, 2.4], door_R: [0, 2.4, -2.4], cockpit: [0, 1.5, 0], power: [0, -1.5, 0], avionics: [2.2, 1.2, 0],
  thermal: [3.2, .3, 0], emergency: [-3.0, 1.3, 0], road: [0, -.9, 0],
  corner_FL: [1.4, .3, 2.6], corner_FR: [1.4, .3, -2.6], corner_RL: [-1.4, .3, 2.6], corner_RR: [-1.4, .3, -2.6],
  leg_FL: [.4, -1.3, .9], leg_FR: [.4, -1.3, -.9], leg_RL: [-.4, -1.3, .9], leg_RR: [-.4, -1.3, -.9],
};
const EXPLODE_ORDER = ['power', 'leg_FL', 'leg_FR', 'leg_RL', 'leg_RR', 'road', 'corner_FL', 'corner_FR', 'corner_RL', 'corner_RR', 'cockpit', 'thermal', 'avionics', 'emergency', 'body', 'door_L', 'door_R'];
const SUB_EXPLODE = (id) => {
  if (/^rotor_/.test(id)) return [0, 0, .55];
  if (/^petO_/.test(id)) return [0, 0, .28];
  if (/^petI_/.test(id)) return [0, 0, -.30];
  if (/^blade_/.test(id)) return [.16, 0, 0];
  if (/^yoke_/.test(id)) return [0, .25, 0];
  if (/^bmod_/.test(id)) return [0, .25, 0];
  return null;
};
const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _ax = new THREE.Vector3();
function applyState(st) {
  for (const r of NODE) {
    const g = r.group, a = r.def.anim, id = r.def.id;
    g.position.copy(r.p0); g.quaternion.copy(r.q0);
    const ex = EXPLODE_GROUPS[id];
    if (ex) {
      const e = typeof st.explode === 'object' ? (st.explode[id] ?? 0) : st.explode;
      g.position.x += ex[0] * e; g.position.y += ex[1] * e; g.position.z += ex[2] * e;
    }
    if (st.sub) { const s = SUB_EXPLODE(id); if (s) g.position.add(_v.set(...s).multiplyScalar(st.sub).applyQuaternion(r.q0)); }
    if (!a) continue;
    _ax.set(...a.axis);
    let ang = null;
    switch (a.kind) {
      case 'lift': g.position.y += st.lift; break;
      case 'yoke': ang = rad(-90 * st.yoke) * a.sign; break;
      case 'tilt': ang = rad(st.tilt) * a.sign; break;
      case 'rim': ang = st.rim * a.sign; break;
      case 'rotor': ang = st.rotorLocked ? st.rim : st.rotor * a.sign; break;
      case 'pitch': ang = rad(st.pitch) * a.sign; break;
      case 'petal_out': ang = rad(100 * st.petals) * a.sign; break;
      case 'petal_in': ang = a.index ? 0 : rad(95 * st.petals) * a.sign; break;
      case 'leg': g.position.addScaledVector(_ax, a.stroke * st.legs); break;
      case 'door': ang = rad(62 * (st.doors || 0)) * a.sign; break;
    }
    if (ang !== null) g.quaternion.multiply(_q.setFromAxisAngle(_ax, ang));
  }
  const op = clamp(st.spin / 3) * (styleNow === 'cad' ? .25 : .35);
  discs.forEach((d) => (d.material.opacity = op));
}
const STATE0 = { explode: 0, sub: 0, lift: 0, yoke: 0, tilt: 0, rim: 0, rotor: 0, rotorLocked: true, pitch: 90, petals: 0, legs: 0, doors: 0, spin: 0 };

// ------------------------------------------------------------------ mass properties (from the CAD)
const MASS = {};
function computeMass() {
  const PAYLOAD = 180;
  const at = (st) => {
    applyState({ ...STATE0, ...st }); root.updateMatrixWorld(true);
    let m = 0; const c = new THREE.Vector3(); const bySys = {};
    const ctr = new THREE.Vector3(), mm = new THREE.Matrix4();
    for (const r of OBJS) {
      const P = PARTS[r.pi], mk = P.def.mass_kg;
      if (P.def.com) ctr.set(...P.def.com); else P.geo.boundingBox.getCenter(ctr);   // B-rep centre of mass
      const node = NODE[r.ni].group;
      r.mtx.forEach((mt) => { _v.copy(ctr).applyMatrix4(mm.multiplyMatrices(node.matrixWorld, mt)); c.addScaledVector(_v, mk); m += mk; });
      bySys[P.def.system] = (bySys[P.def.system] || 0) + mk * r.mtx.length;
    }
    // two occupants at the seat H-points
    c.addScaledVector(_v.set(-0.85, 0.75, 0), PAYLOAD); m += PAYLOAD;
    return { m, cg: c.divideScalar(m), bySys };
  };
  MASS.road = at({});
  MASS.hover = at({ yoke: 1, petals: 1, pitch: 26, legs: 0, lift: 0 });
  MASS.rotors = {};
  root.updateMatrixWorld(true);
  for (const c of ['FL', 'FR', 'RL', 'RR']) { const p = new THREE.Vector3(); NODE_BY_ID['mod_' + c].group.getWorldPosition(p); MASS.rotors[c] = p; }
  MASS.empty = MASS.road.m - PAYLOAD; MASS.payload = PAYLOAD;
  MASS.cells = DATA.parts.find((p) => p.pn === 'JD-200-011')?.qty || 0;
  applyState(STATE0);
}

// ------------------------------------------------------------------ 05 SEQUENCE
const STEPS = [
  { t: 0, code: 'BOOT', title: 'System scan', sub: 'Rev 08 CAD loads as a hologram', hot: [], cam: [[8.5, 4.2, 8.5], [0, .5, 0]],
    text: 'The scan front sweeps nose-ward and reveals 242 unique CADed parts in their exploded positions.' },
  { t: 6, code: 'ASSEMBLE', title: 'Assembly', sub: 'Systems dock into the safety cell', hot: ['200', '300', '110'], cam: [[9.5, 5, 9.5], [0, .5, 0]],
    text: 'Battery, legs, fan-wheel corners, cockpit, avionics, thermal, parachute bay and body panels lock onto the carbon tub.',
    callouts: [['bmod_07', [0, .1, 0], 'ENERGY STORAGE', '19 modules · 1,064 × 4680 cells', -110, 70], ['mod_FL', [0, .5, .2], 'FAN-WHEEL MODULE ×4', 'tyre + duct + 7-blade proprotor', 120, -70],
      ['body', [0, 1.3, 0], 'BODY-IN-WHITE', 'lofted from the A1 surfaces', -140, -60]] },
  { t: 14, code: 'ROAD', title: 'Road mode', sub: '60 km/h · fan hardware stowed and locked', hot: [], cam: [[7.2, 1.4, 5.6], [0, .4, 0]],
    text: 'The airless tyre rolls on the duct rim. Blades sit feathered at 90° and the dog clutch couples them to the rim, so the motor drives the wheel. Petal covers are closed.',
    callouts: [['mod_FL', [0, .2, .22], 'PETAL COVERS CLOSED', 'blade guard in road mode', 110, -80], ['rotor_FL', [0, 0, .05], 'BLADES FEATHERED 90°', 'act as wheel spokes', 130, 30]] },
  { t: 20, code: 'PREPARE', title: 'Stop & prepare', sub: 'Landing legs carry the car off its tyres', hot: ['600'], cam: [[6.6, 1.6, 6.6], [0, .2, 0]],
    text: 'Parking brake, self-test, then four telescoping legs deploy and lift the car 120 mm so each wheel can swing freely.',
    callouts: [['leg2_FL', [0, 0, 0], 'LANDING LEGS ×4', 'ball-screw · oleo · down-lock + WOW', 120, 40]] },
  { t: 27, code: 'UNLOCK', title: 'Unlock & open', sub: 'Clutch release · rim lock · petals open', hot: ['300', '320', '330', '360'], cam: [[4.6, 1.9, 4.9], [1.8, .7, 1.2]],
    text: 'The dog clutch releases the rotor from the rim. The brake caliper and two lock pins index the rim to the module. Iris petals open into an inlet collector and an exit diffuser, and collective drives from 90° to the hover setting.',
    callouts: [['mod_FL', [0, .62, .2], 'IRIS PETALS 12 + 12', 'inlet collector / exit diffuser', 120, -70], ['mod_FL', [0, .6, -.19], 'RIM LOCK', 'caliper clamp + 2 pins', -150, 60],
      ['rotor_FL', [0, 0, .1], 'COLLECTIVE 90° → 26°', 'electromechanical pitch actuator', 130, 40]] },
  { t: 31, code: 'CONVERT', title: 'Wheel → proprotor', sub: 'Yokes swing each wheel 90° up and out', hot: ['340', '300'], cam: [[6.2, 3.6, 7.6], [0, 1, 0]],
    text: 'A harmonic-drive rotary actuator on each hinge swings the module up and outboard. The fender cap rides on the yoke. Redundant RVDTs and locks must agree before arming.',
    callouts: [['yoke_FL', [0, 0, 0], 'CONVERSION HINGE', '2.4 kN·m harmonic drive · dual RVDT', -150, -60], ['yoke_RL', [0, 0, 0], 'FENDER CAP', 'lifts away with the yoke', 120, -80]] },
  { t: 37, code: 'SPIN-UP', title: 'Spin-up', sub: '4 × 230 kW axial-flux motors', hot: ['320', '330'], cam: [[5.2, 6.2, 6.4], [0, 1, 0]],
    text: 'Rotors spin up to hover RPM. Diagonal pairs counter-rotate for yaw balance; the stators remove swirl.',
    callouts: [['mod_FR', [0, 0, .3], 'CCW / CW DIAGONAL PAIRS', 'yaw from differential torque', -150, -70], ['mod_RL', [0, 0, .3], 'DUCTED PROPROTOR', 'R 540 mm · σ 0.40 · B 7', 130, -60]] },
  { t: 41, code: 'LIFT-OFF', title: 'Lift-off & hover', sub: 'Legs retract after weight-off', hot: ['330'], cam: [[8.4, 3.2, 8.4], [0, 2.4, 0]],
    text: 'Thrust balances weight, the car climbs and the legs retract once weight-on-wheels clears.',
    callouts: [['mod_FL', [0, 0, 0], 'HOVER', 'disk loading ≈ 134 lb/ft²', 130, -60]] },
  { t: 47, code: 'TRANSITION', title: 'Partial conversion', sub: 'Modules tilt 25° forward', hot: ['340'], cam: [[-6.5, 4.2, 8.6], [0, 3.6, 0]],
    text: 'Gimbals tilt each rotor axis forward. Thrust vectors carry weight and drag; the body adds a little lift.',
    callouts: [['tilt_FL', [0, 0, 0], 'CRUISE TILT GIMBAL', '0–30° forward', 130, -60]] },
  { t: 53, code: 'CRUISE', title: 'Cruise', sub: '160 km/h', hot: [], cam: [[9, 5, 6], [0, 4, 0]],
    text: 'Edgewise-dominant cruise at μ ≈ 0.19, well inside the memo’s practical limit (μ < 0.7). See tab 07 for power and endurance.',
    callouts: [['mod_RR', [0, 0, 0], 'EDGEWISE μ ≈ 0.19', 'NASA TM Eq. 7', -150, -60]] },
];
const T_END = 60;
const seq = { t: 0, playing: false, dir: 1, speed: 1, style: 'holo', bloom: false, autoCam: true, step: -1, table: null };
function buildTables() {
  const dt = 0.01, n = Math.ceil(T_END / dt) + 2;
  const rim = new Float32Array(n), rot = new Float32Array(n), grd = new Float32Array(n);
  const v = (t) => 16.7 * ramp(t, 14, 16) * (1 - ramp(t, 20, 23));
  const vf = (t) => 44.4 * ramp(t, 47, 53);
  const w = (t) => 2.6 * ramp(t, 37, 41);      // visual rev/s (true 4,420 rpm aliases on screen)
  for (let i = 1; i < n; i++) {
    const t = i * dt;
    rim[i] = rim[i - 1] - v(t) * dt / DATA.meta.tire_R;
    rot[i] = rot[i - 1] + w(t) * 2 * Math.PI * dt;
    grd[i] = grd[i - 1] + (v(t) + vf(t) * .25) * dt;
  }
  // index the rim to a whole turn so the locked rim and petals line up with the yoke
  const total = rim[n - 1], k = Math.round(total / (2 * Math.PI)) * 2 * Math.PI / (total || 1);
  for (let i = 0; i < n; i++) rim[i] *= k;
  seq.table = { dt, rim, rot, grd, v, vf, w };
}
function lookup(arr, t) { const i = clamp(Math.floor(t / seq.table.dt), 0, arr.length - 1); return arr[i]; }
function seqState(t) {
  const ex = {};
  EXPLODE_ORDER.forEach((id, i) => (ex[id] = 1 - ramp(t, 6.2 + i * .38, 8.4 + i * .38)));
  return {
    explode: ex, sub: 0,
    legs: ramp(t, 23, 26.5) - ramp(t, 43, 46.5),
    lift: 0.12 * ramp(t, 23, 26.5) + 2.9 * ramp(t, 41, 47) + 1.0 * ramp(t, 47, 55),
    petals: ramp(t, 27.5, 30), pitch: 90 - 64 * ramp(t, 28.5, 31) + 4 * ramp(t, 47, 53),
    yoke: ramp(t, 31, 37), tilt: 25 * ramp(t, 47, 53), rotorLocked: t < 28,
    rim: lookup(seq.table.rim, t), rotor: lookup(seq.table.rot, t), spin: seq.table.w(t), doors: 0,
  };
}
function initSequence() {
  buildTables();
  const v = makeView('sequence', 'seq-viewport', STEPS[0].cam[0], STEPS[0].cam[1]);
  v.controls.addEventListener('start', () => (seq.autoCam = false));
  $('seq-loading').hidden = true;
  $('seq-steps').innerHTML = STEPS.map((s, i) => `<li><button data-step="${i}"><span>T+${String(s.t).padStart(2, '0')}</span><strong>${esc(s.title)}</strong><small>${esc(s.text)}</small></button></li>`).join('');
  $('seq-steps').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { seq.autoCam = true; seq.snap = true; setSeqTime(STEPS[+b.dataset.step].t + .01); }));
  $('seq-play').addEventListener('click', () => { if (!seq.playing && seq.t >= T_END - .05 && seq.dir > 0) setSeqTime(0); seq.dir = 1; seq.playing = !seq.playing; seq.autoCam = true; syncPlay(); });
  $('seq-land').addEventListener('click', () => { if (seq.t < 15) setSeqTime(T_END); seq.dir = -1; seq.playing = true; seq.autoCam = true; syncPlay(); });
  $('seq-scrub').addEventListener('input', (e) => { seq.playing = false; syncPlay(); setSeqTime(+e.target.value); });
  $('seq-speed').addEventListener('change', (e) => (seq.speed = +e.target.value));
  $('seq-bloom').addEventListener('change', (e) => (seq.bloom = e.target.checked));
  document.querySelectorAll('[data-seqstyle]').forEach((b) => b.addEventListener('click', () => {
    seq.style = b.dataset.seqstyle;
    document.querySelectorAll('[data-seqstyle]').forEach((x) => x.classList.toggle('active', x === b));
    $('seq-viewport').classList.toggle('holo', seq.style !== 'cad');
    applyStyle(seq.style); setSeqTime(seq.t, true);
  }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  seq.playing = !reduce; syncPlay();
  initRegionUI('sequence');
}
function syncPlay() { $('seq-play').textContent = seq.playing && seq.dir > 0 ? '❚❚ Pause' : '▶ Play'; $('seq-land').textContent = seq.playing && seq.dir < 0 ? '❚❚ Pause' : '◀ Land & stow'; }
function tickSequence(dt) {
  if (seq.playing) {
    let t = seq.t + dt * seq.speed * seq.dir;
    if (seq.dir < 0 && t <= 14.01) { t = 14.01; seq.playing = false; syncPlay(); }
    if (t >= T_END) { t = T_END; seq.playing = false; syncPlay(); }
    setSeqTime(t);
  }
  if (seq.autoCam && !FOCUS.region) {
    const s = STEPS[Math.max(0, seq.step)], v = views.sequence;
    const lift = seqState(seq.t).lift;
    const tp = _v.set(...s.cam[1]); if (seq.step >= 7) tp.y = Math.max(tp.y, lift + .4);
    const cp = new THREE.Vector3(...s.cam[0]); if (seq.step >= 7) cp.y += lift * .6;
    const k = seq.snap ? 1 : 1 - Math.pow(0.2, dt);           // frame-rate independent ease
    v.controls.target.lerp(tp, k); v.camera.position.lerp(cp, k); seq.snap = false;
  }
}
function setSeqTime(t, force) {
  seq.t = clamp(t, 0, T_END);
  const st = seqState(seq.t);
  applyState(st);
  setReveal(seq.style === 'cad' ? 99 : -3.8 + 7.6 * ramp(seq.t, .5, 5.5));
  groundMat.uniforms.uOffset.value = lookup(seq.table.grd, seq.t);
  groundMat.uniforms.uRing.value = seq.t < 6 ? 1 + seq.t * 2.4 : -1;
  let k = 0; STEPS.forEach((s, i) => { if (seq.t >= s.t) k = i; });
  if (k !== seq.step || force) {
    seq.step = k;
    const s = STEPS[k];
    hotSystems = new Set(s.hot); if (activeTab === 'sequence') applyStyle(seq.style);
    $('seq-step-title').textContent = s.title; $('seq-step-sub').textContent = s.sub;
    $('seq-steps').querySelectorAll('button').forEach((b, i) => { b.classList.toggle('active', i === k); b.classList.toggle('done', i < k); });
    buildCallouts(s.callouts || []);
  }
  $('seq-step-code').textContent = `${STEPS[k].code} · T+${fmt(seq.t, 1)} s`;
  $('seq-scrub').value = seq.t;
  $('seq-time').textContent = `${fmt(seq.t, 1).padStart(4, '0')} / ${T_END}.0 s`;
  telemetry(st);
}
function telemetry(st) {
  const P = flightModel(FLIGHT);
  const road = seq.table.v(seq.t), air = seq.table.vf(seq.t);
  const mode = seq.t < 14 ? 'ASSEMBLY' : seq.t < 20 ? 'ROAD' : seq.t < 31 ? 'PREPARE / CONFIGURE' : seq.t < 41 ? 'READY' : 'FLIGHT';
  const rpm = st.rotorLocked ? Math.abs(road) / DATA.meta.tire_R * 60 / (2 * Math.PI) : P.rpmHover * clamp(st.spin / 2.6);
  const alt = Math.max(0, st.lift - 0.12 * st.legs - (st.lift > .13 ? .12 : st.lift));
  const pw = seq.t < 37 ? road * 0.6 : P.hoverkW * clamp(st.spin / 2.6) * (seq.t > 47 ? 1 - .18 * ramp(seq.t, 47, 53) : 1);
  const items = [['MODE', mode, 'hot'], ['GROUND / AIR SPEED', `${fmt((road + air) * 3.6, 0)} km/h`], ['ALTITUDE AGL', `${fmt(alt, 2)} m`], ['ROTOR SPEED', `${fmt(rpm, 0)} rpm`],
    ['CONVERSION YOKE', `${fmt(st.yoke * 90, 0)}°`], ['CRUISE TILT', `${fmt(st.tilt, 1)}°`], ['COLLECTIVE θ.75', `${fmt(st.pitch, 1)}°`], ['PETALS', `${fmt(st.petals * 100, 0)} %`],
    ['ELECTRICAL POWER', `${fmt(pw, 0)} kW`], ['LEGS', st.legs > .98 ? 'DOWN & LOCKED' : st.legs < .02 ? 'STOWED' : 'IN TRANSIT']];
  $('seq-telemetry').innerHTML = items.map(([k, v, c]) => `<div><small>${k}</small><b class="${c || ''}">${v}</b></div>`).join('');
}
let calloutEls = [];
function buildCallouts(list) {
  $('seq-callouts').innerHTML = ''; calloutEls = [];
  for (const [nid, pt, title, sub, dx, dy] of list) {
    if (!NODE_BY_ID[nid]) continue;
    const el = document.createElement('div'); el.className = 'callout-tag'; el.innerHTML = `${esc(title)}<small>${esc(sub)}</small>`;
    $('seq-callouts').appendChild(el);
    calloutEls.push({ el, node: NODE_BY_ID[nid].group, pt: new THREE.Vector3(...pt), dx, dy });
  }
}
function drawCallouts() {
  const v = views.sequence, w = v.el.clientWidth, h = v.el.clientHeight;
  let svg = '';
  if (FOCUS.region) { calloutEls.forEach((c) => (c.el.style.opacity = 0)); $('seq-leaders').innerHTML = ''; return; }
  for (const c of calloutEls) {
    const p = c.pt.clone().applyMatrix4(c.node.matrixWorld).project(v.camera);
    const vis = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
    c.el.style.opacity = vis ? 1 : 0;
    if (!vis) continue;
    const x = (p.x + 1) / 2 * w, y = (1 - p.y) / 2 * h;
    const lx = clamp(x + c.dx, 100, w - 100), ly = clamp(y + c.dy, 110, h - 24);
    c.el.style.left = lx + 'px'; c.el.style.top = ly + 'px';
    svg += `<line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}"/><circle cx="${x}" cy="${y}" r="3"/>`;
  }
  $('seq-leaders').innerHTML = svg;
}

// ------------------------------------------------------------------ 06 ADVANCED BLUEPRINT
const adv = { sel: -1, selInst: -1, holo: false, config: 0, explode: 0, view: '3d', hidden: new Set(), overlays: [], sort: ['pn', 1], isolate: false };
function configState(c) {
  const a = clamp(c), b = clamp(c - 1);
  return { ...STATE0, legs: ramp(a, 0, .35) * (1 - b), lift: .12 * ramp(a, 0, .35) + 2.4 * b, petals: ramp(a, .3, .6), pitch: 90 - 64 * ramp(a, .4, .7) + 4 * b,
    yoke: ramp(a, .55, 1), tilt: 25 * b, rotorLocked: c < .35, spin: 0, explode: adv.explode, sub: adv.explode };
}
function applyAdvState() {
  applyState(configState(adv.config));
  setReveal(99); groundMat.uniforms.uOffset.value = 0; groundMat.uniforms.uRing.value = -1;
  const c = adv.config;
  $('adv-config-label').textContent = c < .05 ? 'Road' : c < .95 ? 'Converting' : c < 1.05 ? 'Hover' : 'Cruise tilt';
}
function initAdvanced() {
  const v = makeView('advanced', 'adv-viewport', [7.5, 3.6, 7.5], [0, .5, 0]);
  $('adv-loading').hidden = true;
  $('adv-count').textContent = `${DATA.parts.length} PARTS · ${DATA.instances.length.toLocaleString()} PLACED`;
  buildTree();
  $('adv-search').addEventListener('input', () => { buildTree(); if (adv.view === 'bom') renderBom(); });
  $('adv-filter').addEventListener('change', () => { buildTree(); if (adv.view === 'bom') renderBom(); });
  $('adv-config').addEventListener('input', (e) => { adv.config = +e.target.value; applyAdvState(); });
  $('adv-explode').addEventListener('input', (e) => { adv.explode = +e.target.value; applyAdvState(); });
  $('adv-section').addEventListener('change', (e) => { renderer.clippingPlanes = e.target.checked ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)] : []; });
  $('adv-holo').addEventListener('change', (e) => { adv.holo = e.target.checked; applyStyle(adv.holo ? 'holo' : 'cad'); refreshIsolation(); });
  $('adv-reset').addEventListener('click', () => {
    adv.config = 0; adv.explode = 0; $('adv-config').value = 0; $('adv-explode').value = 0; $('adv-section').checked = false; renderer.clippingPlanes = [];
    adv.isolate = false; refreshIsolation(); applyAdvState(); v.camera.position.set(7.5, 3.6, 7.5); v.controls.target.set(0, .5, 0);
  });
  document.querySelectorAll('[data-advview]').forEach((b) => b.addEventListener('click', () => setAdvView(b.dataset.advview)));
  initRegionUI('advanced');
  // picking
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let down = null;
  v.el.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  v.el.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = v.el.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, v.camera);
    const targets = [];
    for (const rec of OBJS) { if (!rec.obj.visible) continue; if (rec.obj.isInstancedMesh) targets.push(rec.obj); else rec.obj.children.forEach((c) => c.isMesh && targets.push(c)); }
    const hits = ray.intersectObjects(targets, false).filter((hh) => !renderer.clippingPlanes.length || hh.point.z <= 0.001);
    if (!hits.length) return;
    const h0 = hits[0], rec = h0.object.userData.rec;
    const k = h0.object.isInstancedMesh ? h0.instanceId : h0.object.userData.k;
    selectPart(rec.pi, rec.inst[k]);
  });
}
function partMatches(p, q, f) {
  if (f === 'crit' && !p.criticality) return false;
  if (f === 'make' && p.supplier !== 'make') return false;
  if (f === 'buy' && p.supplier !== 'buy') return false;
  if (f === 'handed' && !p.handed) return false;
  if (!q) return true;
  return (p.pn + ' ' + p.name + ' ' + p.system + ' ' + p.assy + ' ' + DATA.materials[p.material].name + ' ' + p.fn).toLowerCase().includes(q);
}
function buildTree() {
  const q = $('adv-search').value.trim().toLowerCase(), f = $('adv-filter').value;
  const sys = {};
  DATA.parts.forEach((p, i) => { if (!partMatches(p, q, f)) return; ((sys[p.system] ||= {})[p.assy] ||= []).push(i); });
  const open = !!(q || f);
  $('adv-tree').innerHTML = Object.keys(sys).sort().map((s) => {
    const assys = sys[s]; const n = Object.values(assys).flat().length;
    const mass = Object.values(assys).flat().reduce((a, i) => a + DATA.parts[i].mass_kg * DATA.parts[i].qty, 0);
    return `<details ${open ? 'open' : ''}><summary><span class="nm">${esc(s)}</span><em>${n} · ${fmt(mass, 0)} kg</em><input type="checkbox" class="sysvis" data-sys="${esc(s)}" ${adv.hidden.has(s) ? '' : 'checked'} aria-label="Show ${esc(s)}"></summary>` +
      Object.keys(assys).sort().map((a) => `<details ${open ? 'open' : ''}><summary><span class="nm">${esc(a)}</span><em>${assys[a].length}</em></summary>` +
        assys[a].map((i) => { const p = DATA.parts[i]; return `<button class="p ${i === adv.sel ? 'sel' : ''}" data-pi="${i}"><span><b>${p.pn}</b>${esc(p.name)}</span><i>×${p.qty}</i></button>`; }).join('') + '</details>').join('') + '</details>';
  }).join('') || '<p class="subtle">No parts match.</p>';
  $('adv-tree').querySelectorAll('.p').forEach((b) => b.addEventListener('click', () => { selectPart(+b.dataset.pi, -1, true); if (adv.view !== '3d') setAdvView('3d'); }));
  $('adv-tree').querySelectorAll('.sysvis').forEach((c) => {
    c.addEventListener('click', (e) => e.stopPropagation());
    c.addEventListener('change', () => { if (c.checked) adv.hidden.delete(c.dataset.sys); else adv.hidden.add(c.dataset.sys); refreshIsolation(); });
  });
}
function clearOverlays() { adv.overlays.forEach((o) => o.parent && o.parent.remove(o)); adv.overlays = []; }
function selectPart(pi, gInst = -1, frame = false) {
  adv.sel = pi; adv.selInst = gInst;
  clearOverlays();
  const P = PARTS[pi];
  for (const rec of OBJS) {
    if (rec.pi !== pi) continue;
    rec.mtx.forEach((m) => {
      const me = new THREE.Mesh(P.geo, highlightMat); me.matrixAutoUpdate = false; me.matrix.copy(m); me.renderOrder = 10;
      const li = new THREE.LineSegments(P.edges, highlightLine); li.matrixAutoUpdate = false; li.matrix.copy(m); li.renderOrder = 11;
      NODE[rec.ni].group.add(me, li); adv.overlays.push(me, li);
    });
  }
  document.querySelectorAll('#adv-tree .p').forEach((b) => b.classList.toggle('sel', +b.dataset.pi === pi));
  const btn = document.querySelector(`#adv-tree .p[data-pi="${pi}"]`);
  if (btn) { btn.closest('details')?.setAttribute('open', ''); btn.closest('details')?.parentElement.closest('details')?.setAttribute('open', ''); btn.scrollIntoView({ block: 'nearest' }); }
  renderSheet(pi);
  refreshIsolation();
  if (frame) frameOverlays();
}
function frameOverlays() {
  const box = new THREE.Box3(); root.updateMatrixWorld(true);
  adv.overlays.forEach((o) => { if (o.isMesh) { const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); box.union(b); } });
  if (box.isEmpty()) return;
  const v = views.advanced, c = box.getCenter(new THREE.Vector3()), r = Math.max(.15, box.getSize(new THREE.Vector3()).length() * .5);
  const dir = v.camera.position.clone().sub(v.controls.target).normalize();
  v.controls.target.copy(c); v.camera.position.copy(c).addScaledVector(dir, r / Math.tan(rad(18)) * 1.15);
}
function refreshIsolation() {
  if (FOCUS.region) { applyStyle(styleNow); return; }
  const iso = adv.isolate && adv.sel >= 0;
  for (const rec of OBJS) {
    const sys = PARTS[rec.pi].def.system;
    const hide = adv.hidden.has(sys);
    rec.obj.visible = !hide; if (rec.line) rec.line.visible = !hide && !iso;
    if (rec.obj.isInstancedMesh) { if (iso) rec.obj.material = rec.pi === adv.sel ? rec.obj.material : ghostMat; }
    else rec.obj.children.forEach((c) => { if (iso) { if (c.isMesh) c.material = rec.pi === adv.sel ? c.material : ghostMat; else c.visible = rec.pi === adv.sel; } else c.visible = true; });
  }
  if (!iso) applyStyle(adv.holo ? 'holo' : 'cad');
}
function renderSheet(pi) {
  const p = DATA.parts[pi], m = DATA.materials[p.material];
  const crit = p.criticality ? `<span class="chip ${p.criticality === 'Safety' ? 'safe' : 'crit'}">${esc(p.criticality.toUpperCase())}</span>` : '';
  const spec = Object.entries(p.spec || {}).map(([k, v]) => `<dt>${esc(k.replace(/_/g, ' ').toUpperCase())}</dt><dd>${esc(v)}</dd>`).join('');
  const insts = DATA.instances.filter((s) => s[0] === pi).length;
  const where = [...new Set(DATA.instances.filter((s) => s[0] === pi).map((s) => DATA.nodes[s[1]].name))].slice(0, 6);
  $('adv-sheet').innerHTML = `
    <div><span class="sheet-pn">${p.pn}</span><h3>${esc(p.name)}</h3>
      <div class="chips"><span class="chip">${esc(p.system)}</span><span class="chip">${esc(p.assy)}</span><span class="chip ${p.supplier === 'buy' ? 'buy' : ''}">${p.supplier === 'buy' ? 'BUY' : 'MAKE'}</span>${crit}${p.handed ? '<span class="chip">LH / RH</span>' : ''}</div></div>
    <div class="drawing" id="sheet-drawing">${drawing(pi)}</div>
    <p>${esc(p.fn || p.desc || '')}</p>
    <dl class="kv">
      <dt>QUANTITY</dt><dd>${p.qty} per vehicle (${insts} placements)</dd>
      <dt>MATERIAL</dt><dd>${esc(m.name)}</dd>
      <dt>PROCESS</dt><dd>${esc(p.process || '—')}</dd>
      <dt>ENVELOPE</dt><dd>${p.dims_mm.map((d) => fmt(d, 1)).join(' × ')} mm</dd>
      <dt>UNIT MASS</dt><dd>${fmt(p.mass_kg, p.mass_kg < 1 ? 3 : 2)} kg · total ${fmt(p.mass_kg * p.qty, 2)} kg</dd>
      <dt>VOLUME / AREA</dt><dd>${fmt(p.volume_cm3, 1)} cm³ · ${fmt(p.area_cm2, 0)} cm²</dd>
      <dt>CAD BASIS</dt><dd>${esc(p.basis)} · ${p.faces} B-rep faces · ${p.mesh.ni / 3} display triangles</dd>
      <dt>LOCATION</dt><dd>${where.map(esc).join(', ')}${where.length >= 6 ? '…' : ''}</dd>
      ${spec}
    </dl>
    ${p.desc && p.fn ? `<p>${esc(p.desc)}</p>` : ''}
    <div class="sheet-actions">
      <button id="sheet-frame">Frame in view</button>
      <button id="sheet-iso">${adv.isolate ? 'Show full vehicle' : 'Isolate part'}</button>
      <button id="sheet-region">Expand its region</button>
      <a href="${REPO}cad/rev08/step/${p.step}" target="_blank" rel="noopener">STEP${p.step_lh ? ' (RH)' : ''} ↗</a>
      ${p.step_lh ? `<a href="${REPO}cad/rev08/step/${p.step_lh}" target="_blank" rel="noopener">STEP (LH) ↗</a>` : ''}
    </div>
    <p class="sheet-note">Mass is computed from the B-rep volume (or laminate area × ply thickness for skins) and the material density. Concept geometry only: no tolerances, fits or qualified loads.</p>`;
  $('sheet-frame').onclick = () => { setAdvView('3d'); frameOverlays(); };
  $('sheet-region').onclick = () => { const rec = OBJS.find((r) => r.pi === pi); if (rec) { setAdvView('3d'); focusRegion('advanced', rec.region, rec); } };
  $('sheet-iso').onclick = () => { adv.isolate = !adv.isolate; refreshIsolation(); renderSheet(pi); if (adv.isolate) frameOverlays(); };
}
function drawing(pi) {
  const P = PARTS[pi], pos = P.edges.attributes.position.array, bb = P.geo.boundingBox;
  const sz = bb.getSize(new THREE.Vector3());
  const W = 320, Hh = 230, pad = 16;
  const views3 = [['SIDE', 0, 1, sz.x, sz.y], ['TOP', 0, 2, sz.x, sz.z], ['END', 2, 1, sz.z, sz.y]];
  const cells = [[pad, pad, 190, 110], [pad, 134, 190, 80], [222, pad, 84, 110]];
  const nseg = pos.length / 6, stride = Math.max(1, Math.ceil(nseg / 5000));
  let out = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Orthographic drawing">`;
  out += `<rect x="0.5" y="0.5" width="${W - 1}" height="${Hh - 1}" fill="none" stroke="#6be1ed30"/>`;
  views3.forEach(([name, a, b, wa, wb], vi) => {
    const [cx, cy, cw, ch] = cells[vi];
    const s = Math.min(cw / Math.max(wa, 1e-6), ch / Math.max(wb, 1e-6)) * .82;
    const ox = cx + (cw - wa * s) / 2, oy = cy + (ch - wb * s) / 2;
    const mn = [bb.min.x, bb.min.y, bb.min.z];
    let d = '';
    for (let i = 0; i < nseg; i += stride) {
      const k = i * 6;
      const x1 = ox + (pos[k + a] - mn[a]) * s, y1 = oy + wb * s - (pos[k + b] - mn[b]) * s;
      const x2 = ox + (pos[k + 3 + a] - mn[a]) * s, y2 = oy + wb * s - (pos[k + 3 + b] - mn[b]) * s;
      d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    out += `<path d="${d}" fill="none" stroke="#6be1ed" stroke-width=".55" opacity=".9"/>`;
    out += `<text x="${cx}" y="${cy + ch + 9}" fill="#8faeb9" font-size="7" font-family="IBM Plex Mono, monospace">${name} · ${fmt(wa * 1000, 0)} × ${fmt(wb * 1000, 0)} mm</text>`;
  });
  out += `<text x="${W - pad}" y="${Hh - 8}" text-anchor="end" fill="#6be1ed" font-size="7" font-family="IBM Plex Mono, monospace">${DATA.parts[pi].pn} · REV 08 · THIRD-ANGLE</text></svg>`;
  return out;
}
function setAdvView(vw) {
  adv.view = vw;
  document.querySelectorAll('[data-advview]').forEach((b) => b.classList.toggle('active', b.dataset.advview === vw));
  $('adv-viewport').hidden = vw !== '3d'; $('adv-bom').hidden = vw !== 'bom'; $('adv-mass').hidden = vw !== 'mass';
  if (vw === 'bom') renderBom(); if (vw === 'mass') renderMass(); if (vw === '3d') resize();
}
function renderBom() {
  const q = $('adv-search').value.trim().toLowerCase(), f = $('adv-filter').value;
  const cols = [['pn', 'PART NO.'], ['name', 'NAME'], ['system', 'SYSTEM'], ['qty', 'QTY'], ['mat', 'MATERIAL'], ['supplier', 'MAKE / BUY'], ['mass_kg', 'UNIT kg'], ['tot', 'TOTAL kg'], ['env', 'ENVELOPE mm']];
  let rows = DATA.parts.map((p, i) => ({ i, p, pn: p.pn, name: p.name, system: p.system, qty: p.qty, mat: DATA.materials[p.material].name, supplier: p.supplier, mass_kg: p.mass_kg, tot: p.mass_kg * p.qty, env: p.dims_mm[0] * p.dims_mm[1] * p.dims_mm[2] }))
    .filter((r) => partMatches(r.p, q, f));
  const [k, dir] = adv.sort;
  rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
  const tm = rows.reduce((a, r) => a + r.tot, 0), tq = rows.reduce((a, r) => a + r.qty, 0);
  $('adv-bom').innerHTML = `<div class="bom-summary"><span><b>${rows.length}</b> unique parts</span><span><b>${tq.toLocaleString()}</b> pieces</span><span><b>${fmt(tm, 1)} kg</b> listed mass</span><span>STEP library: <a href="${REPO}cad/rev08" target="_blank" rel="noopener">cad/rev08 ↗</a></span></div>
    <div style="overflow-x:auto"><table class="bom-table"><thead><tr>${cols.map(([c, l]) => `<th data-k="${c}" class="${c === k ? 'sorted' : ''}">${l}${c === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>
    ${rows.map((r) => `<tr data-pi="${r.i}"><td class="pn">${r.pn}</td><td>${esc(r.name)}</td><td>${esc(r.system)}</td><td class="num">${r.qty}</td><td>${esc(r.mat)}</td><td>${r.supplier}</td><td class="num">${fmt(r.mass_kg, 3)}</td><td class="num">${fmt(r.tot, 2)}</td><td class="num">${r.p.dims_mm.map((d) => Math.round(d)).join('×')}</td></tr>`).join('')}</tbody></table></div>`;
  $('adv-bom').querySelectorAll('th').forEach((th) => th.addEventListener('click', () => { const c = th.dataset.k; adv.sort = [c, adv.sort[0] === c ? -adv.sort[1] : 1]; renderBom(); }));
  $('adv-bom').querySelectorAll('tbody tr').forEach((tr) => tr.addEventListener('click', () => { setAdvView('3d'); selectPart(+tr.dataset.pi, -1, true); }));
}
function renderMass() {
  const bys = Object.entries(MASS.road.bySys).sort((a, b) => b[1] - a[1]);
  const max = bys[0][1];
  const r = MASS.rotors, xf = (r.FL.x + r.FR.x) / 2, xr = (r.RL.x + r.RR.x) / 2;
  const split = flightModel(FLIGHT);
  $('adv-mass').innerHTML = `<div class="mass-grid"><div>
      <span class="eyebrow">MASS ROLL-UP FROM ${DATA.parts.length} CAD PARTS</span><h3 style="font-weight:500;margin:6px 0 12px">Empty ${fmt(MASS.empty, 0)} kg · gross ${fmt(MASS.road.m, 0)} kg with two occupants</h3>
      <div class="mass-bars">${bys.map(([s, m]) => `<div class="mass-row"><span>${esc(s)}</span><span class="bar"><i style="width:${(m / max * 100).toFixed(1)}%"></i></span><b>${fmt(m, 1)} kg</b></div>`).join('')}</div></div>
    <div class="flight-notes" style="grid-template-columns:1fr">
      <div><h4>Centre of gravity</h4><p>Road: x ${fmt(MASS.road.cg.x * 1000, 0)} mm, y ${fmt(MASS.road.cg.y * 1000, 0)} mm, z ${fmt(MASS.road.cg.z * 1000, 0)} mm.<br>Hover (modules converted): x ${fmt(MASS.hover.cg.x * 1000, 0)} mm, y ${fmt(MASS.hover.cg.y * 1000, 0)} mm.</p></div>
      <div><h4>Rotor centroid vs CG</h4><p>Front rotors at x ${fmt(xf * 1000, 0)} mm, rear at x ${fmt(xr * 1000, 0)} mm. The CG sits ${fmt(Math.abs(MASS.hover.cg.x - (xf + xr) / 2) * 1000, 0)} mm ${MASS.hover.cg.x > (xf + xr) / 2 ? 'forward' : 'aft'} of the rotor centroid, so the ${MASS.hover.cg.x > (xf + xr) / 2 ? 'front' : 'rear'} pair carries ${fmt(Math.max(split.kFront, 1 - split.kFront) * 100, 1)} % of hover thrust. Equal loading is optimal (memo Eq. 44); the imbalance costs ${fmt((split.splitPenalty - 1) * 100, 2)} % hover power.</p></div>
      <div><h4>Against the 2,400 kg design gross mass</h4><p>${MASS.road.m <= 2400 ? 'Within' : 'Over'} the rotor sizing mass by ${fmt(Math.abs(2400 - MASS.road.m), 0)} kg. The largest contributors are the battery, the four fan-wheel modules (tyre, duct, petals) and the structure: these are the mass-reduction targets.</p></div>
    </div></div>`;
}

// ------------------------------------------------------------------ 07 PROPROTOR & FLIGHT DYNAMICS
const RHO = 1.225, G0 = 9.80665;
let FLIGHT;
const INPUTS = [
  ['Vehicle', [['mass', 'Gross mass', 'kg', 1200, 3200, 10], ['battery', 'Battery energy', 'kWh', 40, 160, 1], ['usable', 'Usable energy fraction', '', .6, .95, .01]]],
  ['Rotor geometry (CADed baseline)', [['R', 'Tip radius R', 'm', .35, .75, .005], ['B', 'Blades B', '', 3, 10, 1], ['sigma', 'Solidity σ', '', .1, .6, .005],
    ['r0', 'Airfoil start r₀/R', '', .1, .35, .01], ['rm', 'Max-chord station r_m/R', '', .2, 1, .01], ['c2', 'Chord concavity c₂', '', -1.5, 0, .01], ['muD', 'Twist design inflow μ_d', '', 0, .8, .01]]],
  ['Operating point', [['tip', 'Hover tip speed ωR', 'm/s', 150, 300, 1], ['duct', 'Duct thrust share', '', 0, .55, .01], ['fom', 'Figure of merit (ducted)', '', .5, .85, .01],
    ['thH', 'Hover collective θc', '°', -10, 40, .5], ['vC', 'Cruise speed', 'km/h', 40, 260, 1], ['rpmC', 'Cruise RPM / hover RPM', '', .5, 1.1, .01], ['thC', 'Cruise collective θc', '°', -10, 50, .5]]],
  ['Airframe', [['cda', 'Drag area C_D·A', 'm²', .6, 3, .05], ['clS', 'Body lift C_L·S', 'm²', 0, 4, .05], ['tiltMax', 'Tilt limit', '°', 0, 90, 1], ['cd0', 'Blade profile drag C_d0', '', .006, .02, .001]]],
];
function initFlight() {
  const pp = DATA.meta.proprotor;
  FLIGHT = { mass: Math.round(MASS.road.m / 10) * 10, battery: Math.round(MASS.cells * 93.6 / 100) / 10, usable: .85, R: pp.R, B: pp.B, sigma: pp.sigma, r0: pp.r0_R, rm: pp.r_m, c2: pp.c2, muD: pp.mu_design,
    tip: pp.tip_speed_hover, duct: pp.duct_thrust_share, fom: .72, thH: 2, vC: pp.v_cruise * 3.6, rpmC: pp.cruise_rpm_ratio, thC: 6, cda: 1.6, clS: 1.8, tiltMax: 30, cd0: .01, crMin: .05, ctMin: 0 };
  FLIGHT.thH = Math.round(flightModel(FLIGHT).thHoverAuto * 2) / 2;
  FLIGHT.thC = Math.round(flightModel(FLIGHT).thCruiseAuto * 2) / 2;
  $('flight-inputs').innerHTML = INPUTS.map(([g, list]) => `<h4>${g.toUpperCase()}</h4>` + list.map(([k, l, u, a, b, s]) =>
    `<label class="fin" for="fin-${k}">${l}<output id="fout-${k}"></output><input id="fin-${k}" type="range" min="${a}" max="${b}" step="${s}" value="${FLIGHT[k]}" data-k="${k}" data-u="${u}"></label>`).join('')).join('') +
    `<button class="tl-btn" id="fin-reset">Reset to CADed design</button>`;
  $('flight-inputs').querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { FLIGHT[i.dataset.k] = +i.value; renderFlight(); }));
  $('fin-reset').addEventListener('click', () => { initFlight(); renderFlight(); });
  renderFlight();
}
function chordCoeffs(F) {               // Eq. 26 & 28 (R = 1)
  const c1 = -2 * F.c2 * F.rm;
  const c0 = F.sigma / F.B * Math.PI / (1 - F.r0) - F.c2 * (1 + F.r0 + F.r0 ** 2) / 3 + F.c2 * F.rm * (1 + F.r0);
  return [F.c2, c1, c0];
}
const chordAt = (F, x) => { const [a, b, c] = chordCoeffs(F); return a * x * x + b * x + c; };
const phiDeg = (x, mu) => deg(Math.atan2(mu, x));                        // Eq. 8
const twistDeg = (F, x) => phiDeg(x, F.muD) - phiDeg(.75, F.muD);         // memo §2E, referenced to 3/4 R
function flightModel(F) {
  const W = F.mass * G0, A = Math.PI * F.R ** 2, At = 4 * A, Tr = W / 4;
  const om = F.tip / F.R;
  const CT = Tr * (1 - F.duct) / (RHO * A * F.tip ** 2);                 // Eq. 6
  const dl = W / At;                                                      // Eq. 2
  const PidDuct = W ** 1.5 / Math.sqrt(4 * RHO * At), PidOpen = W * Math.sqrt(W / (2 * RHO * At));
  const lamH = Math.sqrt(Tr / (RHO * A)) / F.tip;                          // ducted rotor inflow ratio
  const hoverkW = PidDuct / F.fom / 1e3;
  // CG-based thrust split (memo Eq. 44: equal disk loading is optimal)
  let kFront = .5, splitPenalty = 1;
  if (MASS.rotors) {
    const xf = (MASS.rotors.FL.x + MASS.rotors.FR.x) / 2, xr = (MASS.rotors.RL.x + MASS.rotors.RR.x) / 2;
    kFront = clamp((MASS.hover.cg.x - xr) / (xf - xr));
    splitPenalty = (2 * (kFront / 2) ** 1.5 + 2 * ((1 - kFront) / 2) ** 1.5) / (4 * .25 ** 1.5);
  }
  // forward flight trim and power (momentum + blade profile + parasite); partial conversion via tilt
  const powerAt = (V, rpmRatio = F.rpmC) => {
    const q = .5 * RHO * V * V, D = q * F.cda, L = q * F.clS;
    const Tz = Math.max(W - L, 0), T = Math.hypot(D, Tz), tilt = deg(Math.atan2(D, Tz));
    const Ti = T / 4, a = rad(tilt);
    const Vax = V * Math.sin(a), Ved = V * Math.cos(a);
    let vi = Math.sqrt(Ti / (2 * RHO * A));
    for (let k = 0; k < 40; k++) vi = Ti / (2 * RHO * A * Math.max(1e-3, Math.hypot(Ved, Vax + vi)));   // Glauert
    const kd = Math.sqrt(1 / 2);                                            // ideal duct (σd = 1): induced power × 1/√2 vs open rotor
    const Pi = 4 * Ti * vi * 1.15 * kd;                                      // κ = 1.15 non-ideal induced factor
    const tipC = F.tip * rpmRatio, mu = Ved / tipC;
    const Pp = 4 * F.sigma * F.cd0 / 8 * RHO * A * tipC ** 3 * (1 + 4.65 * mu * mu);
    const Pc = 4 * Ti * Vax;                                                // useful axial work (propulsive)
    const Ppar = D * V;
    return { V, tilt, T, mu, vi, Pi: Pi / 1e3, Pp: Pp / 1e3, Pc: Pc / 1e3, Ppar: Ppar / 1e3 };
  };
  const Vc = F.vC / 3.6, cr = powerAt(Vc);
  const hov = powerAt(0, 1);
  const scale = hoverkW / (hov.Pi + hov.Pp);                               // rotor losses anchored to the FoM hover estimate
  const tot = (s) => ({ ...s, Pi: s.Pi * scale, Pp: s.Pp * scale, P: (s.Pi + s.Pp) * scale + s.Pc });
  const sweep = []; for (let v = 0; v <= 75; v += 1.5) sweep.push(tot(powerAt(v, v < 1 ? 1 : F.rpmC)));
  const crP = tot(cr).P;
  const E = F.battery * F.usable;
  // collective that puts the 3/4-R section at α = 6° (Eq. 12)
  const phi75H = phiDeg(.75, lamH), thHoverAuto = phi75H + 6 - twistDeg(F, .75);
  const omC = om * F.rpmC, lamC = (Vc * Math.sin(rad(cr.tilt)) + cr.vi) / (F.tip * F.rpmC);
  const thCruiseAuto = phiDeg(.75, lamC) + 6;
  const roots = [chordAt(F, F.r0), chordAt(F, 1)];
  return { W, A, At, Tr, om, CT, CTs: CT / F.sigma, dl, PidDuct, PidOpen, hoverkW, lamH, rpmHover: om * 60 / (2 * Math.PI), Mtip: F.tip / 340.3, kFront, splitPenalty,
    cr: { ...cr, P: crP }, sweep, E, hoverMin: E / hoverkW * 60, cruiseMin: E / crP * 60, rangeKm: E / crP * Vc * 3.6, lamC, thHoverAuto, thCruiseAuto, roots,
    installed: 4 * 230, cont: 4 * 165, sigmaMin: CT / .12 * F.sigma / F.sigma };
}
function renderFlight() {
  if (!FLIGHT) return;
  const F = FLIGHT, M = flightModel(F);
  for (const g of INPUTS) for (const [k, , u, , , s] of g[1]) { const o = $('fout-' + k); if (o) o.textContent = `${fmt(F[k], s >= 1 ? 0 : s >= .1 ? 1 : s >= .01 ? 2 : 3)}${u ? ' ' + u : ''}`; }
  const st = (v, okMax, midMax) => (v <= okMax ? 'ok' : v <= midMax ? 'mid' : 'bad');
  const kpis = [
    ['DISK LOADING', `${fmt(M.dl / 47.88, 0)} lb/ft²`, `${fmt(M.dl, 0)} Pa · Eq. 2`, st(M.dl / 47.88, 60, 120)],
    ['BLADE LOADING C_T/σ', fmt(M.CTs, 3), 'limit ≈ 0.12 · Eq. 6', st(M.CTs, .12, .13)],
    ['HOVER POWER', `${fmt(M.hoverkW, 0)} kW`, `installed ${M.installed} kW peak`, st(M.hoverkW / M.installed, .8, 1)],
    ['HOVER RPM / TIP MACH', `${fmt(M.rpmHover, 0)} · M${fmt(M.Mtip, 2)}`, 'ωR / a', st(M.Mtip, .72, .8)],
    ['HOVER ENDURANCE', `${fmt(M.hoverMin, 1)} min`, `${fmt(M.E, 0)} kWh usable`, M.hoverMin >= 15 ? 'ok' : M.hoverMin >= 8 ? 'mid' : 'bad'],
    ['CRUISE TILT', `${fmt(M.cr.tilt, 1)}°`, `limit ${F.tiltMax}°`, st(M.cr.tilt, F.tiltMax, F.tiltMax + 5)],
    ['CRUISE μ (EDGEWISE)', fmt(M.cr.mu, 3), 'Eq. 7 · practical μ < 0.7', st(M.cr.mu, .5, .7)],
    ['CRUISE POWER / RANGE', `${fmt(M.cr.P, 0)} kW · ${fmt(M.rangeKm, 0)} km`, `${fmt(M.cruiseMin, 1)} min at ${fmt(F.vC, 0)} km/h`, M.rangeKm >= 80 ? 'ok' : M.rangeKm >= 30 ? 'mid' : 'bad'],
    ['ROOT / TIP CHORD', `${fmt(M.roots[0] * F.R * 1000, 0)} / ${fmt(M.roots[1] * F.R * 1000, 0)} mm`, 'Eq. 23, 28', M.roots[0] >= F.crMin && M.roots[1] >= F.ctMin ? 'ok' : 'bad'],
    ['HOVER THRUST SPLIT', `${fmt(M.kFront * 100, 1)} / ${fmt((1 - M.kFront) * 100, 1)} %`, `front / rear · +${fmt((M.splitPenalty - 1) * 100, 2)} % power`, st(Math.abs(M.kFront - .5), .03, .08)],
  ];
  $('flight-kpis').innerHTML = kpis.map(([k, v, s, c]) => `<div class="kpi ${c}"><small>${k}</small><b>${v}</b><span>${s}</span></div>`).join('');
  const C = [];
  // A. inflow angle across the blade (Fig. 5a)
  const xs = []; for (let x = F.r0; x <= 1.0001; x += .02) xs.push(+x.toFixed(3));
  C.push(lineChart('Inflow angle across the blade', 'Fig. 5a · Eq. 8', 'Inflow angle φ = atan(μR/r). The hover curve uses the ducted inflow ratio λ, which is large here because of the high disk loading.',
    { x: [0, 1], y: [0, 90], xl: 'r/R', yl: 'φ, deg', series: [
      { name: `Hover λ = ${fmt(M.lamH, 2)}`, c: 'var(--s1)', pts: xs.map((x) => [x, phiDeg(x, M.lamH)]) },
      { name: `Cruise λ = ${fmt(M.lamC, 2)}`, c: 'var(--s2)', pts: xs.map((x) => [x, phiDeg(x, M.lamC)]) },
      { name: 'μ = 0.1 / 0.5 / 0.9', c: 'var(--muted)', dash: '3 3', pts: xs.map((x) => [x, phiDeg(x, .1)]) },
      { name: '', c: 'var(--muted)', dash: '3 3', pts: xs.map((x) => [x, phiDeg(x, .5)]) },
      { name: '', c: 'var(--muted)', dash: '3 3', pts: xs.map((x) => [x, phiDeg(x, .9)]) }] }));
  // B. phi_3/4 and delta-phi vs mu (Fig. 5b)
  const mus = []; for (let m = .05; m <= .9001; m += .025) mus.push(+m.toFixed(3));
  C.push(lineChart('Inflow at ¾R and root-to-tip change', 'Fig. 5b · Eq. 32–33', `Δφ peaks at μ = √(r₀/R) = ${fmt(Math.sqrt(F.r0), 2)}. A large Δφ means no single twist suits the whole operating range.`,
    { x: [0, .9], y: [0, 60], xl: 'advance / inflow ratio μ', yl: 'deg', vline: [Math.sqrt(F.r0), '√r₀'], series: [
      { name: 'φ at r/R = 0.75', c: 'var(--s1)', pts: mus.map((m) => [m, phiDeg(.75, m)]) },
      { name: 'Δφ root → tip', c: 'var(--s2)', pts: mus.map((m) => [m, phiDeg(F.r0, m) - phiDeg(1, m)]) }] }));
  // C. angle of attack hover & cruise (Fig. 8)
  C.push(lineChart('Section angle of attack, hover vs cruise', 'Fig. 8 · Eq. 12', 'α(r) = β(r) − φ(r) + θc. Hatched: stall beyond ±15°; below about −2° the cambered NACA 24xx sections stop producing positive lift.',
    { x: [0, 1], y: [-20, 40], xl: 'r/R', yl: 'α, deg', zones: [[15, 40, 'Stalled flow'], [-15, -2, 'Negative thrust'], [-20, -15, '']], series: [
      { name: `Hover, θc = ${fmt(F.thH, 1)}°`, c: 'var(--s1)', pts: xs.map((x) => [x, twistDeg(F, x) - phiDeg(x, M.lamH) + F.thH]) },
      { name: `Cruise, θc = ${fmt(F.thC, 1)}°`, c: 'var(--s2)', pts: xs.map((x) => [x, twistDeg(F, x) - phiDeg(x, M.lamC) + F.thC]) }] }));
  // D. chord distribution + planform
  C.push(lineChart('Blade chord distribution', 'Eq. 23, 26, 28', `Quadratic chord with maximum at r_m/R = ${fmt(F.rm, 2)} meeting σ = ${fmt(F.sigma, 3)} with B = ${F.B}. Filled band is the blade planform (chord centred on the pitch axis).`,
    { x: [0, 1], y: [-.3, .3], xl: 'r/R', yl: 'c/R (planform ±c/2)', band: xs.map((x) => [x, chordAt(F, x) / 2]), series: [
      { name: 'c(r)/R', c: 'var(--s1)', pts: xs.map((x) => [x, chordAt(F, x)]) }], yTicks: [-.3, -.2, -.1, 0, .1, .2, .3] }));
  C.push(lineChart('Geometric twist', 'memo §2E', `β(r) aligned with the design inflow ratio μ_d = ${fmt(F.muD, 2)} and referenced to zero at ¾R. Collective is added on top (Eq. 9).`,
    { x: [0, 1], y: [-10, 40], xl: 'r/R', yl: 'β, deg', series: [{ name: 'β(r)', c: 'var(--s3)', pts: xs.map((x) => [x, twistDeg(F, x)]) }] }));
  // E. quadratic chord solution space (Fig. 12)
  C.push(solutionSpace(F));
  // F. edgewise V-perp polar (Fig. 3)
  C.push(polarChart(M.cr.mu));
  // G. power vs speed
  C.push(lineChart('Power required vs airspeed', 'momentum + blade-element profile + parasite', `Anchored to the hover estimate (ideal ducted power / FoM). Rotor axes tilt to balance drag; cruise at ${fmt(F.vC, 0)} km/h needs ${fmt(M.cr.tilt, 1)}° tilt.`,
    { x: [0, 270], y: [0, Math.max(1200, M.hoverkW * 1.15)], xl: 'airspeed, km/h', yl: 'kW', vline: [F.vC, 'cruise'], hlines: [[M.installed, 'installed peak'], [M.cont, 'continuous']], series: [
      { name: 'Total', c: 'var(--s1)', pts: M.sweep.map((s) => [s.V * 3.6, s.P]) },
      { name: 'Induced', c: 'var(--s2)', pts: M.sweep.map((s) => [s.V * 3.6, s.Pi]) },
      { name: 'Profile', c: 'var(--s3)', pts: M.sweep.map((s) => [s.V * 3.6, s.Pp]) },
      { name: 'Parasite', c: 'var(--s4)', pts: M.sweep.map((s) => [s.V * 3.6, s.Ppar]) }] }));
  // H. Froude efficiency vs disk area (Eq. 3) at cruise thrust
  const T = M.cr.T, Vc = F.vC / 3.6, areas = []; for (let a = 1; a <= 30.01; a += .5) areas.push(a);
  const etaP = (Aa) => 2 * Vc / (Vc + Math.sqrt(2 * T / (RHO * Aa) + Vc * Vc));
  C.push(lineChart('Ideal propulsive efficiency vs disk area', 'Eq. 3, 45', `Froude efficiency at the cruise thrust (${fmt(T / 1000, 1)} kN) and ${fmt(F.vC, 0)} km/h. Adding area has diminishing returns; the fan-wheels give ${fmt(M.At, 2)} m².`,
    { x: [0, 30], y: [0, 1], xl: 'total disk area, m²', yl: 'η_p', vline: [M.At, 'Rev 08'], series: [{ name: 'η_p (ideal, upper bound)', c: 'var(--s1)', pts: areas.map((a) => [a, etaP(a)]) }] }));
  $('flight-charts').innerHTML = C.join('');
  wireTips();
  // notes + allocation
  const r = MASS.rotors, arms = ['FL', 'FR', 'RL', 'RR'].map((k) => [k, r[k].x - MASS.hover.cg.x, r[k].z - MASS.hover.cg.z]);
  const kq = (M.hoverkW * 1000 / 4 * F.fom) / M.om / M.Tr; // reaction torque per unit thrust, m
  const spin = { FL: 1, FR: -1, RL: -1, RR: 1 };
  $('flight-notes').innerHTML = `
    <div><h4>Findings for the CADed design</h4><ul>
      <li>Wheel-limited fans give ${fmt(M.At, 2)} m² of disk for ${fmt(F.mass, 0)} kg: ${fmt(M.dl / 47.88, 0)} lb/ft², several times an open-proprotor eVTOL. Hover power and energy dominate the design.</li>
      <li>C<sub>T</sub>/σ = ${fmt(M.CTs, 3)} ${M.CTs <= .12 ? 'is inside' : 'exceeds'} the ≈0.12 stall limit; it set σ = 0.40 with 7 blades (memo §2B).</li>
      <li>Twist aligned to μ_d = ${fmt(F.muD, 2)} keeps the hover blade unstalled (chart C). Without a wing the rotors still carry weight in cruise, so cruise is edgewise (μ ≈ ${fmt(M.cr.mu, 2)}) rather than the memo's axial propeller case.</li>
      <li>Endurance ≈ ${fmt(M.hoverMin, 1)} min hovering, or ${fmt(M.rangeKm, 0)} km at cruise. Mass reduction and a deployable wing (Rev 09 trade) are the main levers.</li></ul></div>
    <div><h4>Hover control allocation</h4><p>Rows give force and moments per newton of each rotor's thrust (moment arms from the hover CG; yaw from reaction torque k_Q ≈ ${fmt(kq * 1000, 1)} mm).</p>
      <div style="overflow-x:auto"><table class="alloc"><tr><th></th>${arms.map((a) => `<th>${a[0]}</th>`).join('')}</tr>
      <tr><th>Thrust</th>${arms.map(() => '<td>1</td>').join('')}</tr>
      <tr><th>Roll (m)</th>${arms.map((a) => `<td>${fmt(a[2], 3)}</td>`).join('')}</tr>
      <tr><th>Pitch (m)</th>${arms.map((a) => `<td>${fmt(-a[1], 3)}</td>`).join('')}</tr>
      <tr><th>Yaw (m)</th>${arms.map((a) => `<td>${fmt(spin[a[0]] * kq, 4)}</td>`).join('')}</tr></table></div>
      <p>Four rotors and four control axes: the matrix is square, so a single rotor failure leaves the vehicle under-actuated. Per the Rev 07 register, a degraded three-fan configuration is not assumed controllable; the ballistic parachute covers that case.</p></div>
    <div><h4>Method and limits</h4><p>Momentum theory with an ideal duct (expansion ratio 1), FoM for viscous losses, Glauert inflow in forward flight, blade profile power σC<sub>d0</sub>/8·ρA(ωR)³(1+4.65μ²) and a drag-area airframe. Induced inflow is included in hover φ, unlike the memo's simplified figures. Concept-level only: no aeroelastic, acoustic, duct-lip separation or transient analysis.</p></div>`;
}
// --- chart helpers (SVG, one y-axis, theme tokens, hover crosshair)
let chartId = 0;
function lineChart(title, ref, desc, o) {
  const W = 460, Hh = 250, L = 46, R = 14, T = 12, B = 34, id = 'ch' + (chartId++);
  const sx = (x) => L + (x - o.x[0]) / (o.x[1] - o.x[0]) * (W - L - R), sy = (y) => T + (1 - (y - o.y[0]) / (o.y[1] - o.y[0])) * (Hh - T - B);
  const ticks = (a, b, n = 5) => { const st = niceStep((b - a) / n); const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6)); return out; };
  let s = `<svg viewBox="0 0 ${W} ${Hh}" id="${id}" data-chart='${esc(JSON.stringify({ x: o.x, y: o.y, L, R, T, B, W, H: Hh, s: o.series.filter((q) => q.name).map((q) => ({ n: q.name, c: q.c, p: q.pts.filter((_, i) => i % 1 === 0) })) }))}' role="img" aria-label="${esc(title)}">`;
  s += `<defs><pattern id="hatch-${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--surface)"/><line x1="0" y1="0" x2="0" y2="7" stroke="var(--muted)" stroke-width="1" opacity=".5"/></pattern></defs>`;
  for (const z of o.zones || []) { const y1 = sy(Math.min(z[1], o.y[1])), y0 = sy(Math.max(z[0], o.y[0])); s += `<rect x="${L}" y="${y1}" width="${W - L - R}" height="${y0 - y1}" fill="url(#hatch-${id})" opacity=".8"/>${z[2] ? `<text x="${W - R - 4}" y="${y1 + 12}" text-anchor="end">${z[2]}</text>` : ''}`; }
  for (const v of o.yTicks || ticks(o.y[0], o.y[1])) s += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${sy(v) + 3}" text-anchor="end">${+v.toFixed(3)}</text>`;
  for (const v of ticks(o.x[0], o.x[1])) s += `<text x="${sx(v)}" y="${Hh - B + 14}" text-anchor="middle">${+v.toFixed(3)}</text>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${Hh - B}" y2="${Hh - B}" stroke="var(--muted)" stroke-width="1" opacity=".5"/>`;
  s += `<text x="${(L + W - R) / 2}" y="${Hh - 4}" text-anchor="middle">${o.xl}</text><text transform="translate(11 ${(T + Hh - B) / 2}) rotate(-90)" text-anchor="middle">${o.yl}</text>`;
  if (o.band) { const top = o.band.map(([x, y]) => `${sx(x)},${sy(y)}`), bot = o.band.slice().reverse().map(([x, y]) => `${sx(x)},${sy(-y)}`); s += `<polygon points="${top.concat(bot).join(' ')}" fill="var(--s1)" opacity=".18"/>`; }
  for (const [y, lab] of o.hlines || []) if (y <= o.y[1]) s += `<line x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}" stroke="var(--amber)" stroke-dasharray="5 4" stroke-width="1"/><text x="${L + 4}" y="${sy(y) - 4}">${lab} ${fmt(y, 0)}</text>`;
  if (o.vline && o.vline[0] >= o.x[0] && o.vline[0] <= o.x[1]) s += `<line x1="${sx(o.vline[0])}" x2="${sx(o.vline[0])}" y1="${T}" y2="${Hh - B}" stroke="var(--text)" stroke-dasharray="2 3" opacity=".6"/><text x="${sx(o.vline[0]) + 4}" y="${T + 10}" class="ttl">${o.vline[1]}</text>`;
  for (const q of o.series) { const d = q.pts.filter(([x, y]) => Number.isFinite(y)).map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(clamp(y, o.y[0] - (o.y[1] - o.y[0]) * .05, o.y[1] + (o.y[1] - o.y[0]) * .05)).toFixed(1)}`).join(''); s += `<path d="${d}" fill="none" stroke="${q.c}" stroke-width="2" ${q.dash ? `stroke-dasharray="${q.dash}"` : ''} stroke-linejoin="round" clip-path="url(#clip-${id})"/>`; }
  s += `<clipPath id="clip-${id}"><rect x="${L}" y="${T}" width="${W - L - R}" height="${Hh - T - B}"/></clipPath>`;
  s += `<g class="xh" style="display:none"><line y1="${T}" y2="${Hh - B}" stroke="var(--text)" opacity=".35"/></g></svg>`;
  const legend = o.series.filter((q) => q.name).map((q) => `<span><i style="background:${q.c}"></i>${esc(q.name)}</span>`).join('');
  return `<article class="chart-card"><span class="ref">${esc(ref)}</span><h4>${esc(title)}</h4>${o.series.filter((q) => q.name).length > 1 ? `<div class="legend">${legend}</div>` : ''}${s}<p>${desc}</p></article>`;
}
function niceStep(raw) { const p = 10 ** Math.floor(Math.log10(raw)); const f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
function wireTips() {
  document.querySelectorAll('#flight-charts svg[data-chart]').forEach((svg) => {
    const d = JSON.parse(svg.dataset.chart), card = svg.closest('.chart-card');
    let tip = card.querySelector('.chart-tip'); if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true; card.appendChild(tip); }
    const xh = svg.querySelector('.xh');
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * d.W;
      if (px < d.L || px > d.W - d.R) { tip.hidden = true; xh.style.display = 'none'; return; }
      const x = d.x[0] + (px - d.L) / (d.W - d.L - d.R) * (d.x[1] - d.x[0]);
      const rows = d.s.map((q) => { let best = q.p[0]; for (const p of q.p) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return [q, best]; });
      xh.style.display = ''; xh.querySelector('line').setAttribute('x1', px); xh.querySelector('line').setAttribute('x2', px);
      tip.innerHTML = `x = ${fmt(rows[0][1][0], 2)}<br>` + rows.map(([q, p]) => `<span style="color:${q.c}">■</span> ${esc(q.n)}: ${fmt(p[1], 2)}`).join('<br>');
      tip.hidden = false;
      const cr = card.getBoundingClientRect();
      tip.style.left = Math.min(cr.width - 190, e.clientX - cr.left + 14) + 'px'; tip.style.top = (e.clientY - cr.top + 10) + 'px';
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; xh.style.display = 'none'; });
  });
}
function solutionSpace(F) {
  const W = 460, Hh = 250, L = 46, R = 14, T = 12, B = 34;
  const sx = (x) => L + x * (W - L - R), sy = (y) => T + (-y / 1.5) * (Hh - T - B);
  let cells = '';
  const nx = 60, ny = 40;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const rm = (i + .5) / nx, c2 = -(j + .5) / ny * 1.5;
    if (rm < F.r0) continue;
    const G = { ...F, rm, c2 };
    const ok = chordAt(G, F.r0) >= F.crMin && chordAt(G, 1) >= F.ctMin && chordAt(G, rm) > 0;
    if (ok) cells += `<rect x="${sx(i / nx).toFixed(1)}" y="${sy(-j / ny * 1.5).toFixed(1)}" width="${((W - L - R) / nx + .4).toFixed(1)}" height="${((Hh - T - B) / ny + .4).toFixed(1)}" fill="var(--s1)" opacity=".28"/>`;
  }
  let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Quadratic chord solution space">${cells}`;
  for (const v of [0, -.3, -.6, -.9, -1.2, -1.5]) s += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${sy(v) + 3}" text-anchor="end">${v}</text>`;
  for (const v of [0, .2, .4, .6, .8, 1]) s += `<text x="${sx(v)}" y="${Hh - B + 14}" text-anchor="middle">${v}</text>`;
  s += `<circle cx="${sx(F.rm)}" cy="${sy(F.c2)}" r="5" fill="var(--amber)" stroke="var(--surface)" stroke-width="2"/><text x="${sx(F.rm) + 9}" y="${sy(F.c2) + 4}" class="ttl">Rev 08 blade</text>`;
  s += `<text x="${(L + W - R) / 2}" y="${Hh - 4}" text-anchor="middle">radial station of maximum chord r_m/R</text><text transform="translate(11 ${(T + Hh - B) / 2}) rotate(-90)" text-anchor="middle">c₂</text></svg>`;
  return `<article class="chart-card"><span class="ref">Fig. 12 · Eq. 26–28</span><h4>Quadratic chord solution space</h4>${s}<p>Shaded: (r_m, c₂) pairs that meet σ = ${fmt(F.sigma, 3)} with root chord ≥ ${F.crMin}R and tip chord ≥ ${F.ctMin}R (the memo's example constraints). The marker is the CADed blade.</p></article>`;
}
function polarChart(mu) {
  // memo Fig. 3 convention: freestream from the top, counter-clockwise rotor; azimuth ψ from the right-hand side
  const W = 300, c = 150, Rr = 120, top = 1 + mu;
  let cells = '';
  const col = (v) => {
    if (v < 0) return 'rgb(224,103,90)';
    const t = clamp(v / top), a = [10, 30, 42], b = [140, 236, 245];
    return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`;
  };
  for (let i = 0; i < 18; i++) for (let j = 0; j < 72; j++) {
    const r0 = i / 18, r1 = (i + 1) / 18, p0 = j / 72 * 2 * Math.PI, p1 = (j + 1) / 72 * 2 * Math.PI;
    const v = (r0 + r1) / 2 + mu * Math.cos((p0 + p1) / 2);        // V⊥LE / (ωR) = r/R + μ cos ψ
    const P = (r, p) => `${(c + Rr * r * Math.cos(p)).toFixed(1)},${(c - Rr * r * Math.sin(p)).toFixed(1)}`;
    cells += `<polygon points="${P(r0, p0)} ${P(r1, p0)} ${P(r1, p1)} ${P(r0, p1)}" fill="${col(v)}" stroke="${col(v)}" stroke-width=".3"/>`;
  }
  const rev = mu > 0 ? `<circle cx="${c - Rr * mu / 2}" cy="${c}" r="${Rr * mu / 2}" fill="none" stroke="var(--text)" stroke-dasharray="4 3"/>` : '';
  const s = `<svg viewBox="0 -8 ${W} 300" role="img" aria-label="Edgewise velocity polar">${cells}${rev}
    <line x1="${c}" y1="-6" x2="${c}" y2="22" stroke="var(--text)"/><path d="M${c - 4} 16 L${c} 24 L${c + 4} 16 Z" fill="var(--text)"/><text x="${c + 8}" y="8" class="ttl">V∞</text>
    <text x="${c - Rr - 4}" y="${c + 4}" text-anchor="end">retreating</text><text x="${c + Rr + 4}" y="${c + 4}">advancing</text>
    <text x="${c}" y="288" text-anchor="middle">dashed: reverse-flow circle, diameter μR</text></svg>`;
  return `<article class="chart-card"><span class="ref">Fig. 3 · Eq. 7</span><h4>Edgewise flow at cruise, μ = ${fmt(mu, 3)}</h4>${s}<p>Velocity normal to the leading edge over tip speed, r/R + μ cos ψ: dark near zero, bright at the advancing tip, red where the flow reverses on the retreating side.</p></article>`;
}

// ------------------------------------------------------------------ REGION EXPLORER (click a region: it flies in and explodes)
const REGIONS = [
  { id: 'FL', name: 'Fan-wheel FL', long: 'Fan-wheel / proprotor corner, front port', kind: 'fan' },
  { id: 'FR', name: 'Fan-wheel FR', long: 'Fan-wheel / proprotor corner, front starboard', kind: 'fan' },
  { id: 'RL', name: 'Fan-wheel RL', long: 'Fan-wheel / proprotor corner, rear port', kind: 'fan' },
  { id: 'RR', name: 'Fan-wheel RR', long: 'Fan-wheel / proprotor corner, rear starboard', kind: 'fan' },
  { id: 'battery', name: 'Battery', long: 'Battery pack · 19 modules', kind: 'grid' },
  { id: 'power', name: 'Power electronics', long: 'HV distribution & inverters', kind: 'radial' },
  { id: 'cockpit', name: 'Cockpit', long: 'Cockpit, controls & restraints', kind: 'radial' },
  { id: 'avionics', name: 'Avionics', long: 'Flight control, sensors & harness', kind: 'radial' },
  { id: 'thermal', name: 'Thermal', long: 'Thermal management', kind: 'radial' },
  { id: 'legs', name: 'Landing legs', long: 'Landing legs ×4', kind: 'radial' },
  { id: 'emergency', name: 'Parachute', long: 'Ballistic parachute & fire suppression', kind: 'radial' },
  { id: 'structure', name: 'Structure', long: 'Carbon tub, subframes & road chassis', kind: 'radial' },
  { id: 'body', name: 'Body', long: 'Body panels, doors, glazing & lighting', kind: 'shell' },
];
const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
const FOCUS = { region: null, view: null, hover: null, f: 0, target: 0, fly: null, labels: [], rec: null, briefT: 0 };
function topNode(nid) {
  let n = NODE[nid];
  while (n.def.parent >= 0) {
    const p = NODE[n.def.parent];
    if (p.def.id === 'vehicle' || p.def.id === 'chassis') return n.def.id === 'chassis_R' ? 'chassis' : n.def.id;
    n = p;
  }
  return n.def.id;
}
function assignRegions() {
  for (const r of OBJS) {
    const top = topNode(r.ni), sys = r.sys;
    let id = 'structure';
    if (/^corner_/.test(top)) id = top.slice(7);
    else if (/^leg_/.test(top)) id = 'legs';
    else if (top === 'body' || /^door_/.test(top)) id = 'body';
    else if (top === 'power' || /^bmod_/.test(top)) id = sys === '210' ? 'power' : 'battery';
    else if (top === 'cockpit') id = 'cockpit';
    else if (top === 'avionics') id = 'avionics';
    else if (top === 'thermal') id = 'thermal';
    else if (top === 'emergency' || top === 'emergency_R') id = 'emergency';
    r.region = id;
  }
}
// axial slot (metres along the module axle, + outboard / up in flight) for the fan-wheel exploded view
function fanSlot(rec) {
  const p = PARTS[rec.pi].def, nid = NODE[rec.ni].def.id, a = p.assy;
  if (/^petO_/.test(nid)) return 1.15;
  if (/^petI_/.test(nid)) return -1.25;
  if (a === 'Road tyre') return 0.78;
  if (a === 'Duct & rim') return 0.42;
  if (p.system.startsWith('330')) return /^blade_/.test(nid) ? 0.12 : 0.0;
  if (a === 'Stator') return -0.28;
  if (a === 'Clutch') return -0.46;
  if (p.system.startsWith('320') && a === 'Motor') return -0.64;
  if (a === 'Brakes' || p.system.startsWith('360')) return -0.84;
  if (a === 'Locks') return -0.98;
  if (a === 'Spindle') return -1.06;
  return null;   // yoke, tilt gimbal, suspension, fender cap: pushed radially away instead
}
function recWorldCentroid(rec, out) {
  const P = PARTS[rec.pi], ctr = new THREE.Vector3(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  if (P.def.com) ctr.set(...P.def.com); else P.geo.boundingBox.getCenter(ctr);
  out.set(0, 0, 0);
  rec.obj.updateWorldMatrix(true, false);
  for (const mt of rec.mtx) out.add(v.copy(ctr).applyMatrix4(m.multiplyMatrices(rec.obj.matrixWorld, mt)));
  return out.divideScalar(rec.mtx.length);
}
function recLocalCentroid(rec) {
  const P = PARTS[rec.pi], ctr = new THREE.Vector3(), v = new THREE.Vector3(), out = new THREE.Vector3();
  if (P.def.com) ctr.set(...P.def.com); else P.geo.boundingBox.getCenter(ctr);
  for (const mt of rec.mtx) out.add(v.copy(ctr).applyMatrix4(mt));
  return out.divideScalar(rec.mtx.length);
}
function focusRegion(view, id, pickedRec = null) {
  if (!REGION_BY_ID[id]) return;
  if (FOCUS.region) resetOffsets();
  const R = REGION_BY_ID[id];
  root.updateMatrixWorld(true);
  const recs = OBJS.filter((r) => r.region === id);
  const C = new THREE.Vector3(); let mt = 0;
  const cw = new Map();
  for (const r of recs) { const c = recWorldCentroid(r, new THREE.Vector3()); cw.set(r, c); const m = PARTS[r.pi].def.mass_kg * r.mtx.length + 1e-3; C.addScaledVector(c, m); mt += m; }
  C.divideScalar(mt);
  let axis = null, modC = null;
  if (R.kind === 'fan') {
    const md = NODE_BY_ID['mod_' + id].group; modC = md.getWorldPosition(new THREE.Vector3());
    axis = new THREE.Vector3(0, 0, 1).transformDirection(md.matrixWorld);
    C.copy(modC);
  }
  const box = new THREE.Box3();
  for (const r of recs) {
    const c = cw.get(r), off = new THREE.Vector3();
    if (R.kind === 'fan') {
      const s = fanSlot(r);
      if (s !== null) off.copy(axis).multiplyScalar(s * 1.05);
      else { off.copy(c).sub(modC); off.addScaledVector(axis, -off.dot(axis)); off.setLength(.55).addScaledVector(axis, -.7); }
    } else if (R.kind === 'grid') {
      off.copy(c).sub(C); off.y = 0; off.multiplyScalar(.85); off.y = .35 + (PARTS[r.pi].def.pn === 'JD-200-002' ? .5 : PARTS[r.pi].def.pn === 'JD-200-001' ? -.45 : 0);
    } else {
      off.copy(c).sub(C);
      const L = off.length();
      off.multiplyScalar(R.kind === 'shell' ? .35 : .9); if (L > 1e-4) off.addScaledVector(off.clone().normalize(), R.kind === 'shell' ? .35 : .22);
    }
    const parent = r.obj.parent;
    const p0 = parent.worldToLocal(c.clone()), p1 = parent.worldToLocal(c.clone().add(off));
    r.focusOff = p1.sub(p0);
    box.expandByPoint(c); box.expandByPoint(c.clone().add(off));
  }
  FOCUS.region = id; FOCUS.view = view; FOCUS.f = 0; FOCUS.target = 1; FOCUS.recs = recs; FOCUS.hover = null;
  // camera: frame the exploded envelope from the current viewing direction
  const v = views[view], ctr = box.getCenter(new THREE.Vector3()), radius = Math.max(.6, box.getSize(new THREE.Vector3()).length() * .5);
  const dir = v.camera.position.clone().sub(v.controls.target).normalize();
  if (R.kind === 'fan') {                       // look across the axle so the exploded stack spreads out on screen
    const d = axis.clone().cross(new THREE.Vector3(0, 1, 0));
    if (d.lengthSq() < .01) d.set(1, 0, 0);
    d.normalize(); if (d.x < 0) d.negate();
    dir.copy(d).add(new THREE.Vector3(0, .45, 0)).addScaledVector(axis, .35).normalize();
  }
  FOCUS.fly = { target: ctr, pos: ctr.clone().addScaledVector(dir, radius / Math.tan(rad2(18)) * (R.kind === 'fan' ? 1.25 : 1.0)) };
  buildRegionLabels(recs);
  applyStyle(styleNow);
  if (view === 'sequence') { seq.autoCam = false; }
  renderBrief(true);
  const ui = REGION_UI[view]; ui.brief.hidden = false; ui.back.hidden = false; views[view].el.classList.add('focused');
  ui.chips.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.region === id));
}
const rad2 = (d) => d * Math.PI / 180;
function resetOffsets() { for (const r of OBJS) if (r.focusOff) { r.obj.position.set(0, 0, 0); if (r.line) r.line.position.set(0, 0, 0); r.focusOff = null; } }
function exitFocus(immediate = false) {
  if (!FOCUS.region) return;
  if (immediate) { finishExit(); return; }
  FOCUS.target = 0;
}
function finishExit() {
  const view = FOCUS.view;
  resetOffsets();
  FOCUS.region = null; FOCUS.labels.forEach((l) => l.el.remove()); FOCUS.labels = []; FOCUS.f = 0;
  views[view]?.el.classList.remove('focused');
  const ui = REGION_UI[view]; if (ui) { ui.brief.hidden = true; ui.back.hidden = true; ui.svg.innerHTML = ''; ui.chips.querySelectorAll('button').forEach((b) => b.classList.remove('active')); }
  if (view === 'sequence') seq.autoCam = true;
  if (view === 'advanced') refreshIsolation(); else applyStyle(styleNow);
}
function tickFocus(dt, view) {
  if (!FOCUS.region || FOCUS.view !== view) return;
  const k = 1 - Math.pow(.02, dt);
  FOCUS.f += (FOCUS.target - FOCUS.f) * k;
  if (FOCUS.target === 0 && FOCUS.f < .01) { finishExit(); return; }
  const e = smooth(clamp(FOCUS.f));
  for (const r of FOCUS.recs) { r.obj.position.copy(r.focusOff).multiplyScalar(e); if (r.line) r.line.position.copy(r.obj.position); }
  if (FOCUS.fly && FOCUS.target === 1) {
    const v = views[view], kc = 1 - Math.pow(.08, dt);
    v.controls.target.lerp(FOCUS.fly.target, kc); v.camera.position.lerp(FOCUS.fly.pos, kc);
    if (v.camera.position.distanceTo(FOCUS.fly.pos) < .02) FOCUS.fly = null;
  }
  FOCUS.briefT += dt; if (FOCUS.briefT > .25) { FOCUS.briefT = 0; renderBrief(false); }
}
function buildRegionLabels(recs) {
  FOCUS.labels.forEach((l) => l.el.remove()); FOCUS.labels = [];
  const groups = new Map();
  for (const r of recs) {
    const p = PARTS[r.pi].def, nid = NODE[r.ni].def.id;
    const key = /^petO_/.test(nid) ? 'Petals · inlet collector' : /^petI_/.test(nid) ? 'Petals · exit diffuser' : /^blade_/.test(nid) ? 'Proprotor blades' : p.assy;
    const g = groups.get(key) || { key, mass: 0, n: 0, recs: [] };
    g.mass += p.mass_kg * r.mtx.length; g.n += r.mtx.length; g.recs.push(r); groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => b.mass - a.mass).slice(0, 9);
  const ui = REGION_UI[FOCUS.view];
  for (const g of list) {
    const rep = g.recs.reduce((a, b) => (PARTS[b.pi].def.mass_kg * b.mtx.length > PARTS[a.pi].def.mass_kg * a.mtx.length ? b : a));
    const el = document.createElement('div'); el.className = 'callout-tag region-tag';
    el.innerHTML = `${esc(g.key.toUpperCase())}<small>${g.n} part${g.n > 1 ? 's' : ''} · ${fmt(g.mass, g.mass < 10 ? 1 : 0)} kg</small>`;
    ui.layer.appendChild(el);
    FOCUS.labels.push({ el, obj: rep.obj, pt: recLocalCentroid(rep) });
  }
}
function drawRegionLabels(view) {
  const ui = REGION_UI[view];
  if (!ui) return;
  if (!FOCUS.region || FOCUS.view !== view) { if (ui.svg.innerHTML) ui.svg.innerHTML = ''; return; }
  const v = views[view], w = v.el.clientWidth, h = v.el.clientHeight;
  const cx = FOCUS.fly ? w / 2 : w / 2;
  let svg = ''; const used = [];
  const op = clamp((FOCUS.f - .55) / .35);
  const pts = FOCUS.labels.map((l) => { const p = l.pt.clone().applyMatrix4(l.obj.matrixWorld).project(v.camera); return { l, x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h, vis: p.z < 1 }; });
  pts.sort((a, b) => a.y - b.y);
  for (const q of pts) {
    if (!q.vis) { q.l.el.style.opacity = 0; continue; }
    const right = q.x >= cx;
    const maxX = w - (w > 900 ? 380 : 0) - 110;     // keep clear of the briefing panel
    let lx = clamp(q.x + (right ? 150 : -150), 110, maxX), ly = clamp(q.y - 30, 70, h - 70);
    for (const u of used) if (Math.abs(u.x - lx) < 190 && Math.abs(u.y - ly) < 40) ly = u.y + 42;
    used.push({ x: lx, y: ly });
    q.l.el.style.left = lx + 'px'; q.l.el.style.top = ly + 'px'; q.l.el.style.opacity = op;
    svg += `<line x1="${q.x.toFixed(1)}" y1="${q.y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(ly - 4).toFixed(1)}" opacity="${op}"/><circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="3" opacity="${op}"/>`;
  }
  ui.svg.innerHTML = svg;
}
// what the region is doing right now (sequence time or configuration slider)
function currentPhase(view) {
  if (view === 'sequence') {
    const t = seq.t;
    return t < 14 ? 'assembly' : t < 20 ? 'road' : t < 27 ? 'prepare' : t < 31 ? 'unlock' : t < 37 ? 'convert' : t < 41 ? 'spinup' : t < 47 ? 'hover' : 'cruise';
  }
  const c = adv.config;
  return c < .05 ? 'road' : c < .35 ? 'prepare' : c < .55 ? 'unlock' : c < .98 ? 'convert' : c < 1.05 ? 'hover' : 'cruise';
}
function currentState(view) { return view === 'sequence' ? seqState(seq.t) : configState(adv.config); }
function regionBrief(id, view) {
  const ph = currentPhase(view), st = currentState(view), M = flightModel(FLIGHT), R = REGION_BY_ID[id];
  const flying = ph === 'spinup' || ph === 'hover' || ph === 'cruise';
  const road = view === 'sequence' ? seq.table.v(seq.t) : 0;
  const elec = flying ? (ph === 'cruise' ? M.cr.P : M.hoverkW) * (ph === 'spinup' && view === 'sequence' ? clamp(st.spin / 2.6) : 1) : road > .5 ? 12 + road * 0.9 : 1.5;
  const rpm = st.rotorLocked ? road / DATA.meta.tire_R * 60 / (2 * Math.PI) : M.rpmHover * (view === 'sequence' ? clamp(st.spin / 2.6) : flying ? 1 : 0);
  const PH = { assembly: 'Assembly', road: 'Road mode', prepare: 'Stop & prepare', unlock: 'Unlock & open', convert: 'Converting', spinup: 'Spin-up', hover: 'Hover', cruise: 'Cruise' }[ph];
  let now = '', figs = [];
  if (R.kind === 'fan') {
    const front = id[0] === 'F', share = front ? M.kFront / 2 : (1 - M.kFront) / 2;
    const T = M.W * share / (ph === 'cruise' ? Math.cos(rad2(M.cr.tilt)) : 1);
    const per = elec / 4 * (share / .25);
    const txt = {
      assembly: 'The corner module docks onto its hardpoint bracket: suspension carrier, conversion yoke, then the wheel module itself.',
      road: `Rolling at ${fmt(road * 3.6, 0)} km/h. The dog clutch couples the rotor to the rim, so the axial-flux motor drives the tyre through the stator spokes. Blades are feathered at 90° and the petals are closed over them.`,
      prepare: 'The landing legs take the weight, so this wheel is unloaded. Parking brake on; the module runs its self-test (clutch, lock pins, petal switches, resolver).',
      unlock: 'The clutch releases the rotor from the rim. The brake caliper and two lock pins index the rim to the module. Petals open into an inlet collector and an exit diffuser; collective drives from 90° towards the hover setting.',
      convert: `The harmonic-drive actuator is swinging the module about the hinge above the tyre: ${fmt(st.yoke * 90, 0)}° of 90°. The fender cap rides on the yoke; two RVDTs must agree before the next step.`,
      spinup: `The motor accelerates the 7-blade rotor towards ${fmt(M.rpmHover, 0)} rpm. The seven stator vanes straighten the swirl. ${front === (id[1] === 'L') ? 'This diagonal pair spins counter-clockwise.' : 'This diagonal pair spins clockwise.'}`,
      hover: `Carrying ${fmt(share * 100, 1)} % of the vehicle weight: ${fmt(T / 1000, 1)} kN, of which the duct lip provides about ${fmt(FLIGHT.duct * 100, 0)} %. Disk loading ${fmt(M.dl / 47.88, 0)} lb/ft².`,
      cruise: `The gimbal tilts the rotor axis ${fmt(st.tilt, 1)}° forward. Edgewise advance ratio μ ≈ ${fmt(M.cr.mu, 2)} (NASA TM Eq. 7), collective ${fmt(st.pitch, 1)}°.`,
    };
    now = txt[ph];
    figs = [['Rotor speed', `${fmt(rpm, 0)} rpm`], ['Motor power', `${fmt(per, 0)} kW`], ['Thrust', flying ? `${fmt(T / 1000, 2)} kN` : '0 kN'], ['Conversion yoke', `${fmt(st.yoke * 90, 0)}°`],
      ['Cruise tilt', `${fmt(st.tilt, 1)}°`], ['Collective θ.75', `${fmt(st.pitch, 1)}°`], ['Petals', `${fmt(st.petals * 100, 0)} %`], ['Clutch', st.rotorLocked ? 'Engaged (wheel drive)' : 'Released (rotor free)']];
  } else if (id === 'battery') {
    const E = FLIGHT.battery, I = elec * 1000 / 800, C = elec / E;
    now = { assembly: 'Nineteen modules drop into the floor tray and the rear stack behind the seats; the mica-lined lid seals the pack.',
      road: `Supplying about ${fmt(elec, 0)} kW for driving: a gentle ${fmt(C, 2)}C. Cold plates run on the low-temperature loop.`,
      prepare: 'Contactors closed, pre-charge complete. The BMS confirms state of charge and cell temperatures before conversion is allowed.',
      unlock: 'Small loads only (actuators, petals, pumps). The BMS reserves energy for the flight and the landing.',
      convert: 'Small loads only (conversion actuators). The BMS holds the flight reserve.',
      spinup: `Ramping to ${fmt(elec, 0)} kW as the rotors spin up; the chiller pre-cools the cold plates.`,
      hover: `Discharging at ${fmt(C, 1)}C: about ${fmt(I, 0)} A at 800 V. At this rate the usable ${fmt(E * FLIGHT.usable, 0)} kWh lasts about ${fmt(M.hoverMin, 1)} min.`,
      cruise: `About ${fmt(elec, 0)} kW (${fmt(C, 1)}C, ${fmt(I, 0)} A). Roughly ${fmt(M.rangeKm, 0)} km of range at this speed from a full pack.` }[ph];
    figs = [['Cells', `${MASS.cells.toLocaleString()} × 4680`], ['Energy', `${fmt(E, 1)} kWh`], ['Pack power', `${fmt(elec, 0)} kW`], ['Current @ 800 V', `${fmt(I, 0)} A`], ['C-rate', `${fmt(C, 2)}C`], ['Pack mass', `${fmt(MASS.road.bySys['200 Energy storage'], 0)} kg`]];
  } else if (id === 'power') {
    now = flying ? `Four SiC inverters each deliver about ${fmt(elec / 4, 0)} kW to their fan motors, controlling RPM for thrust allocation. The junction box fuses every branch; the insulation monitor watches the 800 V system.`
      : ph === 'road' ? `The inverters run the motors in torque mode for driving (≈${fmt(elec, 0)} kW total) with regenerative braking.` : 'HV system live; the DC-DC converter supplies 14 V to avionics, actuators and the 12 V backup battery.';
    figs = [['Inverters', '4 × 250 kW SiC'], ['Per inverter', `${fmt(elec / 4, 0)} kW`], ['Bus voltage', '800 V nominal'], ['DC-DC', '3 kW to 14 V'], ['On-board charger', '22 kW AC'], ['DC fast charge', 'CCS2 up to 350 kW']];
  } else if (id === 'cockpit') {
    now = flying ? 'The sidestick commands pitch and roll rates and the thrust lever commands climb. The steering yoke is locked centred; the HUD shows flight symbology. The parachute handle is armed overhead.'
      : ph === 'road' ? 'Steer-by-wire yoke and pedals are active. The sidestick and thrust lever are inhibited. The mode selector reads ROAD.'
      : 'The driver has selected PREPARE / CONFIGURE on the guarded mode selector. Each step needs confirmation; harnesses must be latched.';
    figs = [['Occupants', '2 × 90 kg'], ['Mode selector', flying ? 'FLY' : ph === 'road' ? 'ROAD' : 'CONFIGURE'], ['Primary display', 'Pillar-to-pillar OLED'], ['Restraints', '5-point harness + 4 airbags'], ['Parachute handle', flying ? 'ARMED' : 'SAFE']];
  } else if (id === 'avionics') {
    now = flying ? 'Three dissimilar flight computers run the control laws and allocate thrust to the four rotors at high rate. The independent monitor can inhibit an unsafe command. Radar altimeters and LiDAR watch the ground.'
      : 'The flight computers supervise conversion: every actuator move needs agreement between redundant position sensors and lock switches. On the road the VCU runs traction and stability control.';
    figs = [['Flight computers', '3 (triplex)'], ['IMUs', '3'], ['Air data', '2 pitot-static probes'], ['Height', '2 radar altimeters'], ['Surveillance', 'ADS-B / Mode-S'], ['Cameras', '8 surround']];
  } else if (id === 'thermal') {
    const q = elec * .08;
    now = `About ${fmt(q, 0)} kW of heat from motors, inverters and the battery goes to two front radiators and the chiller. ${flying ? 'In hover the radiator fans run hard because there is little ram air.' : ''}`;
    figs = [['Heat load', `${fmt(q, 0)} kW`], ['Radiators', '2 front, angled 35°'], ['Pumps', '2 electric'], ['Battery cooling', 'Chiller + cold plates']];
  } else if (id === 'legs') {
    const down = st.legs > .98, load = down && !flying ? M.W / 4 : 0;
    now = down ? `Down and locked. Each leg carries about ${fmt(load / 1000, 1)} kN, keeping the tyres 120 mm off the ground so the wheels can swing up.` : st.legs > .02 ? 'In transit: the ball-screw drives the two telescoping stages.' : flying ? 'Stowed after lift-off; the weight-on-wheels switches confirmed the car is airborne.' : 'Stowed flush with the underbody.';
    figs = [['Legs', '4 telescoping, 2 stages'], ['Stroke', '550 mm'], ['Load per leg', `${fmt(load / 1000, 1)} kN`], ['State', down ? 'Down & locked' : st.legs > .02 ? 'In transit' : 'Stowed']];
  } else if (id === 'emergency') {
    now = flying ? 'Armed. If the vehicle becomes uncontrollable (a single rotor failure leaves it under-actuated) the rocket extracts a whole-vehicle canopy through the rear deck lid.' : 'Safe on the ground; the fire-suppression bottle protects the battery bay at all times.';
    figs = [['Canopy rating', '2,500 kg'], ['Deployment', 'Rocket extraction'], ['Riser', '4-point to roll hoop & subframe'], ['Battery fire', 'Suppression bottle']];
  } else if (id === 'structure') {
    now = 'The carbon tub carries the battery, seats and roll hoop. Welded aluminium subframes pick up the suspension, steering rack and conversion hinges; corner hardpoints feed hinge and leg loads into the tub.';
    figs = [['Tub', 'CFRP / Nomex sandwich'], ['Subframes', '6061 welded tube'], ['Roll hoop', 'Ti-6Al-4V'], ['Structure mass', `${fmt(MASS.road.bySys['110 Structure'], 0)} kg`]];
  } else if (id === 'body') {
    now = 'Panels are trimmed from the body lofted through the A1 surfaces. Fender caps ride on the conversion yokes; gull-wing doors hinge on the roof line; the canopy is laminated polycarbonate.';
    figs = [['Panels', 'CFRP, Class-A paint'], ['Doors', '2 gull-wing'], ['Glazing', '4 polycarbonate panes'], ['Body mass', `${fmt(MASS.road.bySys['101 Body'], 0)} kg`]];
  }
  return { PH, now, figs };
}
const REGION_UI = {};
function initRegionUI(view) {
  const host = views[view].el;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'hud-leaders region-leaders'); host.appendChild(svg);
  const layer = document.createElement('div'); layer.className = 'hud-callouts'; host.appendChild(layer);
  const chips = document.createElement('div'); chips.className = 'region-chips';
  chips.innerHTML = '<span>EXPLORE A REGION</span>' + REGIONS.map((r) => `<button data-region="${r.id}">${esc(r.name)}</button>`).join('');
  host.appendChild(chips);
  const back = document.createElement('button'); back.className = 'region-back'; back.textContent = '← Back to full vehicle'; back.hidden = true; host.appendChild(back);
  const brief = document.createElement('aside'); brief.className = 'region-brief'; brief.hidden = true; host.appendChild(brief);
  const tip = document.createElement('div'); tip.className = 'region-tip'; tip.hidden = true; host.appendChild(tip);
  REGION_UI[view] = { svg, layer, chips, back, brief, tip };
  chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => (FOCUS.region === b.dataset.region ? exitFocus() : focusRegion(view, b.dataset.region))));
  back.addEventListener('click', () => exitFocus());
  host.addEventListener('keydown', (e) => { if (e.key === 'Escape') exitFocus(); });
  // hover + click picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, lastMove = 0;
  const pick = (e) => {
    const r = host.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, views[view].camera);
    const targets = [];
    for (const rec of OBJS) { if (!rec.obj.visible || (FOCUS.region && rec.region !== FOCUS.region)) continue; if (rec.obj.isInstancedMesh) targets.push(rec.obj); else rec.obj.children.forEach((c) => c.isMesh && targets.push(c)); }
    const hit = ray.intersectObjects(targets, false).find((hh) => !renderer.clippingPlanes.length || hh.point.z <= .001);
    return hit ? { rec: hit.object.userData.rec, hit } : null;
  };
  host.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  host.addEventListener('pointermove', (e) => {
    if (e.buttons || FOCUS.region || performance.now() - lastMove < 120 || e.target.closest('.region-chips, .region-brief, .region-back')) return;
    lastMove = performance.now();
    const h = pick(e), id = h ? h.rec.region : null;
    if (id !== FOCUS.hover) { FOCUS.hover = id; applyStyle(styleNow); if (view === 'advanced' && adv.isolate) refreshIsolation(); }
    tip.hidden = !id;
    if (id) { const r = host.getBoundingClientRect(); tip.textContent = `${REGION_BY_ID[id].long} · ${view === 'advanced' ? 'double-click' : 'click'} to expand`; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px'; }
  });
  host.addEventListener('pointerleave', () => { tip.hidden = true; if (FOCUS.hover && !FOCUS.region) { FOCUS.hover = null; applyStyle(styleNow); } });
  const open = (e) => {
    const h = pick(e); if (!h) return;
    tip.hidden = true;
    if (!FOCUS.region) focusRegion(view, h.rec.region, h.rec);
    else if (view === 'sequence') showPartFromRegion(h.rec.pi);
  };
  if (view === 'sequence') host.addEventListener('pointerup', (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || e.target.closest('.region-chips, .region-brief, .region-back')) return; open(e); });
  else host.addEventListener('dblclick', (e) => { if (!e.target.closest('.region-chips, .region-brief, .region-back')) open(e); });
}
function showPartFromRegion(pi) { showTab('advanced'); document.querySelector('[data-tab="advanced"]')?.click(); setTimeout(() => { setAdvView('3d'); selectPart(pi, -1, true); }, 60); }
function renderBrief(full) {
  if (!FOCUS.region) return;
  const ui = REGION_UI[FOCUS.view], R = REGION_BY_ID[FOCUS.region], B = regionBrief(FOCUS.region, FOCUS.view);
  if (full || !ui.brief.querySelector('.rb-now')) {
    const groups = new Map();
    for (const r of FOCUS.recs) { const p = PARTS[r.pi].def; const g = groups.get(p.assy) || []; if (!g.includes(r.pi)) g.push(r.pi); groups.set(p.assy, g); }
    const mass = FOCUS.recs.reduce((a, r) => a + PARTS[r.pi].def.mass_kg * r.mtx.length, 0);
    const pieces = FOCUS.recs.reduce((a, r) => a + r.mtx.length, 0);
    ui.brief.innerHTML = `<span class="eyebrow">REGION · ${esc(R.id.toUpperCase())}</span><h3>${esc(R.long)}</h3>
      <div class="rb-phase"></div><p class="rb-now"></p><dl class="kv rb-figs"></dl>
      <div class="rb-sum">${groups.size} sub-assemblies · ${[...groups.values()].flat().length} unique parts · ${pieces.toLocaleString()} pieces · ${fmt(mass, 1)} kg</div>
      <div class="rb-groups">${[...groups.entries()].sort().map(([a, list]) => `<details><summary>${esc(a)} <em>${list.length}</em></summary>${list.map((pi) => `<button data-pi="${pi}"><b>${PARTS[pi].def.pn}</b> ${esc(PARTS[pi].def.name)}</button>`).join('')}</details>`).join('')}</div>
      <p class="rb-hint">${FOCUS.view === 'sequence' ? 'Keep the sequence playing to watch this region change. Click a part to open its datasheet.' : 'Move the configuration slider to see this region in other modes. Click a part to select it.'}</p>`;
    ui.brief.querySelectorAll('button[data-pi]').forEach((b) => b.addEventListener('click', () => {
      const pi = +b.dataset.pi;
      if (FOCUS.view === 'advanced') { selectPart(pi, -1, false); } else showPartFromRegion(pi);
    }));
  }
  ui.brief.querySelector('.rb-phase').textContent = `NOW · ${B.PH.toUpperCase()}`;
  ui.brief.querySelector('.rb-now').textContent = B.now;
  ui.brief.querySelector('.rb-figs').innerHTML = B.figs.map(([k, v]) => `<dt>${esc(k.toUpperCase())}</dt><dd>${esc(v)}</dd>`).join('');
}

// open the remembered tab, or a deep link (#sequence / #advanced / #flight)
const deep = location.hash.replace('#', '');
const startTab = MY_TABS[deep] ? deep : MY_TABS[document.body.dataset.startTab] ? document.body.dataset.startTab : null;
if (startTab) document.querySelector(`[data-tab="${startTab}"]`)?.click();
window.__jd = { _dbg: { OBJS, PARTS, NODE }, focus: (v, id) => focusRegion(v, id), unfocus: () => exitFocus(true), seek: (t) => { seq.playing = false; seq.snap = true; syncPlay(); setSeqTime(t); }, style: (s) => document.querySelector(`[data-seqstyle="${s}"]`).click(), showTab, get DATA() { return DATA; }, MASS, flightModel: () => flightModel(FLIGHT) };
