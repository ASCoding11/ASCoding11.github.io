// Pack the first-person arms (fp_clips.py export) for the web: resampled clips, WebP textures, meshopt geometry.
// usage: GT_MODULES=/path/to/node_modules node fp_pack.mjs fp.glb out.glb
import path from 'path';
const M = process.env.GT_MODULES || path.resolve('node_modules');
const imp = (p) => import(path.join(M, p));
const { NodeIO } = await imp('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions/dist/index.js');
const { dedup, meshopt, textureCompress, resample, prune } = await imp('@gltf-transform/functions/dist/index.js');
const { MeshoptEncoder } = await imp('meshoptimizer/index.js');
const sharp = (await imp('sharp/dist/index.mjs')).default;
const [src, dst] = process.argv.slice(2);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
for (const m of doc.getRoot().listMaterials()) {
  const orm = m.getMetallicRoughnessTexture();
  if (orm && !m.getOcclusionTexture()) { m.setOcclusionTexture(orm); m.getOcclusionTextureInfo().setTexCoord(0); }
}
await doc.transform(
  prune({ keepLeaves: true }), dedup(), resample({ tolerance: 0.0002 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, slots: /^(baseColorTexture)$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92, slots: /^(normalTexture)$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, slots: /^(metallicRoughnessTexture|occlusionTexture)$/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(dst, doc);
for (const t of doc.getRoot().listTextures()) console.log('texture', t.getName() || t.getURI(), t.getMimeType(), t.getSize(), (t.getImage().byteLength / 1024).toFixed(0) + ' KB');
console.log('animations', doc.getRoot().listAnimations().length);
