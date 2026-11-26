/* Midnight Ops environment: room light, soldier rim light and the wear-layer recipe flags. Midnight Ops only (loaded
   after env/core.js by its pages; Ironwing shares env/core.js but not this file, and never makes these materials).
   Adds to IVEnv.U the uniforms the materials in env/core.js read (openings, room fill, probe, rim), IVEnv.setPortals,
   IVEnv.GLSL.interior / interiorUniforms, IVEnv.interiorPatch (kit materials) and IVEnv.rimPatch (characters). */
(function () {
  'use strict';
  const E = window.IVEnv, U = E.U;
  // openings (windows, doors) of the rooms near the camera: the light that comes in through them (IVEnv.setPortals)
  Object.assign(U, { uWin: { value: [] }, uWinN: { value: [] }, uWinNum: { value: 0 }, uWinC: { value: new THREE.Color(0.3, 0.32, 0.36) }, uProbeK: { value: 0 }, uRoomAmb: { value: new THREE.Color(0.036, 0.038, 0.043) },
    uRim: { value: new THREE.Color(0, 0, 0) } });   // uRim: the edge light on soldiers (IVEnv.rimPatch), set by the atmosphere
  for (let i = 0; i < 8; i++) { U.uWin.value.push(new THREE.Vector4()); U.uWinN.value.push(new THREE.Vector4()); }

  // IVEnv.setPortals([{ x, y, z, nx, nz, w, h }]): the openings of roofed rooms (centre, normal pointing INTO the room,
  // width, height, metres). The 8 nearest the camera light the inside of their room (E.GLSL.interior).
  let portals = [], portT = 0;
  E.setPortals = function (list) { portals = (list || []).slice(); portT = 1e9; };
  E._updaters.push(function (dt, cam) {
    portT += dt; if (portT < 0.25 || !cam) return; portT = 0;
    const px = cam.position.x, py = cam.position.y, pz = cam.position.z;
    const l = portals.filter(p => (p.x - px) ** 2 + (p.z - pz) ** 2 < 30 * 30).sort((a, b) => ((a.x - px) ** 2 + (a.y - py) ** 2 + (a.z - pz) ** 2) - ((b.x - px) ** 2 + (b.y - py) ** 2 + (b.z - pz) ** 2));
    const n = Math.min(8, l.length); U.uWinNum.value = n;
    for (let i = 0; i < n; i++) { const p = l[i], k = Math.hypot(p.nx, p.nz) || 1; U.uWin.value[i].set(p.x, p.y, p.z, p.w / 2); U.uWinN.value[i].set(p.nx / k, 0, p.nz / k, p.h / 2); }
  });
  // Inside a roofed room the outdoor sky fill and sky reflections fall away and the room is lit by its openings: each
  // one is a small area light of the sky's colour (form factor of the opening seen from the point), so light comes in
  // at the windows and door and falls off across the floor and up the far wall; lamps add their own pools. Without a
  // shadow map (Low) the sun and moon are also mostly kept out under the roof. vec3 wp: world position, nW: world normal.
  E.GLSL.interior = `
    float ivInside(vec3 wp){ float d = 0.0;
      for (int i = 0; i < 16; i++) { if (i >= uRoofN) break; vec4 r = uRoof[i];
        vec2 inb = smoothstep(vec2(0.05), vec2(0.5), min(wp.xz - r.xy, r.zw - wp.xz));
        d = max(d, inb.x * inb.y * step(wp.y, uRoofY[i] + 0.6)); }
      return d; }
    vec3 ivWindows(vec3 wp, vec3 nW){ vec3 s = vec3(0.0);
      for (int i = 0; i < 8; i++) { if (i >= uWinNum) break;
        vec3 wn = uWinN[i].xyz; float A = 4.0 * uWin[i].w * uWinN[i].w;
        vec3 L = uWin[i].xyz - wp; float d2 = max(dot(L, L), 0.04); L *= inversesqrt(d2);
        float cw = max(dot(-L, wn), 0.0), cn = clamp(dot(nW, L) * 0.7 + 0.3, 0.0, 1.0);
        s += A * cw * cn / (3.14159 * d2 + A); }
      return s * uWinC; }
    void ivInteriorLight(inout ReflectedLight rl, vec3 albedo, vec3 wp, vec3 nV){
      float inside = ivInside(wp); if (inside <= 0.0) return;
      vec3 nW = inverseTransformDirection(nV, viewMatrix);
      rl.indirectDiffuse *= mix(1.0, 0.2, inside); rl.indirectSpecular *= mix(1.0, 0.6, inside);
      #ifdef USE_SHADOWMAP
      rl.indirectDiffuse += inside * albedo * (ivWindows(wp, nW) * 10.0 + uRoomAmb);
      #else
      rl.indirectDiffuse += inside * albedo * (uWinC * 0.45 + uRoomAmb);   // Low: one flat fill, not a loop over the openings (cost)
      #endif
      // bounce: the room's own light probe (js/world.js renders one when the camera walks into a room), its most
      // blurred level along the normal
      #if defined( USE_ENVMAP ) && defined( STANDARD )
      rl.indirectDiffuse += inside * albedo * getIBLRadiance(vec3(0.0, 0.0, 1.0), nV, 1.0) * uProbeK;
      #endif
      #ifndef USE_SHADOWMAP
      rl.directDiffuse *= mix(1.0, 0.15, inside); rl.directSpecular *= mix(1.0, 0.15, inside);
      #endif
    }`;
  E.GLSL.interiorUniforms = 'uniform vec4 uWin[8]; uniform vec4 uWinN[8]; uniform int uWinNum; uniform vec3 uWinC; uniform float uProbeK; uniform vec3 uRoomAmb;\n';
  // the same for a material that is not an IVEnv one (the kit's, js/world.js): adds the world position and uniforms
  E.interiorPatch = function (sh, tag) {
    Object.assign(sh.uniforms, { uRoof: U.uRoof, uRoofY: U.uRoofY, uRoofN: U.uRoofN, uWin: U.uWin, uWinN: U.uWinN, uWinNum: U.uWinNum, uWinC: U.uWinC, uProbeK: U.uProbeK, uRoomAmb: U.uRoomAmb });
    E.patch(sh, 'vertex', '#include <project_vertex>', `#include <project_vertex>
      { vec4 ivp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        ivp = instanceMatrix * ivp;
      #endif
      vIvW = (modelMatrix * ivp).xyz; }`, tag);
    sh.vertexShader = 'varying vec3 vIvW;\n' + sh.vertexShader;
    E.patch(sh, 'fragment', '#include <aomap_fragment>', '#include <aomap_fragment>\n ivInteriorLight(reflectedLight, diffuseColor.rgb, vIvW, normal);', tag);
    sh.fragmentShader = 'varying vec3 vIvW; uniform vec4 uRoof[16]; uniform float uRoofY[16]; uniform int uRoofN;\n' + E.GLSL.interiorUniforms + sh.fragmentShader.replace('void main() {', E.GLSL.interior + '\nvoid main() {');
  };

  // IVEnv.rimPatch(material): a soft cool edge light on a character's body (the sky and moon catching the rim), so a
  // figure separates from a dark field at 30 to 40 m by its outline. Faded with distance by the fog like the rest.
  E.rimPatch = function (m) {
    if (!m || m.userData.ivRim || Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile')) return;
    m.userData.ivRim = true;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uRim = U.uRim;
      E.patch(sh, 'fragment', '#include <opaque_fragment>', `{ float ivF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        outgoingLight += uRim * ivF * ivF * ivF * (0.4 + 0.6 * clamp(normal.y * 0.5 + 0.6, 0.0, 1.0)); }
      #include <opaque_fragment>`, 'env/core rim');
      sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader;
    };
    m.customProgramCacheKey = () => 'ivrim';
  };


  // wear layers by recipe (drawn in env/core.js's material, Medium and High): chipped paint and what shows under it,
  // rust, weathered timber, scuffed floors, stained plaster, mottled sandbags
  const RC = E.RECIPES;
  RC.wood_painted.paintUnder = 'vec3(0.16, 0.135, 0.11)'; RC.metal_painted.paintUnder = 'vec3(0.16, 0.075, 0.035)';
  RC.metal_painted.rust = 1; RC.metal_rust.rust = 1; RC.planks.timber = 1; RC.timber.timber = 1;
  RC.floorboards.floor = 1; RC.plaster_interior.stain = 1; RC.plaster.stain = 1; RC.sandbag.bag = 1; RC.canvas.bag = 1;
})();
