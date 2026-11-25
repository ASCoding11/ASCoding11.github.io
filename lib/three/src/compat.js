// r128 compatibility for three.js r187, so the site's games (written for r128) run on r187 unchanged and look the
// same. Applied once, to the plain window.THREE object, before any game code runs. See ../README.md for each item.
// New code should not rely on any of this.

export function applyCompat(T, orig) {
  // ---- names removed since r128
  T.sRGBEncoding = 3001;
  T.LinearEncoding = 3000;
  T.DataTexture2DArray = orig.DataArrayTexture;
  T.PCFSoftShadowMap = orig.PCFShadowMap;   // removed in r187 (its PCF is soft now); avoids a warning on every page
  T.DataTexture3D = orig.Data3DTexture;
  for (const n of ['Box', 'Capsule', 'Circle', 'Cone', 'Cylinder', 'Dodecahedron', 'Extrude', 'Icosahedron', 'Lathe', 'Octahedron',
    'Plane', 'Polyhedron', 'Ring', 'Shape', 'Sphere', 'Tetrahedron', 'Torus', 'TorusKnot', 'Tube']) {
    if (orig[n + 'Geometry'] && !T[n + 'BufferGeometry']) T[n + 'BufferGeometry'] = orig[n + 'Geometry'];
  }

  // ---- colour: r128 had no colour management. Colours are used as written, and the renderer's output is linear
  // unless a game asks for sRGB (outputEncoding = sRGBEncoding), as in r128.
  orig.ColorManagement.enabled = false;
  const enc2cs = (e) => (e === 3001 ? orig.SRGBColorSpace : orig.NoColorSpace);
  const cs2enc = (c) => (c === orig.SRGBColorSpace ? 3001 : 3000);
  Object.defineProperty(orig.Texture.prototype, 'encoding', {
    get() { return cs2enc(this.colorSpace); }, set(v) { this.colorSpace = enc2cs(v); }, configurable: true,
  });

  // render targets: options.encoding becomes options.colorSpace; WebGLMultisampleRenderTarget is a target with samples
  const fixRT = (o) => (o && o.encoding !== undefined && o.colorSpace === undefined ? Object.assign({}, o, { colorSpace: enc2cs(o.encoding) }) : o);
  T.WebGLRenderTarget = class WebGLRenderTarget extends orig.WebGLRenderTarget {
    constructor(w, h, o) { super(w, h, fixRT(o)); }
  };
  T.WebGLMultisampleRenderTarget = class WebGLMultisampleRenderTarget extends orig.WebGLRenderTarget {
    constructor(w, h, o) { super(w, h, Object.assign({ samples: 4 }, fixRT(o))); }
  };

  // ---- the renderer
  T.WebGLRenderer = class WebGLRenderer extends orig.WebGLRenderer {
    constructor(p) {
      super(p);
      this.outputColorSpace = orig.LinearSRGBColorSpace;   // r128's default output (LinearEncoding)
      this.capabilities.isWebGL2 = true;                    // r187 is WebGL 2 only and dropped the flag
      // r165 swapped the arguments: r128 was (position, texture, level), r187 is (texture, position, level)
      const copy = this.copyFramebufferToTexture;
      this.copyFramebufferToTexture = (a, b, c) => (a && a.isVector2 ? copy.call(this, b, a, c) : copy.call(this, a, b, c));
    }
    get outputEncoding() { return cs2enc(this.outputColorSpace); }
    set outputEncoding(v) { this.outputColorSpace = v === 3001 ? orig.SRGBColorSpace : orig.LinearSRGBColorSpace; }
    get physicallyCorrectLights() { return false; }
    set physicallyCorrectLights(v) { /* r128 games never turned it on; legacy lighting below is always used */ }
  };

  // ---- materials: these flags were removed (r129); drop them quietly instead of warning on every material
  const setValues = orig.Material.prototype.setValues;
  orig.Material.prototype.setValues = function (v) {
    if (v && ('skinning' in v || 'morphTargets' in v || 'morphNormals' in v || 'vertexTangents' in v)) {
      v = Object.assign({}, v); delete v.skinning; delete v.morphTargets; delete v.morphNormals; delete v.vertexTangents;
    }
    return setValues.call(this, v);
  };
  // a second UV set was 'uv2' in r128 and is 'uv1' now
  const setAttribute = orig.BufferGeometry.prototype.setAttribute;
  orig.BufferGeometry.prototype.setAttribute = function (name, a) {
    if (name === 'uv2') setAttribute.call(this, 'uv1', a);
    return setAttribute.call(this, name, a);
  };

  // attribute.updateRange = {offset, count} became addUpdateRange(start, count) (r159). The old object is kept: setting
  // it records one range, and count reads -1 again once the upload has cleared it, as r128's did.
  const updateRange = {
    get() {
      if (this.__ur) return this.__ur;
      const a = this, apply = () => { a.clearUpdateRanges(); if (ur._c >= 0) a.addUpdateRange(ur._o, ur._c); };
      const ur = { _o: 0, _c: -1,
        get offset() { return this._o; }, set offset(v) { this._o = v; apply(); },
        get count() { return a.updateRanges.length ? this._c : -1; }, set count(v) { this._c = v; apply(); } };
      Object.defineProperty(this, '__ur', { value: ur }); return ur;
    }, configurable: true,
  };
  Object.defineProperty(orig.BufferAttribute.prototype, 'updateRange', updateRange);
  Object.defineProperty(orig.InterleavedBuffer.prototype, 'updateRange', updateRange);

  // ---- lights: r128's default ("legacy") lighting. r155 made physically based lighting the default and r165
  // removed the old mode, so it is put back here: every light's colour is multiplied by PI in the shader (as r128
  // did), point and spot lights fade with r128's formula, and their default decay is 1 again.
  T.PointLight = class PointLight extends orig.PointLight {
    constructor(color, intensity, distance = 0, decay = 1) { super(color, intensity, distance, decay); }
  };
  T.SpotLight = class SpotLight extends orig.SpotLight {
    constructor(color, intensity, distance = 0, angle = Math.PI / 3, penumbra = 0, decay = 1) { super(color, intensity, distance, angle, penumbra, decay); }
  };
  const C = orig.ShaderChunk;
  let s = C.lights_pars_begin, misses = [];
  const rep = (a, b) => { if (s.includes(a)) s = s.replace(a, b); else misses.push(a.trim().slice(0, 40)); };
  rep(/float getDistanceAttenuation\([\s\S]*?\n}\n/.exec(s)?.[0] || '<getDistanceAttenuation>',
    'float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n' +
    '\tif ( cutoffDistance > 0.0 && decayExponent > 0.0 ) return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );\n' +
    '\treturn 1.0;\n}\n');
  rep('vec3 irradiance = ambientLightColor;', 'vec3 irradiance = ambientLightColor * PI;');
  rep('vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );',
    'vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight ) * PI;');
  rep('light.color = directionalLight.color;', 'light.color = directionalLight.color * PI;');
  rep('light.color = pointLight.color;', 'light.color = pointLight.color * PI;');
  rep('light.color = spotLight.color * spotAttenuation;', 'light.color = spotLight.color * spotAttenuation * PI;');
  C.lights_pars_begin = s;
  if (misses.length) console.warn('three r128 compat: lighting patch did not apply to', misses);

  // shader chunks renamed since r128, for custom shaders that #include them
  C.encodings_fragment = C.colorspace_fragment;
  C.encodings_pars_fragment = C.colorspace_pars_fragment;
  C.output_fragment = C.opaque_fragment;
  // varyings renamed since r128 (r136: fogDepth -> vFogDepth), for custom shaders that use the old name
  C.fog_pars_vertex += '\n#define fogDepth vFogDepth\n';
  C.fog_pars_fragment += '\n#define fogDepth vFogDepth\n';
  // (a game that edits a built-in shader by searching for '#include <output_fragment>' or another renamed piece
  // finds nothing in r187 and must search for the new name; that can't be fixed here)

  T.R128_COMPAT = true;
}
