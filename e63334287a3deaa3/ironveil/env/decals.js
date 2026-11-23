/* Midnight Ops environment: runtime decals (impacts, scorch) from one pooled instanced mesh = one draw call.
   IVEnv.decal(type, position, normal, size, seed) -> index   types: scratches, gouges, chipped, pocks, scorch, soot,
     damp, moss, rust, mud, crack, bullethole, leaves, waterstain, chalk, grime (see IVEnv.DECALS). position / normal
     are THREE.Vector3 or [x, y, z] in world space. The pool holds IVEnv.Q.decals; the oldest is reused.
   IVEnv.impact(surface, position, normal) picks a decal for a bullet hit by surface: 'stone' | 'brick' | 'concrete' |
     'wood' | 'metal' | 'glass' | 'dirt' | 'cloth' (returns the decal index or -1 for surfaces that take none).
   IVEnv.clearDecals() empties the pool (level change). Decals are offset 4 mm and use polygon offset (no z-fighting). */
(function () {
  'use strict';
  const E = window.IVEnv;
  let pool = null;
  function makePool(scene) {
    const n = (E.Q && E.Q.decals) || 128;
    const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0, 0.004);
    const cell = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); g.setAttribute('aCell', cell);
    const base = E.decalMaterial(), m = base.clone();
    m.onBeforeCompile = function (sh) {
      base.onBeforeCompile.call(this, sh);
      sh.vertexShader = 'attribute vec2 aCell;\n' + sh.vertexShader.replace('#include <uv_vertex>', 'vUv = (uv * (0.25 - 0.008) + 0.004) + aCell;');
    };
    m.customProgramCacheKey = () => 'ivdecalpool';
    const mesh = new THREE.InstancedMesh(g, m, n); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.receiveShadow = true; mesh.name = 'IVEnv.decals';
    pool = { mesh, cell, n, next: 0, used: 0 };
    (scene || E.atmo && E.atmo.scene).add(mesh);
    return pool;
  }
  const _o = new THREE.Object3D(), _n = new THREE.Vector3(), _p = new THREE.Vector3();
  E.decal = function (type, position, normal, size, seed) {
    if (!pool) makePool();
    const c = typeof type === 'number' ? type : E.DECALS[type]; if (c == null) return -1;
    _p.set(position.x != null ? position.x : position[0], position.y != null ? position.y : position[1], position.z != null ? position.z : position[2]);
    _n.set(normal.x != null ? normal.x : normal[0], normal.y != null ? normal.y : normal[1], normal.z != null ? normal.z : normal[2]).normalize();
    const i = pool.next; pool.next = (pool.next + 1) % pool.n; pool.used = Math.min(pool.n, pool.used + 1);
    _o.position.copy(_p); _o.lookAt(_p.x + _n.x, _p.y + _n.y, _p.z + _n.z);
    const r = seed != null ? E.hash(seed, 3, 7) : Math.random(); _o.rotateZ(r * Math.PI * 2);
    const s = size || 0.3; _o.scale.set(s, s, 1); _o.updateMatrix();
    pool.mesh.setMatrixAt(i, _o.matrix); pool.mesh.instanceMatrix.needsUpdate = true;
    pool.cell.setXY(i, (c % 4) / 4, Math.floor(c / 4) / 4); pool.cell.needsUpdate = true;
    pool.mesh.count = pool.used;
    return i;
  };
  E.impact = function (surface, position, normal) {
    const s = String(surface || '').toLowerCase(), R = Math.random;
    if (s === 'stone' || s === 'brick' || s === 'concrete') return E.decal(R() < 0.65 ? 'bullethole' : 'pocks', position, normal, 0.12 + R() * 0.1);
    if (s === 'wood') return E.decal(R() < 0.7 ? 'bullethole' : 'gouges', position, normal, 0.1 + R() * 0.08);
    if (s === 'metal') return E.decal('bullethole', position, normal, 0.07 + R() * 0.04);
    if (s === 'glass') return E.decal('crack', position, normal, 0.35 + R() * 0.2);
    if (s === 'dirt' || s === 'mud' || s === 'grass' || s === 'gravel') return E.decal('mud', position, normal, 0.25 + R() * 0.2);
    return -1;
  };
  E.clearDecals = function () { if (pool) { pool.used = 0; pool.next = 0; pool.mesh.count = 0; } };
  E.decalPoolMesh = () => pool ? pool.mesh : null;
})();
