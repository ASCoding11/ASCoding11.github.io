// Ironwing vehicles: pack the built GLBs for the web (dedup, meshopt geometry with quantisation). Most materials are
// only names (the game's own tiling materials replace them); the baked sets of the hero models ('tex_<kind>' materials)
// keep their textures, as WebP, with occlusion read from the ORM map's red channel. usage:
//   GT_MODULES=/path/to/node_modules node pack.mjs out.glb in1.glb in2.glb ...   (inputs merged into one scene)
// needs: npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp
import path from 'path';
const M = process.env.GT_MODULES || path.resolve('node_modules');
const imp = (p) => import(path.join(M, p));
const { NodeIO, PropertyType } = await imp('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions/dist/index.js');
const { dedup, meshopt, mergeDocuments, unpartition, prune, textureCompress } = await imp('@gltf-transform/functions/dist/index.js');
const sharp = (await imp('sharp/dist/index.mjs')).default;
const { MeshoptEncoder } = await imp('meshoptimizer/index.js');
const [dst, ...src] = process.argv.slice(2);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src[0]);
for (const more of src.slice(1)) mergeDocuments(doc, await io.read(more));
const scenes = doc.getRoot().listScenes(), main = scenes[0];
for (const sc of scenes.slice(1)) { for (const n of sc.listChildren()) main.addChild(n); sc.dispose(); }
doc.getRoot().setDefaultScene(main);
for (const m of doc.getRoot().listMaterials()) {
  const orm = m.getMetallicRoughnessTexture();
  if (m.getName().startsWith('tex_') && orm) { m.setOcclusionTexture(orm); m.getOcclusionTextureInfo().setTexCoord(0); m.setOcclusionStrength(1.0); }
}
// materials are told apart only by name (the game swaps them by name), so dedup must not merge them
await doc.transform(unpartition(), dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }), prune({ keepLeaves: true, keepExtras: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88, slots: /^(baseColorTexture)$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, slots: /^(normalTexture)$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88, slots: /^(metallicRoughnessTexture|occlusionTexture)$/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(dst, doc);
let tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
for (const t of doc.getRoot().listTextures()) console.log('texture', t.getName() || t.getURI(), t.getMimeType(), t.getSize().join('x'), (t.getImage().byteLength / 1024).toFixed(0) + ' KB');
console.log(dst, Math.round((await import('fs')).statSync(dst).size / 1024) + ' KB', Math.round(tris) + ' triangles');
