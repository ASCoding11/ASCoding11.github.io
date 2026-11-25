// Replace some weapons in the packed weapons.glb by newly exported ones, keeping every other weapon untouched.
// usage: GT_MODULES=/path/to/node_modules node swap.mjs weapons.glb out.glb new1.glb [new2.glb ...] [--skip root,root] [--add {...}]
// Every root node of the new files replaces the root of the same name (and its subtree) in weapons.glb.
// New textures are written as WebP like pack.mjs; textures already in the file are not re-encoded.
import path from 'path';
const M = process.env.GT_MODULES || path.resolve('node_modules');
const imp = (p) => import(path.join(M, p));
const { NodeIO } = await imp('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions/dist/index.js');
const { dedup, meshopt, textureCompress, mergeDocuments, unpartition, prune } = await imp('@gltf-transform/functions/dist/index.js');
const { MeshoptEncoder, MeshoptDecoder } = await imp('meshoptimizer/index.js');
const sharp = (await imp('sharp/dist/index.mjs')).default;

const args = process.argv.slice(2);
// --add '{"smg_sightRear":["smg",[x,y,z]], ...}' adds empty nodes (glTF frame) under existing roots
let ADD = {};
const ai = args.indexOf('--add'); if (ai >= 0) { ADD = JSON.parse(args[ai + 1]); args.splice(ai, 2); }
// --skip 'pistol,rifleScopedLod' leaves those roots of the new files out (the shipped ones are kept)
let SKIP = [];
const si = args.indexOf('--skip'); if (si >= 0) { SKIP = args[si + 1].split(','); args.splice(si, 2); }
const [src, dst, ...news] = args;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
const main = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
const oldTex = new Set(doc.getRoot().listTextures());
const newRoots = [];
for (const f of news) {
  const d = await io.read(f);
  for (const sc of d.getRoot().listScenes()) for (const n of sc.listChildren()) {
    if (SKIP.includes(n.getName())) { const all = []; n.traverse((c) => all.push(c)); for (const c of all) { const me = c.getMesh(); c.dispose(); if (me) me.dispose(); } }
    else newRoots.push(n.getName());
  }
  mergeDocuments(doc, d);
}
for (const n of main.listChildren()) if (newRoots.includes(n.getName())) { const all = []; n.traverse((c) => all.push(c)); for (const c of all) { const me = c.getMesh(); c.dispose(); if (me) me.dispose(); } }
for (const sc of doc.getRoot().listScenes()) if (sc !== main) { for (const n of sc.listChildren()) main.addChild(n); sc.dispose(); }
doc.getRoot().setDefaultScene(main);
for (const [name, [rootName, t]] of Object.entries(ADD)) {
  const r = main.listChildren().find((n) => n.getName() === rootName);
  if (!r) { console.warn('no root', rootName); continue; }
  const old = r.listChildren().find((n) => n.getName() === name); if (old) old.dispose();
  r.addChild(doc.createNode(name).setTranslation(t));
}
for (const m of doc.getRoot().listMaterials()) {
  const orm = m.getMetallicRoughnessTexture();
  if (m.getName().startsWith('wpn_') && orm && !m.getOcclusionTexture()) {
    m.setOcclusionTexture(orm); m.getOcclusionTextureInfo().setTexCoord(0); m.setOcclusionStrength(1.0);
  }
  if (/glass/.test(m.getName())) { m.setAlphaMode('BLEND'); m.setDoubleSided(false); }
}
const fresh = (t) => !oldTex.has(t);
const newTex = doc.getRoot().listTextures().filter(fresh).map((t) => t.getName() || t.getURI());
await doc.transform(prune({ keepLeaves: true }), unpartition(), dedup());
const pat = new RegExp('^(' + newTex.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$');
if (newTex.length) await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: +(process.env.QB || 90), pattern: pat, slots: /^(baseColorTexture)$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: +(process.env.QN || 92), pattern: pat, slots: /^(normalTexture)$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: +(process.env.QO || 90), pattern: pat, slots: /^(metallicRoughnessTexture|occlusionTexture)$/ }));
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(dst, doc);
for (const t of doc.getRoot().listTextures()) console.log('texture', t.getName() || t.getURI(), t.getMimeType(), t.getSize(), (t.getImage().byteLength / 1024).toFixed(0) + ' KB');
console.log('roots', main.listChildren().map((n) => n.getName()).join(' '));
